// Semanas de lunes a domingo en hora de Argentina (UTC-3), igual que la Copa.
// Cada semana se identifica por la fecha de su lunes: "2026-09-21".
const DESFASE_ARGENTINA_MS = 3 * 60 * 60 * 1000;
const DIA_MS = 24 * 60 * 60 * 1000;

export const semanaDe = (fecha: Date): string => {
    const local = new Date(fecha.getTime() - DESFASE_ARGENTINA_MS);
    const desdeLunes = (local.getUTCDay() + 6) % 7;
    return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - desdeLunes)).toISOString().slice(0, 10);
};

export const semanaAnterior = (semana: string): string => new Date(Date.parse(`${semana}T00:00:00Z`) - 7 * DIA_MS).toISOString().slice(0, 10);

// Número de semana desde una fecha fija: sirve para rotar los desafíos de forma predecible.
export const numeroDeSemana = (semana: string): number => Math.round(Date.parse(`${semana}T00:00:00Z`) / (7 * DIA_MS));

// Días que faltan para que termine la semana (el domingo a la medianoche).
export const diasParaCerrar = (ahora = new Date()): number => {
    const fin = Date.parse(`${semanaDe(ahora)}T00:00:00Z`) + 7 * DIA_MS + DESFASE_ARGENTINA_MS;
    return Math.max(0, Math.ceil((fin - ahora.getTime()) / DIA_MS) - 1);
};
