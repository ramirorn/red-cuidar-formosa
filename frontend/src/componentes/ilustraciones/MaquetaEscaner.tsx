import { cn } from '@/lib/utils';

interface Deteccion {
    x: number;
    y: number;
    ancho: number;
    alto: number;
    etiqueta: string;
}

const DETECCIONES: Deteccion[] = [
    { x: 22, y: 250, ancho: 108, alto: 82, etiqueta: 'Neumático 91%' },
    { x: 150, y: 210, ancho: 70, alto: 88, etiqueta: 'Balde 78%' },
    { x: 196, y: 318, ancho: 60, alto: 64, etiqueta: 'Maceta 64%' },
];

// Celular con la cámara de la app marcando en rojo los objetos que juntan agua.
export const MaquetaEscaner = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 280 540" role="img" aria-label="Celular con la app detectando un neumático, un balde y una maceta en un patio" className={cn('drop-shadow-xl', className)}>
        <defs>
            <clipPath id="pantalla-escaner">
                <rect x="14" y="14" width="252" height="512" rx="30" />
            </clipPath>
        </defs>

        <rect x="4" y="4" width="272" height="532" rx="40" fill="#1a1a1a" />
        <g clipPath="url(#pantalla-escaner)">
            {/* Patio */}
            <rect x="14" y="14" width="252" height="512" fill="#dff0fb" />
            <path d="M14 190h252v336H14z" fill="#e8dcc4" />
            {Array.from({ length: 9 }, (_, i) => (
                <rect key={i} x={20 + i * 28} y="120" width="20" height="80" rx="3" fill="#c9a77c" stroke="#8a6a44" strokeWidth="2" />
            ))}
            <path d="M14 150h252M14 180h252" stroke="#8a6a44" strokeWidth="3" />
            <path d="M14 400c60-20 140-20 252 0v126H14z" fill="#bfd9a4" />

            {/* Neumático con agua */}
            <ellipse cx="76" cy="298" rx="48" ry="30" fill="#2b2b2b" />
            <ellipse cx="76" cy="294" rx="24" ry="13" fill="#6cb6d9" />
            <ellipse cx="76" cy="294" rx="24" ry="13" fill="none" stroke="#1a1a1a" strokeWidth="3" />
            {/* Balde */}
            <path d="M156 222h58l-8 72h-42z" fill="#4c93c9" stroke="#1a1a1a" strokeWidth="3" strokeLinejoin="round" />
            <ellipse cx="185" cy="222" rx="29" ry="7" fill="#8fd0ef" stroke="#1a1a1a" strokeWidth="3" />
            {/* Maceta con plato */}
            <path d="M206 340h40l-6 34h-28z" fill="#c8693c" stroke="#1a1a1a" strokeWidth="3" strokeLinejoin="round" />
            <path d="M226 340c-4-18-18-22-24-18 8 2 14 8 16 18M226 340c2-20 16-26 22-20-8 2-14 10-14 20" fill="#1e8c2f" stroke="#1a1a1a" strokeWidth="2.5" />
            <ellipse cx="226" cy="376" rx="26" ry="6" fill="#8fd0ef" stroke="#1a1a1a" strokeWidth="3" />

            {/* Detecciones de la IA */}
            {DETECCIONES.map((d) => (
                <g key={d.etiqueta}>
                    <rect x={d.x} y={d.y} width={d.ancho} height={d.alto} rx="10" fill="none" stroke="#e11b22" strokeWidth="4" />
                    <rect x={d.x} y={d.y - 22} width={d.etiqueta.length * 6.4 + 14} height="20" rx="10" fill="#e11b22" />
                    <text x={d.x + 7} y={d.y - 8} fill="#fff" fontSize="11" fontWeight="800" fontFamily="Nunito, sans-serif">{d.etiqueta}</text>
                </g>
            ))}

            {/* Interfaz de la cámara */}
            <rect x="46" y="44" width="188" height="30" rx="15" fill="rgb(26 26 26 / 0.72)" />
            <circle cx="64" cy="59" r="5" fill="#e11b22" />
            <text x="76" y="63" fill="#fff" fontSize="11.5" fontWeight="800" fontFamily="Nunito, sans-serif">3 posibles criaderos</text>
            <circle cx="140" cy="470" r="30" fill="#fff" stroke="#1e8c2f" strokeWidth="6" />
            <circle cx="140" cy="470" r="20" fill="#fff" stroke="#1a1a1a" strokeWidth="2" />
        </g>
        <rect x="108" y="22" width="64" height="16" rx="8" fill="#1a1a1a" />
    </svg>
);
