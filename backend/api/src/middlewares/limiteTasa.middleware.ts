import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { AuthRequest } from './autenticacion.middleware.js';

const respuesta = {
    status: 'error',
    message: 'Demasiadas solicitudes. Intente nuevamente más tarde.',
};

const crearLimite = (ventanaMs: number, limite: number, porSesion = false) => rateLimit({
    windowMs: ventanaMs,
    limit: limite,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: respuesta,
    // En redes móviles muchos vecinos comparten la misma IP pública (CGNAT):
    // los reportes se limitan por sesión anónima y no por IP.
    ...(porSesion
        ? { keyGenerator: (req: AuthRequest) => req.sesion?.id ?? ipKeyGenerator(req.ip ?? '') }
        : {}),
});

export const limiteGeneral = crearLimite(60 * 1000, 300);
export const limiteCreacionSesiones = crearLimite(60 * 60 * 1000, 20);
export const limiteReportes = crearLimite(15 * 60 * 1000, 30, true);
// El LLM es costoso: pocos mensajes por sesión.
export const limiteChat = crearLimite(5 * 60 * 1000, 20, true);
export const limiteLogin = crearLimite(15 * 60 * 1000, 10);
