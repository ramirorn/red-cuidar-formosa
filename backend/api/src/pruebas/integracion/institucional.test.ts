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
    puntoDe,
    type Territorio,
} from './ayudantes.js';

let territorio: Territorio;
let reporteCapital: string;
let reporteClorinda: string;

beforeEach(async () => {
    await limpiarBase();
    territorio = await crearTerritorio();
    const sesion = await crearSesion();
    reporteCapital = (await enviarReporte(sesion.token, { ...puntoDe('capital-11'), confianzaIa: 0.3 })).body.data.id;
    reporteClorinda = (await enviarReporte(sesion.token, { ...puntoDe('clorinda-11'), confianzaIa: 0.3 })).body.data.id;
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

    it('el detalle, la foto y el cambio de estado de otra localidad responden 404', async () => {
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.clorinda);
        const evidencia = await prisma.evidencia.findFirstOrThrow({ where: { reporteId: reporteCapital } });

        const detalle = await request(app).get(`/api/institucional/reportes/${reporteCapital}`).set(conToken(coordinador.token));
        const foto = await request(app).get(`/api/institucional/evidencias/${evidencia.id}/imagen`).set(conToken(coordinador.token));
        const cambio = await request(app)
            .patch(`/api/institucional/reportes/${reporteCapital}/estado`)
            .set(conToken(coordinador.token))
            .send({ estado: 'VALIDADO' });

        expect([detalle.status, foto.status, cambio.status]).toEqual([404, 404, 404]);
        expect((await prisma.reporte.findUniqueOrThrow({ where: { id: reporteCapital } })).estado).toBe('PENDIENTE');
    });

    it('la foto se descarga como JPEG para quien tiene alcance', async () => {
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital);
        const evidencia = await prisma.evidencia.findFirstOrThrow({ where: { reporteId: reporteCapital } });

        const foto = await request(app).get(`/api/institucional/evidencias/${evidencia.id}/imagen`).set(conToken(coordinador.token));

        expect(foto.status).toBe(200);
        expect(foto.headers['content-type']).toContain('image/jpeg');
        expect(foto.body.subarray(0, 2).toString('hex')).toBe('ffd8');
    });

    it('la ubicación es exacta para el coordinador y redondeada para el epidemiólogo', async () => {
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital);
        const epidemiologo = await crearUsuario('EPIDEMIOLOGO');
        const decimales = (numero: number) => String(numero).split('.')[1]?.length ?? 0;

        const paraCoordinador = await request(app).get(`/api/institucional/reportes/${reporteCapital}`).set(conToken(coordinador.token));
        const paraEpidemiologo = await request(app).get(`/api/institucional/reportes/${reporteCapital}`).set(conToken(epidemiologo.token));

        expect(paraCoordinador.body.data.ubicacion.exacta).toBe(true);
        expect(decimales(paraCoordinador.body.data.ubicacion.latitud)).toBeGreaterThan(3);
        expect(paraEpidemiologo.body.data.ubicacion.exacta).toBe(false);
        expect(decimales(paraEpidemiologo.body.data.ubicacion.latitud)).toBeLessThanOrEqual(3);
    });

    it('ver una foto queda registrado en la auditoría', async () => {
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital);
        const evidencia = await prisma.evidencia.findFirstOrThrow({ where: { reporteId: reporteCapital } });

        await request(app).get(`/api/institucional/evidencias/${evidencia.id}/imagen`).set(conToken(coordinador.token)).expect(200);

        const registro = await prisma.auditoriaAcceso.findFirstOrThrow({ where: { accion: 'VER_EVIDENCIA' } });
        expect(registro).toMatchObject({ usuarioId: coordinador.id, recurso: `evidencia:${evidencia.id}` });
    });

    it('un auditor no puede ver fotos aunque tenga alcance provincial', async () => {
        const auditor = await crearUsuario('AUDITOR');
        const evidencia = await prisma.evidencia.findFirstOrThrow({ where: { reporteId: reporteCapital } });

        const foto = await request(app).get(`/api/institucional/evidencias/${evidencia.id}/imagen`).set(conToken(auditor.token));

        expect(foto.status).toBe(403);
    });
});

describe('cambios de estado', () => {
    it('validar un reporte pendiente recalcula la manzana y deja historial con el usuario', async () => {
        const coordinador = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital);

        const respuesta = await request(app)
            .patch(`/api/institucional/reportes/${reporteCapital}/estado`)
            .set(conToken(coordinador.token))
            .send({ estado: 'VALIDADO' });

        expect(respuesta.status).toBe(200);
        const manzana = await prisma.manzana.findUniqueOrThrow({ where: { id: territorio.manzanas['capital-11']! } });
        expect(manzana.estado).toBe('ROJO');
        const ultimoCambio = await prisma.historialEstadoManzana.findFirstOrThrow({
            where: { manzanaId: manzana.id },
            orderBy: { id: 'desc' },
        });
        expect(ultimoCambio).toMatchObject({ estadoAnterior: 'AMARILLO', estadoNuevo: 'ROJO', usuarioId: coordinador.id });
    });

    it('dos funcionarios que validan a la vez: uno gana y el otro recibe 409', async () => {
        const primero = await crearUsuario('COORDINADOR_BRIGADA', territorio.localidades.capital);
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
