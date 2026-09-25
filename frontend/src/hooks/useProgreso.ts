import { useCallback, useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { vecinoApi } from '@/api/vecino.api';
import { listarActividad, guardarActividad, semanasActivas } from '@/progreso/actividad';
import { desafiosPersonales } from '@/progreso/desafios';
import { insigniasCumplidas } from '@/progreso/insignias';
import { calcularRacha } from '@/progreso/racha';
import { leerAjuste, type TipoActividad } from '@/sinConexion/bd';
import { mesAnterior, mesArgentino } from '@/lib/formato';
import type { Ubicacion } from '@/lib/geo';
import { useMiManzana, useMisReportes } from './useVecino';

const CLAVE_ACTIVIDAD = ['progreso', 'actividad'] as const;
export const CLAVE_INSIGNIAS = ['progreso', 'insignias'] as const;

// Registra lo que hizo el vecino y refresca su progreso en toda la app.
export const useRegistrarActividad = () => {
    const cliente = useQueryClient();
    return useCallback(async (tipo: TipoActividad) => {
        const racha = await guardarActividad(tipo);
        await cliente.invalidateQueries({ queryKey: ['progreso'] });
        return racha;
    }, [cliente]);
};

// Entrar a una sección (mapa, consejos) cuenta para los desafíos que la piden, una vez por día.
export const useActividadAlEntrar = (tipo: TipoActividad) => {
    const registrar = useRegistrarActividad();
    useEffect(() => { void registrar(tipo); }, [registrar, tipo]);
};

// Insignias ya ganadas (clave → fecha): se guardan una vez y no se pierden.
export const useInsigniasGanadas = () => useQuery({
    queryKey: CLAVE_INSIGNIAS,
    queryFn: async () => (await leerAjuste<Record<string, string>>('insignias')) ?? {},
    networkMode: 'always',
});

// Racha, desafíos personales e insignias que se cumplen hoy. Todo se calcula en el celular.
export const useProgreso = () => {
    const { data: actividad = [], isLoading } = useQuery({ queryKey: CLAVE_ACTIVIDAD, queryFn: listarActividad, networkMode: 'always' });
    const { data: reportes = [] } = useMisReportes();
    const { data: ganoPremio = false } = useQuery({
        queryKey: ['progreso', 'premios'],
        queryFn: async () => {
            const mes = mesAnterior(mesArgentino());
            return Boolean(await leerAjuste(`premio-${mes}`)) || Boolean(await leerAjuste(`premio-${mesAnterior(mes)}`));
        },
        networkMode: 'always',
    });

    return useMemo(() => {
        const racha = calcularRacha(semanasActivas(actividad));
        const desafios = desafiosPersonales(actividad);
        const cumplidas = insigniasCumplidas({
            actividad, rachaActual: racha.semanas, reportes, ganoPremio,
            desafiosCumplidos: desafios.every((desafio) => desafio.cumplido),
        });
        return { cargando: isLoading, actividad, racha, desafios, cumplidas };
    }, [actividad, reportes, ganoPremio, isLoading]);
};

// Zona del vecino (según la última ubicación guardada) y sus desafíos colectivos de la semana.
export const useDesafiosDeZona = (ubicacion: Ubicacion | null) => {
    const { manzana } = useMiManzana(ubicacion);
    const zonaId = manzana?.properties.zonaId ?? null;
    return useQuery({
        queryKey: ['progreso', 'zona', zonaId],
        queryFn: () => vecinoApi.desafiosZona(zonaId!),
        enabled: zonaId !== null,
        staleTime: 60_000,
    });
};
