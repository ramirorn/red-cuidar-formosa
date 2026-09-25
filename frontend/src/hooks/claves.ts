// Claves de React Query del área del vecino (jerárquicas para invalidar con precisión).
export const CLAVES_VECINO = {
    localidades: ['localidades'] as const,
    manzanas: (recuadro: unknown) => ['manzanas', recuadro] as const,
    misReportes: ['vecino', 'misReportes'] as const,
};
