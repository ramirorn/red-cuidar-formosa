import type { Request, Response } from 'express';
import { crearSesionService } from '../services/sesion.services.js';
import { responderError } from '../utils/errorHttp.js';

export const crearSesion = async (_req: Request, res: Response) => {
    try {
        const sesion = await crearSesionService();

        res.status(201).json({
            status: 'success',
            data: sesion,
        });

    } catch (error) {
        responderError(res, error);
    }
};
