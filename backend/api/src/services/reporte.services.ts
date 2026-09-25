import { Prisma, type ClaseObjeto, type EstadoReporte, type OrigenReporte, type TipoReporte } from '@prisma/client';
import prisma from '../config/prisma.js';
import { esRolProvincial, ROLES_COORDENADAS_EXACTAS } from '../config/permisos.js';
import type { UsuarioAutenticado } from '../middlewares/autenticacion.middleware.js';
import { alcanceLocalidad, verificarAlcance } from '../utils/alcance.js';
import { ErrorHttp } from '../utils/errorHttp.js';
import { armarPagina, decodificarCursor } from '../utils/paginacion.js';
import { resolverRango } from '../utils/rangoFechas.js';
import {
    eliminarImagenesService,
    guardarImagenService,
    procesarImagenService,
    type ImagenProcesada,
} from './almacenamiento.services.js';
import { recalcularEstadoManzanaService } from './manzana.services.js';
import { invalidarCacheMapaCalorService } from './mapaCalor.services.js';
import { registrarActividadSesionService } from './sesion.services.js';

// Todo reporte ciudadano entra PENDIENTE y solo lo valida una persona con permiso `reportes:validar`.
// La confianza de la IA la informa el propio dispositivo (el cliente la controla), así que solo se usa
// para priorizar la bandeja de revisión, nunca para cambiar el estado de una manzana.
const TIPOS_PELIGRO: TipoReporte[] = ['CRIADERO', 'MICROBASURAL'];

export interface DeteccionEntrada {
    clase: ClaseObjeto;
    confianza: number;
    cajaDelimitadora: { x: number; y: number; ancho: number; alto: number };
}

export interface DatosReporte {
    idCliente: string;
    tipo: TipoReporte;
    origen?: OrigenReporte;
    latitud: number;
    longitud: number;
    capturadoEn: Date;
    precisionGpsM?: number;
    confianzaIa?: number;
    descripcion?: string;
    reporteResueltoId?: string;
    detecciones: DeteccionEntrada[];
}

const seleccionResumen = {
    id: true,
    idCliente: true,
    tipo: true,
    estado: true,
    capturadoEn: true,
    createdAt: true,
    manzana: { select: { id: true, codigo: true, estado: true } },
} satisfies Prisma.reporteSelect;

const buscarPorIdCliente = (sesionId: string, idCliente: string) => prisma.reporte.findUnique({
    where: { sesionId_idCliente: { sesionId, idCliente } },
    select: seleccionResumen,
});

// ---------------------------------------------------------------------------
// Ciudadanía: recepción de evidencia y sincronización
// ---------------------------------------------------------------------------

// Idempotente por (sesión, idCliente): la PWA puede reintentar el envío desde su cola
// de Background Sync cuantas veces quiera y el reporte se crea una única vez.
export const crearReporteService = async (sesionId: string, datos: DatosReporte, archivos: Express.Multer.File[]) => {
    const existente = await buscarPorIdCliente(sesionId, datos.idCliente);
    if (existente) return { reporte: existente, creado: false };

    if (archivos.length === 0) {
        throw new ErrorHttp(400, 'Debe adjuntar al menos una imagen como evidencia');
    }

    // El criadero a cerrar debe ser de la misma sesión; se cierra recién cuando una persona valide la limpieza.
    if (datos.reporteResueltoId) {
        const reporteAResolver = await prisma.reporte.findFirst({
            where: {
                id: datos.reporteResueltoId,
                sesionId,
                tipo: { in: TIPOS_PELIGRO },
                estado: { in: ['PENDIENTE', 'VALIDADO'] },
            },
            select: { id: true, manzanaId: true },
        });
        if (!reporteAResolver) {
            throw new ErrorHttp(422, 'El reporte que se intenta resolver no existe o no admite cierre');
        }
    }

    const imagenes: ImagenProcesada[] = [];
    for (const archivo of archivos) {
        imagenes.push(await procesarImagenService(archivo.buffer));
    }

    const hashes = imagenes.map((imagen) => imagen.sha256);
    if (new Set(hashes).size !== hashes.length) {
        throw new ErrorHttp(422, 'Se enviaron imágenes repetidas');
    }
    const imagenReutilizada = await prisma.evidencia.findFirst({ where: { sha256: { in: hashes } }, select: { id: true } });
    if (imagenReutilizada) {
        return resolverConflictoDeImagen(sesionId, datos.idCliente);
    }

    const rutas: string[] = [];
    try {
        for (const imagen of imagenes) {
            rutas.push(await guardarImagenService(imagen.contenido));
        }

        const estado: EstadoReporte = 'PENDIENTE';
        const momento = datos.tipo === 'LIMPIEZA' ? 'DESPUES' : 'ANTES';

        const resultado = await prisma.$transaction(async (tx) => {
            // ON CONFLICT cubre la carrera entre dos reintentos simultáneos del mismo reporte.
            const [insertado] = await tx.$queryRaw<{ id: string; manzanaId: number | null }[]>`
                INSERT INTO "reporte" (
                    "id", "idCliente", "sesionId", "manzanaId", "tipo", "origen", "estado", "ubicacion",
                    "precisionGpsM", "confianzaIa", "descripcion", "reporteResueltoId", "capturadoEn", "updatedAt"
                )
                VALUES (
                    gen_random_uuid(), ${datos.idCliente}::uuid, ${sesionId}::uuid,
                    (
                        SELECT m."id" FROM "manzana" m
                        WHERE ST_Contains(m."geom", ST_SetSRID(ST_MakePoint(${datos.longitud}::float8, ${datos.latitud}::float8), 4326))
                        LIMIT 1
                    ),
                    ${datos.tipo}::"TipoReporte", ${datos.origen ?? 'PWA'}::"OrigenReporte", ${estado}::"EstadoReporte",
                    ST_SetSRID(ST_MakePoint(${datos.longitud}::float8, ${datos.latitud}::float8), 4326)::geography,
                    ${datos.precisionGpsM ?? null}::float8, ${datos.confianzaIa ?? null}::float8,
                    ${datos.descripcion ?? null}, ${datos.reporteResueltoId ?? null}::uuid,
                    ${datos.capturadoEn}, now()
                )
                ON CONFLICT ("sesionId", "idCliente") DO NOTHING
                RETURNING "id", "manzanaId"
            `;

            if (!insertado) return null;

            await tx.evidencia.createMany({
                data: imagenes.map((imagen, indice) => ({
                    reporteId: insertado.id,
                    rutaAlmacenamiento: rutas[indice] as string,
                    mime: imagen.mime,
                    tamanoBytes: imagen.tamanoBytes,
                    sha256: imagen.sha256,
                    ancho: imagen.ancho,
                    alto: imagen.alto,
                    momento,
                })),
            });

            if (datos.detecciones.length > 0) {
                await tx.deteccionIa.createMany({
                    data: datos.detecciones.map((deteccion) => ({
                        reporteId: insertado.id,
                        clase: deteccion.clase,
                        confianza: deteccion.confianza,
                        cajaDelimitadora: deteccion.cajaDelimitadora,
                    })),
                });
            }

            // Un reporte pendiente no pinta de rojo ni de verde: a lo sumo deja la manzana en AMARILLO ("revisar").
            let huboCambioDeEstado = false;
            if (insertado.manzanaId !== null) {
                await tx.manzana.update({
                    where: { id: insertado.manzanaId },
                    data: { ultimoReporteEn: new Date() },
                });
                const { cambio } = await recalcularEstadoManzanaService(tx, insertado.manzanaId, {
                    motivo: `Reporte ciudadano de ${datos.tipo.toLowerCase()}`,
                    reporteId: insertado.id,
                });
                huboCambioDeEstado = cambio;
            }

            return { id: insertado.id, huboCambioDeEstado };
        });

        if (!resultado) {
            // Otro reintento ganó la carrera: se descartan los archivos de este intento.
            await eliminarImagenesService(rutas);
            const reporte = await buscarPorIdCliente(sesionId, datos.idCliente);
            if (!reporte) throw new ErrorHttp(409, 'El reporte está siendo procesado');
            return { reporte, creado: false };
        }

        await registrarActividadSesionService(sesionId);
        if (resultado.huboCambioDeEstado) await invalidarCacheMapaCalorService();

        const reporte = await prisma.reporte.findUniqueOrThrow({ where: { id: resultado.id }, select: seleccionResumen });
        return { reporte, creado: true };
    } catch (error) {
        await eliminarImagenesService(rutas);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return resolverConflictoDeImagen(sesionId, datos.idCliente);
        }
        throw error;
    }
};

// Una foto repetida puede venir de otro reporte (se rechaza) o de un reintento simultáneo del
// mismo reporte que se guardó un instante antes (se responde como reintento exitoso).
const resolverConflictoDeImagen = async (sesionId: string, idCliente: string) => {
    const mismoReporte = await buscarPorIdCliente(sesionId, idCliente);
    if (mismoReporte) return { reporte: mismoReporte, creado: false };
    throw new ErrorHttp(409, 'Una de las imágenes ya fue enviada en otro reporte');
};

// Permite a la PWA conciliar su cola local con lo que el servidor ya recibió.
export const listarMisReportesService = async (sesionId: string, limite: number, cursor?: string) => {
    const reportes = await prisma.reporte.findMany({
        where: { sesionId },
        select: seleccionResumen,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        take: limite + 1,
        ...(cursor ? { cursor: { id: decodificarCursor(cursor) }, skip: 1 } : {}),
    });

    return armarPagina(reportes, limite);
};

// ---------------------------------------------------------------------------
// Dashboard institucional
// ---------------------------------------------------------------------------

export interface FiltrosReportes {
    estado?: EstadoReporte;
    tipo?: TipoReporte;
    localidadId?: number;
    manzanaId?: number;
    desde?: Date;
    hasta?: Date;
    orden?: 'recientes' | 'prioridad';
    limite: number;
    cursor?: string;
}

// "prioridad": primero lo que la IA del dispositivo detectó con más confianza (útil para la bandeja de pendientes).
const ORDEN_REPORTES: Record<'recientes' | 'prioridad', Prisma.reporteOrderByWithRelationInput[]> = {
    recientes: [{ createdAt: 'desc' }, { id: 'desc' }],
    prioridad: [{ confianzaIa: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'desc' }],
};

export const filtroAlcanceReportes = (localidadId: number | null): Prisma.reporteWhereInput =>
    localidadId === null ? {} : { manzana: { localidadId } };

export const listarReportesService = async (usuario: UsuarioAutenticado, filtros: FiltrosReportes) => {
    const localidadId = alcanceLocalidad(usuario, filtros.localidadId);
    const { desde, hasta } = resolverRango(filtros.desde, filtros.hasta);

    // Un único findMany con select anidado: Prisma resuelve las relaciones en lote (sin N+1).
    const reportes = await prisma.reporte.findMany({
        where: {
            ...filtroAlcanceReportes(localidadId),
            createdAt: { gte: desde, lte: hasta },
            ...(filtros.estado ? { estado: filtros.estado } : {}),
            ...(filtros.tipo ? { tipo: filtros.tipo } : {}),
            ...(filtros.manzanaId ? { manzanaId: filtros.manzanaId } : {}),
        },
        select: {
            id: true,
            tipo: true,
            origen: true,
            estado: true,
            confianzaIa: true,
            capturadoEn: true,
            createdAt: true,
            manzana: { select: { id: true, codigo: true, estado: true, localidadId: true } },
            _count: { select: { evidencias: true, detecciones: true } },
        },
        orderBy: ORDEN_REPORTES[filtros.orden ?? 'recientes'],
        take: filtros.limite + 1,
        ...(filtros.cursor ? { cursor: { id: decodificarCursor(filtros.cursor) }, skip: 1 } : {}),
    });

    return armarPagina(reportes, filtros.limite);
};

export const obtenerReporteService = async (usuario: UsuarioAutenticado, id: string) => {
    const reporte = await prisma.reporte.findUnique({
        where: { id },
        select: {
            id: true,
            tipo: true,
            origen: true,
            estado: true,
            precisionGpsM: true,
            confianzaIa: true,
            descripcion: true,
            capturadoEn: true,
            createdAt: true,
            validadoEn: true,
            motivoRechazo: true,
            reporteResueltoId: true,
            validadoPor: { select: { id: true, nombre: true, apellido: true } },
            manzana: { select: { id: true, codigo: true, estado: true, localidadId: true } },
            detecciones: { select: { clase: true, confianza: true, cajaDelimitadora: true } },
            evidencias: { select: { id: true, momento: true, ancho: true, alto: true, createdAt: true } },
        },
    });

    if (!reporte) throw new ErrorHttp(404, 'Recurso no encontrado');
    verificarAlcance(usuario, reporte.manzana?.localidadId);

    const [ubicacion] = await prisma.$queryRaw<{ latitud: number; longitud: number }[]>`
        SELECT ST_Y("ubicacion"::geometry) AS "latitud", ST_X("ubicacion"::geometry) AS "longitud"
        FROM "reporte" WHERE "id" = ${id}::uuid
    `;

    return { ...reporte, ubicacion: ubicacion ?? null };
};

// Transiciones permitidas del ciclo de vida de un reporte.
const TRANSICIONES: Record<EstadoReporte, EstadoReporte[]> = {
    PENDIENTE: ['VALIDADO', 'RECHAZADO'],
    VALIDADO: ['RESUELTO', 'RECHAZADO'],
    RECHAZADO: ['VALIDADO'],
    RESUELTO: [],
};

export const esTransicionValida = (actual: EstadoReporte, nuevo: EstadoReporte, tipo: TipoReporte): boolean =>
    TRANSICIONES[actual].includes(nuevo) && !(nuevo === 'RESUELTO' && !TIPOS_PELIGRO.includes(tipo));

export const cambiarEstadoReporteService = async (
    usuario: UsuarioAutenticado,
    id: string,
    nuevoEstado: EstadoReporte,
    motivoRechazo?: string,
) => {
    const resultado = await prisma.$transaction(async (tx) => {
        const reporte = await tx.reporte.findUnique({
            where: { id },
            select: {
                id: true,
                estado: true,
                tipo: true,
                manzanaId: true,
                manzana: { select: { localidadId: true } },
                reporteResuelto: { select: { id: true, manzanaId: true, manzana: { select: { localidadId: true } } } },
            },
        });

        if (!reporte) throw new ErrorHttp(404, 'Recurso no encontrado');
        verificarAlcance(usuario, reporte.manzana?.localidadId);

        if (!esTransicionValida(reporte.estado, nuevoEstado, reporte.tipo)) {
            throw new ErrorHttp(409, `No se puede pasar un reporte de ${reporte.estado} a ${nuevoEstado}`);
        }

        // La condición sobre el estado actual evita pisar un cambio concurrente de otro funcionario.
        const { count } = await tx.reporte.updateMany({
            where: { id, estado: reporte.estado },
            data: {
                estado: nuevoEstado,
                validadoPorId: usuario.id,
                validadoEn: new Date(),
                motivoRechazo: nuevoEstado === 'RECHAZADO' ? (motivoRechazo ?? null) : null,
            },
        });
        if (count === 0) throw new ErrorHttp(409, 'El reporte fue modificado por otro usuario; recargue e intente nuevamente');

        const manzanasAfectadas = new Set<number>();
        if (reporte.manzanaId !== null) manzanasAfectadas.add(reporte.manzanaId);

        // Validar una limpieza cierra el criadero que el vecino indicó, si sigue abierto y está en el alcance
        // de quien valida. La condición sobre el estado evita reabrir un criadero rechazado mientras tanto.
        const criadero = reporte.reporteResuelto;
        if (nuevoEstado === 'VALIDADO' && reporte.tipo === 'LIMPIEZA' && criadero
            && (esRolProvincial(usuario.rol) || criadero.manzana?.localidadId === usuario.localidadId)) {
            const cierre = await tx.reporte.updateMany({
                where: { id: criadero.id, estado: { in: ['PENDIENTE', 'VALIDADO'] } },
                data: { estado: 'RESUELTO', validadoPorId: usuario.id, validadoEn: new Date() },
            });
            if (cierre.count > 0 && criadero.manzanaId !== null) manzanasAfectadas.add(criadero.manzanaId);
        }

        // Se bloquean las manzanas siempre en el mismo orden para evitar interbloqueos entre transacciones.
        let cambioManzana = false;
        for (const manzanaId of [...manzanasAfectadas].sort((a, b) => a - b)) {
            const { cambio } = await recalcularEstadoManzanaService(tx, manzanaId, {
                motivo: `Reporte ${nuevoEstado.toLowerCase()} por personal institucional`,
                reporteId: id,
                usuarioId: usuario.id,
            });
            cambioManzana ||= cambio;
        }

        return { id, estado: nuevoEstado, cambioManzana };
    });

    if (resultado.cambioManzana) await invalidarCacheMapaCalorService();
    return { id: resultado.id, estado: resultado.estado };
};

// ---------------------------------------------------------------------------
// Exportación CSV
// ---------------------------------------------------------------------------

const TAMANO_LOTE_EXPORTACION = 1000;

interface FilaExportacionReporte {
    id: string;
    createdAt: Date;
    capturadoEn: Date;
    tipo: TipoReporte;
    estado: EstadoReporte;
    origen: string;
    confianzaIa: number | null;
    localidad: string | null;
    manzana: string | null;
    latitud: number;
    longitud: number;
}

export const COLUMNAS_EXPORTACION_REPORTES = [
    'id', 'recibido_en', 'capturado_en', 'tipo', 'estado', 'origen',
    'confianza_ia', 'localidad', 'manzana', 'latitud', 'longitud',
];

// Recorre los reportes por lotes con paginación keyset para no cargar todo en memoria.
// Nunca exporta el identificador de la sesión ciudadana y redondea la ubicación
// (3 decimales ≈ 110 m) salvo para los roles con acceso a coordenadas exactas.
export async function* generarExportacionReportesService(
    usuario: UsuarioAutenticado,
    filtros: { localidadId?: number; desde?: Date; hasta?: Date },
): AsyncGenerator<unknown[]> {
    const localidadId = alcanceLocalidad(usuario, filtros.localidadId);
    const { desde, hasta } = resolverRango(filtros.desde, filtros.hasta);
    const decimales = ROLES_COORDENADAS_EXACTAS.includes(usuario.rol) ? 6 : 3;
    const filtroLocalidad = localidadId === null ? Prisma.empty : Prisma.sql`AND m."localidadId" = ${localidadId}`;

    let ultimo: { createdAt: Date; id: string } | null = null;

    while (true) {
        const desdeUltimo: Prisma.Sql = ultimo
            ? Prisma.sql`AND (r."createdAt", r."id") > (${ultimo.createdAt}, ${ultimo.id}::uuid)`
            : Prisma.empty;

        const filas: FilaExportacionReporte[] = await prisma.$queryRaw<FilaExportacionReporte[]>`
            SELECT r."id", r."createdAt", r."capturadoEn", r."tipo", r."estado", r."origen", r."confianzaIa",
                   l."nombre" AS "localidad", m."codigo" AS "manzana",
                   ROUND(ST_Y(r."ubicacion"::geometry)::numeric, ${decimales}::int)::float8 AS "latitud",
                   ROUND(ST_X(r."ubicacion"::geometry)::numeric, ${decimales}::int)::float8 AS "longitud"
            FROM "reporte" r
            LEFT JOIN "manzana" m ON m."id" = r."manzanaId"
            LEFT JOIN "localidad" l ON l."id" = m."localidadId"
            WHERE r."createdAt" BETWEEN ${desde} AND ${hasta}
            ${filtroLocalidad}
            ${desdeUltimo}
            ORDER BY r."createdAt", r."id"
            LIMIT ${TAMANO_LOTE_EXPORTACION}
        `;

        for (const fila of filas) {
            yield [
                fila.id, fila.createdAt, fila.capturadoEn, fila.tipo, fila.estado, fila.origen,
                fila.confianzaIa, fila.localidad, fila.manzana, fila.latitud, fila.longitud,
            ];
        }

        const ultimaFila = filas[filas.length - 1];
        if (filas.length < TAMANO_LOTE_EXPORTACION || !ultimaFila) return;
        ultimo = { createdAt: ultimaFila.createdAt, id: ultimaFila.id };
    }
}
