import { body } from 'express-validator';

export const validarMensajeChat = [
    body('mensaje').isString().trim().isLength({ min: 1, max: 1000 }).withMessage('mensaje debe tener entre 1 y 1000 caracteres'),
    body('historial').optional().isArray({ max: 10 }).withMessage('historial admite hasta 10 mensajes'),
    body('historial.*.rol').isIn(['usuario', 'asistente']).withMessage('rol del historial inválido'),
    body('historial.*.contenido').isString().isLength({ min: 1, max: 1000 }).withMessage('contenido del historial inválido'),
];
