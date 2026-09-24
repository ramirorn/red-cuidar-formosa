import { body, query } from 'express-validator';
import { validarLatitud, validarLongitud } from './comun.validators.js';

export const validarListarManzanas = [
    validarLongitud('longitudMinima', query),
    validarLatitud('latitudMinima', query),
    validarLongitud('longitudMaxima', query),
    validarLatitud('latitudMaxima', query),
];

export const validarRecalcularEstados = [
    body('localidadId').optional().isInt({ min: 1 }).withMessage('localidadId inválido').toInt(),
];
