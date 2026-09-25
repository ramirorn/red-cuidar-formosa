import { createHash } from 'node:crypto';
import type { Request } from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import type { AuthRequest } from './autenticacion.middleware.js';

const respuesta = {
    status: 'error',
    message: 'Demasiadas solicitudes. Intente nuevamente más tarde.',
};

const porIp = (req: Request) => ipKeyGenerator(req.ip ?? '');

// En redes móviles muchos vecinos comparten la misma IP pública (CGNAT):
// lo que hace cada vecino se limita por su sesión anónima y no por IP.
const porSesion = (req: AuthRequest) => req.sesion?.id ?? porIp(req);

// El login se limita por cuenta (frena la fuerza bruta contra un email aunque cambie la IP)...
const porCuenta = (req: Request) => {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    return email ? `cuenta:${createHash('sha256').update(email).digest('hex')}` : porIp(req);
};

// ...y el refresco por token, así los empleados que comparten la IP del ministerio no se bloquean entre sí.
const porTokenDeRefresco = (req: Request) => {
    const token = req.cookies?.rcf_refresco;
    return typeof token === 'string' && token ? `refresco:${createHash('sha256').update(token).digest('hex')}` : porIp(req);
};

const crearLimite = (ventanaMs: number, limite: number, clave: (req: Request) => string = porIp) => rateLimit({
    windowMs: ventanaMs,
    limit: limite,
    standardHeaders: 'draft-8',
    legacyHeaders: false,
    message: respuesta,
    keyGenerator: clave,
});

const MINUTO = 60 * 1000;

export const limiteGeneral = crearLimite(MINUTO, 300);
// Holgado por el CGNAT; frenar la creación masiva de sesiones requiere además un desafío (pendiente).
export const limiteCreacionSesiones = crearLimite(60 * MINUTO, 60);
export const limiteReportes = crearLimite(15 * MINUTO, 30, porSesion);
// El LLM es costoso: pocos mensajes por sesión.
export const limiteChat = crearLimite(5 * MINUTO, 20, porSesion);
export const limiteLoginPorIp = crearLimite(15 * MINUTO, 100);
export const limiteLoginPorCuenta = crearLimite(15 * MINUTO, 10, porCuenta);
export const limiteRefresco = crearLimite(15 * MINUTO, 20, porTokenDeRefresco);
