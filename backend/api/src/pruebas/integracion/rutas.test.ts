import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { generarRutaService } from '../../services/ruta.services.js';
import { app, crearTerritorio, crearUsuario, limpiarBase, prisma, type Territorio } from './ayudantes.js';

let territorio: Territorio;
const hoy = () => new Date().toISOString().slice(0, 10);

beforeEach(async () => {
    await limpiarBase();
    territorio = await crearTerritorio();
    // Capital: 3 manzanas en ROJO y 3 en AMARILLO.
    const capital = Object.entries(territorio.manzanas).filter(([codigo]) => codigo.startsWith('capital'));
    await prisma.manzana.updateMany({ where: { id: { in: capital.slice(0, 3).map(([, id]) => id) } }, data: { estado: 'ROJO' } });
    await prisma.manzana.updateMany({ where: { id: { in: capital.slice(3, 6).map(([, id]) => id) } }, data: { estado: 'AMARILLO' } });
});

const generar = (token: string, maxParadas: number) => request(app)
    .post('/api/institucional/rutas')
    .set('Authorization', `Bearer ${token}`)
    .send({ fecha: hoy(), maxParadas });

describe('rutas de brigada', () => {
    it('prioriza las manzanas en ROJO', async () => {
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital);

        const respuesta = await generar(coordinador.token, 3);

        expect(respuesta.status).toBe(201);
        expect(respuesta.body.data.paradas.map((parada: { manzana: { estado: string } }) => parada.manzana.estado))
            .toEqual(['ROJO', 'ROJO', 'ROJO']);
    });

    it('dos coordinadores que generan a la vez no se asignan las mismas manzanas', async () => {
        const primero = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital);
        const segundo = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital);
        const comoUsuario = (usuario: typeof primero) => ({ id: usuario.id, rol: usuario.rol, localidadId: usuario.localidadId });

        const rutas = await Promise.all([primero, segundo].map((usuario) =>
            generarRutaService(comoUsuario(usuario), { fecha: hoy(), maxParadas: 4 })));

        const asignadas = rutas.flatMap((ruta) => ruta.paradas.map((parada) => parada.manzana.id));
        expect(asignadas).toHaveLength(6);
        expect(new Set(asignadas).size).toBe(6);
    });

    it('la generación espera a que termine otra generación de la misma localidad y fecha', async () => {
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital);
        const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

        // Simula otra generación en curso tomando el mismo bloqueo que usa el servicio.
        let liberar!: () => void;
        const otraGeneracion = prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ruta:${territorio.localidades.capital}:${hoy()}`}))`;
            await new Promise<void>((resolver) => { liberar = resolver; });
        }, { timeout: 20_000 });
        await esperar(200);

        let terminada = false;
        const generacion = generarRutaService(
            { id: coordinador.id, rol: coordinador.rol, localidadId: coordinador.localidadId },
            { fecha: hoy(), maxParadas: 2 },
        ).then((ruta) => { terminada = true; return ruta; });

        await esperar(700);
        expect(terminada).toBe(false);

        liberar();
        await otraGeneracion;
        expect((await generacion).paradas).toHaveLength(2);
    });

    it('el brigadista registra una intervención en una parada y queda visitada', async () => {
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital);
        const brigadista = await crearUsuario('BRIGADISTA', territorio.localidades.capital);
        const ruta = (await request(app).post('/api/institucional/rutas').set('Authorization', `Bearer ${coordinador.token}`)
            .send({ fecha: hoy(), maxParadas: 2, brigadistaId: brigadista.id })).body.data;
        const parada = ruta.paradas[0];

        await request(app).patch(`/api/institucional/rutas/${ruta.id}/estado`)
            .set('Authorization', `Bearer ${brigadista.token}`).send({ estado: 'EN_CURSO' }).expect(200);
        const intervencion = await request(app).post('/api/institucional/intervenciones')
            .set('Authorization', `Bearer ${brigadista.token}`)
            .send({ tipo: 'DESCACHARRADO', manzanaId: parada.manzana.id, paradaRutaId: parada.id, realizadaEn: new Date().toISOString() });

        expect(intervencion.status).toBe(201);
        const listado = await request(app).get('/api/institucional/rutas').set('Authorization', `Bearer ${brigadista.token}`);
        expect(listado.body.data[0]).toMatchObject({ paradasTotales: 2, paradasVisitadas: 1 });
    });
});
