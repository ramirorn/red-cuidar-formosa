import prisma from '../config/prisma.js';
import { ErrorHttp } from '../utils/errorHttp.js';

export const MAXIMO_SUSCRIPCIONES_POR_SESION = 3;

export interface DatosSuscripcion {
    endpoint: string;
    p256dh: string;
    auth: string;
    localidadId?: number;
}

// Registra la suscripción Web Push del navegador; n8n la usa para las alertas post-lluvia.
export const guardarSuscripcionService = async (sesionId: string, datos: DatosSuscripcion) => {
    if (datos.localidadId !== undefined) {
        const localidad = await prisma.localidad.findUnique({ where: { id: datos.localidadId }, select: { id: true } });
        if (!localidad) throw new ErrorHttp(422, 'La localidad indicada no existe');
    }

    // Una sesión corresponde a un vecino: alcanza con unos pocos navegadores o dispositivos.
    const otras = await prisma.suscripcionPush.count({
        where: { sesionId, activa: true, endpoint: { not: datos.endpoint } },
    });
    if (otras >= MAXIMO_SUSCRIPCIONES_POR_SESION) {
        throw new ErrorHttp(422, `Se permiten como máximo ${MAXIMO_SUSCRIPCIONES_POR_SESION} dispositivos por sesión`);
    }

    const campos = {
        sesionId,
        p256dh: datos.p256dh,
        auth: datos.auth,
        localidadId: datos.localidadId ?? null,
        activa: true,
    };

    return prisma.suscripcionPush.upsert({
        where: { endpoint: datos.endpoint },
        create: { endpoint: datos.endpoint, ...campos },
        update: campos,
        select: { id: true, localidadId: true, activa: true },
    });
};

export const eliminarSuscripcionService = async (sesionId: string, endpoint: string): Promise<void> => {
    const { count } = await prisma.suscripcionPush.deleteMany({ where: { sesionId, endpoint } });
    if (count === 0) throw new ErrorHttp(404, 'Suscripción no encontrada');
};
