import { Prisma, type EstadoManzana } from '@prisma/client';
import prisma from '../config/prisma.js';
import { ErrorHttp } from '../utils/errorHttp.js';

type ClienteBd = Prisma.TransactionClient | typeof prisma;

// ---------------------------------------------------------------------------
// Reglas de color de la manzana (mapa comunitario)
// ---------------------------------------------------------------------------

export const DIAS_VIGENCIA_LIMPIEZA = 7;
export const UMBRAL_LLUVIA_MM = 10;

export interface DatosEstadoManzana {
    tieneCriaderoActivo: boolean;
    tienePendientes: boolean;
    tieneActividad: boolean;
    ultimaLimpiezaEn: Date | null;
    lluviaPosteriorMm: number;
}

// - ROJO: hay un criadero o microbasural validado y sin resolver.
// - VERDE: limpieza validada o intervención (BTI / descacharrado) en los últimos 7 días,
//   sin lluvia fuerte posterior y sin reportes pendientes de revisión.
// - AMARILLO: hubo actividad, pero la limpieza venció, llovió después o hay pendientes.
// - SIN_DATOS: la manzana nunca tuvo reportes ni intervenciones.
export const calcularEstadoManzana = (datos: DatosEstadoManzana, ahora: Date = new Date()): EstadoManzana => {
    if (datos.tieneCriaderoActivo) return 'ROJO';

    const limpiezaVigente = datos.ultimaLimpiezaEn !== null
        && ahora.getTime() - datos.ultimaLimpiezaEn.getTime() <= DIAS_VIGENCIA_LIMPIEZA * 24 * 60 * 60 * 1000
        && datos.lluviaPosteriorMm < UMBRAL_LLUVIA_MM;

    if (limpiezaVigente && !datos.tienePendientes) return 'VERDE';
    if (datos.tieneActividad) return 'AMARILLO';
    return 'SIN_DATOS';
};

// ---------------------------------------------------------------------------
// Recalculo de estados
// ---------------------------------------------------------------------------

interface FilaEstadoManzana extends DatosEstadoManzana {
    id: number;
    estado: EstadoManzana;
}

export interface ContextoCambioEstado {
    motivo: string;
    reporteId?: string;
    intervencionId?: string;
    usuarioId?: number;
}

// Una sola consulta trae todo lo necesario para una o muchas manzanas (sin consultas N+1).
const obtenerDatosEstado = (bd: ClienteBd, filtro: Prisma.Sql) => bd.$queryRaw<FilaEstadoManzana[]>`
    SELECT
        m."id",
        m."estado",
        EXISTS (
            SELECT 1 FROM "reporte" r
            WHERE r."manzanaId" = m."id" AND r."estado" = 'VALIDADO' AND r."tipo" IN ('CRIADERO', 'MICROBASURAL')
        ) AS "tieneCriaderoActivo",
        EXISTS (
            SELECT 1 FROM "reporte" r WHERE r."manzanaId" = m."id" AND r."estado" = 'PENDIENTE'
        ) AS "tienePendientes",
        (
            EXISTS (SELECT 1 FROM "reporte" r WHERE r."manzanaId" = m."id")
            OR EXISTS (SELECT 1 FROM "intervencion" i WHERE i."manzanaId" = m."id")
        ) AS "tieneActividad",
        l."ultimaLimpiezaEn",
        COALESCE((
            SELECT SUM(rm."precipitacionMm")
            FROM "registroMeteorologico" rm
            WHERE rm."localidadId" = m."localidadId"
              AND rm."esPronostico" = false
              AND rm."observadoEn" > l."ultimaLimpiezaEn"
        ), 0)::float8 AS "lluviaPosteriorMm"
    FROM "manzana" m
    CROSS JOIN LATERAL (
        SELECT GREATEST(
            (SELECT MAX(r."capturadoEn") FROM "reporte" r
             WHERE r."manzanaId" = m."id" AND r."tipo" = 'LIMPIEZA' AND r."estado" = 'VALIDADO'),
            (SELECT MAX(i."realizadaEn") FROM "intervencion" i
             WHERE i."manzanaId" = m."id" AND i."tipo" IN ('APLICACION_BTI', 'DESCACHARRADO'))
        ) AS "ultimaLimpiezaEn"
    ) l
    WHERE ${filtro}
`;

// Recalcula una manzana dentro de la transacción que modificó sus reportes o intervenciones.
// Bloquea la fila para que dos reportes simultáneos no pisen el estado del otro.
export const recalcularEstadoManzanaService = async (
    tx: Prisma.TransactionClient,
    manzanaId: number,
    contexto: ContextoCambioEstado,
): Promise<{ anterior: EstadoManzana; nuevo: EstadoManzana; cambio: boolean }> => {
    await tx.$queryRaw`SELECT 1 FROM "manzana" WHERE "id" = ${manzanaId} FOR UPDATE`;

    const [fila] = await obtenerDatosEstado(tx, Prisma.sql`m."id" = ${manzanaId}`);
    if (!fila) throw new ErrorHttp(404, 'Manzana no encontrada');

    const nuevo = calcularEstadoManzana(fila);
    const cambio = nuevo !== fila.estado;

    await tx.manzana.update({
        where: { id: manzanaId },
        data: {
            ultimaLimpiezaEn: fila.ultimaLimpiezaEn,
            ...(cambio ? { estado: nuevo, estadoActualizadoEn: new Date() } : {}),
        },
    });

    if (cambio) {
        await tx.historialEstadoManzana.create({
            data: {
                manzanaId,
                estadoAnterior: fila.estado,
                estadoNuevo: nuevo,
                motivo: contexto.motivo,
                reporteId: contexto.reporteId ?? null,
                intervencionId: contexto.intervencionId ?? null,
                usuarioId: contexto.usuarioId ?? null,
            },
        });
    }

    return { anterior: fila.estado, nuevo, cambio };
};

// Recalculo masivo: lo dispara n8n tras una lluvia y una vez por día (vencimiento de limpiezas).
// Solo revisa manzanas con actividad; las SIN_DATOS cambian únicamente con un evento nuevo.
// No bloquea las filas mientras calcula: la actualización es condicional al estado leído, así que si
// otra transacción cambió la manzana en el medio (por ejemplo, validó un criadero y la pasó a ROJO),
// esa manzana se deja como está y no se pisa. Costo fijo: 1 lectura, 1 actualización y 1 inserción.
export const recalcularEstadosService = async (localidadId?: number) => {
    const filtro = localidadId === undefined
        ? Prisma.sql`m."estado" <> 'SIN_DATOS'`
        : Prisma.sql`m."estado" <> 'SIN_DATOS' AND m."localidadId" = ${localidadId}`;

    const filas = await obtenerDatosEstado(prisma, filtro);
    const ahora = new Date();
    const cambios = filas
        .map((fila) => ({ id: fila.id, anterior: fila.estado, nuevo: calcularEstadoManzana(fila, ahora) }))
        .filter((cambio) => cambio.nuevo !== cambio.anterior);

    if (cambios.length === 0) return { revisadas: filas.length, actualizadas: 0 };

    return prisma.$transaction(async (tx) => {
        const aplicados = await tx.$queryRaw<{ id: number; anterior: EstadoManzana; nuevo: EstadoManzana }[]>`
            UPDATE "manzana" AS m
            SET "estado" = v.nuevo::"EstadoManzana", "estadoActualizadoEn" = ${ahora}, "updatedAt" = ${ahora}
            FROM (
                SELECT unnest(${cambios.map((cambio) => cambio.id)}::int[]) AS id,
                       unnest(${cambios.map((cambio) => cambio.anterior)}::text[]) AS anterior,
                       unnest(${cambios.map((cambio) => cambio.nuevo)}::text[]) AS nuevo
            ) AS v
            WHERE m."id" = v.id AND m."estado" = v.anterior::"EstadoManzana"
            RETURNING m."id", v.anterior::"EstadoManzana" AS anterior, v.nuevo::"EstadoManzana" AS nuevo
        `;

        if (aplicados.length > 0) {
            await tx.historialEstadoManzana.createMany({
                data: aplicados.map((cambio) => ({
                    manzanaId: cambio.id,
                    estadoAnterior: cambio.anterior,
                    estadoNuevo: cambio.nuevo,
                    motivo: 'Recalculo programado (clima o vencimiento de limpieza)',
                })),
            });
        }

        return { revisadas: filas.length, actualizadas: aplicados.length };
    });
};

// ---------------------------------------------------------------------------
// Mapa comunitario público
// ---------------------------------------------------------------------------

export const AMPLITUD_MAXIMA_GRADOS = 0.1;
const MANZANAS_MAXIMAS_POR_CONSULTA = 5000;

export interface RecuadroMapa {
    longitudMinima: number;
    latitudMinima: number;
    longitudMaxima: number;
    latitudMaxima: number;
}

interface FilaManzanaMapa {
    id: number;
    codigo: string;
    estado: EstadoManzana;
    localidadId: number;
    geometria: unknown;
}

// Devuelve un GeoJSON con el color de cada manzana del recuadro visible.
// El recuadro se acota (~11 km) y la búsqueda usa el índice GIST de la geometría.
export const listarManzanasService = async (recuadro: RecuadroMapa) => {
    if (recuadro.longitudMinima >= recuadro.longitudMaxima || recuadro.latitudMinima >= recuadro.latitudMaxima) {
        throw new ErrorHttp(400, 'El recuadro del mapa no es válido');
    }

    if (recuadro.longitudMaxima - recuadro.longitudMinima > AMPLITUD_MAXIMA_GRADOS
        || recuadro.latitudMaxima - recuadro.latitudMinima > AMPLITUD_MAXIMA_GRADOS) {
        throw new ErrorHttp(400, 'El recuadro del mapa es demasiado amplio; acerque el mapa');
    }

    const filas = await prisma.$queryRaw<FilaManzanaMapa[]>`
        SELECT m."id", m."codigo", m."estado", m."localidadId",
               ST_AsGeoJSON(m."geom", 6)::json AS "geometria"
        FROM "manzana" m
        WHERE m."geom" && ST_MakeEnvelope(
            ${recuadro.longitudMinima}::float8, ${recuadro.latitudMinima}::float8,
            ${recuadro.longitudMaxima}::float8, ${recuadro.latitudMaxima}::float8, 4326)
        LIMIT ${MANZANAS_MAXIMAS_POR_CONSULTA}
    `;

    return {
        type: 'FeatureCollection',
        features: filas.map((fila) => ({
            type: 'Feature',
            id: fila.id,
            geometry: fila.geometria,
            properties: { codigo: fila.codigo, estado: fila.estado, localidadId: fila.localidadId },
        })),
    };
};
