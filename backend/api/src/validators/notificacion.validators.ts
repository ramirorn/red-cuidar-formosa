import { body } from 'express-validator';

export const validarAlertaLluvia = [
    body('localidadId').isInt({ min: 1 }).withMessage('localidadId inválido').toInt(),
    body('precipitacionMm').isFloat({ min: 0, max: 1000 }).withMessage('precipitacionMm inválida').toFloat(),
];
