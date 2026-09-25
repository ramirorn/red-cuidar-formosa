import type { ClaseObjeto } from '@/tipos';

// COCO-SSD es un modelo general ya entrenado: no conoce "neumático" ni "tanque", pero sí varios
// recipientes que juntan agua. Se traducen a las clases del proyecto; el resto se ignora.
// Cuando exista un modelo propio (neumáticos, baldes, tanques), se reemplaza este mapeo.
export const CLASES_COCO: Record<string, ClaseObjeto> = {
    bottle: 'BOTELLA',
    vase: 'FLORERO',
    'potted plant': 'MACETA',
    bowl: 'BALDE',
    cup: 'OTRO',
    'wine glass': 'OTRO',
    sink: 'OTRO',
    toilet: 'OTRO',
};

export const NOMBRES_CLASE: Record<ClaseObjeto, string> = {
    NEUMATICO: 'Neumático',
    BOTELLA: 'Botella',
    BALDE: 'Balde',
    MACETA: 'Maceta',
    TANQUE: 'Tanque',
    BEBEDERO: 'Bebedero',
    FLORERO: 'Florero',
    OTRO: 'Recipiente',
};

export const CONFIANZA_MINIMA = 0.4;
