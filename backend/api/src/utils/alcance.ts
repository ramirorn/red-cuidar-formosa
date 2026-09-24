import { esRolProvincial } from '../config/permisos.js';
import type { UsuarioAutenticado } from '../middlewares/autenticacion.middleware.js';
import { ErrorHttp } from './errorHttp.js';

// Devuelve la localidad a la que queda restringida la consulta.
// - Roles provinciales: la localidad pedida (o null = toda la provincia).
// - Roles locales: siempre su propia localidad; pedir otra es un acceso no autorizado.
export const alcanceLocalidad = (usuario: UsuarioAutenticado, localidadSolicitada?: number): number | null => {
    if (esRolProvincial(usuario.rol)) {
        return localidadSolicitada ?? null;
    }

    if (usuario.localidadId === null) {
        throw new ErrorHttp(403, 'El usuario no tiene una localidad asignada');
    }

    if (localidadSolicitada !== undefined && localidadSolicitada !== usuario.localidadId) {
        throw new ErrorHttp(403, 'No tiene acceso a la localidad solicitada');
    }

    return usuario.localidadId;
};

// Verifica que un recurso ya cargado pertenezca al alcance del usuario.
// Responde 404 en lugar de 403 para no revelar la existencia de recursos ajenos.
export const verificarAlcance = (usuario: UsuarioAutenticado, localidadIdRecurso: number | null | undefined): void => {
    if (esRolProvincial(usuario.rol)) return;
    if (localidadIdRecurso === null || localidadIdRecurso === undefined || localidadIdRecurso !== usuario.localidadId) {
        throw new ErrorHttp(404, 'Recurso no encontrado');
    }
};
