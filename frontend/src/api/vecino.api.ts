import { clientePublico, clienteVecino, datosDe } from './cliente';
import type { ColeccionManzanas, Localidad, Pagina, ReporteResumen, RespuestaApi, RespuestaChat } from '@/tipos';

export interface Recuadro {
    longitudMinima: number;
    latitudMinima: number;
    longitudMaxima: number;
    latitudMaxima: number;
}

export interface MensajeHistorialApi {
    rol: 'usuario' | 'asistente';
    contenido: string;
    firma?: string;
}

export const vecinoApi = {
    localidades: async () => datosDe<Localidad[]>(await clientePublico.get('/localidades')),

    manzanas: async (recuadro: Recuadro) => datosDe<ColeccionManzanas>(await clientePublico.get('/manzanas', { params: recuadro })),

    misReportes: async (cursor?: string): Promise<Pagina<ReporteResumen>> => {
        const { data } = await clienteVecino.get<RespuestaApi<ReporteResumen[]>>('/reportes/mios', { params: { limite: 20, cursor } });
        return { datos: data.data, paginacion: data.pagination ?? { limite: 20, siguienteCursor: null } };
    },

    enviarMensaje: async (mensaje: string, historial: MensajeHistorialApi[]) =>
        datosDe<RespuestaChat>(await clienteVecino.post('/chat/mensajes', { mensaje, historial }, { timeout: 100_000 })),

    clavePublicaPush: async () => datosDe<{ clavePublica: string }>(await clientePublico.get('/suscripciones-push/clave-publica')).clavePublica,

    guardarSuscripcion: async (suscripcion: PushSubscriptionJSON, localidadId?: number) =>
        datosDe(await clienteVecino.post('/suscripciones-push', { endpoint: suscripcion.endpoint, keys: suscripcion.keys, localidadId })),

    eliminarSuscripcion: async (endpoint: string) => { await clienteVecino.delete('/suscripciones-push', { data: { endpoint } }); },
};
