import type { Request, Response } from 'express';
import { matchedData } from 'express-validator';
import { enviarAlertaLluviaService, obtenerClavePublicaPushService } from '../services/notificacion.services.js';
import { responderError } from '../utils/errorHttp.js';

export const obtenerClavePublicaPush = (_req: Request, res: Response) => {
    try {
        res.status(200).json({
            status: 'success',
            data: { clavePublica: obtenerClavePublicaPushService() },
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const enviarAlertaLluvia = async (req: Request, res: Response) => {
    const { localidadId, precipitacionMm } = matchedData(req, { locations: ['body'] });

    try {
        const resultado = await enviarAlertaLluviaService(localidadId, precipitacionMm);

        res.status(200).json({
            status: 'success',
            data: resultado,
        });

    } catch (error) {
        responderError(res, error);
    }
};
