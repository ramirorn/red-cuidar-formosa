import type { Response } from 'express';
import { matchedData } from 'express-validator';
import type { AuthRequest } from '../middlewares/autenticacion.middleware.js';
import { eliminarSuscripcionService, guardarSuscripcionService } from '../services/suscripcion.services.js';
import { responderError } from '../utils/errorHttp.js';

export const guardarSuscripcion = async (req: AuthRequest, res: Response) => {
    const { endpoint, keys, localidadId } = matchedData(req, { locations: ['body'] });

    try {
        const suscripcion = await guardarSuscripcionService(req.sesion!.id, {
            endpoint,
            p256dh: keys.p256dh,
            auth: keys.auth,
            ...(localidadId !== undefined ? { localidadId } : {}),
        });

        res.status(201).json({
            status: 'success',
            data: suscripcion,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const eliminarSuscripcion = async (req: AuthRequest, res: Response) => {
    const { endpoint } = matchedData(req, { locations: ['body'] });

    try {
        await eliminarSuscripcionService(req.sesion!.id, endpoint);

        res.status(204).end();

    } catch (error) {
        responderError(res, error);
    }
};
