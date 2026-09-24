import { body, query } from 'express-validator';
import { TipoIntervencion } from '@prisma/client';
import { validarLatitud, validarLocalidadConsulta, validarLongitud, validarPaginacion, validarRangoFechas } from './comun.validators.js';

export const validarRegistrarIntervencion = [
    body('tipo').isIn(Object.values(TipoIntervencion)).withMessage('tipo inválido'),
    body('manzanaId').isInt({ min: 1 }).withMessage('manzanaId inválido').toInt(),
    body('realizadaEn')
        .isISO8601({ strict: true }).withMessage('realizadaEn debe ser una fecha ISO 8601')
        .toDate()
        .custom((fecha: Date) => {
            if (fecha.getTime() > Date.now() + 5 * 60 * 1000) throw new Error('realizadaEn no puede estar en el futuro');
            return true;
        }),
    validarLatitud('latitud').optional(),
    validarLongitud('longitud').optional(),
    body().custom((cuerpo) => {
        if ((cuerpo.latitud === undefined) !== (cuerpo.longitud === undefined)) {
            throw new Error('latitud y longitud deben enviarse juntas');
        }
        if (cuerpo.tipo === 'APLICACION_BTI' && (cuerpo.cantidadProducto === undefined || cuerpo.unidadProducto === undefined)) {
            throw new Error('Una aplicación de BTI requiere cantidadProducto y unidadProducto');
        }
        return true;
    }),
    body('cantidadProducto').optional().isFloat({ gt: 0, max: 100000 }).withMessage('cantidadProducto inválida').toFloat(),
    body('unidadProducto').optional().isIn(['g', 'kg', 'ml', 'l', 'comprimidos']).withMessage('unidadProducto inválida'),
    body('tipoCuerpoAgua').optional().isString().trim().isLength({ max: 100 }),
    body('observaciones').optional().isString().trim().isLength({ max: 500 }),
    body('reporteId').optional().isUUID(4).withMessage('reporteId inválido'),
];

export const validarListarIntervenciones = [
    ...validarPaginacion,
    ...validarRangoFechas,
    validarLocalidadConsulta,
    query('tipo').optional().isIn(Object.values(TipoIntervencion)).withMessage('tipo inválido'),
    query('manzanaId').optional().isInt({ min: 1 }).withMessage('manzanaId inválido').toInt(),
];
