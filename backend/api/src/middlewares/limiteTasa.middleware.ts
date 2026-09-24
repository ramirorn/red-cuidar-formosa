import { rateLimit } from 'express-rate-limit';

const respuesta = {
    status: 'error',
    message: 'Demasiadas solicitudes. Intente nuevamente más tarde.',
};

const crearLimite = (ventanaMs: number, limite: number) => rateLimit({
    windowMs: ventanaMs,
    limit: limite,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: respuesta,
});

export const limiteGeneral = crearLimite(60 * 1000, 300);
export const limiteCreacionSesiones = crearLimite(60 * 60 * 1000, 20);
export const limiteReportes = crearLimite(15 * 60 * 1000, 60);
export const limiteLogin = crearLimite(15 * 60 * 1000, 10);
