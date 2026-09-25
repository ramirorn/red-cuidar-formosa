import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

// Rótulo breve en mayúsculas sobre cada sección ("CÓMO FUNCIONA").
export const Rotulo = ({ className, tono = 'verde', ...resto }: HTMLAttributes<HTMLParagraphElement> & { tono?: 'verde' | 'rojo' | 'blanco' }) => (
    <p
        className={cn(
            'text-xs font-extrabold tracking-[0.18em] uppercase',
            tono === 'verde' && 'text-verde-600',
            tono === 'rojo' && 'text-rojo-600',
            tono === 'blanco' && 'text-white/85',
            className,
        )}
        {...resto}
    />
);

// Frase manuscrita de acento, como la letra a mano del logo de referencia.
export const Manuscrita = ({ className, ...resto }: HTMLAttributes<HTMLSpanElement>) => (
    <span className={cn('font-manuscrita font-bold', className)} {...resto} />
);

interface PropiedadesTitulo {
    rotulo?: ReactNode;
    titulo: ReactNode;
    acento?: ReactNode;
    descripcion?: ReactNode;
    alineacion?: 'izquierda' | 'centro';
    className?: string;
}

// Encabezado de sección: rótulo, título fuerte y segunda línea manuscrita en color.
export const TituloSeccion = ({ rotulo, titulo, acento, descripcion, alineacion = 'izquierda', className }: PropiedadesTitulo) => (
    <div className={cn(alineacion === 'centro' && 'mx-auto text-center', className)}>
        {rotulo && <Rotulo className="mb-3">{rotulo}</Rotulo>}
        <h2 className="text-3xl leading-tight font-black tracking-tight text-tinta sm:text-4xl">
            {titulo}
            {acento && (
                <>
                    <br />
                    <Manuscrita className="text-4xl text-verde-500 sm:text-5xl">{acento}</Manuscrita>
                </>
            )}
        </h2>
        {descripcion && <p className="mt-4 max-w-md text-base leading-relaxed text-tinta-suave">{descripcion}</p>}
    </div>
);
