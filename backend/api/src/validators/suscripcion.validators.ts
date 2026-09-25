import { body } from 'express-validator';

// Servicios push de los navegadores. Aceptar cualquier URL permitiría usar la API para enviar
// peticiones a servidores ajenos o a la red interna en cada alerta (SSRF y amplificación).
const HOSTS_PUSH_EXACTOS = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com'];
const SUFIJOS_PUSH = ['.notify.windows.com', '.push.apple.com'];

export const esEndpointPushPermitido = (valor: unknown): boolean => {
    if (typeof valor !== 'string' || valor.length > 1000) return false;
    let url: URL;
    try {
        url = new URL(valor);
    } catch {
        return false;
    }
    if (url.protocol !== 'https:' || url.port !== '' || url.username || url.password) return false;
    return HOSTS_PUSH_EXACTOS.includes(url.hostname) || SUFIJOS_PUSH.some((sufijo) => url.hostname.endsWith(sufijo));
};

const validarEndpoint = body('endpoint')
    .custom((valor) => {
        if (!esEndpointPushPermitido(valor)) throw new Error('endpoint no corresponde a un servicio push de navegador');
        return true;
    });

export const validarGuardarSuscripcion = [
    validarEndpoint,
    body('keys.p256dh').isBase64({ urlSafe: true }).isLength({ min: 20, max: 200 }).withMessage('keys.p256dh inválida'),
    body('keys.auth').isBase64({ urlSafe: true }).isLength({ min: 8, max: 100 }).withMessage('keys.auth inválida'),
    body('localidadId').optional().isInt({ min: 1 }).withMessage('localidadId inválido').toInt(),
];

export const validarEliminarSuscripcion = [validarEndpoint];
