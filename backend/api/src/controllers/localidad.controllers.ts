import type { Request, Response } from 'express';
import { matchedData } from 'express-validator';
import { listarManzanasDeLocalidadService } from '../services/manzana.services.js';
import { listarLocalidadesService } from '../services/localidad.services.js';
import { responderError } from '../utils/errorHttp.js';

export const listarLocalidades = async (_req: Request, res: Response) => {
    try {
        const localidades = await listarLocalidadesService();

        res.set('Cache-Control', 'public, max-age=3600');
        res.status(200).json({
            status: 'success',
            data: localidades,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const listarManzanasDeLocalidad = async (req: Request, res: Response) => {
    const { id } = matchedData(req, { locations: ['params'] });

    try {
        const manzanas = await listarManzanasDeLocalidadService(id);

        // El color de las manzanas cambia con los reportes: caché corta.
        res.set('Cache-Control', 'public, max-age=300');
        res.status(200).json({
            status: 'success',
            data: manzanas,
        });

    } catch (error) {
        responderError(res, error);
    }
};
