import { body, param, query } from 'express-validator';
import { EstadoRuta } from '@prisma/client';
import { PARADAS_MAXIMAS } from '../services/ruta.services.js';
import { validarIdEntero, validarLatitud, validarLocalidadConsulta, validarLongitud, validarPaginacion } from './comun.validators.js';

const validarFecha = (campo: string, ubicacion = body) => ubicacion(campo)
    .isISO8601({ strict: true })
    .matches(/^\d{4}-\d{2}-\d{2}$/)
    .withMessage(`${campo} debe tener el formato AAAA-MM-DD`);

export const validarGenerarRuta = [
    validarFecha('fecha').custom((fecha: string) => {
        // Se admiten rutas desde ayer (diferencia horaria) hasta 30 días hacia adelante.
        const dia = new Date(`${fecha}T00:00:00Z`).getTime();
        const hoy = Date.now();
        if (dia < hoy - 2 * 24 * 60 * 60 * 1000 || dia > hoy + 30 * 24 * 60 * 60 * 1000) {
            throw new Error('fecha debe estar entre hoy y los próximos 30 días');
        }
        return true;
    }),
    body('localidadId').optional().isInt({ min: 1 }).withMessage('localidadId inválido').toInt(),
    body('brigadistaId').optional().isInt({ min: 1 }).withMessage('brigadistaId inválido').toInt(),
    body('maxParadas').optional().isInt({ min: 1, max: PARADAS_MAXIMAS }).withMessage(`maxParadas debe estar entre 1 y ${PARADAS_MAXIMAS}`).toInt(),
    validarLatitud('inicio.latitud').optional(),
    validarLongitud('inicio.longitud').optional(),
    body('inicio').optional().custom((inicio) => {
        if (inicio?.latitud === undefined || inicio?.longitud === undefined) {
            throw new Error('inicio requiere latitud y longitud');
        }
        return true;
    }),
];

export const validarListarRutas = [
    ...validarPaginacion,
    validarLocalidadConsulta,
    validarFecha('fecha', query).optional(),
    query('estado').optional().isIn(Object.values(EstadoRuta)).withMessage('estado inválido'),
];

export const validarObtenerRuta = [validarIdEntero];

export const validarCambiarEstadoRuta = [
    validarIdEntero,
    body('estado').isIn(['EN_CURSO', 'FINALIZADA', 'CANCELADA']).withMessage('estado debe ser EN_CURSO, FINALIZADA o CANCELADA'),
];

export const validarMarcarParada = [
    validarIdEntero,
    param('paradaId').isInt({ min: 1 }).withMessage('paradaId inválido').toInt(),
];
