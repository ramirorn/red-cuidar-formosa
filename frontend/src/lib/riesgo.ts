// Escala de color del índice de riesgo (0 a 1) que calcula el motor predictivo.
export const NIVELES_RIESGO = [
    { hasta: 0.2, etiqueta: 'Muy bajo', color: '#1e8c2f' },
    { hasta: 0.4, etiqueta: 'Bajo', color: '#8bbf3f' },
    { hasta: 0.6, etiqueta: 'Medio', color: '#f2b705' },
    { hasta: 0.8, etiqueta: 'Alto', color: '#f07a1a' },
    { hasta: 1.01, etiqueta: 'Muy alto', color: '#e11b22' },
] as const;

export const nivelDeRiesgo = (indice: number) =>
    NIVELES_RIESGO.find(({ hasta }) => indice < hasta) ?? NIVELES_RIESGO[NIVELES_RIESGO.length - 1]!;

export const porcentaje = (indice: number) => `${Math.round(indice * 100)}%`;
