import type { Response } from 'express';
import { matchedData } from 'express-validator';
import type { AuthRequest } from '../middlewares/autenticacion.middleware.js';
import { obtenerArchivoEvidenciaService } from '../services/evidencia.services.js';
import { responderError } from '../utils/errorHttp.js';

export const obtenerImagenEvidencia = async (req: AuthRequest, res: Response) => {
    const { id } = matchedData(req, { locations: ['params'] });

    try {
        const { ruta, mime } = await obtenerArchivoEvidenciaService(req.usuario!, id);

        res.set('Cache-Control', 'private, max-age=300');
        res.type(mime);
        res.sendFile(ruta, (error) => {
            if (error && !res.headersSent) {
                res.status(404).json({ status: 'error', message: 'Recurso no encontrado' });
            }
        });

    } catch (error) {
        responderError(res, error);
    }
};
