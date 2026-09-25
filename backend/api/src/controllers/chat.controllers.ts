import type { Response } from 'express';
import { matchedData } from 'express-validator';
import type { AuthRequest } from '../middlewares/autenticacion.middleware.js';
import { enviarMensajeChatService, type MensajeHistorial } from '../services/chat.services.js';
import { responderError } from '../utils/errorHttp.js';

export const enviarMensajeChat = async (req: AuthRequest, res: Response) => {
    const { mensaje, historial } = matchedData(req, { locations: ['body'] });

    try {
        const resultado = await enviarMensajeChatService(
            req.sesion!.id,
            mensaje,
            ((historial ?? []) as MensajeHistorial[]).map(({ rol, contenido, firma }) => ({
                rol,
                contenido,
                ...(typeof firma === 'string' ? { firma } : {}),
            })),
        );

        res.status(200).json({
            status: 'success',
            data: resultado,
        });

    } catch (error) {
        responderError(res, error);
    }
};
