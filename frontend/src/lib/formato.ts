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

// Fechas "solo día" del backend (2026-09-24T00:00:00.000Z): se muestran en UTC para no correrse un día.
const formatoDiaCalendario = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
export const formatearDia = (fecha: string) => formatoDiaCalendario.format(new Date(fecha));

// Hoy en la zona del dispositivo, como AAAA-MM-DD (para <input type="date"> y filtros por fecha).
export const hoyIso = () => {
    const ahora = new Date();
    ahora.setMinutes(ahora.getMinutes() - ahora.getTimezoneOffset());
    return ahora.toISOString().slice(0, 10);
};
