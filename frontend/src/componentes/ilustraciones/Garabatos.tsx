import type { SVGProps } from 'react';

// Garabatos de trazo grueso y redondeado, coherentes con el estilo del logo.
type Propiedades = SVGProps<SVGSVGElement>;
const base = { fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true } as const;

export const Subrayado = (props: Propiedades) => (
    <svg viewBox="0 0 120 14" strokeWidth={4} {...base} {...props}>
        <path d="M3 9c10-6 18 5 28 0s18-6 28 0 18 5 28 0 18-6 30-1" />
    </svg>
);

export const FlechaCurva = (props: Propiedades) => (
    <svg viewBox="0 0 90 48" strokeWidth={2.5} {...base} {...props}>
        <path d="M8 10c-6 10 2 22 14 18 10-3 6-16-3-12-8 4-3 20 14 24 16 4 34-2 48-12" />
        <path d="M72 20l9 8-11 5" />
    </svg>
);

export const Destellos = (props: Propiedades) => (
    <svg viewBox="0 0 60 60" strokeWidth={3.5} {...base} {...props}>
        <path d="M30 6v10M30 44v10M6 30h10M44 30h10M13 13l7 7M40 40l7 7M47 13l-7 7M13 47l7-7" />
    </svg>
);

export const RayosAlerta = (props: Propiedades) => (
    <svg viewBox="0 0 60 40" strokeWidth={3.5} {...base} {...props}>
        <path d="M10 34 4 20M28 30V6M46 34l8-14" />
    </svg>
);

export const Gotas = (props: Propiedades) => (
    <svg viewBox="0 0 64 48" strokeWidth={3} {...base} {...props}>
        <path d="M14 8c-5 8-8 12-8 16a8 8 0 0 0 16 0c0-4-3-8-8-16ZM46 4c-4 6-6 9-6 12a6 6 0 0 0 12 0c0-3-2-6-6-12ZM40 30c-3 5-5 7-5 10a5 5 0 0 0 10 0c0-3-2-5-5-10Z" />
    </svg>
);

export const Corazon = (props: Propiedades) => (
    <svg viewBox="0 0 48 44" strokeWidth={3.5} {...base} {...props}>
        <path d="M24 40S5 28 5 15A10 10 0 0 1 24 10a10 10 0 0 1 19 5c0 13-19 25-19 25Z" />
    </svg>
);

// Mancha orgánica de fondo (como el blob amarillo de la referencia, en verde).
export const Mancha = ({ forma = 1, ...props }: Propiedades & { forma?: 1 | 2 | 3 }) => (
    <svg viewBox="0 0 400 400" aria-hidden {...props}>
        {forma === 1 && <path fill="currentColor" d="M318 70c46 40 70 104 58 164-13 60-61 116-122 135-61 18-135-2-181-48C27 275 9 204 30 143 51 82 111 31 176 21c49-8 99 12 142 49Z" />}
        {forma === 2 && <path fill="currentColor" d="M336 108c37 49 43 121 13 176-31 55-99 93-163 88-64-6-124-55-151-116-27-60-20-132 20-178 40-47 113-66 175-55 45 8 81 38 106 85Z" />}
        {forma === 3 && <path fill="currentColor" d="M289 42c52 22 93 76 97 133 4 58-29 118-80 152-51 33-121 40-177 12C73 311 31 249 22 187 12 125 36 62 86 34c58-33 145-17 203 8Z" />}
    </svg>
);

export const Puntos = (props: Propiedades) => (
    <svg viewBox="0 0 80 80" aria-hidden {...props}>
        {Array.from({ length: 16 }, (_, i) => (
            <circle key={i} cx={10 + (i % 4) * 20} cy={10 + Math.floor(i / 4) * 20} r="3.2" fill="currentColor" />
        ))}
    </svg>
);
