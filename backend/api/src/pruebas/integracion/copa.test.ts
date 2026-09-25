import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import type { TipoReporte } from '@prisma/client';
import { calcularRankingService, cierresSemanales, edicionDe, pedirPremioService } from '../../services/copa.services.js';
import { app, crearSesion, crearTerritorio, crearUsuario, limpiarBase, prisma, type Territorio } from './ayudantes.js';

// Edición de agosto de 2026 (hora de Argentina) evaluada en distintos momentos.
const MES = '2026-08';
const EN_AGOSTO = new Date('2026-08-20T15:00:00Z');
const DEFINITIVA = new Date('2026-09-10T15:00:00Z');

let territorio: Territorio;
let zonas: Record<'oeste' | 'medio' | 'este' | 'clorinda', number>;

// Zonas por columna de la grilla 3 x 3 de la capital (3 manzanas cada una) y una en Clorinda.
const crearZona = async (localidadId: number, nombre: string, x1: number, x2: number, y1: number, y2: number) => {
    const [zona] = await prisma.$queryRaw<{ id: number }[]>`
        INSERT INTO "zonaCompetencia" ("localidadId", "barrio", "nombre", "geom", "updatedAt")
        VALUES (${localidadId}, ${nombre}, ${nombre}, ST_Multi(ST_MakeEnvelope(${x1}::float8, ${y1}::float8, ${x2}::float8, ${y2}::float8, 4326)), now())
        RETURNING "id"`;
    await prisma.$executeRaw`
        UPDATE "manzana" m SET "zonaId" = ${zona!.id}
        FROM "zonaCompetencia" z WHERE z."id" = ${zona!.id} AND ST_Contains(z."geom", m."centroide")`;
    return zona!.id;
};

// Reporte ya decidido, cargado directo en la base con su fecha (sin pasar por fotos ni validación).
const reporte = async (codigo: string, tipo: TipoReporte, estado: 'VALIDADO' | 'PENDIENTE' | 'RECHAZADO', creado: string, validado = creado) =>
    prisma.reporte.create({
        data: {
            idCliente: crypto.randomUUID(),
            manzanaId: territorio.manzanas[codigo]!,
            tipo,
            estado,
            capturadoEn: new Date(creado),
            createdAt: new Date(creado),
            ...(estado === 'PENDIENTE' ? {} : { validadoEn: new Date(validado) }),
        },
    });

const rankingDe = async (ahora = DEFINITIVA) => (await calcularRankingService(territorio.localidades.capital, MES, ahora)).zonas;

beforeEach(async () => {
    await limpiarBase();
    territorio = await crearTerritorio();
    zonas = {
        oeste: await crearZona(territorio.localidades.capital, 'Oeste', -58.1805, -58.1795, -26.191, -26.186),
        medio: await crearZona(territorio.localidades.capital, 'Medio', -58.1795, -58.1785, -26.191, -26.186),
        este: await crearZona(territorio.localidades.capital, 'Este', -58.1785, -58.1775, -26.191, -26.186),
        clorinda: await crearZona(territorio.localidades.clorinda, 'Clorinda', -57.73, -57.70, -25.30, -25.28),
    };
});

describe('calendario de la edición', () => {
    it('el mes se cuenta en hora de Argentina y el resultado es definitivo 72 horas después', () => {
        const edicion = edicionDe(MES, DEFINITIVA);
        expect(edicion.inicio.toISOString()).toBe('2026-08-01T03:00:00.000Z');
        expect(edicion.fin.toISOString()).toBe('2026-09-01T03:00:00.000Z');
        expect(edicion.nombre).toBe('Edición Agosto 2026');
        expect(edicion.estado).toBe('definitiva');
        expect(edicionDe(MES, new Date('2026-09-02T12:00:00Z')).estado).toBe('provisoria');
        expect(edicionDe(MES, EN_AGOSTO).estado).toBe('en-curso');
    });

    it('los cierres semanales son los domingos a la medianoche de Argentina', () => {
        const cierres = cierresSemanales(edicionDe(MES), DEFINITIVA).map((cierre) => cierre.toISOString());
        // Agosto de 2026: domingos 2, 9, 16, 23 y 30.
        expect(cierres).toEqual(['2026-08-03T02:59:59.999Z', '2026-08-10T02:59:59.999Z', '2026-08-17T02:59:59.999Z', '2026-08-24T02:59:59.999Z', '2026-08-31T02:59:59.999Z']);
    });
});

describe('puntaje', () => {
    it('solo suma lo validado: limpieza 10, criadero 1; pendientes y rechazados no suman', async () => {
        await reporte('capital-00', 'LIMPIEZA', 'VALIDADO', '2026-08-05T12:00:00Z');
        await reporte('capital-10', 'CRIADERO', 'VALIDADO', '2026-08-06T12:00:00Z');
        await reporte('capital-20', 'LIMPIEZA', 'PENDIENTE', '2026-08-06T12:00:00Z');
        await reporte('capital-20', 'LIMPIEZA', 'RECHAZADO', '2026-08-06T12:00:00Z');
        // Fuera del mes: no cuenta.
        await reporte('capital-00', 'LIMPIEZA', 'VALIDADO', '2026-07-31T12:00:00Z');

        const oeste = (await rankingDe()).find((zona) => zona.id === zonas.oeste)!;

        expect(oeste).toMatchObject({ limpiezas: 1, criaderos: 1, puntos: 11, manzanas: 3 });
        expect(oeste.puntosPorManzana).toBeCloseTo(11 / 3, 2);
    });

    it('cada semana que una manzana cierra en verde suma 3 puntos', async () => {
        const manzanaId = territorio.manzanas['capital-01']!;
        await prisma.historialEstadoManzana.create({ data: { manzanaId, estadoAnterior: 'SIN_DATOS', estadoNuevo: 'VERDE', motivo: 'prueba', createdAt: new Date('2026-08-12T12:00:00Z') } });
        await prisma.historialEstadoManzana.create({ data: { manzanaId, estadoAnterior: 'VERDE', estadoNuevo: 'AMARILLO', motivo: 'lluvia', createdAt: new Date('2026-08-26T12:00:00Z') } });

        const medio = (await rankingDe()).find((zona) => zona.id === zonas.medio)!;

        // En verde al cierre del 16 y del 23; el 30 ya estaba en amarillo.
        expect(medio.semanasVerdes).toBe(2);
        expect(medio.puntos).toBe(6);
    });

    it('rankea por puntos por manzana y, si empatan, gana la que llegó primero', async () => {
        await reporte('capital-00', 'LIMPIEZA', 'VALIDADO', '2026-08-05T12:00:00Z', '2026-08-10T12:00:00Z');
        await reporte('capital-01', 'LIMPIEZA', 'VALIDADO', '2026-08-05T12:00:00Z', '2026-08-07T12:00:00Z');
        await reporte('capital-02', 'CRIADERO', 'VALIDADO', '2026-08-05T12:00:00Z');

        const ranking = await rankingDe();

        expect(ranking.map((zona) => zona.id)).toEqual([zonas.medio, zonas.oeste, zonas.este]);
        expect(ranking.map((zona) => zona.posicion)).toEqual([1, 2, 3]);
    });
});

describe('vista pública', () => {
    it('muestra el podio (solo zonas con puntos) y nunca los últimos puestos', async () => {
        await reporte('capital-00', 'LIMPIEZA', 'VALIDADO', new Date().toISOString());

        const respuesta = await request(app).get('/api/copa').query({ localidadId: territorio.localidades.capital });

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.podio.map((zona: { id: number }) => zona.id)).toEqual([zonas.oeste]);
        expect(respuesta.body.data.totalZonas).toBe(3);
        expect(respuesta.body.data.puntos).toEqual({ LIMPIEZA: 10, SEMANA_VERDE: 3, CRIADERO: 1 });
    });

    it('una zona fuera del podio sabe cuántas limpiezas le faltan; la vista pública no lista su puesto a otros', async () => {
        const ahora = new Date().toISOString();
        // Cuarta zona: la manzana del rincón sureste pasa a "Rincón" (sin puntos).
        const rincon = await crearZona(territorio.localidades.capital, 'Rincón', -58.1785, -58.1775, -26.188, -26.186);
        await reporte('capital-00', 'LIMPIEZA', 'VALIDADO', ahora);
        await reporte('capital-01', 'LIMPIEZA', 'VALIDADO', ahora);
        await reporte('capital-02', 'CRIADERO', 'VALIDADO', ahora);

        const situacion = await request(app).get(`/api/copa/zonas/${rincon}`);
        const podio = await request(app).get('/api/copa').query({ localidadId: territorio.localidades.capital });

        expect(situacion.status).toBe(200);
        expect(situacion.body.data.zona).toMatchObject({ posicion: 4, enPodio: false, puntos: 0 });
        expect(situacion.body.data.totalZonas).toBe(4);
        // El tercero tiene 0,5 puntos por manzana (1 punto en 2 manzanas): con una limpieza lo supera.
        expect(situacion.body.data.faltanLimpiezas).toBe(1);
        expect(podio.body.data.podio.map((zona: { id: number }) => zona.id)).not.toContain(rincon);
    });
});

describe('premio anónimo', () => {
    // Tres zonas con puntos (todas en el podio) y una cuarta en otra localidad.
    const prepararPodio = async () => {
        const ganador = await reporte('capital-00', 'LIMPIEZA', 'VALIDADO', '2026-08-05T12:00:00Z');
        const otro = await reporte('capital-10', 'CRIADERO', 'VALIDADO', '2026-08-06T12:00:00Z');
        await reporte('capital-01', 'CRIADERO', 'VALIDADO', '2026-08-06T12:00:00Z');
        return { ganador, otro };
    };

    it('quien aportó en una zona ganadora recibe un código; pedirlo de nuevo devuelve el mismo', async () => {
        const { ganador, otro } = await prepararPodio();

        const primero = await pedirPremioService(MES, [ganador.idCliente, otro.idCliente], DEFINITIVA);
        const repetido = await pedirPremioService(MES, [ganador.idCliente, otro.idCliente], DEFINITIVA);

        expect(primero!.codigo).toMatch(/^RC-[2-9A-Z]{4}-[2-9A-Z]{4}$/);
        expect(repetido!.codigo).toBe(primero!.codigo);
        expect(primero!.zona.nombre).toBe('Oeste');
        expect(await prisma.canjePremio.count()).toBe(1);
    });

    it('un reporte ya usado no genera un segundo premio', async () => {
        const { ganador, otro } = await prepararPodio();
        const { codigo } = (await pedirPremioService(MES, [ganador.idCliente, otro.idCliente], DEFINITIVA))!;

        // Pedirlo con cada reporte por separado: o se rechaza, o devuelve el mismo premio (nunca uno nuevo).
        for (const idCliente of [ganador.idCliente, otro.idCliente]) {
            const resultado = await pedirPremioService(MES, [idCliente], DEFINITIVA).catch((error: { estado: number }) => error);
            if ('estado' in resultado) expect(resultado.estado).toBe(409);
            else expect(resultado!.codigo).toBe(codigo);
        }
        expect(await prisma.canjePremio.count()).toBe(1);
    });

    it('sin reportes validados en una zona ganadora no hay premio', async () => {
        const pendiente = await reporte('capital-00', 'LIMPIEZA', 'PENDIENTE', '2026-08-05T12:00:00Z');

        expect(await pedirPremioService(MES, [pendiente.idCliente, crypto.randomUUID()], DEFINITIVA)).toBeNull();
    });

    it('no se entregan premios hasta que la edición es definitiva', async () => {
        const { ganador } = await prepararPodio();

        await expect(pedirPremioService(MES, [ganador.idCliente], new Date('2026-09-02T12:00:00Z'))).rejects.toMatchObject({ estado: 409 });
        await expect(pedirPremioService(MES, [ganador.idCliente], new Date('2026-10-05T12:00:00Z'))).rejects.toMatchObject({ estado: 410 });
    });

    it('el canje lo hace Coordinación de su localidad, una sola vez, y queda auditado', async () => {
        const { ganador } = await prepararPodio();
        const { codigo } = (await pedirPremioService(MES, [ganador.idCliente], DEFINITIVA))!;
        await prisma.canjePremio.update({ where: { codigo }, data: { venceEn: new Date(Date.now() + 86_400_000) } });
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital);
        const deClorinda = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.clorinda);
        const brigadista = await crearUsuario('BRIGADISTA', territorio.localidades.capital);
        const canjear = (token: string, texto: string) => request(app).post('/api/institucional/copa/canjes').set('Authorization', `Bearer ${token}`).send({ codigo: texto });

        expect((await canjear(brigadista.token, codigo)).status).toBe(403);
        expect((await canjear(deClorinda.token, codigo)).status).toBe(404);
        // El QR trae un prefijo; también se acepta tipeado en minúsculas y sin guiones.
        const entrega = await canjear(coordinador.token, `REDCUIDAR:${codigo}`);
        const otraVez = await canjear(coordinador.token, codigo.toLowerCase().replaceAll('-', ''));

        expect(entrega.status).toBe(200);
        expect(entrega.body.data.zona.nombre).toBe('Oeste');
        expect(otraVez.status).toBe(409);
        expect(await prisma.auditoriaAcceso.count({ where: { accion: 'CANJEAR_PREMIO' } })).toBe(1);
    });

    it('pedir el premio por la API exige sesión anónima', async () => {
        const sinSesion = await request(app).post('/api/copa/premio').send({ mes: MES, idsCliente: [crypto.randomUUID()] });
        const sesion = await crearSesion();
        const conSesion = await request(app).post('/api/copa/premio').set('Authorization', `Bearer ${sesion.token}`)
            .send({ mes: '2020-01', idsCliente: [crypto.randomUUID()] });

        expect(sinSesion.status).toBe(401);
        // Una edición vieja ya venció.
        expect(conSesion.status).toBe(410);
    });
});

describe('panel institucional', () => {
    it('muestra todas las zonas, incluidas las que no sumaron, y exige localidad a los roles provinciales', async () => {
        const epidemiologo = await crearUsuario('EPIDEMIOLOGO');
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital);

        const sinLocalidad = await request(app).get('/api/institucional/copa').set('Authorization', `Bearer ${epidemiologo.token}`);
        const propio = await request(app).get('/api/institucional/copa').set('Authorization', `Bearer ${coordinador.token}`);

        expect(sinLocalidad.status).toBe(400);
        expect(propio.status).toBe(200);
        expect(propio.body.data.zonas).toHaveLength(3);
        expect(propio.body.data.zonas.every((zona: { premios: object }) => 'premios' in zona)).toBe(true);
    });
});
