import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { vecinoApi, type Recuadro } from '@/api/vecino.api';
import { puntoEnPoligono, recuadroAlrededor, type Ubicacion } from '@/lib/geo';
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

// Manzana que contiene la ubicación del vecino.
export const useMiManzana = (ubicacion: Ubicacion | null) => {
    const consulta = useManzanas(ubicacion ? recuadroAlrededor(ubicacion.latitud, ubicacion.longitud) : null);
    const manzana = ubicacion
        ? consulta.data?.features.find((feature) => feature.geometry.coordinates.some((anillo) => puntoEnPoligono(ubicacion.longitud, ubicacion.latitud, anillo))) ?? null
        : null;
    return { ...consulta, manzana, cercanas: consulta.data?.features ?? [] };
};

export const useMisReportes = () => useInfiniteQuery({
    queryKey: CLAVES_VECINO.misReportes,
    queryFn: ({ pageParam }) => vecinoApi.misReportes(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (pagina) => pagina.paginacion.siguienteCursor ?? undefined,
    staleTime: 30 * 1000,
});
