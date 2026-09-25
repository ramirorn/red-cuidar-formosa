import { body, param, query } from 'express-validator';

// Mes de la edición en hora de Argentina ("AAAA-MM"). Por defecto, el mes en curso.
const esMes = (campo: ReturnType<typeof query> | ReturnType<typeof body>) =>
    campo.matches(/^20\d{2}-(0[1-9]|1[0-2])$/).withMessage('El mes debe tener el formato AAAA-MM');

export const validarPodio = [
    query('localidadId').isInt({ min: 1 }).withMessage('localidadId es obligatorio').toInt(),
    esMes(query('mes').optional()),
];

export const validarSituacionZona = [
    param('id').isInt({ min: 1 }).withMessage('El id no es válido').toInt(),
    esMes(query('mes').optional()),
];

export const validarDesafiosZona = [
    param('id').isInt({ min: 1 }).withMessage('El id no es válido').toInt(),
];

export const validarPedirPremio = [
    esMes(body('mes')),
    body('idsCliente').isArray({ min: 1, max: 100 }).withMessage('idsCliente debe ser una lista de 1 a 100 identificadores'),
    body('idsCliente.*').isUUID(4).withMessage('Cada idCliente debe ser un UUID v4'),
];

export const validarRankingInstitucional = [
    query('localidadId').optional().isInt({ min: 1 }).withMessage('localidadId inválido').toInt(),
    esMes(query('mes').optional()),
];

export const validarCanje = [
    body('codigo').isString().trim().isLength({ min: 8, max: 40 }).withMessage('Ingresá el código del premio'),
];
