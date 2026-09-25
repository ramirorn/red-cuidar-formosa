import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { CLAVE_INSIGNIAS, useInsigniasGanadas, useProgreso } from '@/hooks/useProgreso';
import { useMisReportes, type EstadoPropio } from '@/hooks/useVecino';
import { INSIGNIAS } from '@/progreso/insignias';
import { guardarAjuste, leerAjuste } from '@/sinConexion/bd';

const CONFIRMADOS: EstadoPropio[] = ['VALIDADO', 'RESUELTO'];

// Vive en la disposición del vecino: festeja las insignias nuevas y los reportes que confirmó
// el equipo de salud desde la última vez que abrió la app. No muestra nada propio.
export const VigiaProgreso = () => {
    const cliente = useQueryClient();
    const navegar = useNavigate();
    const { cumplidas, cargando } = useProgreso();
    const { data: ganadas } = useInsigniasGanadas();
    const { data: reportes } = useMisReportes();
    const procesando = useRef(false);

    // Insignias: las que se cumplen y todavía no estaban guardadas.
    useEffect(() => {
        if (cargando || !ganadas || procesando.current) return;
        const nuevas = cumplidas.filter((clave) => !ganadas[clave]);
        if (nuevas.length === 0) return;
        procesando.current = true;
        const fecha = new Date().toISOString();
        void guardarAjuste('insignias', { ...ganadas, ...Object.fromEntries(nuevas.map((clave) => [clave, fecha])) })
            .then(() => cliente.invalidateQueries({ queryKey: CLAVE_INSIGNIAS }))
            .finally(() => { procesando.current = false; });
        for (const clave of nuevas) {
            const insignia = INSIGNIAS.find((item) => item.clave === clave);
            if (insignia) toast.success(`¡Nueva insignia: ${insignia.nombre}!`, { description: 'Mirala en Mi progreso.', action: { label: 'Ver', onClick: () => { void navegar('/app/progreso'); } } });
        }
    }, [cumplidas, ganadas, cargando, cliente, navegar]);

    // Reportes confirmados desde la última visita.
    useEffect(() => {
        if (!reportes || reportes.length === 0) return;
        void (async () => {
            const avisados = (await leerAjuste<Record<string, EstadoPropio>>('estadosAvisados')) ?? {};
            const recienConfirmados = reportes.filter((reporte) => CONFIRMADOS.includes(reporte.estado) && !CONFIRMADOS.includes(avisados[reporte.idCliente] ?? 'PENDIENTE'));
            await guardarAjuste('estadosAvisados', Object.fromEntries(reportes.map((reporte) => [reporte.idCliente, reporte.estado])));
            if (recienConfirmados.length > 2) {
                toast.success(`¡Confirmaron ${recienConfirmados.length} reportes tuyos!`, { description: 'Cada uno suma puntos para tu zona en la Copa.' });
                return;
            }
            for (const reporte of recienConfirmados) {
                if (reporte.tipo === 'LIMPIEZA') {
                    toast.success('¡Confirmaron tu limpieza!', { description: 'Sumó 10 puntos para tu zona en la Copa Red-Cuidar.' });
                } else {
                    toast.success('Confirmaron el criadero que reportaste', { description: '+1 punto para tu zona. Eliminalo y mandá la foto de cómo quedó: suma 10 más.' });
                }
            }
        })();
    }, [reportes]);

    return null;
};
