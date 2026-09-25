const formatoFecha = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const formatoRelativo = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });

export const formatearFecha = (fecha: string | Date) => formatoFecha.format(new Date(fecha));

// "hace 3 días", "ayer", "hace 2 horas".
export const hace = (fecha: string | Date) => {
    const segundos = (new Date(fecha).getTime() - Date.now()) / 1000;
    const unidades: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]];
    for (const [unidad, tamano] of unidades) {
        if (Math.abs(segundos) >= tamano) return formatoRelativo.format(Math.round(segundos / tamano), unidad);
    }
    return 'recién';
};
