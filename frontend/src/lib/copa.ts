import type { SituacionZona } from '@/tipos';

// Mensajes de la Copa: siempre en positivo. Nunca se nombra el premio (no se premia a los flojos)
// ni se señalan los últimos puestos: a cada zona se le dice cuánto le falta para el podio.

const limpiezas = (cantidad: number) => `${cantidad} ${cantidad === 1 ? 'limpieza validada' : 'limpiezas validadas'}`;

export const mensajeDeZona = ({ edicion, zona, totalZonas, faltanLimpiezas }: SituacionZona) => {
    const cerrada = edicion.estado !== 'en-curso';
    if (cerrada) {
        if (zona.enPodio) return `¡Tu zona terminó en el puesto ${zona.posicion} de la ${edicion.nombre}! Gracias por cuidar el barrio.`;
        return `Esta vez les faltaron ${limpiezas(faltanLimpiezas)} para el podio. ¡Muy poco! El mes que viene hay revancha y habrá premios.`;
    }
    if (zona.enPodio && zona.posicion === 1) return '¡Tu zona va primera! Defiendan el puesto: habrá premios para el podio.';
    if (zona.enPodio) return `¡Están en el podio, puesto ${zona.posicion}! Un empujón más y pelean el primer lugar. Habrá premios.`;
    if (zona.puntos === 0) return `Tu zona todavía no sumó puntos este mes. Con ${limpiezas(faltanLimpiezas)} ya entran al podio. ¡Habrá premios!`;
    return `Van en el puesto ${zona.posicion} de ${totalZonas}. Les faltan ${limpiezas(faltanLimpiezas)} para entrar al Top 3. ¡Habrá premios para el podio!`;
};

export const diasHasta = (fecha: string) => Math.max(0, Math.ceil((new Date(fecha).getTime() - Date.now()) / 86_400_000));
