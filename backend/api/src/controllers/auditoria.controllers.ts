import type { Response } from 'express';
import { matchedData } from 'express-validator';
import type { AuthRequest } from '../middlewares/autenticacion.middleware.js';
import { listarAuditoriaService, type FiltrosAuditoria } from '../services/auditoria.services.js';
import { responderError } from '../utils/errorHttp.js';
import { limiteDeConsulta } from '../validators/comun.validators.js';

export const listarAuditoria = async (req: AuthRequest, res: Response) => {
    const filtros = matchedData(req, { locations: ['query'] });

    try {
        const { datos, paginacion } = await listarAuditoriaService({
            ...filtros,
            limite: limiteDeConsulta(filtros.limite),
        } as FiltrosAuditoria);

        res.status(200).json({
            status: 'success',
            data: datos,
            pagination: paginacion,
        });

    } catch (error) {
        responderError(res, error);
    }
};
