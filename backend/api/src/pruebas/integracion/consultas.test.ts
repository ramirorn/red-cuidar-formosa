import request from 'supertest';
import { beforeAll, describe, expect, it } from 'vitest';
import {
    app,
    contarConsultas,
    crearTerritorio,
    crearUsuario,
    limpiarBase,
    prisma,
    type Territorio,
} from './ayudantes.js';

let territorio: Territorio;
let administrador: Awaited<ReturnType<typeof crearUsuario>>;
let coordinador: Awaited<ReturnType<typeof crearUsuario>>;

const CANTIDAD_CAPITAL = 2500;
const CANTIDAD_CLORINDA = 40;
// Todos los reportes de Capital con la misma fecha de recepción: obliga a desempatar por id
// en la paginación keyset de la exportación.
const FECHA_COMUN = new Date(Date.now() - 60 * 60 * 1000);

// Carga masiva directa en SQL (sin pasar por la API) con evidencias y detecciones.
const insertarReportes = async (localidadId: number, cantidad: number, fecha: Date | null) => {
    await prisma.$executeRaw`
        WITH manzanas AS (
            SELECT "id", row_number() OVER (ORDER BY "id") - 1 AS orden, COUNT(*) OVER () AS total
            FROM "manzana" WHERE "localidadId" = ${localidadId}
        ),
        nuevos AS (
            INSERT INTO "reporte" ("id", "idCliente", "manzanaId", "tipo", "estado", "capturadoEn", "createdAt", "updatedAt")
            SELECT gen_random_uuid(), gen_random_uuid(), m."id",
                   (CASE WHEN g % 3 = 0 THEN 'MICROBASURAL' ELSE 'CRIADERO' END)::"TipoReporte",
                   (CASE WHEN g % 2 = 0 THEN 'VALIDADO' ELSE 'PENDIENTE' END)::"EstadoReporte",
                   now(),
                   COALESCE(${fecha}::timestamp, now() - make_interval(secs => g)), now()
            FROM generate_series(1, ${cantidad}) AS g
            JOIN manzanas m ON m.orden = g % m.total
            RETURNING "id"
        ),
        evidencias AS (
            INSERT INTO "evidencia" ("id", "reporteId", "rutaAlmacenamiento", "mime", "tamanoBytes", "sha256", "ancho", "alto", "momento")
            SELECT gen_random_uuid(), n."id", 'x/' || n."id" || '.jpg', 'image/jpeg', 1000, md5(n."id"::text) || md5(n."id"::text), 10, 10, 'ANTES'
            FROM nuevos n
            RETURNING "reporteId"
        )
        INSERT INTO "deteccionIa" ("reporteId", "clase", "confianza", "cajaDelimitadora")
        SELECT "reporteId", 'NEUMATICO', 0.9, '{"x":0.1,"y":0.1,"ancho":0.2,"alto":0.2}'::jsonb FROM evidencias
    `;
};

const filasCsv = (texto: string) => texto.replace(/^﻿/, '').trim().split('\r\n');

beforeAll(async () => {
    await limpiarBase();
    territorio = await crearTerritorio();
    await insertarReportes(territorio.localidades.capital, CANTIDAD_CAPITAL, FECHA_COMUN);
    await insertarReportes(territorio.localidades.clorinda, CANTIDAD_CLORINDA, null);
    administrador = await crearUsuario('ADMINISTRADOR');
    coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.clorinda);
});

describe('prevención de consultas N+1', () => {
    const listar = (limite: number) => () =>
        request(app).get('/api/institucional/reportes').query({ limite }).set('Authorization', `Bearer ${administrador.token}`).expect(200);

    it('el listado de reportes hace las mismas consultas con 5 o con 200 filas', async () => {
        const conCinco = await contarConsultas(listar(5));
        const conDoscientos = await contarConsultas(listar(200));

        expect(conDoscientos).toBe(conCinco);
        expect(conCinco).toBeLessThanOrEqual(6);
    });

    it('las métricas usan agregaciones: pocas consultas sin importar el volumen', async () => {
        const consultas = await contarConsultas(() =>
            request(app).get('/api/institucional/metricas').set('Authorization', `Bearer ${administrador.token}`).expect(200));

        expect(consultas).toBeLessThanOrEqual(6);
    });

    it('el listado de intervenciones tampoco crece con la página', async () => {
        const listarIntervenciones = (limite: number) => () =>
            request(app).get('/api/institucional/intervenciones').query({ limite })
                .set('Authorization', `Bearer ${administrador.token}`).expect(200);

        expect(await contarConsultas(listarIntervenciones(200))).toBe(await contarConsultas(listarIntervenciones(5)));
    });
});

describe('paginación por cursor', () => {
    it('recorre todos los reportes de Clorinda sin repetir ni perder ninguno', async () => {
        const vistos: string[] = [];
        let cursor: string | null = null;

        do {
            const respuesta: request.Response = await request(app)
                .get('/api/institucional/reportes')
                .query({ limite: 7, ...(cursor ? { cursor } : {}) })
                .set('Authorization', `Bearer ${coordinador.token}`)
                .expect(200);
            vistos.push(...respuesta.body.data.map((reporte: { id: string }) => reporte.id));
            cursor = respuesta.body.pagination.siguienteCursor;
        } while (cursor);

        expect(vistos).toHaveLength(CANTIDAD_CLORINDA);
        expect(new Set(vistos).size).toBe(CANTIDAD_CLORINDA);
    });
});

describe('exportación CSV', () => {
    it('exporta más de un lote completo, sin duplicados, aun con fechas idénticas', async () => {
        const respuesta = await request(app)
            .get('/api/institucional/exportaciones/reportes')
            .query({ localidadId: territorio.localidades.capital })
            .set('Authorization', `Bearer ${administrador.token}`)
            .buffer(true)
            .parse((res, callback) => {
                let texto = '';
                res.on('data', (parte: Buffer) => { texto += parte.toString('utf8'); });
                res.on('end', () => callback(null, texto));
            });

        expect(respuesta.status).toBe(200);
        const [encabezado, ...filas] = filasCsv(respuesta.body as string);
        // Los reportes de vecinos no tienen coordenadas: solo la manzana.
        expect(encabezado).toContain('manzana');
        expect(encabezado).not.toContain('latitud');
        expect(filas).toHaveLength(CANTIDAD_CAPITAL);
        expect(new Set(filas.map((fila) => fila.split(',')[0])).size).toBe(CANTIDAD_CAPITAL);
    });

    it('cada exportación queda en la auditoría', async () => {
        const auditadasAntes = await prisma.auditoriaAcceso.count({ where: { accion: 'EXPORTAR_CSV' } });

        await request(app)
            .get('/api/institucional/exportaciones/reportes')
            .query({ localidadId: territorio.localidades.clorinda })
            .set('Authorization', `Bearer ${coordinador.token}`)
            .expect(200);

        expect(await prisma.auditoriaAcceso.count({ where: { accion: 'EXPORTAR_CSV' } })).toBe(auditadasAntes + 1);
    });

    it('un coordinador no puede exportar otra localidad', async () => {
        const respuesta = await request(app)
            .get('/api/institucional/exportaciones/reportes')
            .query({ localidadId: territorio.localidades.capital })
            .set('Authorization', `Bearer ${coordinador.token}`);

        expect(respuesta.status).toBe(403);
    });
});

describe('métricas', () => {
    it('cuentan exactamente los reportes por tipo y estado de la localidad', async () => {
        const respuesta = await request(app)
            .get('/api/institucional/metricas')
            .set('Authorization', `Bearer ${coordinador.token}`)
            .expect(200);

        const total = respuesta.body.data.reportes.reduce((suma: number, fila: { cantidad: number }) => suma + fila.cantidad, 0);
        expect(total).toBe(CANTIDAD_CLORINDA);
        expect(respuesta.body.data.localidadId).toBe(territorio.localidades.clorinda);
    });
});
