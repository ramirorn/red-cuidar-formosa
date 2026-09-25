import { CircleCheck, CircleX, Clock, Hourglass, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { EstadoReporte } from '@/tipos';

// VENCIDO: nadie lo revisó en 72 horas y se descartó (solo lo sabe el celular del vecino).
export type EstadoVisibleReporte = EstadoReporte | 'VENCIDO';

export const ESTADOS_REPORTE: Record<EstadoVisibleReporte, { etiqueta: string; clases: string; Icono: typeof Clock }> = {
    PENDIENTE: { etiqueta: 'En revisión', clases: 'bg-gris-superficie text-tinta-suave ring-gris-borde', Icono: Clock },
    VALIDADO: { etiqueta: 'Confirmado', clases: 'bg-rojo-50 text-rojo-700 ring-rojo-200', Icono: ShieldCheck },
    RECHAZADO: { etiqueta: 'No confirmado', clases: 'bg-gris-superficie text-gris-texto ring-gris-borde line-through', Icono: CircleX },
    RESUELTO: { etiqueta: 'Resuelto', clases: 'bg-verde-50 text-verde-700 ring-verde-200', Icono: CircleCheck },
    VENCIDO: { etiqueta: 'No se revisó a tiempo', clases: 'bg-gris-superficie text-gris-texto ring-gris-borde', Icono: Hourglass },
};

export const ChipEstadoReporte = ({ estado, className }: { estado: EstadoVisibleReporte; className?: string }) => {
    const { etiqueta, clases, Icono } = ESTADOS_REPORTE[estado];
    return (
        <span className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold ring-1 ring-inset', clases, className)}>
            <Icono className="size-3.5" aria-hidden />{etiqueta}
        </span>
    );
};
