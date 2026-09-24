import type { Response } from 'express';
import { matchedData } from 'express-validator';
import type { AuthRequest } from '../middlewares/autenticacion.middleware.js';
import {
    cambiarEstadoRutaService,
    generarRutaService,
    listarRutasService,
    marcarParadaVisitadaService,
    obtenerRutaService,
    type DatosNuevaRuta,
    type FiltrosRutas,
} from '../services/ruta.services.js';
import { responderError } from '../utils/errorHttp.js';
import { limiteDeConsulta } from '../validators/comun.validators.js';

export const generarRuta = async (req: AuthRequest, res: Response) => {
    const datos = matchedData(req, { locations: ['body'] }) as DatosNuevaRuta;

    try {
        const ruta = await generarRutaService(req.usuario!, datos);

        res.status(201).json({
            status: 'success',
            data: ruta,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const listarRutas = async (req: AuthRequest, res: Response) => {
    const filtros = matchedData(req, { locations: ['query'] });

    try {
        const { datos, paginacion } = await listarRutasService(req.usuario!, {
            ...filtros,
            limite: limiteDeConsulta(filtros.limite),
        } as FiltrosRutas);

        res.status(200).json({
            status: 'success',
            data: datos,
            pagination: paginacion,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const obtenerRuta = async (req: AuthRequest, res: Response) => {
    const { id } = matchedData(req, { locations: ['params'] });

    try {
        const ruta = await obtenerRutaService(req.usuario!, id);

        res.status(200).json({
            status: 'success',
            data: ruta,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const cambiarEstadoRuta = async (req: AuthRequest, res: Response) => {
    const { id } = matchedData(req, { locations: ['params'] });
    const { estado } = matchedData(req, { locations: ['body'] });

    try {
        const ruta = await cambiarEstadoRutaService(req.usuario!, id, estado);

        res.status(200).json({
            status: 'success',
            data: ruta,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const marcarParadaVisitada = async (req: AuthRequest, res: Response) => {
    const { id, paradaId } = matchedData(req, { locations: ['params'] });

    try {
        const parada = await marcarParadaVisitadaService(req.usuario!, id, paradaId);

        res.status(200).json({
            status: 'success',
            data: parada,
        });

    } catch (error) {
        responderError(res, error);
    }
};
