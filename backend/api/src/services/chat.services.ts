import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { NivelTriaje } from '@prisma/client';
import entorno from '../config/entorno.js';
import { ErrorHttp } from '../utils/errorHttp.js';
import { crearSemaforo } from '../utils/semaforo.js';
import { registrarActividadSesionService } from './sesion.services.js';

// El LLM corre en CPU: se le da margen, pero sin dejar la conexión colgada indefinidamente.
const TIEMPO_ESPERA_CHAT_MS = 90_000;
const NIVELES: NivelTriaje[] = ['SIN_RIESGO', 'LEVE', 'MODERADO', 'URGENTE'];

// Un único modelo local atiende a toda la provincia: pocas consultas a la vez y una fila corta.
const conLugarEnElModelo = crearSemaforo(3, 15, 'El asistente está muy ocupado; probá de nuevo en un rato');

export interface MensajeHistorial {
    rol: 'usuario' | 'asistente';
    contenido: string;
    firma?: string;
}

// Las respuestas del asistente se firman: el historial que reenvía la PWA solo puede incluir
// respuestas que realmente generó el asistente para esa sesión, no turnos inventados por el cliente.
const CLAVE_FIRMA = createHash('sha256').update(`chat:${entorno.JWT_SECRET_SESIONES}`).digest();

export const firmarRespuesta = (sesionId: string, contenido: string): string =>
    createHmac('sha256', CLAVE_FIRMA).update(`${sesionId}\n${contenido}`).digest('base64url');

const firmaValida = (sesionId: string, mensaje: MensajeHistorial): boolean => {
    if (!mensaje.firma) return false;
    const esperada = Buffer.from(firmarRespuesta(sesionId, mensaje.contenido));
    const recibida = Buffer.from(mensaje.firma);
    return esperada.length === recibida.length && timingSafeEqual(esperada, recibida);
};

// Descarta los turnos del asistente sin firma válida; los del usuario se reenvían tal cual.
export const filtrarHistorial = (sesionId: string, historial: MensajeHistorial[]) =>
    historial
        .filter((mensaje) => mensaje.rol === 'usuario' || firmaValida(sesionId, mensaje))
        .map(({ rol, contenido }) => ({ rol, contenido }));

// La API es la única puerta al orquestador: autentica la sesión, limita la tasa y reenvía
// el mensaje a n8n por la red interna. El historial lo guarda la PWA en el dispositivo;
// el servidor no persiste el contenido de la conversación.
export const enviarMensajeChatService = (sesionId: string, mensaje: string, historial: MensajeHistorial[]) =>
    conLugarEnElModelo(() => consultarAsistente(sesionId, mensaje, filtrarHistorial(sesionId, historial)));

const consultarAsistente = async (sesionId: string, mensaje: string, historial: MensajeHistorial[]) => {
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

    const texto = cuerpo.respuesta.slice(0, 4000);
    return {
        respuesta: texto,
        nivelTriaje: NIVELES.includes(cuerpo.nivelTriaje as NivelTriaje) ? (cuerpo.nivelTriaje as NivelTriaje) : null,
        // La PWA la guarda junto a la respuesta y la reenvía en el historial.
        firma: firmarRespuesta(sesionId, texto),
    };
};
