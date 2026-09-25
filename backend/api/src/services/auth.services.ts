import { createHash, randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { PERMISOS_POR_ROL } from '../config/permisos.js';
import entorno from '../config/entorno.js';
import { AUDIENCIA_INSTITUCIONAL, EMISOR_TOKEN } from '../middlewares/autenticacion.middleware.js';
import { ErrorHttp } from '../utils/errorHttp.js';

export const COSTO_BCRYPT = 12;
const DURACION_TOKEN_ACCESO = '15m';
export const DURACION_TOKEN_REFRESCO_MS = 7 * 24 * 60 * 60 * 1000;

// Hash de relleno: si el email no existe se compara igual contra él, así el tiempo de
// respuesta no revela qué emails están registrados.
const HASH_DE_RELLENO = bcrypt.hashSync(randomBytes(16).toString('hex'), COSTO_BCRYPT);

const resumirToken = (token: string): string => createHash('sha256').update(token).digest('hex');

const seleccionUsuarioPublico = {
    id: true,
    nombre: true,
    apellido: true,
    email: true,
    rol: true,
    localidadId: true,
} as const;

interface ContextoCliente {
    ip?: string;
    userAgent?: string;
}

const emitirTokens = async (usuarioId: number, contexto: ContextoCliente) => {
    const token = jwt.sign({}, entorno.JWT_SECRET, {
        algorithm: 'HS256',
        subject: String(usuarioId),
        issuer: EMISOR_TOKEN,
        audience: AUDIENCIA_INSTITUCIONAL,
        expiresIn: DURACION_TOKEN_ACCESO,
    });

    // El token de refresco es opaco y en la base solo se guarda su resumen SHA-256.
    const tokenRefresco = randomBytes(48).toString('base64url');
    await prisma.tokenRefresco.create({
        data: {
            usuarioId,
            hashToken: resumirToken(tokenRefresco),
            expiraEn: new Date(Date.now() + DURACION_TOKEN_REFRESCO_MS),
            ip: contexto.ip?.slice(0, 64) ?? null,
            userAgent: contexto.userAgent?.slice(0, 300) ?? null,
        },
    });

    return { token, tokenRefresco };
};

export const loginAuthService = async (email: string, passwordPlana: string, contexto: ContextoCliente) => {
    const usuario = await prisma.usuario.findUnique({
        where: { email: email.toLowerCase() },
        select: { ...seleccionUsuarioPublico, password: true, activo: true, eliminadoEn: true },
    });

    const passwordCorrecta = await bcrypt.compare(passwordPlana, usuario?.password ?? HASH_DE_RELLENO);

    if (!usuario || !passwordCorrecta || !usuario.activo || usuario.eliminadoEn) {
        throw new ErrorHttp(401, 'Credenciales inválidas');
    }

    await prisma.usuario.update({ where: { id: usuario.id }, data: { ultimoAccesoEn: new Date() } });
    const tokens = await emitirTokens(usuario.id, contexto);

    const { password, activo, eliminadoEn, ...usuarioPublico } = usuario;

    return { usuario: usuarioPublico, ...tokens };
};

// Rotación: cada token de refresco sirve una sola vez. Si llega uno ya usado, se asume
// robo y se revocan todas las sesiones del usuario.
export const refrescarAuthService = async (tokenRefresco: string, contexto: ContextoCliente) => {
    const registro = await prisma.tokenRefresco.findUnique({
        where: { hashToken: resumirToken(tokenRefresco) },
        select: {
            id: true,
            expiraEn: true,
            revocadoEn: true,
            usuario: { select: { id: true, activo: true, eliminadoEn: true } },
        },
    });

    if (!registro) throw new ErrorHttp(401, 'Sesión inválida');

    if (registro.revocadoEn) {
        await prisma.tokenRefresco.updateMany({
            where: { usuarioId: registro.usuario.id, revocadoEn: null },
            data: { revocadoEn: new Date() },
        });
        throw new ErrorHttp(401, 'Sesión inválida');
    }

    if (registro.expiraEn < new Date() || !registro.usuario.activo || registro.usuario.eliminadoEn) {
        throw new ErrorHttp(401, 'Sesión expirada');
    }

    const { count } = await prisma.tokenRefresco.updateMany({
        where: { id: registro.id, revocadoEn: null },
        data: { revocadoEn: new Date() },
    });
    if (count === 0) throw new ErrorHttp(401, 'Sesión inválida');

    return emitirTokens(registro.usuario.id, contexto);
};

export const cerrarSesionAuthService = async (tokenRefresco: string): Promise<void> => {
    await prisma.tokenRefresco.updateMany({
        where: { hashToken: resumirToken(tokenRefresco), revocadoEn: null },
        data: { revocadoEn: new Date() },
    });
};

export const revocarSesionesUsuarioService = async (usuarioId: number): Promise<void> => {
    await prisma.tokenRefresco.updateMany({
        where: { usuarioId, revocadoEn: null },
        data: { revocadoEn: new Date() },
    });
};

// Datos del usuario en sesión para el panel: con ellos arma el menú según los permisos del rol.
// Los permisos se informan solo para la interfaz; cada ruta los vuelve a verificar en el servidor.
export const obtenerUsuarioActualService = async (usuarioId: number) => {
    const usuario = await prisma.usuario.findUnique({
        where: { id: usuarioId },
        select: { ...seleccionUsuarioPublico, localidad: { select: { id: true, nombre: true } } },
    });

    if (!usuario) throw new ErrorHttp(404, 'Recurso no encontrado');

    return { ...usuario, permisos: PERMISOS_POR_ROL[usuario.rol] };
};
