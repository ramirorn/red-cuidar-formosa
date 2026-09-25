import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { vecinoApi } from '@/api/vecino.api';
import { mesArgentino } from '@/lib/formato';
import { guardarAjuste, leerAjuste } from '@/sinConexion/bd';
import { listarPropios } from '@/sinConexion/cola';
import type { PremioCopa } from '@/tipos';

export const useCopaPodio = (localidadId: number | null, mes?: string) => useQuery({
    queryKey: ['copa', 'podio', localidadId, mes ?? 'actual'],
    queryFn: () => vecinoApi.copaPodio(localidadId!, mes),
    enabled: localidadId !== null,
    staleTime: 60_000,
});

export const useCopaZona = (zonaId: number | null, mes?: string) => useQuery({
    queryKey: ['copa', 'zona', zonaId, mes ?? 'actual'],
    queryFn: () => vecinoApi.copaZona(zonaId!, mes),
    enabled: zonaId !== null,
    staleTime: 60_000,
});

export type ResultadoPremio = { tipo: 'premio'; premio: PremioCopa } | { tipo: 'esperando' } | { tipo: 'nada' };

// Premio de una edición cerrada: el celular manda los idCliente de sus reportes de ese mes y el
// servidor responde si alguno ayudó a una zona del podio. El código se guarda para mostrarlo sin señal.
export const usePremio = (mes: string) => useQuery({
    queryKey: ['copa', 'premio', mes],
    queryFn: async (): Promise<ResultadoPremio> => {
        const guardado = await leerAjuste<PremioCopa>(`premio-${mes}`);
        const propios = (await listarPropios()).filter((propio) => mesArgentino(new Date(propio.creadoEn)) === mes);
        if (propios.length === 0) return guardado ? { tipo: 'premio', premio: guardado } : { tipo: 'nada' };
        try {
            const premio = await vecinoApi.pedirPremio(mes, propios.map((propio) => propio.idCliente));
            if (!premio) return { tipo: 'nada' };
            await guardarAjuste(`premio-${mes}`, premio);
            return { tipo: 'premio', premio };
        } catch (error) {
            // 409: la edición todavía no es definitiva, o estos reportes ya generaron un premio (guardado en el celular).
            if (isAxiosError(error) && error.response?.status === 409) {
                if (guardado) return { tipo: 'premio', premio: guardado };
                const mensaje = String((error.response.data as { message?: string } | undefined)?.message ?? '');
                return mensaje.includes('todavía no cerró') ? { tipo: 'esperando' } : { tipo: 'nada' };
            }
            if (isAxiosError(error) && error.response?.status === 410) return { tipo: 'nada' };
            if (guardado) return { tipo: 'premio', premio: guardado };
            throw error;
        }
    },
    staleTime: 5 * 60_000,
    networkMode: 'offlineFirst',
});
