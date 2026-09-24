import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { parse } from 'yaml';

// Base simulada: alcanza con que la autenticación pase para llegar al enrutador.
// La prueba solo verifica que cada operación del contrato exista en la API.
vi.mock('../config/prisma.js', () => ({
    default: {
        usuario: { findUnique: async () => ({ id: 1, rol: 'ADMINISTRADOR', localidadId: null, activo: true, eliminadoEn: null }) },
        sesionAnonima: { findUnique: async () => ({ id: '4b1f6f3e-9a55-4c1e-8c0b-2b1c1e2f3a4b' }) },
    },
}));

const { default: app } = await import('../app.js');

const contrato = parse(readFileSync(new URL('../../openapi.yaml', import.meta.url), 'utf8'));
const METODOS = ['get', 'post', 'patch', 'put', 'delete'] as const;
type Metodo = (typeof METODOS)[number];

const opciones = { issuer: 'red-cuidar-formosa', expiresIn: '5m' } as const;
const tokenInstitucional = jwt.sign({}, process.env.JWT_SECRET as string, { ...opciones, subject: '1', audience: 'institucional' });
const tokenSesion = jwt.sign({}, process.env.JWT_SECRET_SESIONES as string, {
    ...opciones, subject: '4b1f6f3e-9a55-4c1e-8c0b-2b1c1e2f3a4b', audience: 'ciudadania',
});

const ejemplos: Record<string, string> = { id: '3f2b8c1e-5d4a-4b7e-9c6f-1a2b3c4d5e6f', paradaId: '1' };

const operaciones = Object.entries(contrato.paths as Record<string, Record<string, unknown>>).flatMap(([ruta, definicion]) =>
    METODOS.filter((metodo) => metodo in definicion).map((metodo) => ({
        metodo,
        ruta,
        url: `/api${ruta.replace(/\{(\w+)\}/g, (_, nombre: string) => ejemplos[nombre] ?? '1')}`,
    })),
);

// Envía las credenciales que corresponden a cada grupo de rutas.
const pedir = (metodo: Metodo, url: string) => {
    const peticion = request(app)[metodo](url);
    if (url.startsWith('/api/institucional')) return peticion.set('Authorization', `Bearer ${tokenInstitucional}`);
    if (url.startsWith('/api/interno')) return peticion.set('x-clave-servicio', process.env.CLAVE_SERVICIO_INTERNO as string);
    return peticion.set('Authorization', `Bearer ${tokenSesion}`);
};

describe('contrato OpenAPI', () => {
    it('documenta al menos las rutas principales', () => {
        expect(operaciones.length).toBeGreaterThan(25);
    });

    it('detecta una ruta inexistente aun con credenciales válidas (control negativo)', async () => {
        const respuesta = await pedir('get', '/api/institucional/ruta-inventada');
        expect(respuesta.status).toBe(404);
        expect(respuesta.body.message).toBe('Ruta no encontrada');
    });

    it.each(operaciones)('$metodo $ruta existe en la API', async ({ metodo, url }) => {
        const respuesta = await pedir(metodo, url);
        expect(respuesta.body?.message).not.toBe('Ruta no encontrada');
    });

    it('publica el contrato fuera de producción', async () => {
        const respuesta = await request(app).get('/api/documentacion/openapi.yaml');
        expect(respuesta.status).toBe(200);
        expect(respuesta.text).toContain('openapi: 3.1.0');
    });
});
