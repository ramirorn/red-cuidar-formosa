import type { Rol } from '@prisma/client';

// Control de acceso basado en roles (RBAC).
// Cada ruta institucional exige un permiso; cada rol tiene un conjunto fijo de permisos.
// El alcance territorial se aplica aparte, en los servicios, con alcanceLocalidad().

export const PERMISOS = {
    REPORTES_LEER: 'reportes:leer',
    REPORTES_VALIDAR: 'reportes:validar',
    EVIDENCIAS_VER: 'evidencias:ver',
    INTERVENCIONES_LEER: 'intervenciones:leer',
    INTERVENCIONES_REGISTRAR: 'intervenciones:registrar',
    METRICAS_LEER: 'metricas:leer',
    MAPA_CALOR_LEER: 'mapa_calor:leer',
    EXPORTACIONES_DESCARGAR: 'exportaciones:descargar',
    USUARIOS_GESTIONAR: 'usuarios:gestionar',
    AUDITORIA_LEER: 'auditoria:leer',
} as const;

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS];

const TODOS = Object.values(PERMISOS);

export const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
    ADMINISTRADOR: TODOS,
    EPIDEMIOLOGO: [
        PERMISOS.REPORTES_LEER,
        PERMISOS.REPORTES_VALIDAR,
        PERMISOS.EVIDENCIAS_VER,
        PERMISOS.INTERVENCIONES_LEER,
        PERMISOS.METRICAS_LEER,
        PERMISOS.MAPA_CALOR_LEER,
        PERMISOS.EXPORTACIONES_DESCARGAR,
    ],
    COORDINADOR_BRIGADA: [
        PERMISOS.REPORTES_LEER,
        PERMISOS.REPORTES_VALIDAR,
        PERMISOS.EVIDENCIAS_VER,
        PERMISOS.INTERVENCIONES_LEER,
        PERMISOS.INTERVENCIONES_REGISTRAR,
        PERMISOS.METRICAS_LEER,
        PERMISOS.MAPA_CALOR_LEER,
        PERMISOS.EXPORTACIONES_DESCARGAR,
    ],
    BRIGADISTA: [
        PERMISOS.REPORTES_LEER,
        PERMISOS.EVIDENCIAS_VER,
        PERMISOS.INTERVENCIONES_LEER,
        PERMISOS.INTERVENCIONES_REGISTRAR,
        PERMISOS.MAPA_CALOR_LEER,
    ],
    AUDITOR: [
        PERMISOS.REPORTES_LEER,
        PERMISOS.INTERVENCIONES_LEER,
        PERMISOS.METRICAS_LEER,
        PERMISOS.MAPA_CALOR_LEER,
        PERMISOS.AUDITORIA_LEER,
    ],
};

// Roles que ven toda la provincia. El resto queda limitado a su localidad.
export const ROLES_PROVINCIALES: readonly Rol[] = ['ADMINISTRADOR', 'EPIDEMIOLOGO', 'AUDITOR'];

// Solo estos roles exportan coordenadas exactas; el resto las recibe redondeadas (~100 m).
export const ROLES_COORDENADAS_EXACTAS: readonly Rol[] = ['ADMINISTRADOR'];

export const tienePermiso = (rol: Rol, permiso: Permiso): boolean => PERMISOS_POR_ROL[rol].includes(permiso);

export const esRolProvincial = (rol: Rol): boolean => ROLES_PROVINCIALES.includes(rol);
