import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import {
    app,
    crearSesion,
    crearTerritorio,
    crearUsuario,
    enviarReporte,
    limpiarBase,
    prisma,
    enManzana,
    type Territorio,
} from './ayudantes.js';

let territorio: Territorio;
let reporteCapital: string;
let reporteClorinda: string;

beforeEach(async () => {
    await limpiarBase();
    territorio = await crearTerritorio();
    const sesion = await crearSesion();
    reporteCapital = (await enviarReporte(sesion.token, { ...enManzana('capital-11'), confianzaIa: 0.3 })).body.data.id;
    reporteClorinda = (await enviarReporte(sesion.token, { ...enManzana('clorinda-11'), confianzaIa: 0.3 })).body.data.id;
});

const conToken = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('alcance territorial con datos reales', () => {
    it('un coordinador de Clorinda solo lista los reportes de Clorinda', async () => {
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.clorinda);

        const respuesta = await request(app).get('/api/institucional/reportes').set(conToken(coordinador.token));

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.map((reporte: { id: string }) => reporte.id)).toEqual([reporteClorinda]);
    });

    it('un rol provincial ve toda la provincia', async () => {
        const epidemiologo = await crearUsuario('EPIDEMIOLOGO');

        const respuesta = await request(app).get('/api/institucional/reportes').set(conToken(epidemiologo.token));

        expect(respuesta.body.data).toHaveLength(2);
    });

    it('el detalle de otra localidad responde 404', async () => {
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.clorinda);

        const detalle = await request(app).get(`/api/institucional/reportes/${reporteCapital}`).set(conToken(coordinador.token));

        expect(detalle.status).toBe(404);
    });
});

describe('privacidad: solo Epidemiología ve fotos y valida', () => {
    it('la foto se descarga como JPEG para Epidemiología y queda en la auditoría', async () => {
        const epidemiologo = await crearUsuario('EPIDEMIOLOGO');
        const evidencia = await prisma.evidencia.findFirstOrThrow({ where: { reporteId: reporteCapital } });

        const foto = await request(app).get(`/api/institucional/evidencias/${evidencia.id}/imagen`).set(conToken(epidemiologo.token));

        expect(foto.status).toBe(200);
        expect(foto.headers['content-type']).toContain('image/jpeg');
        expect(foto.body.subarray(0, 2).toString('hex')).toBe('ffd8');
        const registro = await prisma.auditoriaAcceso.findFirstOrThrow({ where: { accion: 'VER_EVIDENCIA' } });
        expect(registro).toMatchObject({ usuarioId: epidemiologo.id, recurso: `evidencia:${evidencia.id}` });
    });

    it('ni la administración, ni la coordinación, ni las brigadas, ni la auditoría ven fotos ni validan', async () => {
        const evidencia = await prisma.evidencia.findFirstOrThrow({ where: { reporteId: reporteCapital } });
        const usuarios = [
            await crearUsuario('ADMINISTRADOR'),
            await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital),
            await crearUsuario('BRIGADISTA', territorio.localidades.capital),
            await crearUsuario('AUDITOR'),
        ];

        for (const usuario of usuarios) {
            const foto = await request(app).get(`/api/institucional/evidencias/${evidencia.id}/imagen`).set(conToken(usuario.token));
            const detalle = await request(app).get(`/api/institucional/reportes/${reporteCapital}`).set(conToken(usuario.token));
            const cambio = await request(app)
                .patch(`/api/institucional/reportes/${reporteCapital}/estado`)
                .set(conToken(usuario.token))
                .send({ estado: 'VALIDADO' });

            expect(foto.status).toBe(403);
            expect(cambio.status).toBe(403);
            // El detalle sí lo ven, pero sin fotos ni ubicación.
            expect(detalle.body.data.evidencias).toEqual([]);
            expect(detalle.body.data).not.toHaveProperty('ubicacion');
        }
        expect((await prisma.reporte.findUniqueOrThrow({ where: { id: reporteCapital } })).estado).toBe('PENDIENTE');
    });

    it('el detalle informa cuándo vence un reporte pendiente', async () => {
        const epidemiologo = await crearUsuario('EPIDEMIOLOGO');

        const detalle = await request(app).get(`/api/institucional/reportes/${reporteCapital}`).set(conToken(epidemiologo.token));

        const creado = new Date(detalle.body.data.createdAt).getTime();
        expect(new Date(detalle.body.data.venceEn).getTime() - creado).toBe(72 * 3600_000);
        expect(detalle.body.data.evidencias).toHaveLength(1);
    });
});

describe('cambios de estado', () => {
    it('validar un reporte pendiente recalcula la manzana y deja historial con el usuario', async () => {
        const epidemiologo = await crearUsuario('EPIDEMIOLOGO');

        const respuesta = await request(app)
            .patch(`/api/institucional/reportes/${reporteCapital}/estado`)
            .set(conToken(epidemiologo.token))
            .send({ estado: 'VALIDADO' });

        expect(respuesta.status).toBe(200);
        const manzana = await prisma.manzana.findUniqueOrThrow({ where: { id: territorio.manzanas['capital-11']! } });
        expect(manzana.estado).toBe('ROJO');
        const ultimoCambio = await prisma.historialEstadoManzana.findFirstOrThrow({
            where: { manzanaId: manzana.id },
            orderBy: { id: 'desc' },
        });
        expect(ultimoCambio).toMatchObject({ estadoAnterior: 'AMARILLO', estadoNuevo: 'ROJO', usuarioId: epidemiologo.id });
    });

    it('dos personas que validan a la vez: una gana y la otra recibe 409', async () => {
        const primero = await crearUsuario('EPIDEMIOLOGO');
        const segundo = await crearUsuario('EPIDEMIOLOGO');

        const respuestas = await Promise.all([primero, segundo].map((usuario) =>
            request(app)
                .patch(`/api/institucional/reportes/${reporteCapital}/estado`)
                .set(conToken(usuario.token))
                .send({ estado: 'VALIDADO' })));

        expect(respuestas.map((respuesta) => respuesta.status).sort()).toEqual([200, 409]);
        const cambios = await prisma.historialEstadoManzana.count({ where: { reporteId: reporteCapital, estadoNuevo: 'ROJO' } });
        expect(cambios).toBe(1);
    });
});

describe('autenticación con la base real', () => {
    const iniciarSesion = (email: string, password: string) =>
        request(app).post('/api/auth/login').send({ email, password });

    const cookieDe = (respuesta: request.Response): string => {
        const encabezado = respuesta.headers['set-cookie'] as unknown as string[];
        return encabezado.find((cookie) => cookie.startsWith('rcf_refresco='))!.split(';')[0]!;
    };

    it('el login entrega un token que funciona y una cookie httpOnly', async () => {
        const administrador = await crearUsuario('ADMINISTRADOR');

        const login = await iniciarSesion(administrador.email, administrador.password);

        expect(login.status).toBe(200);
        expect(login.body.data.usuario.password).toBeUndefined();
        const cookie = (login.headers['set-cookie'] as unknown as string[])[0]!;
        expect(cookie).toMatch(/HttpOnly/i);
        expect(cookie).toMatch(/SameSite=Strict/i);

        const listado = await request(app).get('/api/institucional/usuarios').set(conToken(login.body.data.token));
        expect(listado.status).toBe(200);
    });

    it('reutilizar un token de refresco ya usado revoca todas las sesiones del usuario', async () => {
        const administrador = await crearUsuario('ADMINISTRADOR');
        const login = await iniciarSesion(administrador.email, administrador.password);
        const cookieOriginal = cookieDe(login);

        const renovacion = await request(app).post('/api/auth/refrescar').set('Cookie', cookieOriginal);
        expect(renovacion.status).toBe(200);
        const cookieNueva = cookieDe(renovacion);

        const robo = await request(app).post('/api/auth/refrescar').set('Cookie', cookieOriginal);
        expect(robo.status).toBe(401);

        const legitimo = await request(app).post('/api/auth/refrescar').set('Cookie', cookieNueva);
        expect(legitimo.status).toBe(401);
        expect(await prisma.tokenRefresco.count({ where: { usuarioId: administrador.id, revocadoEn: null } })).toBe(0);
    });

    it('desactivar un usuario invalida su token al instante y revoca sus sesiones', async () => {
        const administrador = await crearUsuario('ADMINISTRADOR');
        const brigadista = await crearUsuario('BRIGADISTA', territorio.localidades.capital);
        await iniciarSesion(brigadista.email, brigadista.password);

        const baja = await request(app)
            .patch(`/api/institucional/usuarios/${brigadista.id}`)
            .set(conToken(administrador.token))
            .send({ activo: false });
        expect(baja.status).toBe(200);

        const intento = await request(app).get('/api/institucional/reportes').set(conToken(brigadista.token));
        expect(intento.status).toBe(401);
        expect(await prisma.tokenRefresco.count({ where: { usuarioId: brigadista.id, revocadoEn: null } })).toBe(0);
        expect(await prisma.auditoriaAcceso.count({ where: { accion: 'ACTUALIZAR_USUARIO' } })).toBe(1);
    });

    it('los intentos fallidos bloquean esa cuenta, pero no a otras cuentas desde la misma IP', async () => {
        const atacada = await crearUsuario('EPIDEMIOLOGO');
        const colega = await crearUsuario('EPIDEMIOLOGO');

        const intentos = [];
        for (let i = 0; i < 11; i++) intentos.push((await iniciarSesion(atacada.email, 'ClaveIncorrecta99')).status);

        expect(intentos.slice(0, 10).every((estado) => estado === 401)).toBe(true);
        expect(intentos[10]).toBe(429);
        expect((await iniciarSesion(atacada.email, atacada.password)).status).toBe(429);
        expect((await iniciarSesion(colega.email, colega.password)).status).toBe(200);
    });

    it('un email inexistente y una contraseña incorrecta responden igual', async () => {
        const administrador = await crearUsuario('ADMINISTRADOR');

        const inexistente = await iniciarSesion('nadie@pruebas.local', 'ClaveDePrueba123');
        const incorrecta = await iniciarSesion(administrador.email, 'OtraClave12345');

        expect([inexistente.status, incorrecta.status]).toEqual([401, 401]);
        expect(inexistente.body).toEqual(incorrecta.body);
    });
});

describe('datos para el panel', () => {
    it('/auth/yo devuelve la localidad y los permisos del rol, sin la contraseña', async () => {
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.clorinda);

        const respuesta = await request(app).get('/api/auth/yo').set(conToken(coordinador.token));

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.localidad).toMatchObject({ id: territorio.localidades.clorinda });
        expect(respuesta.body.data.permisos).toContain('rutas:gestionar');
        expect(respuesta.body.data.permisos).not.toContain('usuarios:gestionar');
        expect(respuesta.body.data).not.toHaveProperty('password');
    });

    it('un coordinador solo ve los brigadistas activos de su localidad', async () => {
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.clorinda);
        const propio = await crearUsuario('BRIGADISTA', territorio.localidades.clorinda);
        await crearUsuario('BRIGADISTA', territorio.localidades.capital);
        const inactivo = await crearUsuario('BRIGADISTA', territorio.localidades.clorinda);
        await prisma.usuario.update({ where: { id: inactivo.id }, data: { activo: false } });

        const respuesta = await request(app).get('/api/institucional/brigadistas').set(conToken(coordinador.token));
        const otraLocalidad = await request(app)
            .get(`/api/institucional/brigadistas?localidadId=${territorio.localidades.capital}`)
            .set(conToken(coordinador.token));

        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data.map((usuario: { id: number }) => usuario.id)).toEqual([propio.id]);
        expect(respuesta.body.data[0]).not.toHaveProperty('email');
        expect(otraLocalidad.status).toBe(403);
    });

    it('un brigadista no puede listar brigadistas', async () => {
        const brigadista = await crearUsuario('BRIGADISTA', territorio.localidades.clorinda);

        const respuesta = await request(app).get('/api/institucional/brigadistas').set(conToken(brigadista.token));

        expect(respuesta.status).toBe(403);
    });
});
