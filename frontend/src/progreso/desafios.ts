import type { Actividad, TipoActividad } from '@/sinConexion/bd';
import { numeroDeSemana, semanaDe } from './semanas';

export interface Desafio {
    clave: string;
    titulo: string;
    meta: number;
    progreso: number;
    cumplido: boolean;
}

interface Plantilla { clave: string; titulo: string; meta: number; tipo: TipoActividad }

// Siempre: revisar el patio dos veces. Y uno que rota cada semana.
const FIJO: Plantilla = { clave: 'REVISIONES', titulo: 'Revisá tu patio 2 veces esta semana', meta: 2, tipo: 'REVISION' };
const ROTATIVOS: Plantilla[] = [
    { clave: 'LIMPIEZA', titulo: 'Mandá la foto de una limpieza', meta: 1, tipo: 'LIMPIEZA' },
    { clave: 'MAPA', titulo: 'Mirá cómo está tu manzana en el mapa', meta: 1, tipo: 'MAPA' },
    { clave: 'CONSEJOS', titulo: 'Repasá los consejos para cortar el ciclo', meta: 1, tipo: 'CONSEJOS' },
];

export const desafiosPersonales = (actividad: Actividad[], ahora = new Date()): Desafio[] => {
    const semana = semanaDe(ahora);
    const deLaSemana = actividad.filter((item) => semanaDe(new Date(item.fecha)) === semana);
    const plantillas = [FIJO, ROTATIVOS[numeroDeSemana(semana) % ROTATIVOS.length]!];
    return plantillas.map(({ clave, titulo, meta, tipo }) => {
        const hechas = deLaSemana.filter((item) => item.tipo === tipo).length;
        return { clave, titulo, meta, progreso: Math.min(hechas, meta), cumplido: hechas >= meta };
    });
};
