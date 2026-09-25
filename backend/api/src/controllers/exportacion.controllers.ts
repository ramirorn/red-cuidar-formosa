import type { Response } from 'express';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { matchedData } from 'express-validator';
import type { AuthRequest } from '../middlewares/autenticacion.middleware.js';
import { registrarAuditoriaService } from '../services/auditoria.services.js';
import {
    COLUMNAS_EXPORTACION_INTERVENCIONES,
    generarExportacionIntervencionesService,
} from '../services/intervencion.services.js';
import { COLUMNAS_EXPORTACION_REPORTES, generarExportacionReportesService } from '../services/reporte.services.js';
import type { UsuarioAutenticado } from '../middlewares/autenticacion.middleware.js';
import { alcanceLocalidad } from '../utils/alcance.js';
import { filaCsv } from '../utils/csv.js';
import { responderError } from '../utils/errorHttp.js';
import { resolverRango } from '../utils/rangoFechas.js';

type Generador = (usuario: UsuarioAutenticado, filtros: Record<string, any>) => AsyncGenerator<unknown[]>;

// Transmite el CSV fila por fila: la memoria usada no depende del tamaño del informe.
const exportarCsv = (recurso: string, columnas: string[], generar: Generador) => async (req: AuthRequest, res: Response) => {
    const filtros = matchedData(req, { locations: ['query'] });
    const usuario = req.usuario!;

    try {
        // Se validan alcance y rango antes de enviar encabezados, para poder responder 400/403.
        alcanceLocalidad(usuario, filtros.localidadId);
        const rango = resolverRango(filtros.desde, filtros.hasta);

        await registrarAuditoriaService({
            usuarioId: usuario.id,
            accion: 'EXPORTAR_CSV',
            recurso,
            filtros: {
                localidadId: filtros.localidadId ?? null,
                desde: rango.desde.toISOString(),
                hasta: rango.hasta.toISOString(),
            },
            ...(req.ip ? { ip: req.ip } : {}),
        });

        const fecha = new Date().toISOString().slice(0, 10);
        res.status(200);
        res.set({
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="${recurso}-${fecha}.csv"`,
            'Cache-Control': 'no-store',
        });

        // pipeline respeta la contrapresión del socket y, si el cliente corta la descarga,
        // cierra el generador (y con él las consultas por lotes) en lugar de quedar esperando.
        async function* lineas() {
            // BOM para que las planillas de cálculo reconozcan UTF-8 (tildes y eñes).
            yield '\uFEFF' + filaCsv(columnas);
            for await (const fila of generar(usuario, filtros)) yield filaCsv(fila);
        }
        await pipeline(Readable.from(lineas()), res);

    } catch (error) {
        if (res.headersSent) {
            // Una descarga cancelada por el cliente no es un error del servidor.
            if ((error as NodeJS.ErrnoException)?.code !== 'ERR_STREAM_PREMATURE_CLOSE') console.error(error);
            res.destroy();
            return;
        }
        responderError(res, error);
    }
};

export const exportarReportes = exportarCsv('reportes', COLUMNAS_EXPORTACION_REPORTES, generarExportacionReportesService);

export const exportarIntervenciones = exportarCsv(
    'intervenciones',
    COLUMNAS_EXPORTACION_INTERVENCIONES,
    generarExportacionIntervencionesService,
);
