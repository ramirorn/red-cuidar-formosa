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
    RUTAS_LEER: 'rutas:leer',
    RUTAS_GESTIONAR: 'rutas:gestionar',
    RUTAS_EJECUTAR: 'rutas:ejecutar',
    USUARIOS_GESTIONAR: 'usuarios:gestionar',
    AUDITORIA_LEER: 'auditoria:leer',
    // Entregar los premios de la Copa Red-Cuidar (escanear el QR del vecino).
    PREMIOS_CANJEAR: 'premios:canjear',
} as const;

export type Permiso = (typeof PERMISOS)[keyof typeof PERMISOS];

const TODOS = Object.values(PERMISOS);

// Privacidad por diseño: solo Epidemiología ve las fotos de los vecinos, y solo para decidir si un
// reporte es válido. Ni la administración (que no siempre conoce el tema) ni las brigadas las ven.
const SOLO_EPIDEMIOLOGIA: readonly Permiso[] = [PERMISOS.EVIDENCIAS_VER, PERMISOS.REPORTES_VALIDAR];

export const PERMISOS_POR_ROL: Record<Rol, readonly Permiso[]> = {
    ADMINISTRADOR: TODOS.filter((permiso) => !SOLO_EPIDEMIOLOGIA.includes(permiso)),
    EPIDEMIOLOGO: [
        PERMISOS.REPORTES_LEER,
        PERMISOS.REPORTES_VALIDAR,
        PERMISOS.EVIDENCIAS_VER,
        PERMISOS.INTERVENCIONES_LEER,
        PERMISOS.METRICAS_LEER,
        PERMISOS.MAPA_CALOR_LEER,
        PERMISOS.EXPORTACIONES_DESCARGAR,
        PERMISOS.RUTAS_LEER,
    ],
    COORDINADOR_BRIGADA: [
        PERMISOS.REPORTES_LEER,
        PERMISOS.INTERVENCIONES_LEER,
        PERMISOS.INTERVENCIONES_REGISTRAR,
        PERMISOS.METRICAS_LEER,
        PERMISOS.MAPA_CALOR_LEER,
        PERMISOS.EXPORTACIONES_DESCARGAR,
        PERMISOS.RUTAS_LEER,
        PERMISOS.RUTAS_GESTIONAR,
        PERMISOS.RUTAS_EJECUTAR,
        PERMISOS.PREMIOS_CANJEAR,
    ],
    BRIGADISTA: [
        PERMISOS.REPORTES_LEER,
        PERMISOS.INTERVENCIONES_LEER,
        PERMISOS.INTERVENCIONES_REGISTRAR,
        PERMISOS.MAPA_CALOR_LEER,
        PERMISOS.RUTAS_LEER,
        PERMISOS.RUTAS_EJECUTAR,
    ],
    AUDITOR: [
        PERMISOS.REPORTES_LEER,
        PERMISOS.INTERVENCIONES_LEER,
        PERMISOS.METRICAS_LEER,
        PERMISOS.MAPA_CALOR_LEER,
        PERMISOS.AUDITORIA_LEER,
        PERMISOS.RUTAS_LEER,
    ],
};

// Roles que ven toda la provincia. El resto queda limitado a su localidad.
export const ROLES_PROVINCIALES: readonly Rol[] = ['ADMINISTRADOR', 'EPIDEMIOLOGO', 'AUDITOR'];

// Solo estos roles exportan coordenadas exactas de intervenciones (las registra el personal en campo);
// el resto las recibe redondeadas (~100 m). Los reportes de vecinos no tienen coordenadas.
export const ROLES_COORDENADAS_EXACTAS: readonly Rol[] = ['ADMINISTRADOR'];

export const tienePermiso = (rol: Rol, permiso: Permiso): boolean => PERMISOS_POR_ROL[rol].includes(permiso);

export const esRolProvincial = (rol: Rol): boolean => ROLES_PROVINCIALES.includes(rol);
