import webpush from 'web-push';
import prisma from '../config/prisma.js';
import entorno from '../config/entorno.js';
import { procesarConLimite } from '../utils/concurrencia.js';
import { ErrorHttp } from '../utils/errorHttp.js';

const HORAS_ENTRE_ALERTAS = 12;
const TAMANO_LOTE = 500;
const ENVIOS_SIMULTANEOS = 20;

const pushConfigurado = Boolean(entorno.VAPID_CLAVE_PUBLICA && entorno.VAPID_CLAVE_PRIVADA);

if (pushConfigurado) {
    webpush.setVapidDetails(entorno.VAPID_CONTACTO, entorno.VAPID_CLAVE_PUBLICA, entorno.VAPID_CLAVE_PRIVADA);
}

const exigirConfiguracion = (): void => {
    if (!pushConfigurado) throw new ErrorHttp(503, 'Las notificaciones Web Push no están configuradas');
};

// La PWA necesita la clave pública VAPID para suscribirse (PushManager.subscribe).
export const obtenerClavePublicaPushService = (): string => {
    exigirConfiguracion();
    return entorno.VAPID_CLAVE_PUBLICA;
};

export const armarMensajeLluvia = (localidad: string, precipitacionMm: number) => ({
    tipo: 'ALERTA_LLUVIA',
    titulo: `Llovió en ${localidad}`,
    cuerpo: `Se registraron ${Math.round(precipitacionMm)} mm. Vaciá, cepillá y tapá los recipientes con agua, `
        + 'y enviá una foto para mantener tu manzana en verde.',
    url: '/?accion=reportar-limpieza',
});

// Alerta post-lluvia para todas las suscripciones activas de una localidad.
// - Como máximo una alerta cada 12 horas por localidad (n8n consulta el clima cada hora).
// - Un bloqueo transaccional evita que dos llamadas simultáneas envíen la alerta dos veces.
// - Las suscripciones que el servicio push da por vencidas (404/410) se desactivan.
export const enviarAlertaLluviaService = async (localidadId: number, precipitacionMm: number) => {
    exigirConfiguracion();

    const localidad = await prisma.localidad.findUnique({ where: { id: localidadId }, select: { nombre: true } });
    if (!localidad) throw new ErrorHttp(404, 'Localidad no encontrada');

    const mensaje = armarMensajeLluvia(localidad.nombre, precipitacionMm);

    const registro = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`alerta_lluvia:${localidadId}`}))`;

        const reciente = await tx.notificacionEnviada.findFirst({
            where: {
                localidadId,
                tipo: 'ALERTA_LLUVIA',
                createdAt: { gte: new Date(Date.now() - HORAS_ENTRE_ALERTAS * 60 * 60 * 1000) },
            },
            select: { id: true },
        });
        if (reciente) return null;

        return tx.notificacionEnviada.create({
            data: { tipo: 'ALERTA_LLUVIA', localidadId, titulo: mensaje.titulo, precipitacionMm },
            select: { id: true },
        });
    });

    if (!registro) {
        return { omitida: true, motivo: `Ya se envió una alerta en las últimas ${HORAS_ENTRE_ALERTAS} horas` };
    }

    const contenido = JSON.stringify(mensaje);
    let enviadas = 0;
    let fallidas = 0;
    const vencidas: number[] = [];
    let ultimoId = 0;

    // Recorre las suscripciones por lotes (keyset) para no cargarlas todas en memoria.
    while (true) {
        const lote = await prisma.suscripcionPush.findMany({
            where: { localidadId, activa: true, id: { gt: ultimoId } },
            select: { id: true, endpoint: true, p256dh: true, auth: true },
            orderBy: { id: 'asc' },
            take: TAMANO_LOTE,
        });
        if (lote.length === 0) break;

        await procesarConLimite(lote, ENVIOS_SIMULTANEOS, async (suscripcion) => {
            try {
                await webpush.sendNotification(
                    { endpoint: suscripcion.endpoint, keys: { p256dh: suscripcion.p256dh, auth: suscripcion.auth } },
                    contenido,
                    { TTL: HORAS_ENTRE_ALERTAS * 60 * 60, urgency: 'normal', timeout: 10_000 },
                );
                enviadas++;
            } catch (error) {
                const estado = (error as { statusCode?: number }).statusCode;
                if (estado === 404 || estado === 410) {
                    vencidas.push(suscripcion.id);
                } else {
                    fallidas++;
                }
            }
        });

        ultimoId = lote[lote.length - 1]!.id;
        if (lote.length < TAMANO_LOTE) break;
    }

    if (vencidas.length > 0) {
        await prisma.suscripcionPush.updateMany({ where: { id: { in: vencidas } }, data: { activa: false } });
    }

    await prisma.notificacionEnviada.update({
        where: { id: registro.id },
        data: { enviadas, fallidas, bajas: vencidas.length },
    });

    return { omitida: false, notificacionId: registro.id, enviadas, fallidas, bajas: vencidas.length };
};
