import { readdir, rmdir, stat } from 'node:fs/promises';
import path from 'node:path';
import prisma from '../config/prisma.js';
import type { UsuarioAutenticado } from '../middlewares/autenticacion.middleware.js';
import { verificarAlcance } from '../utils/alcance.js';
import { ErrorHttp } from '../utils/errorHttp.js';
import { directorioEvidencias, eliminarImagenesService, rutaAbsolutaEvidencia } from './almacenamiento.services.js';
import { recalcularEstadoManzanaService } from './manzana.services.js';
import { invalidarCacheMapaCalorService } from './mapaCalor.services.js';

// Privacidad por diseño: la foto de un vecino existe solo mientras hace falta para validar su reporte.
// - Se borra en cuanto Epidemiología decide (valida o rechaza).
// - Un reporte que nadie revisó en 72 horas se descarta entero (foto y reporte).
// - A las 48 horas el panel avisa que el reporte está por vencer.
export const VIGENCIA_PENDIENTE_MS = 72 * 60 * 60 * 1000;
export const AVISO_ANTES_DE_VENCER_MS = 24 * 60 * 60 * 1000;

export const venceEn = (creadoEn: Date) => new Date(creadoEn.getTime() + VIGENCIA_PENDIENTE_MS);

// Las fotos nunca se sirven como archivos estáticos públicos: cada descarga pasa por
// autenticación, permiso y alcance territorial del reporte al que pertenecen.
export const obtenerArchivoEvidenciaService = async (usuario: UsuarioAutenticado, id: string) => {
    const evidencia = await prisma.evidencia.findUnique({
        where: { id },
        select: {
            rutaAlmacenamiento: true,
            mime: true,
            reporte: { select: { estado: true, manzana: { select: { localidadId: true } } } },
        },
    });

    // Una foto borrada (o de un reporte ya decidido) responde igual que una inexistente.
    if (!evidencia?.rutaAlmacenamiento || evidencia.reporte.estado !== 'PENDIENTE') throw new ErrorHttp(404, 'Recurso no encontrado');
    verificarAlcance(usuario, evidencia.reporte.manzana.localidadId);

    return { ruta: rutaAbsolutaEvidencia(evidencia.rutaAlmacenamiento), mime: evidencia.mime };
};

// Borra los archivos y deja el registro sin ruta: el hash sigue impidiendo reutilizar la misma foto.
export const borrarFotosDeReportesService = async (reporteIds: string[]): Promise<number> => {
    if (reporteIds.length === 0) return 0;
    const evidencias = await prisma.evidencia.findMany({
        where: { reporteId: { in: reporteIds }, rutaAlmacenamiento: { not: null } },
        select: { id: true, rutaAlmacenamiento: true },
    });
    if (evidencias.length === 0) return 0;

    // Primero se quita la ruta de la base (nadie más puede pedir la foto) y después se borra el archivo.
    await prisma.evidencia.updateMany({
        where: { id: { in: evidencias.map(({ id }) => id) } },
        data: { rutaAlmacenamiento: null, borradaEn: new Date() },
    });
    await eliminarImagenesService(evidencias.map(({ rutaAlmacenamiento }) => rutaAlmacenamiento as string));
    return evidencias.length;
};

// Descarta los reportes que nadie revisó a tiempo. Borra primero las fotos y después los reportes,
// y recalcula el color de las manzanas afectadas (un pendiente menos puede sacarla de "revisar").
export const descartarReportesVencidosService = async (ahora = new Date()) => {
    const limite = new Date(ahora.getTime() - VIGENCIA_PENDIENTE_MS);
    const vencidos = await prisma.reporte.findMany({
        where: { estado: 'PENDIENTE', createdAt: { lt: limite } },
        select: { id: true, manzanaId: true },
        take: 5000,
    });
    if (vencidos.length === 0) return { descartados: 0 };

    const ids = vencidos.map(({ id }) => id);
    await borrarFotosDeReportesService(ids);

    const manzanas = [...new Set(vencidos.map(({ manzanaId }) => manzanaId))].sort((a, b) => a - b);
    const cambioManzana = await prisma.$transaction(async (tx) => {
        // La condición sobre el estado respeta a quien lo haya validado en el último instante.
        await tx.reporte.deleteMany({ where: { id: { in: ids }, estado: 'PENDIENTE' } });
        let cambio = false;
        for (const manzanaId of manzanas) {
            const resultado = await recalcularEstadoManzanaService(tx, manzanaId, { motivo: 'Reportes vencidos sin revisar' });
            cambio ||= resultado.cambio;
        }
        return cambio;
    });

    if (cambioManzana) await invalidarCacheMapaCalorService();
    return { descartados: ids.length };
};

// Archivos en disco que ya no tienen registro (reportes borrados, datos anteriores, cortes a mitad de
// un envío). Solo se tocan archivos con más de una hora, para no pisar un envío en curso.
export const limpiarArchivosHuerfanosService = async (): Promise<number> => {
    const base = directorioEvidencias();
    const encontrados: string[] = [];

    const recorrer = async (directorio: string): Promise<void> => {
        const entradas = await readdir(directorio, { withFileTypes: true }).catch(() => []);
        for (const entrada of entradas) {
            const absoluta = path.join(directorio, entrada.name);
            if (entrada.isDirectory()) await recorrer(absoluta);
            else if (entrada.isFile() && entrada.name.endsWith('.jpg')) encontrados.push(path.relative(base, absoluta).split(path.sep).join('/'));
        }
    };
    await recorrer(base);
    if (encontrados.length === 0) return 0;

    const registrados = new Set(
        (await prisma.evidencia.findMany({ where: { rutaAlmacenamiento: { in: encontrados } }, select: { rutaAlmacenamiento: true } }))
            .map(({ rutaAlmacenamiento }) => rutaAlmacenamiento),
    );
    const haceUnaHora = Date.now() - 60 * 60 * 1000;
    const huerfanos: string[] = [];
    for (const relativa of encontrados) {
        if (registrados.has(relativa)) continue;
        const { mtimeMs } = await stat(path.join(base, relativa)).catch(() => ({ mtimeMs: Date.now() }));
        if (mtimeMs < haceUnaHora) huerfanos.push(relativa);
    }
    await eliminarImagenesService(huerfanos);

    // Directorios de meses que quedaron vacíos.
    const directorios = [...new Set(huerfanos.map((relativa) => path.dirname(path.join(base, relativa))))];
    await Promise.allSettled(directorios.map((directorio) => rmdir(directorio)));
    return huerfanos.length;
};
