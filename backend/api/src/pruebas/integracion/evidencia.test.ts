import { existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import sharp from 'sharp';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    app,
    crearSesion,
    crearTerritorio,
    crearUsuario,
    enviarReporte,
    imagenUnica,
    limpiarBase,
    prisma,
    puntoDe,
    type Territorio,
} from './ayudantes.js';

const DIR_EVIDENCIAS = process.env.DIR_EVIDENCIAS as string;

const contarArchivos = (directorio = DIR_EVIDENCIAS): number => {
    if (!existsSync(directorio)) return 0;
    return readdirSync(directorio, { withFileTypes: true }).reduce(
        (total, entrada) => total + (entrada.isDirectory() ? contarArchivos(path.join(directorio, entrada.name)) : 1),
        0,
    );
};

let territorio: Territorio;
let sesion: { sesionId: string; token: string };

// Un epidemiólogo (alcance provincial) cambia el estado de un reporte.
const cambiarEstado = async (reporteId: string, estado: string, motivoRechazo?: string) => {
    const epidemiologo = await crearUsuario('EPIDEMIOLOGO');
    return request(app)
        .patch(`/api/institucional/reportes/${reporteId}/estado`)
        .set('Authorization', `Bearer ${epidemiologo.token}`)
        .send({ estado, ...(motivoRechazo ? { motivoRechazo } : {}) });
};

beforeEach(async () => {
    await limpiarBase();
    rmSync(DIR_EVIDENCIAS, { recursive: true, force: true });
    territorio = await crearTerritorio();
    sesion = await crearSesion();
});

describe('recepción de reportes con PostGIS', () => {
    it('asigna la manzana por ubicación y deja el reporte PENDIENTE con la manzana en AMARILLO', async () => {
        const respuesta = await enviarReporte(sesion.token, { ...puntoDe('capital-11'), confianzaIa: 0.9 });

        expect(respuesta.status).toBe(201);
        expect(respuesta.body.data.estado).toBe('PENDIENTE');
        expect(respuesta.body.data.manzana).toMatchObject({ id: territorio.manzanas['capital-11'], estado: 'AMARILLO' });

        const evidencias = await prisma.evidencia.findMany({ where: { reporteId: respuesta.body.data.id } });
        expect(evidencias).toHaveLength(1);
        expect(existsSync(path.join(DIR_EVIDENCIAS, evidencias[0]!.rutaAlmacenamiento))).toBe(true);
    });

    it('la confianza que informa el dispositivo no valida nada: la manzana solo pasa a ROJO cuando valida una persona', async () => {
        const respuesta = await enviarReporte(sesion.token, { ...puntoDe('capital-11'), confianzaIa: 1 });
        expect(respuesta.body.data.estado).toBe('PENDIENTE');
        expect(respuesta.body.data.manzana.estado).toBe('AMARILLO');

        const validacion = await cambiarEstado(respuesta.body.data.id, 'VALIDADO');

        expect(validacion.status).toBe(200);
        const manzana = await prisma.manzana.findUniqueOrThrow({ where: { id: territorio.manzanas['capital-11']! } });
        expect(manzana.estado).toBe('ROJO');
        const historial = await prisma.historialEstadoManzana.findMany({ where: { manzanaId: manzana.id }, orderBy: { id: 'asc' } });
        expect(historial.map((cambio) => cambio.estadoNuevo)).toEqual(['AMARILLO', 'ROJO']);
    });

    it('guarda la ubicación exacta en la columna geography', async () => {
        const punto = puntoDe('clorinda-02');
        const respuesta = await enviarReporte(sesion.token, punto);

        const [fila] = await prisma.$queryRaw<{ latitud: number; longitud: number }[]>`
            SELECT ST_Y("ubicacion"::geometry) AS "latitud", ST_X("ubicacion"::geometry) AS "longitud"
            FROM "reporte" WHERE "id" = ${respuesta.body.data.id}::uuid`;
        expect(fila!.latitud).toBeCloseTo(punto.latitud, 6);
        expect(fila!.longitud).toBeCloseTo(punto.longitud, 6);
    });

    it('acepta un reporte fuera de toda manzana sin asignarle ninguna', async () => {
        const respuesta = await enviarReporte(sesion.token, { latitud: -26.0, longitud: -58.0 });

        expect(respuesta.status).toBe(201);
        expect(respuesta.body.data.manzana).toBeNull();
    });

    it('elimina los metadatos EXIF de la foto', async () => {
        const conExif = await sharp(await imagenUnica())
            .withMetadata({ exif: { IFD0: { Copyright: 'ubicacion-del-vecino' } } })
            .jpeg()
            .toBuffer();
        expect((await sharp(conExif).metadata()).exif).toBeDefined();

        const respuesta = await enviarReporte(sesion.token, puntoDe('capital-00'), [conExif]);
        const evidencia = await prisma.evidencia.findFirstOrThrow({ where: { reporteId: respuesta.body.data.id } });
        const guardada = await sharp(path.join(DIR_EVIDENCIAS, evidencia.rutaAlmacenamiento)).metadata();

        expect(guardada.exif).toBeUndefined();
    });

    it('al validar una limpieza se resuelve el criadero indicado y la manzana pasa a VERDE', async () => {
        const criadero = await enviarReporte(sesion.token, { ...puntoDe('capital-22'), confianzaIa: 0.8 });
        await cambiarEstado(criadero.body.data.id, 'VALIDADO');
        const limpieza = await enviarReporte(sesion.token, {
            ...puntoDe('capital-22'),
            tipo: 'LIMPIEZA',
            confianzaIa: 0.9,
            reporteResueltoId: criadero.body.data.id,
        });

        // Mientras nadie valide la limpieza, el criadero sigue abierto y la manzana en ROJO.
        expect(limpieza.status).toBe(201);
        expect(limpieza.body.data.manzana.estado).toBe('ROJO');

        const validacion = await cambiarEstado(limpieza.body.data.id, 'VALIDADO');

        expect(validacion.status).toBe(200);
        const cerrado = await prisma.reporte.findUniqueOrThrow({ where: { id: criadero.body.data.id } });
        expect(cerrado.estado).toBe('RESUELTO');
        const manzana = await prisma.manzana.findUniqueOrThrow({ where: { id: territorio.manzanas['capital-22']! } });
        expect(manzana.estado).toBe('VERDE');
    });

    it('validar una limpieza no reabre un criadero que el equipo ya rechazó', async () => {
        const criadero = await enviarReporte(sesion.token, puntoDe('capital-22'));
        const limpieza = await enviarReporte(sesion.token, {
            ...puntoDe('capital-22'),
            tipo: 'LIMPIEZA',
            reporteResueltoId: criadero.body.data.id,
        });
        await cambiarEstado(criadero.body.data.id, 'RECHAZADO', 'La foto no muestra agua');

        await cambiarEstado(limpieza.body.data.id, 'VALIDADO');

        const rechazado = await prisma.reporte.findUniqueOrThrow({ where: { id: criadero.body.data.id } });
        expect(rechazado.estado).toBe('RECHAZADO');
    });

    it('no permite resolver el criadero de otra sesión', async () => {
        const otraSesion = await crearSesion();
        const criadero = await enviarReporte(otraSesion.token, { ...puntoDe('capital-01'), confianzaIa: 0.8 });

        const limpieza = await enviarReporte(sesion.token, {
            ...puntoDe('capital-01'),
            tipo: 'LIMPIEZA',
            confianzaIa: 0.9,
            reporteResueltoId: criadero.body.data.id,
        });

        expect(limpieza.status).toBe(422);
        const intacto = await prisma.reporte.findUniqueOrThrow({ where: { id: criadero.body.data.id } });
        expect(intacto.estado).toBe('PENDIENTE');
    });
});

describe('protección de memoria', () => {
    it('rechaza sin decodificar una imagen chica en bytes pero de 30 megapíxeles', async () => {
        const bomba = await sharp({ create: { width: 6000, height: 5000, channels: 3, background: '#00aa00' } }).png().toBuffer();
        expect(bomba.length).toBeLessThan(1024 * 1024);

        const respuesta = await request(app)
            .post('/api/reportes')
            .set('Authorization', `Bearer ${sesion.token}`)
            .field('idCliente', crypto.randomUUID())
            .field('tipo', 'CRIADERO')
            .field('latitud', String(puntoDe('capital-00').latitud))
            .field('longitud', String(puntoDe('capital-00').longitud))
            .field('capturadoEn', new Date().toISOString())
            .attach('imagenes', bomba, { filename: 'bomba.png', contentType: 'image/png' });

        expect(respuesta.status).toBe(413);
        expect(await prisma.reporte.count()).toBe(0);
    });
});

describe('idempotencia del Background Sync', () => {
    it('un reintento con el mismo idCliente devuelve el mismo reporte sin duplicar nada', async () => {
        const idCliente = crypto.randomUUID();
        const imagen = await imagenUnica();

        const primero = await enviarReporte(sesion.token, { ...puntoDe('capital-10'), idCliente }, [imagen]);
        const reintento = await enviarReporte(sesion.token, { ...puntoDe('capital-10'), idCliente }, [imagen]);

        expect(primero.status).toBe(201);
        expect(reintento.status).toBe(200);
        expect(reintento.body.data.id).toBe(primero.body.data.id);
        expect(await prisma.reporte.count()).toBe(1);
        expect(contarArchivos()).toBe(1);
    });

    it('dos reintentos simultáneos crean un solo reporte y no dejan archivos huérfanos', async () => {
        const idCliente = crypto.randomUUID();
        const imagen = await imagenUnica();

        const respuestas = await Promise.all(
            Array.from({ length: 4 }, () => enviarReporte(sesion.token, { ...puntoDe('capital-12'), idCliente }, [imagen])),
        );

        const estados = respuestas.map((respuesta) => respuesta.status).sort();
        expect(estados).toEqual([200, 200, 200, 201]);
        expect(new Set(respuestas.map((respuesta) => respuesta.body.data.id)).size).toBe(1);
        expect(await prisma.reporte.count()).toBe(1);
        expect(await prisma.evidencia.count()).toBe(1);
        expect(contarArchivos()).toBe(1);
    });

    it('rechaza reutilizar la misma foto en un reporte distinto', async () => {
        const imagen = await imagenUnica();
        await enviarReporte(sesion.token, puntoDe('capital-20'), [imagen]);

        const copia = await enviarReporte(sesion.token, puntoDe('capital-21'), [imagen]);

        expect(copia.status).toBe(409);
        expect(await prisma.reporte.count()).toBe(1);
        expect(contarArchivos()).toBe(1);
    });

    it('lista los reportes de la sesión para conciliar la cola offline', async () => {
        await enviarReporte(sesion.token, puntoDe('capital-00'));
        await enviarReporte(sesion.token, puntoDe('capital-01'));
        const otraSesion = await crearSesion();
        await enviarReporte(otraSesion.token, puntoDe('capital-02'));

        const respuesta = await request(app).get('/api/reportes/mios').set('Authorization', `Bearer ${sesion.token}`);

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data).toHaveLength(2);
    });
});

describe('mapa comunitario', () => {
    it('devuelve el GeoJSON de las manzanas del recuadro con su color', async () => {
        await enviarReporte(sesion.token, { ...puntoDe('capital-11'), confianzaIa: 0.9 });

        const respuesta = await request(app).get('/api/manzanas').query({
            longitudMinima: -58.181, latitudMinima: -26.191, longitudMaxima: -58.176, latitudMaxima: -26.186,
        });

        expect(respuesta.status).toBe(200);
        const features = respuesta.body.data.features;
        expect(features).toHaveLength(9);
        expect(features.find((feature: { id: number }) => feature.id === territorio.manzanas['capital-11']).properties.estado).toBe('AMARILLO');
        expect(features[0].geometry.type).toBe('Polygon');
    });
});
