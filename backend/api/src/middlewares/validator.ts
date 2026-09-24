import type { Request, Response, NextFunction } from 'express';
import { validationResult } from 'express-validator';

// Corta la petición con 400 si alguna regla de express-validator falló.
export const validarCampos = (req: Request, res: Response, next: NextFunction): void => {
    const errores = validationResult(req);

    if (!errores.isEmpty()) {
        res.status(400).json({
            status: 'error',
            message: 'Los datos enviados no son válidos',
            errors: errores.array().map((error) => ({
                campo: error.type === 'field' ? error.path : error.type,
                mensaje: error.msg,
            })),
        });
        return;
    }

    next();
};
