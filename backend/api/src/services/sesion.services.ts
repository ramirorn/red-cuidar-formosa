import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import entorno from '../config/entorno.js';
import { AUDIENCIA_CIUDADANIA, EMISOR_TOKEN } from '../middlewares/autenticacion.middleware.js';

// La sesión se elimina tras 30 días sin actividad (limpieza programada en n8n);
// el token puede durar más, pero deja de valer en cuanto la sesión desaparece.
const DURACION_TOKEN_SESION = '90d';

export const crearSesionService = async () => {
    const sesion = await prisma.sesionAnonima.create({ data: {} });

    const token = jwt.sign({}, entorno.JWT_SECRET_SESIONES, {
        algorithm: 'HS256',
        subject: sesion.id,
        issuer: EMISOR_TOKEN,
        audience: AUDIENCIA_CIUDADANIA,
        expiresIn: DURACION_TOKEN_SESION,
    });

    return { sesionId: sesion.id, token };
};

export const registrarActividadSesionService = async (sesionId: string): Promise<void> => {
    await prisma.sesionAnonima.update({
        where: { id: sesionId },
        data: { ultimaActividadEn: new Date() },
    });
};
