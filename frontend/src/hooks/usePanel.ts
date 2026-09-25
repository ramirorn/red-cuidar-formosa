import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { panelApi } from '@/api/panel.api';
import { vecinoApi } from '@/api/vecino.api';
import type { EstadoReporte } from '@/tipos';
import type {
    CambiosUsuario,
    EstadoRuta,
    FiltrosReportes,
    NuevaIntervencion,
    NuevaRuta,
    NuevoUsuario,
    RangoFechas,
    Rol,
    TipoIntervencion,
} from '@/tipos/panel';

// Claves jerárquicas: invalidar ['panel', 'reportes'] refresca la bandeja y todos los detalles.
export const CLAVES_PANEL = {
    reportes: (filtros?: FiltrosReportes) => ['panel', 'reportes', 'lista', filtros ?? {}] as const,
    reporte: (id: string) => ['panel', 'reportes', 'detalle', id] as const,
    imagen: (id: string) => ['panel', 'evidencias', id] as const,
    metricas: (filtros: object) => ['panel', 'metricas', filtros] as const,
    mapaCalor: (filtros: object) => ['panel', 'riesgo', 'actual', filtros] as const,
    predicciones: (localidadId?: number) => ['panel', 'riesgo', 'prediccion', localidadId ?? null] as const,
    intervenciones: (filtros: object) => ['panel', 'intervenciones', filtros] as const,
    rutas: (filtros: object) => ['panel', 'rutas', 'lista', filtros] as const,
    ruta: (id: number) => ['panel', 'rutas', 'detalle', id] as const,
    brigadistas: (localidadId?: number) => ['panel', 'brigadistas', localidadId ?? null] as const,
    usuarios: (filtros: object) => ['panel', 'usuarios', filtros] as const,
    auditoria: (filtros: object) => ['panel', 'auditoria', filtros] as const,
};

const siguiente = (ultima: { paginacion: { siguienteCursor: string | null } }) => ultima.paginacion.siguienteCursor ?? undefined;

export const useLocalidadesPanel = () => useQuery({
    queryKey: ['localidades'],
    queryFn: vecinoApi.localidades,
    staleTime: 60 * 60_000,
});

// ---------------------------------------------------------------------------
// Reportes
// ---------------------------------------------------------------------------

export const useReportes = (filtros: FiltrosReportes) => useInfiniteQuery({
    queryKey: CLAVES_PANEL.reportes(filtros),
    queryFn: ({ pageParam }) => panelApi.reportes(filtros, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: siguiente,
    placeholderData: keepPreviousData,
    staleTime: 20_000,
});

export const useReporte = (id: string) => useQuery({
    queryKey: CLAVES_PANEL.reporte(id),
    queryFn: () => panelApi.reporte(id),
});

// La foto se pide con el token (la URL sola no alcanza) y cada descarga queda auditada:
// se guarda en caché durante la sesión para no registrar un acceso por cada re-render.
export const useImagenEvidencia = (id: string, habilitada = true) => useQuery({
    queryKey: CLAVES_PANEL.imagen(id),
    queryFn: () => panelApi.imagenEvidencia(id),
    enabled: habilitada,
    staleTime: Infinity,
    gcTime: 30 * 60_000,
});

export const useCambiarEstadoReporte = () => {
    const cliente = useQueryClient();
    return useMutation({
        mutationFn: ({ id, estado, motivoRechazo }: { id: string; estado: Exclude<EstadoReporte, 'PENDIENTE'>; motivoRechazo?: string }) =>
            panelApi.cambiarEstadoReporte(id, estado, motivoRechazo),
        onSettled: () => Promise.all([
            cliente.invalidateQueries({ queryKey: ['panel', 'reportes'] }),
            cliente.invalidateQueries({ queryKey: ['panel', 'metricas'] }),
            cliente.invalidateQueries({ queryKey: ['panel', 'riesgo'] }),
            cliente.invalidateQueries({ queryKey: ['manzanas'] }),
        ]),
    });
};

// ---------------------------------------------------------------------------
// Métricas y riesgo
// ---------------------------------------------------------------------------

export const useMetricas = (filtros: RangoFechas & { localidadId?: number }, habilitada = true) => useQuery({
    queryKey: CLAVES_PANEL.metricas(filtros),
    queryFn: () => panelApi.metricas(filtros),
    enabled: habilitada,
    placeholderData: keepPreviousData,
});

export const useMapaCalor = (filtros: RangoFechas & { localidadId?: number }, habilitada = true) => useQuery({
    queryKey: CLAVES_PANEL.mapaCalor(filtros),
    queryFn: () => panelApi.mapaCalor(filtros),
    enabled: habilitada,
    retry: false,
});

export const usePredicciones = (localidadId: number | undefined, habilitada = true) => useQuery({
    queryKey: CLAVES_PANEL.predicciones(localidadId),
    queryFn: () => panelApi.predicciones(localidadId),
    enabled: habilitada,
    retry: false,
});

// ---------------------------------------------------------------------------
// Intervenciones
// ---------------------------------------------------------------------------

export const useIntervenciones = (filtros: RangoFechas & { localidadId?: number; tipo?: TipoIntervencion; manzanaId?: number }) => useInfiniteQuery({
    queryKey: CLAVES_PANEL.intervenciones(filtros),
    queryFn: ({ pageParam }) => panelApi.intervenciones(filtros, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: siguiente,
    placeholderData: keepPreviousData,
});

export const useRegistrarIntervencion = () => {
    const cliente = useQueryClient();
    return useMutation({
        mutationFn: (intervencion: NuevaIntervencion) => panelApi.registrarIntervencion(intervencion),
        onSettled: () => Promise.all([
            cliente.invalidateQueries({ queryKey: ['panel', 'intervenciones'] }),
            cliente.invalidateQueries({ queryKey: ['panel', 'rutas'] }),
            cliente.invalidateQueries({ queryKey: ['panel', 'reportes'] }),
            cliente.invalidateQueries({ queryKey: ['panel', 'metricas'] }),
            cliente.invalidateQueries({ queryKey: ['manzanas'] }),
        ]),
    });
};

// ---------------------------------------------------------------------------
// Rutas
// ---------------------------------------------------------------------------

export const useRutas = (filtros: { localidadId?: number; fecha?: string; estado?: EstadoRuta }) => useInfiniteQuery({
    queryKey: CLAVES_PANEL.rutas(filtros),
    queryFn: ({ pageParam }) => panelApi.rutas(filtros, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: siguiente,
    placeholderData: keepPreviousData,
});

export const useRuta = (id: number) => useQuery({
    queryKey: CLAVES_PANEL.ruta(id),
    queryFn: () => panelApi.ruta(id),
});

export const useBrigadistas = (localidadId: number | undefined, habilitada: boolean) => useQuery({
    queryKey: CLAVES_PANEL.brigadistas(localidadId),
    queryFn: () => panelApi.brigadistas(localidadId),
    enabled: habilitada,
});

const useInvalidarRutas = () => {
    const cliente = useQueryClient();
    return () => cliente.invalidateQueries({ queryKey: ['panel', 'rutas'] });
};

export const useGenerarRuta = () => {
    const invalidar = useInvalidarRutas();
    return useMutation({ mutationFn: (ruta: NuevaRuta) => panelApi.generarRuta(ruta), onSettled: invalidar });
};

export const useCambiarEstadoRuta = () => {
    const invalidar = useInvalidarRutas();
    return useMutation({
        mutationFn: ({ id, estado }: { id: number; estado: Exclude<EstadoRuta, 'PLANIFICADA'> }) => panelApi.cambiarEstadoRuta(id, estado),
        onSettled: invalidar,
    });
};

export const useMarcarParada = () => {
    const invalidar = useInvalidarRutas();
    return useMutation({
        mutationFn: ({ rutaId, paradaId }: { rutaId: number; paradaId: number }) => panelApi.marcarParadaVisitada(rutaId, paradaId),
        onSettled: invalidar,
    });
};

// ---------------------------------------------------------------------------
// Usuarios y auditoría
// ---------------------------------------------------------------------------

export const useUsuarios = (filtros: { rol?: Rol; localidadId?: number }) => useInfiniteQuery({
    queryKey: CLAVES_PANEL.usuarios(filtros),
    queryFn: ({ pageParam }) => panelApi.usuarios(filtros, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: siguiente,
    placeholderData: keepPreviousData,
});

export const useCrearUsuario = () => {
    const cliente = useQueryClient();
    return useMutation({
        mutationFn: (usuario: NuevoUsuario) => panelApi.crearUsuario(usuario),
        onSettled: () => cliente.invalidateQueries({ queryKey: ['panel', 'usuarios'] }),
    });
};

export const useActualizarUsuario = () => {
    const cliente = useQueryClient();
    return useMutation({
        mutationFn: ({ id, cambios }: { id: number; cambios: CambiosUsuario }) => panelApi.actualizarUsuario(id, cambios),
        onSettled: () => Promise.all([
            cliente.invalidateQueries({ queryKey: ['panel', 'usuarios'] }),
            cliente.invalidateQueries({ queryKey: ['panel', 'brigadistas'] }),
        ]),
    });
};

export const useAuditoria = (filtros: RangoFechas & { usuarioId?: number; accion?: string }) => useInfiniteQuery({
    queryKey: CLAVES_PANEL.auditoria(filtros),
    queryFn: ({ pageParam }) => panelApi.auditoria(filtros, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: siguiente,
    placeholderData: keepPreviousData,
});

// ---------------------------------------------------------------------------
// Copa Red-Cuidar
// ---------------------------------------------------------------------------

export const useRankingCopa = (localidadId: number | undefined, mes: string, habilitada = true) => useQuery({
    queryKey: ['panel', 'copa', localidadId ?? null, mes],
    queryFn: () => panelApi.rankingCopa(localidadId, mes),
    enabled: habilitada,
    placeholderData: keepPreviousData,
});

export const useCanjearPremio = () => {
    const cliente = useQueryClient();
    return useMutation({
        mutationFn: (codigo: string) => panelApi.canjearPremio(codigo),
        onSettled: () => cliente.invalidateQueries({ queryKey: ['panel', 'copa'] }),
    });
};
