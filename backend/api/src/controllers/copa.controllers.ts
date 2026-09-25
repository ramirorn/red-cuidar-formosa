import type { Request, Response } from 'express';
import { matchedData } from 'express-validator';
import type { AuthRequest } from '../middlewares/autenticacion.middleware.js';
import { registrarAuditoriaService } from '../services/auditoria.services.js';
import {
    canjearPremioService,
    mesArgentino,
    obtenerPodioService,
    obtenerRankingInstitucionalService,
    obtenerSituacionZonaService,
    pedirPremioService,
} from '../services/copa.services.js';
import { responderError } from '../utils/errorHttp.js';

// ----- Público (PWA) -----

export const obtenerPodio = async (req: Request, res: Response) => {
    const { localidadId, mes } = matchedData(req, { locations: ['query'] });

    try {
        const podio = await obtenerPodioService(localidadId, mes ?? mesArgentino(new Date()));

        res.set('Cache-Control', 'public, max-age=60');
        res.status(200).json({
            status: 'success',
            data: podio,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const obtenerSituacionZona = async (req: Request, res: Response) => {
    const { id } = matchedData(req, { locations: ['params'] });
    const { mes } = matchedData(req, { locations: ['query'] });

    try {
        const situacion = await obtenerSituacionZonaService(id, mes ?? mesArgentino(new Date()));

        res.set('Cache-Control', 'public, max-age=60');
        res.status(200).json({
            status: 'success',
            data: situacion,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const pedirPremio = async (req: AuthRequest, res: Response) => {
    const { mes, idsCliente } = matchedData(req, { locations: ['body'] }) as { mes: string; idsCliente: string[] };

    try {
        const premio = await pedirPremioService(mes, idsCliente);

        res.status(200).json({
            status: 'success',
            data: premio,
        });

    } catch (error) {
        responderError(res, error);
    }
};

// ----- Institucional -----

export const obtenerRankingInstitucional = async (req: AuthRequest, res: Response) => {
    const { localidadId, mes } = matchedData(req, { locations: ['query'] });

    try {
        const ranking = await obtenerRankingInstitucionalService(req.usuario!, localidadId, mes ?? mesArgentino(new Date()));

        res.status(200).json({
            status: 'success',
            data: ranking,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const canjearPremio = async (req: AuthRequest, res: Response) => {
    const { codigo } = matchedData(req, { locations: ['body'] });

    try {
        const canje = await canjearPremioService(req.usuario!, codigo);
        await registrarAuditoriaService({
            usuarioId: req.usuario!.id,
            accion: 'CANJEAR_PREMIO',
            recurso: `premio:${canje.codigo}`,
            filtros: { edicion: canje.edicion, zona: canje.zona.nombre },
            ...(req.ip ? { ip: req.ip } : {}),
        });

        res.status(200).json({
            status: 'success',
            data: canje,
        });

    } catch (error) {
        responderError(res, error);
    }
};
