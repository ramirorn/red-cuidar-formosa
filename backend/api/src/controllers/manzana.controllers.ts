import type { Request, Response } from 'express';
import { matchedData } from 'express-validator';
import { listarManzanasService, recalcularEstadosService, type RecuadroMapa } from '../services/manzana.services.js';
import { invalidarCacheMapaCalorService } from '../services/mapaCalor.services.js';
import { responderError } from '../utils/errorHttp.js';

export const listarManzanas = async (req: Request, res: Response) => {
    const recuadro = matchedData(req, { locations: ['query'] }) as RecuadroMapa;

    try {
        const coleccion = await listarManzanasService(recuadro);

        // El mapa comunitario es público y tolera un minuto de desfase.
        res.set('Cache-Control', 'public, max-age=60');
        res.status(200).json({
            status: 'success',
            data: coleccion,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const recalcularEstados = async (req: Request, res: Response) => {
    const { localidadId } = matchedData(req, { locations: ['body'] });

    try {
        const resultado = await recalcularEstadosService(localidadId);
        if (resultado.actualizadas > 0) await invalidarCacheMapaCalorService();

        res.status(200).json({
            status: 'success',
            data: resultado,
        });

    } catch (error) {
        responderError(res, error);
    }
};
