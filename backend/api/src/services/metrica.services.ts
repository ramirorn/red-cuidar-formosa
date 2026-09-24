import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import type { UsuarioAutenticado } from '../middlewares/autenticacion.middleware.js';
import { alcanceLocalidad } from '../utils/alcance.js';
import { resolverRango } from '../utils/rangoFechas.js';
import { filtroAlcanceReportes } from './reporte.services.js';

export interface FiltrosMetricas {
    localidadId?: number;
    desde?: Date;
    hasta?: Date;
}

// Todas las métricas salen de agregaciones en la base (GROUP BY), en consultas paralelas
// e independientes del volumen de filas: nunca se traen registros para contarlos en memoria.
export const obtenerMetricasService = async (usuario: UsuarioAutenticado, filtros: FiltrosMetricas) => {
    const localidadId = alcanceLocalidad(usuario, filtros.localidadId);
    const { desde, hasta } = resolverRango(filtros.desde, filtros.hasta);
    const filtroLocalidad = localidadId === null ? Prisma.empty : Prisma.sql`AND m."localidadId" = ${localidadId}`;

    const [reportesPorTipoYEstado, manzanasPorEstado, intervencionesPorTipo, reportesPorDia] = await Promise.all([
        prisma.reporte.groupBy({
            by: ['tipo', 'estado'],
            where: { ...filtroAlcanceReportes(localidadId), createdAt: { gte: desde, lte: hasta } },
            _count: { _all: true },
        }),
        prisma.manzana.groupBy({
            by: ['estado'],
            where: localidadId === null ? {} : { localidadId },
            _count: { _all: true },
        }),
        prisma.intervencion.groupBy({
            by: ['tipo'],
            where: {
                realizadaEn: { gte: desde, lte: hasta },
                ...(localidadId === null ? {} : { manzana: { localidadId } }),
            },
            _count: { _all: true },
            _sum: { cantidadProducto: true },
        }),
        // Las columnas se guardan en UTC; el día se agrupa según la hora local de Formosa.
        prisma.$queryRaw<{ dia: string; tipo: string; cantidad: number }[]>`
            SELECT to_char((r."createdAt" AT TIME ZONE 'UTC') AT TIME ZONE 'America/Argentina/Buenos_Aires', 'YYYY-MM-DD') AS "dia",
                   r."tipo", COUNT(*)::int AS "cantidad"
            FROM "reporte" r
            LEFT JOIN "manzana" m ON m."id" = r."manzanaId"
            WHERE r."createdAt" BETWEEN ${desde} AND ${hasta}
            ${filtroLocalidad}
            GROUP BY 1, 2
            ORDER BY 1, 2
        `,
    ]);

    return {
        rango: { desde, hasta },
        localidadId,
        reportes: reportesPorTipoYEstado.map((fila) => ({ tipo: fila.tipo, estado: fila.estado, cantidad: fila._count._all })),
        manzanas: manzanasPorEstado.map((fila) => ({ estado: fila.estado, cantidad: fila._count._all })),
        intervenciones: intervencionesPorTipo.map((fila) => ({
            tipo: fila.tipo,
            cantidad: fila._count._all,
            cantidadProductoTotal: fila._sum.cantidadProducto,
        })),
        reportesPorDia,
    };
};
