// Tipos de las respuestas del backend, copiados a mano del contrato (backend/api/openapi.yaml).

export type EstadoManzana = 'ROJO' | 'AMARILLO' | 'VERDE' | 'SIN_DATOS';
export type TipoReporte = 'CRIADERO' | 'MICROBASURAL' | 'LIMPIEZA';
export type EstadoReporte = 'PENDIENTE' | 'VALIDADO' | 'RECHAZADO' | 'RESUELTO';
export type ClaseObjeto = 'NEUMATICO' | 'BOTELLA' | 'BALDE' | 'MACETA' | 'TANQUE' | 'BEBEDERO' | 'FLORERO' | 'OTRO';
export type NivelTriaje = 'SIN_RIESGO' | 'LEVE' | 'MODERADO' | 'URGENTE';

export interface Paginacion {
    limite: number;
    siguienteCursor: string | null;
}

export interface RespuestaApi<T> {
    status: 'success';
    data: T;
    pagination?: Paginacion;
}

export interface Pagina<T> {
    datos: T[];
    paginacion: Paginacion;
}

export interface Localidad {
    id: number;
    nombre: string;
    nivelRiesgoBase: string;
    latitud: number | null;
    longitud: number | null;
}

export interface CajaDelimitadora {
    x: number;
    y: number;
    ancho: number;
    alto: number;
}

export interface Deteccion {
    clase: ClaseObjeto;
    confianza: number;
    cajaDelimitadora: CajaDelimitadora;
}

export interface ReporteResumen {
    id: string;
    idCliente: string;
    tipo: TipoReporte;
    estado: EstadoReporte;
    capturadoEn: string;
    createdAt: string;
    manzana: { id: number; codigo: string; estado: EstadoManzana } | null;
}

export interface FeatureManzana {
    type: 'Feature';
    id: number;
    geometry: { type: 'Polygon'; coordinates: number[][][] };
    properties: { codigo: string; estado: EstadoManzana; localidadId: number; zonaId?: number | null };
}

export interface ColeccionManzanas {
    type: 'FeatureCollection';
    features: FeatureManzana[];
}

export interface RespuestaChat {
    respuesta: string;
    nivelTriaje: NivelTriaje | null;
    firma: string;
    // 'basico': contestó el asistente sin modelo de lenguaje (el flujo de IA no respondió).
    origen?: 'ia' | 'basico';
}

// ---------------------------------------------------------------------------
// Copa Red-Cuidar
// ---------------------------------------------------------------------------

export type EstadoEdicion = 'en-curso' | 'provisoria' | 'definitiva';

export interface EdicionCopa {
    mes: string;
    nombre: string;
    estado: EstadoEdicion;
    cierraEn: string;
    definitivaDesde: string;
    premiosVencen: string;
}

export interface ZonaCopa {
    id: number;
    nombre: string;
    barrio: string;
    posicion: number;
    manzanas: number;
    limpiezas: number;
    criaderos: number;
    semanasVerdes: number;
    puntos: number;
    puntosPorManzana: number;
}

export interface PuntosCopa {
    LIMPIEZA: number;
    SEMANA_VERDE: number;
    CRIADERO: number;
}

export interface PodioCopa {
    edicion: EdicionCopa;
    podio: ZonaCopa[];
    totalZonas: number;
    puntos: PuntosCopa;
}

export interface SituacionZona {
    edicion: EdicionCopa;
    zona: ZonaCopa & { enPodio: boolean };
    totalZonas: number;
    faltanPuntosPorManzana: number;
    faltanLimpiezas: number;
}

export interface PremioCopa {
    codigo: string;
    zona: { nombre: string; barrio: string };
    edicion: EdicionCopa;
    venceEn: string;
    canjeadoEn: string | null;
}

// Desafíos colectivos de la semana en la zona del vecino.
export interface DesafiosZona {
    zona: { id: number; nombre: string };
    semana: { inicio: string; fin: string };
    desafios: { clave: 'LIMPIEZAS' | 'VERDES'; titulo: string; meta: number; progreso: number; cumplido: boolean }[];
}
