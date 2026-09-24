import type { NivelTriaje } from '@prisma/client';
import entorno from '../config/entorno.js';
import { ErrorHttp } from '../utils/errorHttp.js';
import { registrarActividadSesionService } from './sesion.services.js';

// El LLM corre en CPU: se le da margen, pero sin dejar la conexión colgada indefinidamente.
const TIEMPO_ESPERA_CHAT_MS = 90_000;
const NIVELES: NivelTriaje[] = ['SIN_RIESGO', 'LEVE', 'MODERADO', 'URGENTE'];

export interface MensajeHistorial {
    rol: 'usuario' | 'asistente';
    contenido: string;
}

// La API es la única puerta al orquestador: autentica la sesión, limita la tasa y reenvía
// el mensaje a n8n por la red interna. El historial lo guarda la PWA en el dispositivo;
// el servidor no persiste el contenido de la conversación.
export const enviarMensajeChatService = async (sesionId: string, mensaje: string, historial: MensajeHistorial[]) => {
    let respuesta: Response;
    try {
        respuesta = await fetch(entorno.URL_CHAT_ORQUESTADOR, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-clave-servicio': entorno.CLAVE_SERVICIO_INTERNO },
            body: JSON.stringify({ sesionId, mensaje, historial }),
            signal: AbortSignal.timeout(TIEMPO_ESPERA_CHAT_MS),
        });
    } catch {
        throw new ErrorHttp(503, 'El asistente no está disponible en este momento');
    }

    if (!respuesta.ok) {
        console.error(`El orquestador de chat respondió ${respuesta.status}`);
        throw new ErrorHttp(502, 'El asistente no pudo responder');
    }

    const cuerpo = (await respuesta.json().catch(() => null)) as { respuesta?: unknown; nivelTriaje?: unknown } | null;
    if (!cuerpo || typeof cuerpo.respuesta !== 'string' || cuerpo.respuesta.length === 0) {
        throw new ErrorHttp(502, 'El asistente no pudo responder');
    }

    await registrarActividadSesionService(sesionId);

    return {
        respuesta: cuerpo.respuesta.slice(0, 4000),
        nivelTriaje: NIVELES.includes(cuerpo.nivelTriaje as NivelTriaje) ? (cuerpo.nivelTriaje as NivelTriaje) : null,
    };
};
