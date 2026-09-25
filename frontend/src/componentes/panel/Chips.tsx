import { CircleCheck, CircleX, Clock, ShieldCheck } from 'lucide-react';
import { ESTADOS_REPORTE_PANEL, ESTADOS_RUTA } from '@/lib/etiquetasPanel';
import { cn } from '@/lib/utils';
import type { EstadoReporte } from '@/tipos';
import type { EstadoRuta } from '@/tipos/panel';

const ESTILOS_REPORTE: Record<EstadoReporte, { clases: string; Icono: typeof Clock }> = {
    PENDIENTE: { clases: 'bg-amber-50 text-amber-800 ring-amber-200', Icono: Clock },
    VALIDADO: { clases: 'bg-rojo-50 text-rojo-700 ring-rojo-200', Icono: ShieldCheck },
    RECHAZADO: { clases: 'bg-gris-superficie text-gris-texto ring-gris-borde', Icono: CircleX },
    RESUELTO: { clases: 'bg-verde-50 text-verde-700 ring-verde-200', Icono: CircleCheck },
};

const BASE = 'inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-extrabold whitespace-nowrap ring-1 ring-inset';

export const ChipReporte = ({ estado, className }: { estado: EstadoReporte; className?: string }) => {
    const { clases, Icono } = ESTILOS_REPORTE[estado];
    return <span className={cn(BASE, clases, className)}><Icono className="size-3.5" aria-hidden />{ESTADOS_REPORTE_PANEL[estado]}</span>;
};

export const ChipRuta = ({ estado, className }: { estado: EstadoRuta; className?: string }) => (
    <span className={cn(BASE, ESTADOS_RUTA[estado].clases, className)}>{ESTADOS_RUTA[estado].etiqueta}</span>
);

// Barra de confianza de la IA: sirve para priorizar, nunca para decidir (siempre valida una persona).
export const ConfianzaIa = ({ valor }: { valor: number | null }) => {
    if (valor === null) return <span className="text-xs text-gris-texto">Sin IA</span>;
    const porcentaje = Math.round(valor * 100);
    return (
        <span className="inline-flex items-center gap-2" title={`Confianza de la IA: ${porcentaje}%`}>
            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-gris-superficie" aria-hidden>
                <span className={cn('block h-full rounded-full', porcentaje >= 70 ? 'bg-rojo-500' : porcentaje >= 40 ? 'bg-estado-amarillo' : 'bg-gris-texto')} style={{ width: `${porcentaje}%` }} />
            </span>
            <span className="text-xs font-extrabold tabular-nums">{porcentaje}%</span>
        </span>
    );
};
