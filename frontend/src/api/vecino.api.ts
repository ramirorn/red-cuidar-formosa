import { clientePublico, clienteVecino, datosDe } from './cliente';
import type { ColeccionManzanas, Localidad, PodioCopa, PremioCopa, ReporteResumen, RespuestaChat, SituacionZona } from '@/tipos';

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

    // Todas las manzanas de la localidad: el celular calcula en cuál está sin enviar su ubicación.
    manzanasDeLocalidad: async (localidadId: number) =>
        datosDe<ColeccionManzanas>(await clientePublico.get(`/localidades/${localidadId}/manzanas`, { timeout: 60_000 })),

    // Estado de los reportes propios, por los idCliente que guarda el celular (el servidor no sabe cuáles son).
    consultarPropios: async (idsCliente: string[]) =>
        datosDe<ReporteResumen[]>(await clienteVecino.post('/reportes/consulta', { idsCliente })),

    // Copa Red-Cuidar: el podio y la situación de una zona son públicos; el premio exige sesión.
    copaPodio: async (localidadId: number, mes?: string) =>
        datosDe<PodioCopa>(await clientePublico.get('/copa', { params: { localidadId, ...(mes ? { mes } : {}) } })),
    copaZona: async (zonaId: number, mes?: string) =>
        datosDe<SituacionZona>(await clientePublico.get(`/copa/zonas/${zonaId}`, { params: mes ? { mes } : {} })),
    pedirPremio: async (mes: string, idsCliente: string[]) =>
        datosDe<PremioCopa | null>(await clienteVecino.post('/copa/premio', { mes, idsCliente })),

    enviarMensaje: async (mensaje: string, historial: MensajeHistorialApi[]) =>
        datosDe<RespuestaChat>(await clienteVecino.post('/chat/mensajes', { mensaje, historial }, { timeout: 100_000 })),

    clavePublicaPush: async () => datosDe<{ clavePublica: string }>(await clientePublico.get('/suscripciones-push/clave-publica')).clavePublica,

    guardarSuscripcion: async (suscripcion: PushSubscriptionJSON, localidadId?: number) =>
        datosDe(await clienteVecino.post('/suscripciones-push', { endpoint: suscripcion.endpoint, keys: suscripcion.keys, localidadId })),

    eliminarSuscripcion: async (endpoint: string) => { await clienteVecino.delete('/suscripciones-push', { data: { endpoint } }); },
};
