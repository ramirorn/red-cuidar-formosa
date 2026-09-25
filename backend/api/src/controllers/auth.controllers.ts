import type { Request, Response, CookieOptions } from 'express';
import { matchedData } from 'express-validator';
import { esProduccion } from '../config/entorno.js';
import {
    cerrarSesionAuthService,
    DURACION_TOKEN_REFRESCO_MS,
    loginAuthService,
    obtenerUsuarioActualService,
    refrescarAuthService,
} from '../services/auth.services.js';
import type { AuthRequest } from '../middlewares/autenticacion.middleware.js';
import { ErrorHttp, responderError } from '../utils/errorHttp.js';

// El token de refresco viaja solo en una cookie httpOnly: el JavaScript del navegador no
// puede leerlo (mitiga XSS) y SameSite=Strict impide enviarlo desde otros sitios (CSRF).
const NOMBRE_COOKIE_REFRESCO = 'rcf_refresco';
const opcionesCookie: CookieOptions = {
    httpOnly: true,
    secure: esProduccion,
    sameSite: 'strict',
    path: '/api/auth',
    maxAge: DURACION_TOKEN_REFRESCO_MS,
};

const contextoCliente = (req: Request) => ({
    ...(req.ip ? { ip: req.ip } : {}),
    ...(req.get('user-agent') ? { userAgent: req.get('user-agent') as string } : {}),
});

const leerCookieRefresco = (req: Request): string => {
    const token = req.cookies?.[NOMBRE_COOKIE_REFRESCO];
    if (typeof token !== 'string' || token.length === 0 || token.length > 200) {
        throw new ErrorHttp(401, 'Sesión inválida');
    }
    return token;
};

export const loginUser = async (req: Request, res: Response) => {
    const { email, password } = matchedData(req, { locations: ['body'] });

    try {
        const { usuario, token, tokenRefresco } = await loginAuthService(email, password, contextoCliente(req));

        res.cookie(NOMBRE_COOKIE_REFRESCO, tokenRefresco, opcionesCookie);
        res.status(200).json({
            status: 'success',
            data: { usuario, token },
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const refrescarToken = async (req: Request, res: Response) => {
    try {
        const { token, tokenRefresco } = await refrescarAuthService(leerCookieRefresco(req), contextoCliente(req));

        res.cookie(NOMBRE_COOKIE_REFRESCO, tokenRefresco, opcionesCookie);
        res.status(200).json({
            status: 'success',
            data: { token },
        });

    } catch (error) {
        res.clearCookie(NOMBRE_COOKIE_REFRESCO, { ...opcionesCookie, maxAge: undefined });
        responderError(res, error);
    }
};

export const cerrarSesion = async (req: Request, res: Response) => {
    try {
        const token = req.cookies?.[NOMBRE_COOKIE_REFRESCO];
        if (typeof token === 'string' && token.length > 0 && token.length <= 200) {
            await cerrarSesionAuthService(token);
        }

        res.clearCookie(NOMBRE_COOKIE_REFRESCO, { ...opcionesCookie, maxAge: undefined });
        res.status(204).end();

    } catch (error) {
        responderError(res, error);
    }
};

export const obtenerUsuarioActual = async (req: AuthRequest, res: Response) => {
    try {
        const usuario = await obtenerUsuarioActualService(req.usuario!.id);

        res.status(200).json({
            status: 'success',
            data: usuario,
        });

    } catch (error) {
        responderError(res, error);
    }
};
