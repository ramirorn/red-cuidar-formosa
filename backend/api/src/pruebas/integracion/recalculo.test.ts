import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { recalcularEstadosService } from '../../services/manzana.services.js';
import { app, crearSesion, crearTerritorio, crearUsuario, enviarReporte, limpiarBase, prisma, puntoDe, type Territorio } from './ayudantes.js';

let territorio: Territorio;
const CLAVE = { 'x-clave-servicio': process.env.CLAVE_SERVICIO_INTERNO as string };

beforeEach(async () => {
    await limpiarBase();
    territorio = await crearTerritorio();
});

// Deja una manzana en VERDE: limpieza enviada hace unas horas y validada por una persona.
const manzanaLimpia = async (codigo: string, horasAtras: number) => {
    const sesion = await crearSesion();
    const epidemiologo = await crearUsuario('EPIDEMIOLOGO');
    const limpieza = await enviarReporte(sesion.token, {
        ...puntoDe(codigo),
        tipo: 'LIMPIEZA',
        capturadoEn: new Date(Date.now() - horasAtras * 60 * 60 * 1000).toISOString(),
    });
    await request(app)
        .patch(`/api/institucional/reportes/${limpieza.body.data.id}/estado`)
        .set('Authorization', `Bearer ${epidemiologo.token}`)
        .send({ estado: 'VALIDADO' })
        .expect(200);
    return territorio.manzanas[codigo]!;
};

const llover = (localidadId: number, milimetros: number) => prisma.registroMeteorologico.create({
    data: { localidadId, observadoEn: new Date(), precipitacionMm: milimetros, fuente: 'pruebas' },
});

describe('recalculo de colores por clima y vencimiento', () => {
    it('una lluvia de 10 mm o más después de la limpieza pasa la manzana de VERDE a AMARILLO', async () => {
        const manzanaId = await manzanaLimpia('capital-00', 5);
        expect((await prisma.manzana.findUniqueOrThrow({ where: { id: manzanaId } })).estado).toBe('VERDE');

        await llover(territorio.localidades.capital, 12);
        const respuesta = await request(app).post('/api/interno/manzanas/recalcular').set(CLAVE).send({});

        expect(respuesta.body.data).toEqual({ revisadas: 1, actualizadas: 1 });
        expect((await prisma.manzana.findUniqueOrThrow({ where: { id: manzanaId } })).estado).toBe('AMARILLO');
    });

    it('la lluvia de otra localidad no afecta', async () => {
        const manzanaId = await manzanaLimpia('capital-00', 5);

        await llover(territorio.localidades.clorinda, 40);
        await request(app).post('/api/interno/manzanas/recalcular').set(CLAVE).send({});

        expect((await prisma.manzana.findUniqueOrThrow({ where: { id: manzanaId } })).estado).toBe('VERDE');
    });

    it('una limpieza de hace más de 7 días ya no deja la manzana en VERDE', async () => {
        const manzanaId = await manzanaLimpia('capital-01', 8 * 24);

        expect((await prisma.manzana.findUniqueOrThrow({ where: { id: manzanaId } })).estado).toBe('AMARILLO');
    });

    it('no pisa un estado que otra transacción cambió mientras el recalculo calculaba', async () => {
        const manzanaId = await manzanaLimpia('capital-02', 5);
        await llover(territorio.localidades.capital, 15);

        // Entre la lectura y la actualización, otra transacción valida un criadero y pasa la manzana a ROJO.
        const transaccionOriginal = prisma.$transaction.bind(prisma);
        const espia = vi.spyOn(prisma, '$transaction').mockImplementationOnce(async (...argumentos: unknown[]) => {
            await prisma.manzana.update({ where: { id: manzanaId }, data: { estado: 'ROJO' } });
            return (transaccionOriginal as (...a: unknown[]) => Promise<unknown>)(...argumentos);
        });

        const resultado = await recalcularEstadosService();
        espia.mockRestore();

        expect(resultado).toEqual({ revisadas: 1, actualizadas: 0 });
        expect((await prisma.manzana.findUniqueOrThrow({ where: { id: manzanaId } })).estado).toBe('ROJO');
        const recalculos = await prisma.historialEstadoManzana.count({
            where: { manzanaId, motivo: { startsWith: 'Recalculo programado' } },
        });
        expect(recalculos).toBe(0);
    });
});
