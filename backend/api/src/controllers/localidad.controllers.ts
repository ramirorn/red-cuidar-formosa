import type { Request, Response } from 'express';
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
