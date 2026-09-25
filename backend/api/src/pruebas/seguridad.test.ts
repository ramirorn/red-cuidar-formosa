import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Se reemplaza el cliente de base de datos: estas pruebas verifican la capa HTTP
// (autenticación, autorización y validación) sin depender de PostgreSQL.
const bd = vi.hoisted(() => ({
    usuario: { findUnique: vi.fn() },
    sesionAnonima: { findUnique: vi.fn(), update: vi.fn() },
    reporte: { findUnique: vi.fn(), findMany: vi.fn() },
    evidencia: { findFirst: vi.fn() },
    manzana: { findUnique: vi.fn() },
}));

vi.mock('../config/prisma.js', () => ({ default: bd }));

const { default: app } = await import('../app.js');

const SECRETO = process.env.JWT_SECRET as string;
const SECRETO_SESIONES = process.env.JWT_SECRET_SESIONES as string;

const tokenInstitucional = (id: number, secreto = SECRETO) => jwt.sign({}, secreto, {
    subject: String(id), issuer: 'red-cuidar-formosa', audience: 'institucional', expiresIn: '5m',
});

const tokenSesion = (id: string) => jwt.sign({}, SECRETO_SESIONES, {
    subject: id, issuer: 'red-cuidar-formosa', audience: 'ciudadania', expiresIn: '5m',
});

const usuarioActivo = (rol: string, localidadId: number | null) => ({ id: 7, rol, localidadId, activo: true, eliminadoEn: null });

beforeEach(() => {
    vi.clearAllMocks();
});

describe('blindaje de la API institucional', () => {
    it('rechaza peticiones sin token', async () => {
        const respuesta = await request(app).get('/api/institucional/reportes');
        expect(respuesta.status).toBe(401);
        expect(respuesta.body.status).toBe('error');
    });

    it('rechaza un token de sesión ciudadana', async () => {
        const respuesta = await request(app)
            .get('/api/institucional/reportes')
            .set('Authorization', `Bearer ${tokenSesion('4b1f6f3e-9a55-4c1e-8c0b-2b1c1e2f3a4b')}`);
        expect(respuesta.status).toBe(401);
    });

    it('rechaza un token firmado con otro secreto', async () => {
        const respuesta = await request(app)
            .get('/api/institucional/reportes')
            .set('Authorization', `Bearer ${tokenInstitucional(7, 'otro-secreto-cualquiera-de-32-caracteres!!')}`);
        expect(respuesta.status).toBe(401);
    });

    it('rechaza un token sin firma (alg none)', async () => {
        const sinFirma = jwt.sign({ sub: '7', iss: 'red-cuidar-formosa', aud: 'institucional' }, '', { algorithm: 'none' });
        const respuesta = await request(app).get('/api/institucional/reportes').set('Authorization', `Bearer ${sinFirma}`);
        expect(respuesta.status).toBe(401);
    });

    it('rechaza a un usuario desactivado aunque su token siga vigente', async () => {
        bd.usuario.findUnique.mockResolvedValue({ ...usuarioActivo('ADMINISTRADOR', null), activo: false });
        const respuesta = await request(app)
            .get('/api/institucional/reportes')
            .set('Authorization', `Bearer ${tokenInstitucional(7)}`);
        expect(respuesta.status).toBe(401);
    });

    it('impide a un BRIGADISTA exportar datos', async () => {
        bd.usuario.findUnique.mockResolvedValue(usuarioActivo('BRIGADISTA', 2));
        const respuesta = await request(app)
            .get('/api/institucional/exportaciones/reportes')
            .set('Authorization', `Bearer ${tokenInstitucional(7)}`);
        expect(respuesta.status).toBe(403);
    });

    it('impide a un rol local consultar otra localidad', async () => {
        bd.usuario.findUnique.mockResolvedValue(usuarioActivo('COORDINADOR_BRIGADA', 2));
        const respuesta = await request(app)
            .get('/api/institucional/reportes?localidadId=1')
            .set('Authorization', `Bearer ${tokenInstitucional(7)}`);
        expect(respuesta.status).toBe(403);
        expect(bd.reporte.findMany).not.toHaveBeenCalled();
    });

    it('protege las rutas internas con la clave de servicio', async () => {
        const sinClave = await request(app).post('/api/interno/manzanas/recalcular');
        const claveErronea = await request(app).post('/api/interno/manzanas/recalcular').set('x-clave-servicio', 'incorrecta');
        expect(sinClave.status).toBe(401);
        expect(claveErronea.status).toBe(401);
    });
});

describe('recepción de evidencia', () => {
    const sesionId = '4b1f6f3e-9a55-4c1e-8c0b-2b1c1e2f3a4b';
    const camposValidos = {
        idCliente: '0e6a5f4b-3d2c-4b1a-8f9e-7d6c5b4a3f2e',
        tipo: 'CRIADERO',
        manzanaId: '12',
        capturadoEn: new Date().toISOString(),
    };

    const enviar = (campos: Record<string, string>, archivo?: { contenido: Buffer; tipo: string }) => {
        let peticion = request(app).post('/api/reportes').set('Authorization', `Bearer ${tokenSesion(sesionId)}`);
        for (const [campo, valor] of Object.entries(campos)) peticion = peticion.field(campo, valor);
        if (archivo) peticion = peticion.attach('imagenes', archivo.contenido, { filename: 'foto.jpg', contentType: archivo.tipo });
        return peticion;
    };

    beforeEach(() => {
        bd.sesionAnonima.findUnique.mockResolvedValue({ id: sesionId });
        bd.reporte.findUnique.mockResolvedValue(null);
        bd.manzana.findUnique.mockResolvedValue({ id: 12 });
    });

    it('exige una sesión anónima', async () => {
        const respuesta = await request(app).post('/api/reportes');
        expect(respuesta.status).toBe(401);
    });

    it('exige la manzana: el reporte nunca lleva coordenadas', async () => {
        const { manzanaId, ...sinManzana } = camposValidos;
        const respuesta = await enviar({ ...sinManzana, latitud: '-26.18', longitud: '-58.17' });
        expect(manzanaId).toBeDefined();
        expect(respuesta.status).toBe(400);
        expect(respuesta.body.errors.map((error: { campo: string }) => error.campo)).toContain('manzanaId');
    });

    it('rechaza detecciones con estructura inválida', async () => {
        const respuesta = await enviar({ ...camposValidos, detecciones: '[{"clase":"PERRO","confianza":2}]' });
        expect(respuesta.status).toBe(400);
    });

    it('rechaza un archivo que no es imagen aunque declare image/jpeg', async () => {
        const respuesta = await enviar(camposValidos, { contenido: Buffer.from('MZ\x90\x00 ejecutable'), tipo: 'image/jpeg' });
        expect(respuesta.status).toBe(415);
    });

    it('rechaza tipos de archivo no permitidos', async () => {
        const respuesta = await enviar(camposValidos, { contenido: Buffer.from('%PDF-1.4'), tipo: 'application/pdf' });
        expect(respuesta.status).toBe(400);
    });

    it('rechaza imágenes de más de 5 MB', async () => {
        const respuesta = await enviar(camposValidos, { contenido: Buffer.alloc(5 * 1024 * 1024 + 1), tipo: 'image/jpeg' });
        expect(respuesta.status).toBe(413);
    });
});

describe('paginación', () => {
    it('rechaza un cursor manipulado con 400 sin consultar la base', async () => {
        bd.usuario.findUnique.mockResolvedValue(usuarioActivo('ADMINISTRADOR', null));
        const cursor = Buffer.from("' OR 1=1 --").toString('base64url');
        const respuesta = await request(app)
            .get(`/api/institucional/reportes?cursor=${cursor}`)
            .set('Authorization', `Bearer ${tokenInstitucional(7)}`);
        expect(respuesta.status).toBe(400);
        expect(bd.reporte.findMany).not.toHaveBeenCalled();
    });
});
