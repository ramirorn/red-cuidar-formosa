import { Link } from 'react-router';
import { Flame } from 'lucide-react';
import { useProgreso } from '@/hooks/useProgreso';
import { cn } from '@/lib/utils';

// Racha en el encabezado: naranja si esta semana ya revisó el patio, gris si todavía le falta.
export const ChipRacha = () => {
    const { racha, cargando } = useProgreso();
    if (cargando) return null;
    const encendida = racha.estaSemanaHecha;
    return (
        <Link to="/app/progreso" aria-label={`Racha de ${racha.semanas} ${racha.semanas === 1 ? 'semana' : 'semanas'}. Ver mi progreso`}
            className={cn('flex h-9 items-center gap-1 rounded-full px-2.5 text-sm font-black ring-1 ring-inset transition',
                encendida ? 'bg-amber-50 text-amber-700 ring-amber-200' : 'bg-gris-superficie text-gris-texto ring-gris-borde')}>
            <Flame className={cn('size-4', encendida && 'fill-amber-400 text-amber-600')} aria-hidden />
            {racha.semanas}
        </Link>
    );
};

export const BarraProgreso = ({ progreso, meta, className }: { progreso: number; meta: number; className?: string }) => (
    <div className={cn('h-2.5 overflow-hidden rounded-full bg-gris-superficie', className)} role="progressbar" aria-valuemin={0} aria-valuemax={meta} aria-valuenow={progreso}>
        <div className={cn('h-full rounded-full transition-all', progreso >= meta ? 'bg-verde-500' : 'bg-amber-400')} style={{ width: `${Math.round((progreso / Math.max(1, meta)) * 100)}%` }} />
    </div>
);
