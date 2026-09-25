import { CircleAlert, CircleCheck, CircleDashed, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';

export type EstadoManzana = 'ROJO' | 'AMARILLO' | 'VERDE' | 'SIN_DATOS';

export const ESTADOS_MANZANA: Record<EstadoManzana, { etiqueta: string; descripcion: string; clases: string; color: string; Icono: typeof CircleAlert }> = {
    ROJO: {
        etiqueta: 'Criadero activo',
        descripcion: 'Hay un criadero confirmado sin eliminar.',
        clases: 'bg-rojo-50 text-rojo-700 ring-rojo-200',
        color: 'var(--color-estado-rojo)',
        Icono: CircleAlert,
    },
    AMARILLO: {
        etiqueta: 'Revisar',
        descripcion: 'Hay reportes en revisión, llovió después de limpiar o la limpieza venció.',
        clases: 'bg-amber-50 text-amber-800 ring-amber-200',
        color: 'var(--color-estado-amarillo)',
        Icono: TriangleAlert,
    },
    VERDE: {
        etiqueta: 'Limpia',
        descripcion: 'Se limpió en los últimos 7 días.',
        clases: 'bg-verde-50 text-verde-700 ring-verde-200',
        color: 'var(--color-estado-verde)',
        Icono: CircleCheck,
    },
    SIN_DATOS: {
        etiqueta: 'Sin datos',
        descripcion: 'Todavía no hay reportes en esta manzana.',
        clases: 'bg-gris-superficie text-gris-texto ring-gris-borde',
        color: 'var(--color-estado-sin-datos)',
        Icono: CircleDashed,
    },
};

export const ChipEstado = ({ estado, tamano = 'medio', className }: { estado: EstadoManzana; tamano?: 'chico' | 'medio' | 'grande'; className?: string }) => {
    const { etiqueta, clases, Icono } = ESTADOS_MANZANA[estado];
    return (
        <span
            className={cn(
                'inline-flex items-center gap-1.5 rounded-full font-extrabold ring-1 ring-inset',
                tamano === 'chico' && 'px-2.5 py-1 text-xs',
                tamano === 'medio' && 'px-3 py-1.5 text-sm',
                tamano === 'grande' && 'px-4 py-2 text-base',
                clases,
                className,
            )}
        >
            <Icono aria-hidden className={tamano === 'grande' ? 'size-5' : 'size-4'} strokeWidth={2.5} />
            {etiqueta}
        </span>
    );
};
