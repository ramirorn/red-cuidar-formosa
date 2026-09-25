import type { EstadoManzana } from '@/componentes/ui/ChipEstado';

const COLORES: Record<EstadoManzana, string> = {
    ROJO: '#e11b22',
    AMARILLO: '#f2b705',
    VERDE: '#1e8c2f',
    SIN_DATOS: '#cfd2cc',
};

// Barrio ilustrado: la idea del mapa comunitario, sin datos reales.
const GRILLA: EstadoManzana[][] = [
    ['VERDE', 'VERDE', 'AMARILLO', 'VERDE', 'SIN_DATOS'],
    ['ROJO', 'VERDE', 'VERDE', 'AMARILLO', 'VERDE'],
    ['VERDE', 'AMARILLO', 'VERDE', 'VERDE', 'ROJO'],
    ['SIN_DATOS', 'VERDE', 'VERDE', 'AMARILLO', 'VERDE'],
];

export const MapaIlustrado = ({ className }: { className?: string }) => (
    <svg viewBox="0 0 330 222" role="img" aria-label="Mapa ilustrado de un barrio con manzanas pintadas de verde, amarillo y rojo" className={className}>
        <rect width="330" height="222" rx="22" fill="#f4f5f2" />
        {GRILLA.map((fila, y) => fila.map((estado, x) => (
            <rect
                key={`${x}-${y}`}
                x={14 + x * 62}
                y={14 + y * 50}
                width="54"
                height="42"
                rx="8"
                fill={COLORES[estado]}
                fillOpacity={estado === 'SIN_DATOS' ? 1 : 0.88}
                stroke="#1a1a1a"
                strokeWidth="2"
            />
        )))}
    </svg>
);
