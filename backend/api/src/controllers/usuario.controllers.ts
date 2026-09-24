import type { Response } from 'express';
import { matchedData } from 'express-validator';
import type { AuthRequest } from '../middlewares/autenticacion.middleware.js';
import { registrarAuditoriaService } from '../services/auditoria.services.js';
import {
    actualizarUsuarioService,
    crearUsuarioService,
    listarUsuariosService,
    type DatosNuevoUsuario,
} from '../services/usuario.services.js';
import { responderError } from '../utils/errorHttp.js';
import { limiteDeConsulta } from '../validators/comun.validators.js';

export const crearUsuario = async (req: AuthRequest, res: Response) => {
    const datos = matchedData(req, { locations: ['body'] }) as DatosNuevoUsuario;

    try {
        const usuario = await crearUsuarioService(datos);
        await registrarAuditoriaService({
            usuarioId: req.usuario!.id,
            accion: 'CREAR_USUARIO',
            recurso: `usuario:${usuario.id}`,
            filtros: { rol: usuario.rol, localidadId: usuario.localidadId },
            ...(req.ip ? { ip: req.ip } : {}),
        });

        res.status(201).json({
            status: 'success',
            data: usuario,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const listarUsuarios = async (req: AuthRequest, res: Response) => {
    const filtros = matchedData(req, { locations: ['query'] });

    try {
        const { datos, paginacion } = await listarUsuariosService({ ...filtros, limite: limiteDeConsulta(filtros.limite) });

        res.status(200).json({
            status: 'success',
            data: datos,
            pagination: paginacion,
        });

    } catch (error) {
        responderError(res, error);
    }
};

export const actualizarUsuario = async (req: AuthRequest, res: Response) => {
    const { id } = matchedData(req, { locations: ['params'] });
    const cambios = matchedData(req, { locations: ['body'] });

    try {
        const usuario = await actualizarUsuarioService(req.usuario!, id, cambios);
        await registrarAuditoriaService({
            usuarioId: req.usuario!.id,
            accion: 'ACTUALIZAR_USUARIO',
            recurso: `usuario:${id}`,
            filtros: cambios,
            ...(req.ip ? { ip: req.ip } : {}),
        });

        res.status(200).json({
            status: 'success',
            data: usuario,
        });

    } catch (error) {
        responderError(res, error);
    }
};
