import { body, query } from 'express-validator';
import { Rol } from '@prisma/client';
import { validarIdEntero, validarPaginacion } from './comun.validators.js';

export const validarCrearUsuario = [
    body('nombre').isString().trim().isLength({ min: 2, max: 80 }).withMessage('nombre inválido'),
    body('apellido').isString().trim().isLength({ min: 2, max: 80 }).withMessage('apellido inválido'),
    body('email').isEmail().withMessage('email inválido').isLength({ max: 254 }),
    body('password')
        .isString()
        .isLength({ min: 12, max: 128 }).withMessage('password debe tener entre 12 y 128 caracteres')
        .matches(/[a-z]/).withMessage('password debe incluir una minúscula')
        .matches(/[A-Z]/).withMessage('password debe incluir una mayúscula')
        .matches(/\d/).withMessage('password debe incluir un número'),
    body('rol').isIn(Object.values(Rol)).withMessage('rol inválido'),
    body('localidadId').optional().isInt({ min: 1 }).withMessage('localidadId inválido').toInt(),
];

export const validarListarUsuarios = [
    ...validarPaginacion,
    query('rol').optional().isIn(Object.values(Rol)).withMessage('rol inválido'),
    query('localidadId').optional().isInt({ min: 1 }).withMessage('localidadId inválido').toInt(),
];

export const validarActualizarUsuario = [
    validarIdEntero,
    body('rol').optional().isIn(Object.values(Rol)).withMessage('rol inválido'),
    body('localidadId').optional({ values: 'undefined' }).custom((valor) => {
        if (valor === null || (Number.isInteger(valor) && valor > 0)) return true;
        throw new Error('localidadId debe ser un entero positivo o null');
    }),
    body('activo').optional().isBoolean({ strict: true }).withMessage('activo debe ser booleano'),
];

export const validarListarBrigadistas = [
    query('localidadId').optional().isInt({ min: 1 }).withMessage('localidadId inválido').toInt(),
];
