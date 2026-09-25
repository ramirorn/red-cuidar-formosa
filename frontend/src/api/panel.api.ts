import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { avisarSesionExpirada, guardarToken, leerToken, refrescarToken } from '@/autenticacion/tokenPanel';
import type { Pagina, RespuestaApi } from '@/tipos';
import type {
    Brigadista,
    CambiosUsuario,
    ColeccionRiesgo,
    FiltrosReportes,
    Intervencion,
    Metricas,
    NuevaIntervencion,
    NuevaRuta,
    NuevoUsuario,
    RangoFechas,
    RegistroAuditoria,
    ReporteDetalle,
    ReporteListado,
    Rol,
    RutaDetalle,
    RutaListado,
    TipoIntervencion,
    UsuarioActual,
    UsuarioInstitucional,
    EstadoRuta,
} from '@/tipos/panel';
import type { EstadoReporte } from '@/tipos';

// Cliente del panel: adjunta el token de acceso y, si venció, lo renueva una vez con la cookie de
// refresco y repite la petición. Si tampoco se puede renovar, avisa que la sesión terminó.
export const clientePanel = axios.create({ baseURL: '/api', timeout: 30_000 });

clientePanel.interceptors.request.use((config) => {
    const token = leerToken();
    if (token) config.headers.set('Authorization', `Bearer ${token}`);
    return config;
});

const RUTAS_SIN_REINTENTO = new Set(['/auth/login', '/auth/refrescar', '/auth/cerrar-sesion']);

clientePanel.interceptors.response.use(undefined, async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { reintentado?: boolean }) | undefined;
    // Estas rutas responden 401 por credenciales o cookie inválidas, no por token vencido: no se reintentan.
    if (error.response?.status === 401 && original && !original.reintentado && !RUTAS_SIN_REINTENTO.has(original.url ?? '')) {
        original.reintentado = true;
        const token = await refrescarToken();
        if (token) {
            original.headers.set('Authorization', `Bearer ${token}`);
            return clientePanel(original);
        }
        avisarSesionExpirada();
    }
    throw error;
});

const datos = <T>(respuesta: { data: RespuestaApi<T> }): T => respuesta.data.data;

const pagina = <T>(respuesta: { data: RespuestaApi<T[]> }, limite: number): Pagina<T> => ({
    datos: respuesta.data.data,
    paginacion: respuesta.data.pagination ?? { limite, siguienteCursor: null },
});

// Quita los filtros vacíos para no mandar "estado=" y que la validación del backend los rechace.
const limpiar = <T extends object>(filtros: T) =>
    Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== undefined && valor !== '' && valor !== null));

const LIMITE = 30;

export const panelApi = {
    // Autenticación
    iniciarSesion: async (email: string, password: string) => {
        const respuesta = await clientePanel.post<RespuestaApi<{ token: string }>>('/auth/login', { email, password });
        guardarToken(respuesta.data.data.token);
    },
    usuarioActual: async () => datos<UsuarioActual>(await clientePanel.get('/auth/yo')),
    cerrarSesion: async () => {
        await clientePanel.post('/auth/cerrar-sesion').catch(() => undefined);
        guardarToken(null);
    },

    // Reportes
    reportes: async (filtros: FiltrosReportes, cursor?: string) =>
        pagina<ReporteListado>(await clientePanel.get('/institucional/reportes', { params: limpiar({ ...filtros, limite: LIMITE, cursor }) }), LIMITE),
    reporte: async (id: string) => datos<ReporteDetalle>(await clientePanel.get(`/institucional/reportes/${id}`)),
    cambiarEstadoReporte: async (id: string, estado: Exclude<EstadoReporte, 'PENDIENTE'>, motivoRechazo?: string) =>
        datos<unknown>(await clientePanel.patch(`/institucional/reportes/${id}/estado`, limpiar({ estado, motivoRechazo }))),
    imagenEvidencia: async (id: string) =>
        (await clientePanel.get<Blob>(`/institucional/evidencias/${id}/imagen`, { responseType: 'blob' })).data,

    // Métricas y riesgo
    metricas: async (filtros: RangoFechas & { localidadId?: number }) =>
        datos<Metricas>(await clientePanel.get('/institucional/metricas', { params: limpiar(filtros) })),
    mapaCalor: async (filtros: RangoFechas & { localidadId?: number }) =>
        datos<ColeccionRiesgo>(await clientePanel.get('/institucional/mapa-calor', { params: limpiar(filtros) })),
    predicciones: async (localidadId?: number) =>
        datos<ColeccionRiesgo>(await clientePanel.get('/institucional/predicciones', { params: limpiar({ localidadId }) })),

    // Intervenciones
    intervenciones: async (filtros: RangoFechas & { localidadId?: number; tipo?: TipoIntervencion; manzanaId?: number }, cursor?: string) =>
        pagina<Intervencion>(await clientePanel.get('/institucional/intervenciones', { params: limpiar({ ...filtros, limite: LIMITE, cursor }) }), LIMITE),
    registrarIntervencion: async (intervencion: NuevaIntervencion) =>
        datos<Intervencion>(await clientePanel.post('/institucional/intervenciones', limpiar(intervencion))),

    // Rutas de brigada
    rutas: async (filtros: { localidadId?: number; fecha?: string; estado?: EstadoRuta }, cursor?: string) =>
        pagina<RutaListado>(await clientePanel.get('/institucional/rutas', { params: limpiar({ ...filtros, limite: LIMITE, cursor }) }), LIMITE),
    ruta: async (id: number) => datos<RutaDetalle>(await clientePanel.get(`/institucional/rutas/${id}`)),
    generarRuta: async (ruta: NuevaRuta) => datos<RutaDetalle>(await clientePanel.post('/institucional/rutas', limpiar(ruta))),
    cambiarEstadoRuta: async (id: number, estado: Exclude<EstadoRuta, 'PLANIFICADA'>) =>
        datos<unknown>(await clientePanel.patch(`/institucional/rutas/${id}/estado`, { estado })),
    marcarParadaVisitada: async (rutaId: number, paradaId: number) =>
        datos<unknown>(await clientePanel.patch(`/institucional/rutas/${rutaId}/paradas/${paradaId}/visitada`)),
    brigadistas: async (localidadId?: number) =>
        datos<Brigadista[]>(await clientePanel.get('/institucional/brigadistas', { params: limpiar({ localidadId }) })),

    // Exportaciones (CSV auditado)
    exportar: async (tipo: 'reportes' | 'intervenciones', filtros: RangoFechas & { localidadId?: number }) =>
        (await clientePanel.get<Blob>(`/institucional/exportaciones/${tipo}`, { params: limpiar(filtros), responseType: 'blob' })).data,

    // Usuarios
    usuarios: async (filtros: { rol?: Rol; localidadId?: number }, cursor?: string) =>
        pagina<UsuarioInstitucional>(await clientePanel.get('/institucional/usuarios', { params: limpiar({ ...filtros, limite: LIMITE, cursor }) }), LIMITE),
    crearUsuario: async (usuario: NuevoUsuario) => datos<UsuarioInstitucional>(await clientePanel.post('/institucional/usuarios', limpiar(usuario))),
    actualizarUsuario: async (id: number, cambios: CambiosUsuario) =>
        datos<UsuarioInstitucional>(await clientePanel.patch(`/institucional/usuarios/${id}`, cambios)),

    // Auditoría
    auditoria: async (filtros: RangoFechas & { usuarioId?: number; accion?: string }, cursor?: string) =>
        pagina<RegistroAuditoria>(await clientePanel.get('/institucional/auditoria', { params: limpiar({ ...filtros, limite: LIMITE, cursor }) }), LIMITE),
};
