import type { Response } from 'express';
import { matchedData } from 'express-validator';
import type { AuthRequest } from '../middlewares/autenticacion.middleware.js';
import {
    listarIntervencionesService,
    registrarIntervencionService,
    type DatosIntervencion,
    type FiltrosIntervenciones,
} from '../services/intervencion.services.js';
import { responderError } from '../utils/errorHttp.js';
import { limiteDeConsulta } from '../validators/comun.validators.js';

export const registrarIntervencion = async (req: AuthRequest, res: Response) => {
    const datos = matchedData(req, { locations: ['body'] }) as DatosIntervencion;

    try {
        const intervencion = await registrarIntervencionService(req.usuario!, datos);

        res.status(201).json({
            status: 'success',
            data: intervencion,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const listarIntervenciones = async (req: AuthRequest, res: Response) => {
    const filtros = matchedData(req, { locations: ['query'] });

    try {
        const { datos, paginacion } = await listarIntervencionesService(req.usuario!, {
            ...filtros,
            limite: limiteDeConsulta(filtros.limite),
        } as FiltrosIntervenciones);

        res.status(200).json({
            status: 'success',
            data: datos,
            pagination: paginacion,
        });

    } catch (error) {
        responderError(res, error);
    }
};
