import bcrypt from 'bcryptjs';
import type { Rol } from '@prisma/client';
import prisma from '../config/prisma.js';
import { esRolProvincial } from '../config/permisos.js';
import type { UsuarioAutenticado } from '../middlewares/autenticacion.middleware.js';
import { ErrorHttp } from '../utils/errorHttp.js';
import { armarPagina, decodificarCursorEntero } from '../utils/paginacion.js';
import { COSTO_BCRYPT, revocarSesionesUsuarioService } from './auth.services.js';

const seleccionUsuario = {
    id: true,
    nombre: true,
    apellido: true,
    email: true,
    rol: true,
    localidadId: true,
    activo: true,
    ultimoAccesoEn: true,
    createdAt: true,
} as const;

// Los roles locales necesitan una localidad; los provinciales no deben tenerla.
const validarAlcanceRol = async (rol: Rol, localidadId: number | null): Promise<void> => {
    if (esRolProvincial(rol)) {
        if (localidadId !== null) throw new ErrorHttp(422, `El rol ${rol} tiene alcance provincial y no admite localidad`);
        return;
    }

    if (localidadId === null) throw new ErrorHttp(422, `El rol ${rol} requiere una localidad asignada`);

    const localidad = await prisma.localidad.findUnique({ where: { id: localidadId }, select: { id: true } });
    if (!localidad) throw new ErrorHttp(422, 'La localidad indicada no existe');
};

export interface DatosNuevoUsuario {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    rol: Rol;
    localidadId?: number;
}

export const crearUsuarioService = async (datos: DatosNuevoUsuario) => {
    const localidadId = datos.localidadId ?? null;
    await validarAlcanceRol(datos.rol, localidadId);

    const email = datos.email.toLowerCase();
    const existente = await prisma.usuario.findUnique({ where: { email }, select: { id: true } });
    if (existente) throw new ErrorHttp(409, 'Ya existe un usuario con ese email');

    return prisma.usuario.create({
        data: {
            nombre: datos.nombre,
            apellido: datos.apellido,
            email,
            password: await bcrypt.hash(datos.password, COSTO_BCRYPT),
            rol: datos.rol,
            localidadId,
        },
        select: seleccionUsuario,
    });
};

export const listarUsuariosService = async (filtros: { rol?: Rol; localidadId?: number; limite: number; cursor?: string }) => {
    const usuarios = await prisma.usuario.findMany({
        where: {
            eliminadoEn: null,
            ...(filtros.rol ? { rol: filtros.rol } : {}),
            ...(filtros.localidadId ? { localidadId: filtros.localidadId } : {}),
        },
        select: seleccionUsuario,
        orderBy: { id: 'asc' },
        take: filtros.limite + 1,
        ...(filtros.cursor ? { cursor: { id: decodificarCursorEntero(filtros.cursor) }, skip: 1 } : {}),
    });

    return armarPagina(usuarios, filtros.limite);
};

export interface CambiosUsuario {
    rol?: Rol;
    localidadId?: number | null;
    activo?: boolean;
}

export const actualizarUsuarioService = async (administrador: UsuarioAutenticado, id: number, cambios: CambiosUsuario) => {
    if (id === administrador.id && (cambios.activo === false || (cambios.rol && cambios.rol !== administrador.rol))) {
        throw new ErrorHttp(422, 'No puede desactivarse ni cambiar su propio rol');
    }

    const actual = await prisma.usuario.findFirst({
        where: { id, eliminadoEn: null },
        select: { rol: true, localidadId: true },
    });
    if (!actual) throw new ErrorHttp(404, 'Recurso no encontrado');

    const rol = cambios.rol ?? actual.rol;
    const localidadId = cambios.localidadId !== undefined
        ? cambios.localidadId
        : (esRolProvincial(rol) ? null : actual.localidadId);
    await validarAlcanceRol(rol, localidadId);

    const usuario = await prisma.usuario.update({
        where: { id },
        data: { rol, localidadId, ...(cambios.activo !== undefined ? { activo: cambios.activo } : {}) },
        select: seleccionUsuario,
    });

    // Cualquier cambio de privilegios invalida las sesiones abiertas del usuario.
    if (cambios.activo === false || rol !== actual.rol || localidadId !== actual.localidadId) {
        await revocarSesionesUsuarioService(id);
    }

    return usuario;
};
