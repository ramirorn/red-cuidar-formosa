import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import type { Rol } from '@prisma/client';
import prisma from '../config/prisma.js';
import entorno from '../config/entorno.js';

export const EMISOR_TOKEN = 'red-cuidar-formosa';
export const AUDIENCIA_INSTITUCIONAL = 'institucional';
export const AUDIENCIA_CIUDADANIA = 'ciudadania';

export interface UsuarioAutenticado {
    id: number;
    rol: Rol;
    localidadId: number | null;
}

export interface AuthRequest extends Request {
    usuario?: UsuarioAutenticado;
    sesion?: { id: string };
}

const extraerToken = (req: Request): string | null => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
    return authHeader.slice(7).trim() || null;
};

const rechazar = (res: Response, mensaje: string): void => {
    res.status(401).json({
        status: 'error',
        message: mensaje,
    });
};

// Personal institucional. El token solo aporta el id: rol, localidad y estado se leen
// de la base en cada petición, así una baja o un cambio de rol tiene efecto inmediato.
export const verificarToken = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = extraerToken(req);

    if (!token) {
        rechazar(res, 'Acceso denegado. Token no proporcionado o formato inválido.');
        return;
    }

    let idUsuario: number;
    try {
        const decoded = jwt.verify(token, entorno.JWT_SECRET, {
            algorithms: ['HS256'],
            issuer: EMISOR_TOKEN,
            audience: AUDIENCIA_INSTITUCIONAL,
        }) as jwt.JwtPayload;
        idUsuario = Number(decoded.sub);
        if (!Number.isInteger(idUsuario)) throw new Error('Sujeto inválido');
    } catch {
        rechazar(res, 'Acceso denegado. Token inválido.');
        return;
    }

    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id: idUsuario },
            select: { id: true, rol: true, localidadId: true, activo: true, eliminadoEn: true },
        });

        if (!usuario || !usuario.activo || usuario.eliminadoEn) {
            rechazar(res, 'Acceso denegado. Usuario inhabilitado.');
            return;
        }

        req.usuario = { id: usuario.id, rol: usuario.rol, localidadId: usuario.localidadId };
        next();
    } catch (error) {
        next(error);
    }
};

// Ciudadanía anónima: el token identifica una sesión sin datos personales.
// Usa otro secreto y otra audiencia, así nunca sirve para rutas institucionales.
export const verificarSesionAnonima = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const token = extraerToken(req);

    if (!token) {
        rechazar(res, 'Acceso denegado. Sesión no proporcionada.');
        return;
    }

    let idSesion: string;
    try {
        const decoded = jwt.verify(token, entorno.JWT_SECRET_SESIONES, {
            algorithms: ['HS256'],
            issuer: EMISOR_TOKEN,
            audience: AUDIENCIA_CIUDADANIA,
        }) as jwt.JwtPayload;
        if (typeof decoded.sub !== 'string') throw new Error('Sujeto inválido');
        idSesion = decoded.sub;
    } catch {
        rechazar(res, 'Acceso denegado. Sesión inválida.');
        return;
    }

    try {
        // La sesión pudo haber sido eliminada por inactividad.
        const sesion = await prisma.sesionAnonima.findUnique({ where: { id: idSesion }, select: { id: true } });

        if (!sesion) {
            rechazar(res, 'Acceso denegado. La sesión expiró.');
            return;
        }

        req.sesion = { id: sesion.id };
        next();
    } catch (error) {
        next(error);
    }
};
