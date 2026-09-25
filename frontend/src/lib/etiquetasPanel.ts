import type { EstadoReporte, TipoReporte } from '@/tipos';
import type { EstadoRuta, Rol, TipoIntervencion, UnidadProducto } from '@/tipos/panel';

// Textos del panel para los valores del backend (un solo lugar, así la interfaz es consistente).

export const ROLES: Record<Rol, { etiqueta: string; descripcion: string }> = {
    ADMINISTRADOR: { etiqueta: 'Administración', descripcion: 'Toda la provincia. Gestiona usuarios y ve la auditoría. No ve fotos ni valida.' },
    EPIDEMIOLOGO: { etiqueta: 'Epidemiología', descripcion: 'Toda la provincia. La única que ve las fotos y valida reportes.' },
    COORDINADOR_BRIGADA: { etiqueta: 'Coordinación de brigada', descripcion: 'Su localidad. Arma rutas, registra intervenciones y exporta.' },
    BRIGADISTA: { etiqueta: 'Brigadista', descripcion: 'Su localidad. Recorre las rutas asignadas y registra intervenciones.' },
    AUDITOR: { etiqueta: 'Auditoría', descripcion: 'Toda la provincia, solo lectura. Ve la auditoría de accesos.' },
};

export const ROLES_PROVINCIALES: readonly Rol[] = ['ADMINISTRADOR', 'EPIDEMIOLOGO', 'AUDITOR'];

export const TIPOS_REPORTE: Record<TipoReporte, string> = {
    CRIADERO: 'Criadero',
    MICROBASURAL: 'Microbasural',
    LIMPIEZA: 'Limpieza',
};

// En el panel se usan los nombres técnicos de los estados (el vecino ve textos más amables).
export const ESTADOS_REPORTE_PANEL: Record<EstadoReporte, string> = {
    PENDIENTE: 'Pendiente',
    VALIDADO: 'Validado',
    RECHAZADO: 'Rechazado',
    RESUELTO: 'Resuelto',
};

export const TIPOS_INTERVENCION: Record<TipoIntervencion, string> = {
    APLICACION_BTI: 'Aplicación de BTI',
    FUMIGACION: 'Fumigación',
    DESCACHARRADO: 'Descacharrado',
    INSPECCION: 'Inspección',
};

export const UNIDADES: Record<UnidadProducto, string> = {
    g: 'gramos',
    kg: 'kilos',
    ml: 'mililitros',
    l: 'litros',
    comprimidos: 'comprimidos',
};

export const ESTADOS_RUTA: Record<EstadoRuta, { etiqueta: string; clases: string }> = {
    PLANIFICADA: { etiqueta: 'Planificada', clases: 'bg-bruma text-verde-800 ring-verde-200' },
    EN_CURSO: { etiqueta: 'En curso', clases: 'bg-amber-50 text-amber-800 ring-amber-200' },
    FINALIZADA: { etiqueta: 'Finalizada', clases: 'bg-verde-50 text-verde-700 ring-verde-200' },
    CANCELADA: { etiqueta: 'Cancelada', clases: 'bg-gris-superficie text-gris-texto ring-gris-borde' },
};

// Transiciones que acepta el backend (reporte.services.ts). RESUELTO solo para criaderos y microbasurales.
export const accionesReporte = (estado: EstadoReporte, tipo: TipoReporte): Exclude<EstadoReporte, 'PENDIENTE'>[] => {
    const posibles: Record<EstadoReporte, Exclude<EstadoReporte, 'PENDIENTE'>[]> = {
        PENDIENTE: ['VALIDADO', 'RECHAZADO'],
        VALIDADO: ['RESUELTO', 'RECHAZADO'],
        RECHAZADO: ['VALIDADO'],
        RESUELTO: [],
    };
    return posibles[estado].filter((accion) => accion !== 'RESUELTO' || tipo !== 'LIMPIEZA');
};

export const ACCIONES_AUDITORIA: Record<string, string> = {
    VER_EVIDENCIA: 'Vio una foto',
    EXPORTAR_CSV: 'Exportó un CSV',
    CREAR_USUARIO: 'Creó un usuario',
    ACTUALIZAR_USUARIO: 'Modificó un usuario',
};

export const nombreCompleto = (persona: { nombre: string; apellido: string } | null | undefined) =>
    persona ? `${persona.nombre} ${persona.apellido}` : '—';
