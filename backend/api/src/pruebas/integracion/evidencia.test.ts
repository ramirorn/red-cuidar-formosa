import { existsSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import request from 'supertest';
import sharp from 'sharp';
import { utimesSync, writeFileSync, mkdirSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { descartarReportesVencidosService, limpiarArchivosHuerfanosService } from '../../services/evidencia.services.js';
import {
    app,
    crearSesion,
    crearTerritorio,
    crearUsuario,
    enviarReporte,
    imagenUnica,
    limpiarBase,
    prisma,
    enManzana,
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

describe('recepción de reportes', () => {
    it('guarda la manzana indicada y deja el reporte PENDIENTE con la manzana en AMARILLO', async () => {
        const respuesta = await enviarReporte(sesion.token, { ...enManzana('capital-11'), confianzaIa: 0.9 });

        expect(respuesta.status).toBe(201);
        expect(respuesta.body.data.estado).toBe('PENDIENTE');
        expect(respuesta.body.data.manzana).toMatchObject({ id: territorio.manzanas['capital-11'], estado: 'AMARILLO' });

        const evidencias = await prisma.evidencia.findMany({ where: { reporteId: respuesta.body.data.id } });
        expect(evidencias).toHaveLength(1);
        expect(existsSync(path.join(DIR_EVIDENCIAS, evidencias[0]!.rutaAlmacenamiento!))).toBe(true);
    });

    it('la confianza que informa el dispositivo no valida nada: la manzana solo pasa a ROJO cuando valida una persona', async () => {
        const respuesta = await enviarReporte(sesion.token, { ...enManzana('capital-11'), confianzaIa: 1 });
        expect(respuesta.body.data.estado).toBe('PENDIENTE');
        expect(respuesta.body.data.manzana.estado).toBe('AMARILLO');

        const validacion = await cambiarEstado(respuesta.body.data.id, 'VALIDADO');

        expect(validacion.status).toBe(200);
        const manzana = await prisma.manzana.findUniqueOrThrow({ where: { id: territorio.manzanas['capital-11']! } });
        expect(manzana.estado).toBe('ROJO');
        const historial = await prisma.historialEstadoManzana.findMany({ where: { manzanaId: manzana.id }, orderBy: { id: 'asc' } });
        expect(historial.map((cambio) => cambio.estadoNuevo)).toEqual(['AMARILLO', 'ROJO']);
    });

    it('no guarda ubicación exacta ni la sesión que envió el reporte', async () => {
        const columnas = await prisma.$queryRaw<{ column_name: string }[]>`
            SELECT column_name FROM information_schema.columns WHERE table_name = 'reporte'`;
        const nombres = columnas.map((columna) => columna.column_name);

        expect(nombres).toContain('manzanaId');
        expect(nombres).not.toContain('ubicacion');
        expect(nombres).not.toContain('precisionGpsM');
        expect(nombres).not.toContain('sesionId');
    });

    it('ignora coordenadas si un cliente viejo las manda y exige la manzana', async () => {
        const sinManzana = await enviarReporte(sesion.token, { latitud: -26.19, longitud: -58.18 } as never);
        const manzanaInexistente = await enviarReporte(sesion.token, { manzanaId: 999_999 });

        expect(sinManzana.status).toBe(400);
        expect(manzanaInexistente.status).toBe(422);
        expect(await prisma.reporte.count()).toBe(0);
    });

    it('elimina los metadatos EXIF de la foto', async () => {
        const conExif = await sharp(await imagenUnica())
            .withMetadata({ exif: { IFD0: { Copyright: 'ubicacion-del-vecino' } } })
            .jpeg()
            .toBuffer();
        expect((await sharp(conExif).metadata()).exif).toBeDefined();

        const respuesta = await enviarReporte(sesion.token, enManzana('capital-00'), [conExif]);
        const evidencia = await prisma.evidencia.findFirstOrThrow({ where: { reporteId: respuesta.body.data.id } });
        const guardada = await sharp(path.join(DIR_EVIDENCIAS, evidencia.rutaAlmacenamiento!)).metadata();

        expect(guardada.exif).toBeUndefined();
    });

    it('al validar una limpieza se resuelve el criadero indicado y la manzana pasa a VERDE', async () => {
        const criadero = await enviarReporte(sesion.token, { ...enManzana('capital-22'), confianzaIa: 0.8 });
        await cambiarEstado(criadero.body.data.id, 'VALIDADO');
        const limpieza = await enviarReporte(sesion.token, {
            ...enManzana('capital-22'),
            tipo: 'LIMPIEZA',
            confianzaIa: 0.9,
            idClienteResuelto: criadero.body.data.idCliente,
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
        const criadero = await enviarReporte(sesion.token, enManzana('capital-22'));
        const limpieza = await enviarReporte(sesion.token, {
            ...enManzana('capital-22'),
            tipo: 'LIMPIEZA',
            idClienteResuelto: criadero.body.data.idCliente,
        });
        await cambiarEstado(criadero.body.data.id, 'RECHAZADO', 'La foto no muestra agua');

        await cambiarEstado(limpieza.body.data.id, 'VALIDADO');

        const rechazado = await prisma.reporte.findUniqueOrThrow({ where: { id: criadero.body.data.id } });
        expect(rechazado.estado).toBe('RECHAZADO');
    });

    it('solo cierra un criadero quien conoce su idCliente (el id público no alcanza)', async () => {
        const criadero = await enviarReporte(sesion.token, { ...enManzana('capital-01'), confianzaIa: 0.8 });

        const conIdPublico = await enviarReporte(sesion.token, {
            ...enManzana('capital-01'),
            tipo: 'LIMPIEZA',
            idClienteResuelto: criadero.body.data.id,
        });
        const inventado = await enviarReporte(sesion.token, {
            ...enManzana('capital-01'),
            tipo: 'LIMPIEZA',
            idClienteResuelto: crypto.randomUUID(),
        });

        expect([conIdPublico.status, inventado.status]).toEqual([422, 422]);
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
            .field('manzanaId', String(enManzana('capital-00').manzanaId))
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

        const primero = await enviarReporte(sesion.token, { ...enManzana('capital-10'), idCliente }, [imagen]);
        const reintento = await enviarReporte(sesion.token, { ...enManzana('capital-10'), idCliente }, [imagen]);

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
            Array.from({ length: 4 }, () => enviarReporte(sesion.token, { ...enManzana('capital-12'), idCliente }, [imagen])),
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
        await enviarReporte(sesion.token, enManzana('capital-20'), [imagen]);

        const copia = await enviarReporte(sesion.token, enManzana('capital-21'), [imagen]);

        expect(copia.status).toBe(409);
        expect(await prisma.reporte.count()).toBe(1);
        expect(contarArchivos()).toBe(1);
    });

    it('"mis reportes" se consultan por idCliente: el servidor no sabe cuáles son de la misma persona', async () => {
        const primero = await enviarReporte(sesion.token, enManzana('capital-00'));
        const segundo = await enviarReporte(sesion.token, enManzana('capital-01'));
        await enviarReporte(sesion.token, enManzana('capital-02'));

        const respuesta = await request(app)
            .post('/api/reportes/consulta')
            .set('Authorization', `Bearer ${sesion.token}`)
            .send({ idsCliente: [primero.body.data.idCliente, segundo.body.data.idCliente, crypto.randomUUID()] });

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.map((reporte: { id: string }) => reporte.id).sort())
            .toEqual([primero.body.data.id, segundo.body.data.id].sort());
    });
});

describe('mapa comunitario', () => {
    it('devuelve el GeoJSON de las manzanas del recuadro con su color', async () => {
        await enviarReporte(sesion.token, { ...enManzana('capital-11'), confianzaIa: 0.9 });

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

describe('manzanas de una localidad para el celular', () => {
    it('devuelve todas las manzanas de la localidad pedida y ninguna de otra', async () => {
        const respuesta = await request(app).get(`/api/localidades/${territorio.localidades.capital}/manzanas`);

        expect(respuesta.status).toBe(200);
        const ids = respuesta.body.data.features.map((feature: { id: number }) => feature.id).sort((a: number, b: number) => a - b);
        const esperadas = Object.entries(territorio.manzanas).filter(([codigo]) => codigo.startsWith('capital')).map(([, id]) => id).sort((a, b) => a - b);
        expect(ids).toEqual(esperadas);
        expect(respuesta.headers['cache-control']).toContain('max-age=300');
    });

    it('una localidad inexistente responde 404', async () => {
        expect((await request(app).get('/api/localidades/999999/manzanas')).status).toBe(404);
    });
});

describe('fotos efímeras', () => {
    const epidemiologia = async () => crearUsuario('EPIDEMIOLOGO');

    it('al decidir el reporte se borra la foto (archivo y ruta) y deja de poder pedirse', async () => {
        const reporte = await enviarReporte(sesion.token, enManzana('capital-11'));
        const evidencia = await prisma.evidencia.findFirstOrThrow({ where: { reporteId: reporte.body.data.id } });
        const epidemiologo = await epidemiologia();
        const antes = await request(app).get(`/api/institucional/evidencias/${evidencia.id}/imagen`).set('Authorization', `Bearer ${epidemiologo.token}`);
        expect(antes.status).toBe(200);

        await cambiarEstado(reporte.body.data.id, 'RECHAZADO', 'Foto sin contexto');

        const borrada = await prisma.evidencia.findUniqueOrThrow({ where: { id: evidencia.id } });
        expect(borrada.rutaAlmacenamiento).toBeNull();
        expect(borrada.borradaEn).not.toBeNull();
        expect(contarArchivos()).toBe(0);
        const despues = await request(app).get(`/api/institucional/evidencias/${evidencia.id}/imagen`).set('Authorization', `Bearer ${epidemiologo.token}`);
        expect(despues.status).toBe(404);
    });

    it('la foto borrada igual impide reutilizarla en otro reporte', async () => {
        const imagen = await imagenUnica();
        const reporte = await enviarReporte(sesion.token, enManzana('capital-11'), [imagen]);
        await cambiarEstado(reporte.body.data.id, 'VALIDADO');

        const copia = await enviarReporte(sesion.token, enManzana('capital-12'), [imagen]);

        expect(copia.status).toBe(409);
    });

    it('un reporte que nadie revisó en 72 horas se descarta con su foto y la manzana se recalcula', async () => {
        const viejo = await enviarReporte(sesion.token, enManzana('capital-11'));
        const reciente = await enviarReporte(sesion.token, enManzana('capital-22'));
        await prisma.reporte.update({ where: { id: viejo.body.data.id }, data: { createdAt: new Date(Date.now() - 73 * 3600_000) } });
        expect(contarArchivos()).toBe(2);

        const { descartados } = await descartarReportesVencidosService();

        expect(descartados).toBe(1);
        expect(await prisma.reporte.findUnique({ where: { id: viejo.body.data.id } })).toBeNull();
        expect(await prisma.reporte.findUnique({ where: { id: reciente.body.data.id } })).not.toBeNull();
        expect(contarArchivos()).toBe(1);
        const manzana = await prisma.manzana.findUniqueOrThrow({ where: { id: territorio.manzanas['capital-11']! } });
        expect(manzana.estado).not.toBe('AMARILLO');
    });

    it('borra del disco los archivos sin registro con más de una hora', async () => {
        const reporte = await enviarReporte(sesion.token, enManzana('capital-11'));
        mkdirSync(path.join(DIR_EVIDENCIAS, '2020', '01'), { recursive: true });
        const huerfano = path.join(DIR_EVIDENCIAS, '2020', '01', 'viejo.jpg');
        const reciente = path.join(DIR_EVIDENCIAS, '2020', '01', 'reciente.jpg');
        writeFileSync(huerfano, 'x');
        writeFileSync(reciente, 'x');
        const haceDosHoras = new Date(Date.now() - 2 * 3600_000);
        utimesSync(huerfano, haceDosHoras, haceDosHoras);

        const borrados = await limpiarArchivosHuerfanosService();

        expect(borrados).toBe(1);
        expect(existsSync(huerfano)).toBe(false);
        expect(existsSync(reciente)).toBe(true);
        const evidencia = await prisma.evidencia.findFirstOrThrow({ where: { reporteId: reporte.body.data.id } });
        expect(existsSync(path.join(DIR_EVIDENCIAS, evidencia.rutaAlmacenamiento!))).toBe(true);
    });
});

describe('suscripciones Web Push', () => {
    const suscribir = (endpoint: string) => request(app)
        .post('/api/suscripciones-push')
        .set('Authorization', `Bearer ${sesion.token}`)
        .send({ endpoint, keys: { p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u', auth: 'tBHItJI5svbpez7KI4CCXg' } });

    it('rechaza endpoints que no son de un servicio push', async () => {
        expect((await suscribir('https://192.168.0.10/recibir')).status).toBe(400);
    });

    it('admite hasta 3 dispositivos por sesión y actualizar uno existente', async () => {
        for (const numero of [1, 2, 3]) {
            expect((await suscribir(`https://fcm.googleapis.com/fcm/send/dispositivo-${numero}`)).status).toBe(201);
        }
        expect((await suscribir('https://fcm.googleapis.com/fcm/send/dispositivo-4')).status).toBe(422);
        expect((await suscribir('https://fcm.googleapis.com/fcm/send/dispositivo-2')).status).toBe(201);
        expect(await prisma.suscripcionPush.count()).toBe(3);
    });
});
