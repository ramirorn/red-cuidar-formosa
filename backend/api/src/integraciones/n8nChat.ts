import entorno from '../config/entorno.js';

// Conexión con el flujo de chat de n8n (IA Mosquito).
//
// Para usar tu propio flujo, pegá su Production URL en el .env (no hace falta tocar este archivo):
//   URL_CHAT_ORQUESTADOR="https://<tu-n8n>/webhook/<ruta>"
// Si n8n corre en la misma compu y la API en Docker, usá host.docker.internal en lugar de localhost:
//   URL_CHAT_ORQUESTADOR="http://host.docker.internal:5678/webhook/<ruta>"
// Vacía, el chat usa solo el asistente básico (sin modelo de lenguaje).
//
// Qué se envía (POST JSON). Van los dos nombres más comunes para que funcione con un Webhook
// o con un Chat Trigger / AI Agent de n8n sin cambiar el flujo:
//   { sesionId, sessionId, mensaje, chatInput, historial: [{ rol: 'usuario' | 'asistente', contenido }] }
// Encabezado x-clave-servicio: CLAVE_SERVICIO_INTERNO (si el webhook usa Header Auth).
//
// Qué se espera de vuelta: JSON con el texto en `respuesta` (o `output`, `text`, `response`, `answer`,
// `message`), opcionalmente `nivelTriaje` (SIN_RIESGO | LEVE | MODERADO | URGENTE). También sirve una
// lista con un solo objeto (lo que devuelve "Respond to Webhook" con "All Incoming Items") o texto plano.

// El LLM corre en CPU: se le da margen, pero sin dejar la conexión colgada indefinidamente.
const TIEMPO_ESPERA_MS = 90_000;
const CAMPOS_TEXTO = ['respuesta', 'output', 'text', 'response', 'answer', 'message'] as const;
const CAMPOS_TRIAJE = ['nivelTriaje', 'triaje', 'nivel'] as const;

export interface PedidoChat {
    sesionId: string;
    mensaje: string;
    historial: { rol: 'usuario' | 'asistente'; contenido: string }[];
}

export interface RespuestaFlujo {
    respuesta: string;
    nivelTriaje: string | null;
}

export class FlujoNoDisponible extends Error {}

export const flujoConfigurado = () => entorno.URL_CHAT_ORQUESTADOR.trim() !== '';

// Saca el texto y el triaje de lo que devolvió n8n, sin importar cuál de los formatos usa el flujo.
export const interpretarRespuestaFlujo = (cuerpo: unknown): RespuestaFlujo | null => {
    const dato = Array.isArray(cuerpo) ? cuerpo[0] : cuerpo;
    if (typeof dato === 'string') return dato.trim() ? { respuesta: dato.trim(), nivelTriaje: null } : null;
    if (!dato || typeof dato !== 'object') return null;

    const objeto = (dato as { json?: unknown }).json && typeof (dato as { json?: unknown }).json === 'object'
        ? (dato as { json: Record<string, unknown> }).json
        : (dato as Record<string, unknown>);
    const texto = CAMPOS_TEXTO.map((campo) => objeto[campo]).find((valor): valor is string => typeof valor === 'string' && valor.trim() !== '');
    if (!texto) return null;
    const triaje = CAMPOS_TRIAJE.map((campo) => objeto[campo]).find((valor): valor is string => typeof valor === 'string');
    return { respuesta: texto.trim(), nivelTriaje: triaje ? triaje.toUpperCase() : null };
};

export const consultarFlujoN8n = async ({ sesionId, mensaje, historial }: PedidoChat): Promise<RespuestaFlujo> => {
    let respuesta: Response;
    try {
        respuesta = await fetch(entorno.URL_CHAT_ORQUESTADOR, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-clave-servicio': entorno.CLAVE_SERVICIO_INTERNO },
            body: JSON.stringify({ sesionId, sessionId: sesionId, mensaje, chatInput: mensaje, historial }),
            signal: AbortSignal.timeout(TIEMPO_ESPERA_MS),
        });
    } catch (error) {
        throw new FlujoNoDisponible(`no se pudo conectar (${error instanceof Error ? error.message : String(error)})`);
    }
    if (!respuesta.ok) throw new FlujoNoDisponible(`respondió ${respuesta.status}`);

    const texto = await respuesta.text();
    let cuerpo: unknown = texto;
    try { cuerpo = JSON.parse(texto); } catch { /* texto plano */ }
    const interpretada = interpretarRespuestaFlujo(cuerpo);
    if (!interpretada) throw new FlujoNoDisponible('respondió sin texto');
    return interpretada;
};
