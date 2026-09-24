import { Prisma, type TipoIntervencion } from '@prisma/client';
import prisma from '../config/prisma.js';
import { ROLES_COORDENADAS_EXACTAS } from '../config/permisos.js';
import type { UsuarioAutenticado } from '../middlewares/autenticacion.middleware.js';
import { alcanceLocalidad, verificarAlcance } from '../utils/alcance.js';
import { ErrorHttp } from '../utils/errorHttp.js';
import { armarPagina, decodificarCursor } from '../utils/paginacion.js';
import { resolverRango } from '../utils/rangoFechas.js';
import { recalcularEstadoManzanaService } from './manzana.services.js';
import { invalidarCacheMapaCalorService } from './mapaCalor.services.js';

// Intervenciones que eliminan el criadero: cierran el reporte asociado.
const TIPOS_QUE_RESUELVEN: TipoIntervencion[] = ['APLICACION_BTI', 'DESCACHARRADO', 'FUMIGACION'];

export interface DatosIntervencion {
    tipo: TipoIntervencion;
    manzanaId: number;
    realizadaEn: Date;
    latitud?: number;
    longitud?: number;
    cantidadProducto?: number;
    unidadProducto?: string;
    tipoCuerpoAgua?: string;
    observaciones?: string;
    reporteId?: string;
    paradaRutaId?: number;
}

export const registrarIntervencionService = async (usuario: UsuarioAutenticado, datos: DatosIntervencion) => {
    const resultado = await prisma.$transaction(async (tx) => {
        const manzana = await tx.manzana.findUnique({
            where: { id: datos.manzanaId },
            select: { id: true, localidadId: true },
        });
        if (!manzana) throw new ErrorHttp(404, 'Manzana no encontrada');
        verificarAlcance(usuario, manzana.localidadId);

        if (datos.reporteId) {
            const reporte = await tx.reporte.findUnique({
                where: { id: datos.reporteId },
                select: { manzanaId: true },
            });
            if (!reporte || reporte.manzanaId !== manzana.id) {
                throw new ErrorHttp(422, 'El reporte indicado no pertenece a la manzana de la intervención');
            }
        }

        // Si la intervención se hizo dentro de una ruta, la parada debe ser de esa manzana y la ruta estar en curso.
        if (datos.paradaRutaId !== undefined) {
            const parada = await tx.paradaRuta.findUnique({
                where: { id: datos.paradaRutaId },
                select: { manzanaId: true, ruta: { select: { estado: true, brigadistaId: true } } },
            });
            if (!parada || parada.manzanaId !== manzana.id || parada.ruta.estado !== 'EN_CURSO') {
                throw new ErrorHttp(422, 'La parada indicada no corresponde a esta manzana o su ruta no está en curso');
            }
            if (usuario.rol === 'BRIGADISTA' && parada.ruta.brigadistaId !== usuario.id) {
                throw new ErrorHttp(422, 'La parada indicada pertenece a una ruta asignada a otro brigadista');
            }
        }

        const tieneUbicacion = datos.latitud !== undefined && datos.longitud !== undefined;
        const ubicacion = tieneUbicacion
            ? Prisma.sql`ST_SetSRID(ST_MakePoint(${datos.longitud}::float8, ${datos.latitud}::float8), 4326)::geography`
            : Prisma.sql`NULL`;

        const [intervencion] = await tx.$queryRaw<{ id: string }[]>`
            INSERT INTO "intervencion" (
                "id", "tipo", "manzanaId", "usuarioId", "reporteId", "paradaRutaId", "realizadaEn", "ubicacion",
                "cantidadProducto", "unidadProducto", "tipoCuerpoAgua", "observaciones"
            )
            VALUES (
                gen_random_uuid(), ${datos.tipo}::"TipoIntervencion", ${manzana.id}, ${usuario.id},
                ${datos.reporteId ?? null}::uuid, ${datos.paradaRutaId ?? null}::int, ${datos.realizadaEn}, ${ubicacion},
                ${datos.cantidadProducto ?? null}::float8, ${datos.unidadProducto ?? null},
                ${datos.tipoCuerpoAgua ?? null}, ${datos.observaciones ?? null}
            )
            RETURNING "id"
        `;
        if (!intervencion) throw new ErrorHttp(500, 'No se pudo registrar la intervención');

        if (datos.paradaRutaId !== undefined) {
            await tx.paradaRuta.updateMany({
                where: { id: datos.paradaRutaId, visitadaEn: null },
                data: { visitadaEn: new Date() },
            });
        }

        if (datos.reporteId && TIPOS_QUE_RESUELVEN.includes(datos.tipo)) {
            await tx.reporte.updateMany({
                where: { id: datos.reporteId, estado: { in: ['PENDIENTE', 'VALIDADO'] }, tipo: { in: ['CRIADERO', 'MICROBASURAL'] } },
                data: { estado: 'RESUELTO', validadoPorId: usuario.id, validadoEn: new Date() },
            });
        }

        const { cambio } = await recalcularEstadoManzanaService(tx, manzana.id, {
            motivo: `Intervención institucional: ${datos.tipo.toLowerCase()}`,
            intervencionId: intervencion.id,
            usuarioId: usuario.id,
        });

        return { id: intervencion.id, cambio };
    });

    if (resultado.cambio) await invalidarCacheMapaCalorService();

    return prisma.intervencion.findUniqueOrThrow({
        where: { id: resultado.id },
        select: {
            id: true,
            tipo: true,
            realizadaEn: true,
            cantidadProducto: true,
            unidadProducto: true,
            reporteId: true,
            paradaRutaId: true,
            manzana: { select: { id: true, codigo: true, estado: true } },
        },
    });
};

export interface FiltrosIntervenciones {
    tipo?: TipoIntervencion;
    localidadId?: number;
    manzanaId?: number;
    desde?: Date;
    hasta?: Date;
    limite: number;
    cursor?: string;
}

export const listarIntervencionesService = async (usuario: UsuarioAutenticado, filtros: FiltrosIntervenciones) => {
    const localidadId = alcanceLocalidad(usuario, filtros.localidadId);
    const { desde, hasta } = resolverRango(filtros.desde, filtros.hasta);

    const intervenciones = await prisma.intervencion.findMany({
        where: {
            realizadaEn: { gte: desde, lte: hasta },
            ...(localidadId === null ? {} : { manzana: { localidadId } }),
            ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
            ...(filtros.manzanaId ? { manzanaId: filtros.manzanaId } : {}),
        },
        select: {
            id: true,
            tipo: true,
            realizadaEn: true,
            cantidadProducto: true,
            unidadProducto: true,
            tipoCuerpoAgua: true,
            observaciones: true,
            reporteId: true,
            manzana: { select: { id: true, codigo: true, localidadId: true } },
            usuario: { select: { id: true, nombre: true, apellido: true } },
        },
        orderBy: [{ realizadaEn: 'desc' }, { id: 'desc' }],
        take: filtros.limite + 1,
        ...(filtros.cursor ? { cursor: { id: decodificarCursor(filtros.cursor) }, skip: 1 } : {}),
    });

    return armarPagina(intervenciones, filtros.limite);
};

// ---------------------------------------------------------------------------
// Exportación CSV
// ---------------------------------------------------------------------------

const TAMANO_LOTE_EXPORTACION = 1000;

interface FilaExportacionIntervencion {
    id: string;
    realizadaEn: Date;
    tipo: TipoIntervencion;
    localidad: string;
    manzana: string;
    cantidadProducto: number | null;
    unidadProducto: string | null;
    tipoCuerpoAgua: string | null;
    responsable: string;
    latitud: number | null;
    longitud: number | null;
}

export const COLUMNAS_EXPORTACION_INTERVENCIONES = [
    'id', 'realizada_en', 'tipo', 'localidad', 'manzana', 'cantidad_producto',
    'unidad_producto', 'tipo_cuerpo_agua', 'responsable', 'latitud', 'longitud',
];

export async function* generarExportacionIntervencionesService(
    usuario: UsuarioAutenticado,
    filtros: { localidadId?: number; desde?: Date; hasta?: Date },
): AsyncGenerator<unknown[]> {
    const localidadId = alcanceLocalidad(usuario, filtros.localidadId);
    const { desde, hasta } = resolverRango(filtros.desde, filtros.hasta);
    const decimales = ROLES_COORDENADAS_EXACTAS.includes(usuario.rol) ? 6 : 3;
    const filtroLocalidad = localidadId === null ? Prisma.empty : Prisma.sql`AND m."localidadId" = ${localidadId}`;

    let ultimo: { realizadaEn: Date; id: string } | null = null;

    while (true) {
        const desdeUltimo: Prisma.Sql = ultimo
            ? Prisma.sql`AND (i."realizadaEn", i."id") > (${ultimo.realizadaEn}, ${ultimo.id}::uuid)`
            : Prisma.empty;

        const filas: FilaExportacionIntervencion[] = await prisma.$queryRaw<FilaExportacionIntervencion[]>`
            SELECT i."id", i."realizadaEn", i."tipo", l."nombre" AS "localidad", m."codigo" AS "manzana",
                   i."cantidadProducto", i."unidadProducto", i."tipoCuerpoAgua",
                   u."nombre" || ' ' || u."apellido" AS "responsable",
                   ROUND(ST_Y(i."ubicacion"::geometry)::numeric, ${decimales}::int)::float8 AS "latitud",
                   ROUND(ST_X(i."ubicacion"::geometry)::numeric, ${decimales}::int)::float8 AS "longitud"
            FROM "intervencion" i
            JOIN "manzana" m ON m."id" = i."manzanaId"
            JOIN "localidad" l ON l."id" = m."localidadId"
            JOIN "usuario" u ON u."id" = i."usuarioId"
            WHERE i."realizadaEn" BETWEEN ${desde} AND ${hasta}
            ${filtroLocalidad}
            ${desdeUltimo}
            ORDER BY i."realizadaEn", i."id"
            LIMIT ${TAMANO_LOTE_EXPORTACION}
        `;

        for (const fila of filas) {
            yield [
                fila.id, fila.realizadaEn, fila.tipo, fila.localidad, fila.manzana, fila.cantidadProducto,
                fila.unidadProducto, fila.tipoCuerpoAgua, fila.responsable, fila.latitud, fila.longitud,
            ];
        }

        const ultimaFila = filas[filas.length - 1];
        if (filas.length < TAMANO_LOTE_EXPORTACION || !ultimaFila) return;
        ultimo = { realizadaEn: ultimaFila.realizadaEn, id: ultimaFila.id };
    }
}
