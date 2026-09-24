import type { Response } from 'express';
import { matchedData } from 'express-validator';
import type { AuthRequest } from '../middlewares/autenticacion.middleware.js';
import { obtenerMetricasService } from '../services/metrica.services.js';
import { obtenerMapaCalorService } from '../services/mapaCalor.services.js';
import { responderError } from '../utils/errorHttp.js';

export const obtenerMetricas = async (req: AuthRequest, res: Response) => {
    const filtros = matchedData(req, { locations: ['query'] });

    try {
        const metricas = await obtenerMetricasService(req.usuario!, filtros);

        res.status(200).json({
            status: 'success',
            data: metricas,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const obtenerMapaCalor = async (req: AuthRequest, res: Response) => {
    const filtros = matchedData(req, { locations: ['query'] });

    try {
        const mapa = await obtenerMapaCalorService(req.usuario!, filtros);

        res.status(200).json({
            status: 'success',
            data: mapa,
        });

    } catch (error) {
        responderError(res, error);
    }
};
