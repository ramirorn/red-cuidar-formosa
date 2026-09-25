import { useCallback, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ReporteEnCola } from '@/sinConexion/bd';
import { CANAL_COLA, descartarDeCola, listarCola, reintentarReporte, sincronizarCola } from '@/sinConexion/cola';
import { CLAVES_VECINO } from './claves';

// Estado de la cola local de reportes, sincronizado entre pestañas y con el service worker.
export const useColaReportes = () => {
    const queryClient = useQueryClient();
    const [reportes, setReportes] = useState<ReporteEnCola[]>([]);
    const [sincronizando, setSincronizando] = useState(false);

    const recargar = useCallback(async () => setReportes(await listarCola()), []);

    useEffect(() => {
        void recargar();
        const canal = new BroadcastChannel(CANAL_COLA);
        canal.onmessage = () => {
            void recargar();
            void queryClient.invalidateQueries({ queryKey: CLAVES_VECINO.misReportes });
        };
        return () => canal.close();
    }, [recargar, queryClient]);

    const sincronizar = useCallback(async ({ silencioso = false } = {}) => {
        setSincronizando(true);
        try {
            const resultado = await sincronizarCola();
            if (!silencioso && resultado.enviados > 0) toast.success(resultado.enviados === 1 ? 'Reporte enviado' : `${resultado.enviados} reportes enviados`);
            if (!silencioso && resultado.pendientes > 0 && resultado.enviados === 0) toast.info('Sin señal: lo enviamos cuando vuelva la conexión.');
            return resultado;
        } finally {
            setSincronizando(false);
            await recargar();
        }
    }, [recargar]);

    return {
        reportes,
        pendientes: reportes.filter((reporte) => reporte.estado !== 'error').length,
        conError: reportes.filter((reporte) => reporte.estado === 'error').length,
        sincronizando,
        sincronizar,
        reintentar: reintentarReporte,
        descartar: descartarDeCola,
    };
};
