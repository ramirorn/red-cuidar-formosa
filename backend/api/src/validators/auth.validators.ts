import { body } from 'express-validator';

export const validarLogin = [
    body('email').isEmail().withMessage('email inválido').isLength({ max: 254 }),
    body('password').isString().isLength({ min: 1, max: 128 }).withMessage('password inválida'),
];
