import { Prisma, type ClaseObjeto, type EstadoReporte, type OrigenReporte, type TipoReporte } from '@prisma/client';
import prisma from '../config/prisma.js';
import { esRolProvincial, PERMISOS, tienePermiso } from '../config/permisos.js';
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
import { borrarFotosDeReportesService, venceEn } from './evidencia.services.js';
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
    manzanaId: number;
    capturadoEn: Date;
    confianzaIa?: number;
    descripcion?: string;
    idClienteResuelto?: string;
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

const buscarPorIdCliente = (idCliente: string) => prisma.reporte.findUnique({
    where: { idCliente },
    select: seleccionResumen,
});

// ---------------------------------------------------------------------------
// Ciudadanía: recepción de evidencia y sincronización
// ---------------------------------------------------------------------------

// Idempotente por idCliente: la PWA puede reintentar el envío desde su cola de Background Sync
// cuantas veces quiera y el reporte se crea una única vez.
// Privacidad: la sesión solo autentica el envío (y limita la tasa); no se guarda en el reporte.
export const crearReporteService = async (sesionId: string, datos: DatosReporte, archivos: Express.Multer.File[]) => {
    const existente = await buscarPorIdCliente(datos.idCliente);
    if (existente) return { reporte: existente, creado: false };

    if (archivos.length === 0) {
        throw new ErrorHttp(400, 'Debe adjuntar al menos una imagen como evidencia');
    }

    // Los reportes fuera de las manzanas registradas no se admiten.
    const manzana = await prisma.manzana.findUnique({ where: { id: datos.manzanaId }, select: { id: true } });
    if (!manzana) throw new ErrorHttp(422, 'La ubicación no corresponde a ninguna manzana registrada');

    // El criadero a cerrar se identifica con su idCliente (solo lo conoce quien lo reportó).
    // Se cierra recién cuando una persona valide la limpieza.
    let reporteResueltoId: string | null = null;
    if (datos.idClienteResuelto) {
        const reporteAResolver = await prisma.reporte.findFirst({
            where: {
                idCliente: datos.idClienteResuelto,
                tipo: { in: TIPOS_PELIGRO },
                estado: { in: ['PENDIENTE', 'VALIDADO'] },
            },
            select: { id: true },
        });
        if (!reporteAResolver) {
            throw new ErrorHttp(422, 'El reporte que se intenta resolver no existe o no admite cierre');
        }
        reporteResueltoId = reporteAResolver.id;
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
        return resolverConflictoDeImagen(datos.idCliente);
    }

    const rutas: string[] = [];
    try {
        for (const imagen of imagenes) {
            rutas.push(await guardarImagenService(imagen.contenido));
        }

        const momento = datos.tipo === 'LIMPIEZA' ? 'DESPUES' : 'ANTES';

        const resultado = await prisma.$transaction(async (tx) => {
            const creado = await tx.reporte.create({
                data: {
                    idCliente: datos.idCliente,
                    manzanaId: datos.manzanaId,
                    tipo: datos.tipo,
                    origen: datos.origen ?? 'PWA',
                    estado: 'PENDIENTE',
                    confianzaIa: datos.confianzaIa ?? null,
                    descripcion: datos.descripcion ?? null,
                    reporteResueltoId,
                    capturadoEn: datos.capturadoEn,
                    evidencias: {
                        create: imagenes.map((imagen, indice) => ({
                            rutaAlmacenamiento: rutas[indice] as string,
                            mime: imagen.mime,
                            tamanoBytes: imagen.tamanoBytes,
                            sha256: imagen.sha256,
                            ancho: imagen.ancho,
                            alto: imagen.alto,
                            momento,
                        })),
                    },
                    detecciones: {
                        create: datos.detecciones.map((deteccion) => ({
                            clase: deteccion.clase,
                            confianza: deteccion.confianza,
                            cajaDelimitadora: deteccion.cajaDelimitadora,
                        })),
                    },
                },
                select: { id: true },
            });

            // Un reporte pendiente no pinta de rojo ni de verde: a lo sumo deja la manzana en AMARILLO ("revisar").
            await tx.manzana.update({ where: { id: datos.manzanaId }, data: { ultimoReporteEn: new Date() } });
            const { cambio } = await recalcularEstadoManzanaService(tx, datos.manzanaId, {
                motivo: `Reporte ciudadano de ${datos.tipo.toLowerCase()}`,
                reporteId: creado.id,
            });

            return { id: creado.id, huboCambioDeEstado: cambio };
        });

        await registrarActividadSesionService(sesionId);
        if (resultado.huboCambioDeEstado) await invalidarCacheMapaCalorService();

        const reporte = await prisma.reporte.findUniqueOrThrow({ where: { id: resultado.id }, select: seleccionResumen });
        return { reporte, creado: true };
    } catch (error) {
        await eliminarImagenesService(rutas);
        // P2002: otro reintento simultáneo del mismo reporte (idCliente) o una foto ya usada (sha256).
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return resolverConflictoDeImagen(datos.idCliente);
        }
        throw error;
    }
};

// Una foto repetida puede venir de otro reporte (se rechaza) o de un reintento simultáneo del
// mismo reporte que se guardó un instante antes (se responde como reintento exitoso).
const resolverConflictoDeImagen = async (idCliente: string) => {
    const mismoReporte = await buscarPorIdCliente(idCliente);
    if (mismoReporte) return { reporte: mismoReporte, creado: false };
    throw new ErrorHttp(409, 'Una de las imágenes ya fue enviada en otro reporte');
};

// "Mis reportes": el celular guarda los idCliente de lo que envió y pregunta por ellos.
// Sin sesión en el reporte, el servidor no puede saber qué reportes son de la misma persona.
// Los descartados por vencimiento simplemente no aparecen.
export const consultarMisReportesService = async (idsCliente: string[]) => prisma.reporte.findMany({
    where: { idCliente: { in: idsCliente } },
    select: seleccionResumen,
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
});

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
            evidencias: {
                where: { rutaAlmacenamiento: { not: null } },
                select: { id: true, momento: true, ancho: true, alto: true, createdAt: true },
            },
        },
    });

    if (!reporte) throw new ErrorHttp(404, 'Recurso no encontrado');
    verificarAlcance(usuario, reporte.manzana.localidadId);

    // Las fotos solo existen mientras el reporte espera validación, y solo las ve Epidemiología.
    const puedeVerFotos = tienePermiso(usuario.rol, PERMISOS.EVIDENCIAS_VER) && reporte.estado === 'PENDIENTE';

    return {
        ...reporte,
        evidencias: puedeVerFotos ? reporte.evidencias : [],
        venceEn: reporte.estado === 'PENDIENTE' ? venceEn(reporte.createdAt) : null,
    };
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
        verificarAlcance(usuario, reporte.manzana.localidadId);

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
        manzanasAfectadas.add(reporte.manzanaId);

        // Validar una limpieza cierra el criadero que el vecino indicó, si sigue abierto y está en el alcance
        // de quien valida. La condición sobre el estado evita reabrir un criadero rechazado mientras tanto.
        const criadero = reporte.reporteResuelto;
        const reportesDecididos = [id];
        if (nuevoEstado === 'VALIDADO' && reporte.tipo === 'LIMPIEZA' && criadero
            && (esRolProvincial(usuario.rol) || criadero.manzana.localidadId === usuario.localidadId)) {
            const cierre = await tx.reporte.updateMany({
                where: { id: criadero.id, estado: { in: ['PENDIENTE', 'VALIDADO'] } },
                data: { estado: 'RESUELTO', validadoPorId: usuario.id, validadoEn: new Date() },
            });
            if (cierre.count > 0) {
                manzanasAfectadas.add(criadero.manzanaId);
                reportesDecididos.push(criadero.id);
            }
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

        return { id, estado: nuevoEstado, cambioManzana, reportesDecididos };
    });

    // Decidido el reporte, su foto ya no hace falta: se borra (también la del criadero que se cerró).
    await borrarFotosDeReportesService(resultado.reportesDecididos);
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
    localidad: string;
    manzana: string;
}

export const COLUMNAS_EXPORTACION_REPORTES = [
    'id', 'recibido_en', 'capturado_en', 'tipo', 'estado', 'origen',
    'confianza_ia', 'localidad', 'manzana',
];

// Recorre los reportes por lotes con paginación keyset para no cargar todo en memoria.
// Los reportes de vecinos no tienen ubicación exacta ni sesión: se exporta solo la manzana.
export async function* generarExportacionReportesService(
    usuario: UsuarioAutenticado,
    filtros: { localidadId?: number; desde?: Date; hasta?: Date },
): AsyncGenerator<unknown[]> {
    const localidadId = alcanceLocalidad(usuario, filtros.localidadId);
    const { desde, hasta } = resolverRango(filtros.desde, filtros.hasta);
    const filtroLocalidad = localidadId === null ? Prisma.empty : Prisma.sql`AND m."localidadId" = ${localidadId}`;

    let ultimo: { createdAt: Date; id: string } | null = null;

    while (true) {
        const desdeUltimo: Prisma.Sql = ultimo
            ? Prisma.sql`AND (r."createdAt", r."id") > (${ultimo.createdAt}, ${ultimo.id}::uuid)`
            : Prisma.empty;

        const filas: FilaExportacionReporte[] = await prisma.$queryRaw<FilaExportacionReporte[]>`
            SELECT r."id", r."createdAt", r."capturadoEn", r."tipo", r."estado", r."origen", r."confianzaIa",
                   l."nombre" AS "localidad", m."codigo" AS "manzana"
            FROM "reporte" r
            JOIN "manzana" m ON m."id" = r."manzanaId"
            JOIN "localidad" l ON l."id" = m."localidadId"
            WHERE r."createdAt" BETWEEN ${desde} AND ${hasta}
            ${filtroLocalidad}
            ${desdeUltimo}
            ORDER BY r."createdAt", r."id"
            LIMIT ${TAMANO_LOTE_EXPORTACION}
        `;

        for (const fila of filas) {
            yield [
                fila.id, fila.createdAt, fila.capturadoEn, fila.tipo, fila.estado, fila.origen,
                fila.confianzaIa, fila.localidad, fila.manzana,
            ];
        }

        const ultimaFila = filas[filas.length - 1];
        if (filas.length < TAMANO_LOTE_EXPORTACION || !ultimaFila) return;
        ultimo = { createdAt: ultimaFila.createdAt, id: ultimaFila.id };
    }
}
