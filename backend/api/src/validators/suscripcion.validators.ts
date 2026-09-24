import { body } from 'express-validator';

export const validarGuardarSuscripcion = [
    body('endpoint')
        .isURL({ protocols: ['https'], require_protocol: true, require_tld: true })
        .withMessage('endpoint debe ser una URL https')
        .isLength({ max: 1000 }),
    body('keys.p256dh').isBase64({ urlSafe: true }).isLength({ min: 20, max: 200 }).withMessage('keys.p256dh inválida'),
    body('keys.auth').isBase64({ urlSafe: true }).isLength({ min: 8, max: 100 }).withMessage('keys.auth inválida'),
    body('localidadId').optional().isInt({ min: 1 }).withMessage('localidadId inválido').toInt(),
];

export const validarEliminarSuscripcion = [
    body('endpoint').isURL({ protocols: ['https'], require_protocol: true }).withMessage('endpoint inválido'),
];
