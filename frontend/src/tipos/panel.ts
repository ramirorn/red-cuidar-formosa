// Tipos de la API Core del Dashboard Institucional (backend/api/openapi.yaml).
import type { CajaDelimitadora, ClaseObjeto, EstadoManzana, EstadoReporte, TipoReporte } from './index';

export type Rol = 'ADMINISTRADOR' | 'EPIDEMIOLOGO' | 'COORDINADOR_BRIGADA' | 'BRIGADISTA' | 'AUDITOR';
export type TipoIntervencion = 'APLICACION_BTI' | 'FUMIGACION' | 'DESCACHARRADO' | 'INSPECCION';
export type EstadoRuta = 'PLANIFICADA' | 'EN_CURSO' | 'FINALIZADA' | 'CANCELADA';
export type UnidadProducto = 'g' | 'kg' | 'ml' | 'l' | 'comprimidos';

export type Permiso =
    | 'reportes:leer'
    | 'reportes:validar'
    | 'evidencias:ver'
    | 'intervenciones:leer'
    | 'intervenciones:registrar'
    | 'metricas:leer'
    | 'mapa_calor:leer'
    | 'exportaciones:descargar'
    | 'rutas:leer'
    | 'rutas:gestionar'
    | 'rutas:ejecutar'
    | 'usuarios:gestionar'
    | 'auditoria:leer';

export interface UsuarioActual {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    rol: Rol;
    localidadId: number | null;
    localidad: { id: number; nombre: string } | null;
    permisos: Permiso[];
}

export interface PersonaBreve {
    id: number;
    nombre: string;
    apellido: string;
}

export interface ManzanaBreve {
    id: number;
    codigo: string;
    estado: EstadoManzana;
    localidadId: number;
}

export interface ReporteListado {
    id: string;
    tipo: TipoReporte;
    origen: 'PWA' | 'CHAT';
    estado: EstadoReporte;
    confianzaIa: number | null;
    capturadoEn: string;
    createdAt: string;
    manzana: ManzanaBreve | null;
    _count: { evidencias: number; detecciones: number };
}

export interface EvidenciaBreve {
    id: string;
    momento: 'ANTES' | 'DESPUES';
    ancho: number;
    alto: number;
    createdAt: string;
}

export interface ReporteDetalle {
    id: string;
    tipo: TipoReporte;
    origen: 'PWA' | 'CHAT';
    estado: EstadoReporte;
    precisionGpsM: number | null;
    confianzaIa: number | null;
    descripcion: string | null;
    capturadoEn: string;
    createdAt: string;
    validadoEn: string | null;
    motivoRechazo: string | null;
    reporteResueltoId: string | null;
    validadoPor: PersonaBreve | null;
    manzana: ManzanaBreve | null;
    detecciones: { clase: ClaseObjeto; confianza: number; cajaDelimitadora: CajaDelimitadora }[];
    evidencias: EvidenciaBreve[];
    ubicacion: { latitud: number; longitud: number; exacta: boolean } | null;
}

export interface FiltrosReportes {
    estado?: EstadoReporte;
    tipo?: TipoReporte;
    localidadId?: number;
    manzanaId?: number;
    orden?: 'recientes' | 'prioridad';
    desde?: string;
    hasta?: string;
}

export interface Intervencion {
    id: string;
    tipo: TipoIntervencion;
    realizadaEn: string;
    cantidadProducto: number | null;
    unidadProducto: UnidadProducto | null;
    tipoCuerpoAgua: string | null;
    observaciones: string | null;
    reporteId: string | null;
    manzana: { id: number; codigo: string; localidadId: number };
    usuario: PersonaBreve;
}

export interface NuevaIntervencion {
    tipo: TipoIntervencion;
    manzanaId: number;
    realizadaEn: string;
    latitud?: number;
    longitud?: number;
    cantidadProducto?: number;
    unidadProducto?: UnidadProducto;
    tipoCuerpoAgua?: string;
    observaciones?: string;
    reporteId?: string;
    paradaRutaId?: number;
}

export interface RutaListado {
    id: number;
    fecha: string;
    estado: EstadoRuta;
    localidadId: number;
    coordinador: PersonaBreve;
    brigadista: PersonaBreve | null;
    paradasTotales: number;
    paradasVisitadas: number;
}

export interface ParadaRuta {
    id: number;
    orden: number;
    visitadaEn: string | null;
    manzana: { id: number; codigo: string; estado: EstadoManzana };
    ubicacion: { latitud: number; longitud: number };
}

export interface RutaDetalle {
    id: number;
    fecha: string;
    estado: EstadoRuta;
    localidadId: number;
    createdAt: string;
    coordinador: PersonaBreve;
    brigadista: PersonaBreve | null;
    paradas: ParadaRuta[];
    distanciaTotalEstimadaM?: number;
}

export interface NuevaRuta {
    fecha: string;
    localidadId?: number;
    brigadistaId?: number;
    maxParadas?: number;
}

export interface Brigadista extends PersonaBreve {
    localidadId: number | null;
}

export interface Metricas {
    rango: { desde: string; hasta: string };
    localidadId: number | null;
    reportes: { tipo: TipoReporte; estado: EstadoReporte; cantidad: number }[];
    manzanas: { estado: EstadoManzana; cantidad: number }[];
    intervenciones: { tipo: TipoIntervencion; cantidad: number; cantidadProductoTotal: number | null }[];
    reportesPorDia: { dia: string; tipo: TipoReporte; cantidad: number }[];
}

export interface PuntoRiesgo {
    type: 'Feature';
    geometry: { type: 'Point'; coordinates: [number, number] };
    properties: {
        manzanaId: number;
        codigo: string;
        localidadId: number;
        estado: EstadoManzana;
        indiceRiesgo?: number;
        indiceRiesgoPredicho?: number;
        reportesValidados?: number;
        reportesPendientes?: number;
        lluvia7dMm?: number;
        vigenteHasta?: string;
    };
}

export interface ColeccionRiesgo {
    type: 'FeatureCollection';
    features: PuntoRiesgo[];
    metadatos?: Record<string, unknown>;
}

export interface UsuarioInstitucional {
    id: number;
    nombre: string;
    apellido: string;
    email: string;
    rol: Rol;
    localidadId: number | null;
    activo: boolean;
    ultimoAccesoEn: string | null;
    createdAt: string;
}

export interface NuevoUsuario {
    nombre: string;
    apellido: string;
    email: string;
    password: string;
    rol: Rol;
    localidadId?: number;
}

export interface CambiosUsuario {
    rol?: Rol;
    localidadId?: number | null;
    activo?: boolean;
}

export interface RegistroAuditoria {
    id: number;
    accion: string;
    recurso: string | null;
    filtros: Record<string, unknown> | null;
    ip: string | null;
    createdAt: string;
    usuario: PersonaBreve & { rol: Rol };
}

export interface RangoFechas {
    desde?: string;
    hasta?: string;
}
