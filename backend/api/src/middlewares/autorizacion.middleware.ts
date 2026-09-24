import type { Response, NextFunction } from 'express';
import { tienePermiso, type Permiso } from '../config/permisos.js';
import type { AuthRequest } from './autenticacion.middleware.js';

// Debe usarse siempre después de verificarToken.
export const requierePermiso = (permiso: Permiso) => (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.usuario) {
        res.status(401).json({
            status: 'error',
            message: 'Acceso denegado. Usuario no autenticado.',
        });
        return;
    }

    if (!tienePermiso(req.usuario.rol, permiso)) {
        res.status(403).json({
            status: 'error',
            message: 'No tiene permisos para realizar esta acción.',
        });
        return;
    }

    next();
};
