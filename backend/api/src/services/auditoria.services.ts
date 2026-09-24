import type { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { armarPagina, decodificarCursorEntero } from '../utils/paginacion.js';
import { resolverRango } from '../utils/rangoFechas.js';

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

export interface FiltrosAuditoria {
    usuarioId?: number;
    accion?: string;
    desde?: Date;
    hasta?: Date;
    limite: number;
    cursor?: string;
}

export const listarAuditoriaService = async (filtros: FiltrosAuditoria) => {
    const { desde, hasta } = resolverRango(filtros.desde, filtros.hasta);

    const registros = await prisma.auditoriaAcceso.findMany({
        where: {
            createdAt: { gte: desde, lte: hasta },
            ...(filtros.usuarioId ? { usuarioId: filtros.usuarioId } : {}),
            ...(filtros.accion ? { accion: filtros.accion } : {}),
        },
        select: {
            id: true,
            accion: true,
            recurso: true,
            filtros: true,
            ip: true,
            createdAt: true,
            usuario: { select: { id: true, nombre: true, apellido: true, rol: true } },
        },
        orderBy: { id: 'desc' },
        take: filtros.limite + 1,
        ...(filtros.cursor ? { cursor: { id: decodificarCursorEntero(filtros.cursor) }, skip: 1 } : {}),
    });

    return armarPagina(registros, filtros.limite);
};
