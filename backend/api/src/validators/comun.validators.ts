import { body, param, query } from 'express-validator';
import entorno from '../config/entorno.js';
import { LIMITE_MAXIMO, LIMITE_POR_DEFECTO } from '../utils/paginacion.js';

const { LIMITES_PROVINCIA } = entorno;

export const validarPaginacion = [
    query('limite').optional().isInt({ min: 1, max: LIMITE_MAXIMO }).withMessage(`limite debe estar entre 1 y ${LIMITE_MAXIMO}`).toInt(),
    query('cursor').optional().isString().isLength({ max: 100 }).withMessage('cursor inválido'),
];

export const limiteDeConsulta = (valor: unknown): number => (typeof valor === 'number' ? valor : LIMITE_POR_DEFECTO);

export const validarRangoFechas = [
    query('desde').optional().isISO8601({ strict: true }).withMessage('desde debe ser una fecha ISO 8601').toDate(),
    query('hasta').optional().isISO8601({ strict: true }).withMessage('hasta debe ser una fecha ISO 8601').toDate(),
];

export const validarLocalidadConsulta = query('localidadId').optional().isInt({ min: 1 }).withMessage('localidadId inválido').toInt();

export const validarIdUuid = param('id').isUUID(4).withMessage('El id no es válido');

export const validarIdEntero = param('id').isInt({ min: 1 }).withMessage('El id no es válido').toInt();

// Coordenadas acotadas al territorio de la provincia de Formosa.
export const validarLatitud = (campo: string, ubicacion = body) => ubicacion(campo)
    .isFloat({ min: LIMITES_PROVINCIA.latitudMinima, max: LIMITES_PROVINCIA.latitudMaxima })
    .withMessage(`${campo} debe estar dentro de la provincia de Formosa`)
    .toFloat();

export const validarLongitud = (campo: string, ubicacion = body) => ubicacion(campo)
    .isFloat({ min: LIMITES_PROVINCIA.longitudMinima, max: LIMITES_PROVINCIA.longitudMaxima })
    .withMessage(`${campo} debe estar dentro de la provincia de Formosa`)
    .toFloat();
