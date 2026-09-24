import { query } from 'express-validator';
import { validarPaginacion, validarRangoFechas } from './comun.validators.js';

export const validarListarAuditoria = [
    ...validarPaginacion,
    ...validarRangoFechas,
    query('usuarioId').optional().isInt({ min: 1 }).withMessage('usuarioId inválido').toInt(),
    query('accion').optional().isString().isLength({ max: 60 }).matches(/^[A-Z_]+$/).withMessage('accion inválida'),
];
