import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { obtenerSesion, renovarSesion } from '@/sinConexion/sesion';
import type { RespuestaApi } from '@/tipos';

// Cliente de las rutas ciudadanas: adjunta el token de la sesión anónima y, si el servidor la dio
// por vencida, crea otra y repite la petición una vez.
export const clienteVecino = axios.create({ baseURL: '/api', timeout: 20_000 });

clienteVecino.interceptors.request.use(async (config) => {
    const { token } = await obtenerSesion();
    config.headers.set('Authorization', `Bearer ${token}`);
    return config;
});

clienteVecino.interceptors.response.use(undefined, async (error: AxiosError) => {
    const original = error.config as (InternalAxiosRequestConfig & { reintentado?: boolean }) | undefined;
    if (error.response?.status === 401 && original && !original.reintentado) {
        original.reintentado = true;
        const { token } = await renovarSesion();
        original.headers.set('Authorization', `Bearer ${token}`);
        return clienteVecino(original);
    }
    throw error;
});

// Cliente sin credenciales para las rutas públicas (mapa, localidades).
export const clientePublico = axios.create({ baseURL: '/api', timeout: 20_000 });

// Quita el sobre { status, data } de la respuesta.
export const datosDe = <T>(respuesta: { data: RespuestaApi<T> }): T => respuesta.data.data;
