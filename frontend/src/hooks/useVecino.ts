import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { vecinoApi, type Recuadro } from '@/api/vecino.api';
import { recuadroAlrededor, type Ubicacion } from '@/lib/geo';
import { listarCola, listarPropios } from '@/sinConexion/cola';
import { manzanasEnArea, obtenerManzanasDeLocalidad, ubicarEnManzana } from '@/sinConexion/manzanasLocales';
import type { EstadoReporte, TipoReporte } from '@/tipos';
import { CLAVES_VECINO } from './claves';

export const useLocalidades = () => useQuery({
    queryKey: CLAVES_VECINO.localidades,
    queryFn: vecinoApi.localidades,
    staleTime: 60 * 60 * 1000, // casi no cambian
});

// El recuadro se redondea (~100 m) para reutilizar la caché al mover apenas el mapa.
const redondear = (recuadro: Recuadro): Recuadro => ({
    longitudMinima: Math.floor(recuadro.longitudMinima * 1000) / 1000,
    latitudMinima: Math.floor(recuadro.latitudMinima * 1000) / 1000,
    longitudMaxima: Math.ceil(recuadro.longitudMaxima * 1000) / 1000,
    latitudMaxima: Math.ceil(recuadro.latitudMaxima * 1000) / 1000,
});

export const useManzanas = (recuadro: Recuadro | null) => {
    const clave = recuadro ? redondear(recuadro) : null;
    return useQuery({
        queryKey: CLAVES_VECINO.manzanas(clave),
        queryFn: () => vecinoApi.manzanas(clave as Recuadro),
        enabled: clave !== null,
        placeholderData: keepPreviousData,
        staleTime: 60 * 1000, // el mapa público tolera un minuto de desfase
    });
};

// Manzana del vecino, calculada en el celular con las manzanas de su localidad: la ubicación
// exacta nunca se envía. Funciona sin conexión si las manzanas ya se descargaron alguna vez.
export const useMiManzana = (ubicacion: Ubicacion | null) => {
    const consulta = useQuery({
        queryKey: ['vecino', 'miManzana', ubicacion ? [ubicacion.latitud.toFixed(5), ubicacion.longitud.toFixed(5)] : null],
        queryFn: () => ubicarEnManzana(ubicacion!.latitud, ubicacion!.longitud),
        enabled: ubicacion !== null,
        networkMode: 'offlineFirst',
        staleTime: 60 * 1000,
    });
    const resultado = consulta.data;
    const cercanas = ubicacion && resultado?.coleccion
        ? manzanasEnArea(resultado.coleccion, recuadroAlrededor(ubicacion.latitud, ubicacion.longitud))
        : [];
    return {
        ...consulta,
        manzana: resultado?.tipo === 'encontrada' ? resultado.manzana : null,
        fuera: resultado?.tipo === 'fuera',
        localidadId: resultado?.localidadId ?? null,
        cercanas,
    };
};

// Todas las manzanas de una localidad (mapa del barrio), con copia en el celular.
export const useManzanasDeLocalidad = (localidadId: number | null) => useQuery({
    queryKey: ['vecino', 'manzanasLocalidad', localidadId],
    queryFn: () => obtenerManzanasDeLocalidad(localidadId!),
    enabled: localidadId !== null,
    networkMode: 'offlineFirst',
    staleTime: 5 * 60 * 1000,
});

export type EstadoPropio = EstadoReporte | 'VENCIDO';

export interface ReporteMio {
    idCliente: string;
    tipo: TipoReporte;
    manzanaCodigo: string;
    creadoEn: string;
    estado: EstadoPropio;
}

const VIGENCIA_PENDIENTE_MS = 72 * 60 * 60 * 1000;

// "Mis reportes": el celular recuerda sus idCliente y le pregunta al servidor el estado de cada uno.
// Un reporte que el servidor ya no tiene y pasó las 72 horas se descartó porque nadie lo revisó a tiempo.
export const useMisReportes = () => useQuery({
    queryKey: CLAVES_VECINO.misReportes,
    queryFn: async (): Promise<ReporteMio[]> => {
        const enCola = new Set((await listarCola()).map((reporte) => reporte.idCliente));
        const enviados = (await listarPropios()).filter((propio) => !enCola.has(propio.idCliente)).slice(0, 100);
        if (enviados.length === 0) return [];

        const servidor = new Map((await vecinoApi.consultarPropios(enviados.map((propio) => propio.idCliente)))
            .map((reporte) => [reporte.idCliente, reporte]));
        return enviados.map((propio) => {
            const remoto = servidor.get(propio.idCliente);
            const vencido = !remoto && Date.now() - new Date(propio.creadoEn).getTime() > VIGENCIA_PENDIENTE_MS;
            return { ...propio, estado: remoto?.estado ?? (vencido ? 'VENCIDO' : 'PENDIENTE') };
        });
    },
    staleTime: 30 * 1000,
});
