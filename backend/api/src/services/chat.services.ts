import { createHash, createHmac, timingSafeEqual } from 'node:crypto';
import type { NivelTriaje } from '@prisma/client';
import entorno from '../config/entorno.js';
import prisma from '../config/prisma.js';
import { consultarFlujoN8n, flujoConfigurado, FlujoNoDisponible } from '../integraciones/n8nChat.js';
import { crearSemaforo } from '../utils/semaforo.js';
import { detectarTriaje, responderBasico } from './asistenteBasico.services.js';
import { registrarActividadSesionService } from './sesion.services.js';

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

// La API es la única puerta al orquestador: autentica la sesión, limita la tasa y reenvía el mensaje
// al flujo de n8n (src/integraciones/n8nChat.ts). Si el flujo no está configurado o no responde,
// contesta el asistente básico. El historial lo guarda la PWA en el dispositivo; el servidor no
// persiste el contenido de la conversación, solo el nivel de triaje (para las métricas).
export const enviarMensajeChatService = async (sesionId: string, mensaje: string, historial: MensajeHistorial[]) => {
    const conversacion = filtrarHistorial(sesionId, historial);
    let resultado: { respuesta: string; nivelTriaje: NivelTriaje | null; origen: 'ia' | 'basico' } | null = null;

    if (flujoConfigurado()) {
        try {
            const flujo = await conLugarEnElModelo(() => consultarFlujoN8n({ sesionId, mensaje, historial: conversacion }));
            const nivel = NIVELES.includes(flujo.nivelTriaje as NivelTriaje) ? (flujo.nivelTriaje as NivelTriaje) : null;
            resultado = { respuesta: flujo.respuesta.slice(0, 4000), nivelTriaje: nivel, origen: 'ia' };
        } catch (error) {
            // Flujo caído, sin respuesta o con la fila llena: el vecino igual recibe una respuesta útil.
            const motivo = error instanceof FlujoNoDisponible ? error.message : error instanceof Error ? error.message : String(error);
            console.warn(`Chat: el flujo de n8n no respondió (${motivo}); contesta el asistente básico`);
        }
    }
    resultado ??= { ...responderBasico(mensaje), origen: 'basico' };

    // Red de seguridad: un signo de alarma siempre termina en URGENTE con el 107, diga lo que diga el modelo.
    if (detectarTriaje(mensaje) === 'URGENTE' && resultado.nivelTriaje !== 'URGENTE') {
        resultado.nivelTriaje = 'URGENTE';
        if (!resultado.respuesta.includes('107')) resultado.respuesta += '\n\nLo que contás puede ser un signo de alarma: andá ya a la guardia más cercana o llamá al 107.';
    }

    await registrarActividadSesionService(sesionId);
    if (resultado.nivelTriaje) await prisma.triajeChat.create({ data: { sesionId, nivel: resultado.nivelTriaje } });

    return {
        ...resultado,
        // La PWA la guarda junto a la respuesta y la reenvía en el historial.
        firma: firmarRespuesta(sesionId, resultado.respuesta),
    };
};
