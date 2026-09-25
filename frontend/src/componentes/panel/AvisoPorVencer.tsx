import { useMemo } from 'react';
import { Link } from 'react-router';
import { ArrowRight, Hourglass } from 'lucide-react';
import { useSesionPanel } from '@/autenticacion/SesionPanel';
import { useReportes } from '@/hooks/usePanel';

const HORA_MS = 3_600_000;

// Aviso para Epidemiología: reportes pendientes que llegaron hace más de 48 horas. Si nadie los
// revisa antes de las 72 horas, se descartan con su foto (privacidad del vecino).
export const AvisoPorVencer = () => {
    const { puede } = useSesionPanel();
    const rango = useMemo(() => {
        const ahora = Math.floor(Date.now() / 60_000) * 60_000;
        return { desde: new Date(ahora - 72 * HORA_MS).toISOString(), hasta: new Date(ahora - 48 * HORA_MS).toISOString() };
    }, []);
    const { data } = useReportes({ estado: 'PENDIENTE', ...rango });
    const cantidad = data?.pages[0]?.datos.length ?? 0;
    const hayMas = Boolean(data?.pages[0]?.paginacion.siguienteCursor);

    if (!puede('reportes:validar') || cantidad === 0) return null;

    return (
        <Link to="/panel/reportes?estado=PENDIENTE" role="status"
            className="flex items-center gap-3 rounded-tarjeta border border-rojo-200 bg-rojo-50 p-4 text-sm text-rojo-800 transition hover:bg-rojo-100">
            <Hourglass className="size-5 shrink-0" aria-hidden />
            <span className="flex-1">
                <strong>{cantidad}{hayMas ? '+' : ''} {cantidad === 1 ? 'reporte vence' : 'reportes vencen'} en menos de 24 horas.</strong>{' '}
                Si nadie los revisa, se descartan junto con su foto.
            </span>
            <ArrowRight className="size-4 shrink-0" aria-hidden />
        </Link>
    );
};
