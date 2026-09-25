import type { LucideIcon } from 'lucide-react';
import { Bug, CalendarCheck, Flame, Medal, ScanSearch, Sparkles, Target } from 'lucide-react';
import type { EstadoPropio, ReporteMio } from '@/hooks/useVecino';
import type { Actividad } from '@/sinConexion/bd';

export interface Insignia {
    clave: string;
    nombre: string;
    como: string;
    Icono: LucideIcon;
}

export const INSIGNIAS: Insignia[] = [
    { clave: 'PRIMERA_REVISION', nombre: 'Primer patio revisado', como: 'Revisá tu patio con el escáner.', Icono: ScanSearch },
    { clave: 'RACHA_4', nombre: 'Un mes cuidando', como: 'Revisá el patio 4 semanas seguidas.', Icono: Flame },
    { clave: 'RACHA_12', nombre: 'Guardián del barrio', como: 'Revisá el patio 12 semanas seguidas.', Icono: CalendarCheck },
    { clave: 'PRIMERA_LIMPIEZA', nombre: 'Primera limpieza confirmada', como: 'Mandá la foto de una limpieza y que la confirmen.', Icono: Sparkles },
    { clave: 'CAZADOR', nombre: 'Cazador de criaderos', como: 'Que confirmen 3 criaderos que reportaste.', Icono: Bug },
    { clave: 'DESAFIOS', nombre: 'Semana completa', como: 'Cumplí todos tus desafíos de una semana.', Icono: Target },
    { clave: 'PODIO', nombre: 'Mi zona en el podio', como: 'Ayudá a que tu zona quede en el podio de la Copa.', Icono: Medal },
];

const CONFIRMADOS: EstadoPropio[] = ['VALIDADO', 'RESUELTO'];

export interface DatosInsignias {
    actividad: Actividad[];
    rachaActual: number;
    reportes: ReporteMio[];
    desafiosCumplidos: boolean;
    ganoPremio: boolean;
}

// Qué insignias se cumplen hoy. Una vez ganadas se guardan en el celular y no se pierden
// (los reportes propios se olvidan a los 70 días, pero la insignia queda).
export const insigniasCumplidas = ({ actividad, rachaActual, reportes, desafiosCumplidos, ganoPremio }: DatosInsignias): string[] => {
    const confirmados = reportes.filter((reporte) => CONFIRMADOS.includes(reporte.estado));
    const condiciones: Record<string, boolean> = {
        PRIMERA_REVISION: actividad.some((item) => item.tipo === 'REVISION'),
        RACHA_4: rachaActual >= 4,
        RACHA_12: rachaActual >= 12,
        PRIMERA_LIMPIEZA: confirmados.some((reporte) => reporte.tipo === 'LIMPIEZA'),
        CAZADOR: confirmados.filter((reporte) => reporte.tipo !== 'LIMPIEZA').length >= 3,
        DESAFIOS: desafiosCumplidos,
        PODIO: ganoPremio,
    };
    return INSIGNIAS.filter(({ clave }) => condiciones[clave]).map(({ clave }) => clave);
};
