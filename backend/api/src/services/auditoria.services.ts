import type { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';

// Deja constancia de quién accedió a datos sensibles (exportaciones, gestión de usuarios).
export const registrarAuditoriaService = async (datos: {
    usuarioId: number;
    accion: string;
    recurso: string;
    filtros?: Prisma.InputJsonValue;
    ip?: string;
}): Promise<void> => {
    await prisma.auditoriaAcceso.create({
        data: {
            usuarioId: datos.usuarioId,
            accion: datos.accion,
            recurso: datos.recurso,
            ...(datos.filtros !== undefined ? { filtros: datos.filtros } : {}),
            ip: datos.ip ?? null,
        },
    });
};
