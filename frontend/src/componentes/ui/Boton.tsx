import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router';
import { cn } from '@/lib/utils';

const VARIANTES = {
    primario: 'bg-verde-600 text-white shadow-suave hover:bg-verde-700',
    acento: 'bg-rojo-500 text-white shadow-suave hover:bg-rojo-600',
    contorno: 'border-2 border-tinta/85 bg-white text-tinta hover:bg-gris-superficie',
    blanco: 'bg-white text-verde-700 shadow-suave hover:bg-verde-50',
    fantasma: 'text-tinta hover:bg-gris-superficie',
} as const;

const TAMANOS = {
    chico: 'h-10 px-4 text-sm gap-2',
    medio: 'h-12 px-6 text-[0.95rem] gap-2.5',
    grande: 'h-14 px-8 text-base gap-3',
} as const;

export type VarianteBoton = keyof typeof VARIANTES;
export type TamanoBoton = keyof typeof TAMANOS;

interface PropiedadesComunes {
    variante?: VarianteBoton;
    tamano?: TamanoBoton;
    icono?: ReactNode;
    iconoFinal?: ReactNode;
    anchoCompleto?: boolean;
}

export const clasesBoton = ({ variante = 'primario', tamano = 'medio', anchoCompleto = false }: PropiedadesComunes) => cn(
    'inline-flex shrink-0 items-center justify-center rounded-full font-extrabold whitespace-nowrap',
    'transition duration-150 hover:-translate-y-px active:translate-y-0',
    'disabled:pointer-events-none disabled:opacity-60',
    VARIANTES[variante],
    TAMANOS[tamano],
    anchoCompleto && 'w-full',
);

type PropiedadesBoton = PropiedadesComunes & ButtonHTMLAttributes<HTMLButtonElement>;

export const Boton = ({ variante, tamano, icono, iconoFinal, anchoCompleto, className, children, type = 'button', ...resto }: PropiedadesBoton) => (
    <button type={type} className={cn(clasesBoton({ variante, tamano, anchoCompleto }), className)} {...resto}>
        {icono}
        {children}
        {iconoFinal}
    </button>
);

type PropiedadesBotonEnlace = PropiedadesComunes & LinkProps;

export const BotonEnlace = ({ variante, tamano, icono, iconoFinal, anchoCompleto, className, children, ...resto }: PropiedadesBotonEnlace) => (
    <Link className={cn(clasesBoton({ variante, tamano, anchoCompleto }), className)} {...resto}>
        {icono}
        {children}
        {iconoFinal}
    </Link>
);
