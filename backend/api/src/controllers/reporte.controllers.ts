import type { Response } from 'express';
import { matchedData } from 'express-validator';
import type { AuthRequest } from '../middlewares/autenticacion.middleware.js';
import {
    cambiarEstadoReporteService,
    crearReporteService,
    consultarMisReportesService,
    listarReportesService,
    obtenerReporteService,
    type DatosReporte,
    type FiltrosReportes,
} from '../services/reporte.services.js';
import { responderError } from '../utils/errorHttp.js';
import { limiteDeConsulta } from '../validators/comun.validators.js';

// ----- Ciudadanía -----

export const crearReporte = async (req: AuthRequest, res: Response) => {
    // matchedData devuelve solo los campos validados: lo demás que envíe el cliente se ignora.
    const datos = matchedData(req, { locations: ['body'] }) as DatosReporte;
    const archivos = (req.files ?? []) as Express.Multer.File[];

    try {
        const { reporte, creado } = await crearReporteService(req.sesion!.id, datos, archivos);

        res.status(creado ? 201 : 200).json({
            status: 'success',
            data: reporte,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const consultarMisReportes = async (req: AuthRequest, res: Response) => {
    const { idsCliente } = matchedData(req, { locations: ['body'] }) as { idsCliente: string[] };

    try {
        const reportes = await consultarMisReportesService(idsCliente);

        res.status(200).json({
            status: 'success',
            data: reportes,
        });

    } catch (error) {
        responderError(res, error);
    }
};

// ----- Institucional -----

export const listarReportes = async (req: AuthRequest, res: Response) => {
    const filtros = matchedData(req, { locations: ['query'] });

    try {
        const { datos, paginacion } = await listarReportesService(req.usuario!, {
            ...filtros,
            limite: limiteDeConsulta(filtros.limite),
        } as FiltrosReportes);

        res.status(200).json({
            status: 'success',
            data: datos,
            pagination: paginacion,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const obtenerReporte = async (req: AuthRequest, res: Response) => {
    const { id } = matchedData(req, { locations: ['params'] });

    try {
        const reporte = await obtenerReporteService(req.usuario!, id);

        res.status(200).json({
            status: 'success',
            data: reporte,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const cambiarEstadoReporte = async (req: AuthRequest, res: Response) => {
    const { id } = matchedData(req, { locations: ['params'] });
    const { estado, motivoRechazo } = matchedData(req, { locations: ['body'] });

    try {
        const reporte = await cambiarEstadoReporteService(req.usuario!, id, estado, motivoRechazo);

        res.status(200).json({
            status: 'success',
            data: reporte,
        });

    } catch (error) {
        responderError(res, error);
    }
};
