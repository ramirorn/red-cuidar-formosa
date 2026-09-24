import { body, query } from 'express-validator';
import { ClaseObjeto, EstadoReporte, TipoReporte } from '@prisma/client';
import { validarIdUuid, validarLatitud, validarLocalidadConsulta, validarLongitud, validarPaginacion, validarRangoFechas } from './comun.validators.js';

const MAXIMO_DETECCIONES = 50;
const TOLERANCIA_RELOJ_MS = 5 * 60 * 1000;
const ANTIGUEDAD_MAXIMA_MS = 30 * 24 * 60 * 60 * 1000;

const esFraccion = (valor: unknown): boolean => typeof valor === 'number' && Number.isFinite(valor) && valor >= 0 && valor <= 1;

// Las detecciones de la IA llegan como texto JSON dentro del formulario multipart.
const convertirDetecciones = (valor: unknown) => {
    if (valor === undefined || valor === '') return [];
    if (typeof valor !== 'string') throw new Error('detecciones debe ser un texto JSON');

    let lista: unknown;
    try {
        lista = JSON.parse(valor);
    } catch {
        throw new Error('detecciones no es un JSON válido');
    }

    if (!Array.isArray(lista) || lista.length > MAXIMO_DETECCIONES) {
        throw new Error(`detecciones debe ser una lista de hasta ${MAXIMO_DETECCIONES} elementos`);
    }

    const clases = Object.values(ClaseObjeto) as string[];

    // Se reconstruye cada objeto campo por campo: nunca se persiste el JSON recibido tal cual.
    return lista.map((item: any) => {
        const caja = item?.cajaDelimitadora;
        if (!clases.includes(item?.clase) || !esFraccion(item?.confianza)
            || !esFraccion(caja?.x) || !esFraccion(caja?.y) || !esFraccion(caja?.ancho) || !esFraccion(caja?.alto)) {
            throw new Error('Cada detección requiere clase válida, confianza y cajaDelimitadora normalizadas entre 0 y 1');
        }
        return {
            clase: item.clase as ClaseObjeto,
            confianza: item.confianza as number,
            cajaDelimitadora: { x: caja.x, y: caja.y, ancho: caja.ancho, alto: caja.alto },
        };
    });
};

export const validarCrearReporte = [
    body('idCliente').isUUID(4).withMessage('idCliente debe ser un UUID v4 generado por la PWA'),
    body('tipo').isIn(Object.values(TipoReporte)).withMessage('tipo inválido'),
    validarLatitud('latitud'),
    validarLongitud('longitud'),
    body('capturadoEn')
        .isISO8601({ strict: true }).withMessage('capturadoEn debe ser una fecha ISO 8601')
        .toDate()
        .custom((fecha: Date) => {
            const diferencia = Date.now() - fecha.getTime();
            if (diferencia < -TOLERANCIA_RELOJ_MS) throw new Error('capturadoEn no puede estar en el futuro');
            if (diferencia > ANTIGUEDAD_MAXIMA_MS) throw new Error('capturadoEn no puede tener más de 30 días');
            return true;
        }),
    body('precisionGpsM').optional().isFloat({ min: 0, max: 5000 }).withMessage('precisionGpsM inválida').toFloat(),
    body('confianzaIa').optional().isFloat({ min: 0, max: 1 }).withMessage('confianzaIa debe estar entre 0 y 1').toFloat(),
    body('descripcion').optional().isString().trim().isLength({ max: 500 }).withMessage('descripcion admite hasta 500 caracteres'),
    body('reporteResueltoId')
        .optional()
        .isUUID(4).withMessage('reporteResueltoId inválido')
        .custom((_valor, { req }) => {
            if (req.body.tipo !== 'LIMPIEZA') throw new Error('Solo un reporte de LIMPIEZA puede resolver otro reporte');
            return true;
        }),
    // Primero se valida (error 400 legible) y después se convierte a la estructura tipada.
    body('detecciones')
        .default('')
        .custom((valor) => {
            convertirDetecciones(valor);
            return true;
        })
        .customSanitizer((valor) => {
            try {
                return convertirDetecciones(valor);
            } catch {
                return [];
            }
        }),
];

export const validarListarMisReportes = [...validarPaginacion];

export const validarListarReportes = [
    ...validarPaginacion,
    ...validarRangoFechas,
    validarLocalidadConsulta,
    query('estado').optional().isIn(Object.values(EstadoReporte)).withMessage('estado inválido'),
    query('tipo').optional().isIn(Object.values(TipoReporte)).withMessage('tipo inválido'),
    query('manzanaId').optional().isInt({ min: 1 }).withMessage('manzanaId inválido').toInt(),
];

export const validarObtenerReporte = [validarIdUuid];

export const validarCambiarEstadoReporte = [
    validarIdUuid,
    body('estado').isIn(['VALIDADO', 'RECHAZADO', 'RESUELTO']).withMessage('estado debe ser VALIDADO, RECHAZADO o RESUELTO'),
    body('motivoRechazo')
        .if(body('estado').equals('RECHAZADO'))
        .isString().withMessage('motivoRechazo es obligatorio al rechazar').bail()
        .trim().isLength({ min: 3, max: 300 }).withMessage('motivoRechazo debe tener entre 3 y 300 caracteres'),
];
