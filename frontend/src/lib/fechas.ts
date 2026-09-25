// Utilidades de calendario sobre fechas "AAAA-MM-DD" (sin zona horaria: son días de calendario local).
// Comparar dos fechas en este formato como texto da el mismo orden que comparar las fechas.

export interface Dia {
    anio: number;
    mes: number; // 0 a 11
    dia: number;
}

const dosDigitos = (valor: number) => String(valor).padStart(2, '0');

export const aTexto = ({ anio, mes, dia }: Dia) => `${anio}-${dosDigitos(mes + 1)}-${dosDigitos(dia)}`;

export const desdeTexto = (texto: string): Dia | null => {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(texto);
    if (!partes) return null;
    const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]) - 1, Number(partes[3])];
    const fecha = new Date(anio, mes, dia);
    return fecha.getMonth() === mes ? { anio, mes, dia } : null;
};

export const hoy = (): Dia => {
    const ahora = new Date();
    return { anio: ahora.getFullYear(), mes: ahora.getMonth(), dia: ahora.getDate() };
};

// Suma días o meses; al sumar meses se ajusta el día si el mes destino es más corto (31 → 30).
export const sumarDias = ({ anio, mes, dia }: Dia, cantidad: number): Dia => {
    const fecha = new Date(anio, mes, dia + cantidad);
    return { anio: fecha.getFullYear(), mes: fecha.getMonth(), dia: fecha.getDate() };
};

export const sumarMeses = ({ anio, mes, dia }: Dia, cantidad: number): Dia => {
    const destino = new Date(anio, mes + cantidad, 1);
    const ultimo = new Date(destino.getFullYear(), destino.getMonth() + 1, 0).getDate();
    return { anio: destino.getFullYear(), mes: destino.getMonth(), dia: Math.min(dia, ultimo) };
};

// Día de la semana empezando en lunes (0 = lunes, 6 = domingo), como se usa en Argentina.
export const diaDeSemana = ({ anio, mes, dia }: Dia) => (new Date(anio, mes, dia).getDay() + 6) % 7;

// Semanas del mes para la grilla del calendario (con días del mes anterior y siguiente para completar).
export const semanasDelMes = (anio: number, mes: number): Dia[][] => {
    const primero: Dia = { anio, mes, dia: 1 };
    let actual = sumarDias(primero, -diaDeSemana(primero));
    const semanas: Dia[][] = [];
    do {
        const semana: Dia[] = [];
        for (let i = 0; i < 7; i++) {
            semana.push(actual);
            actual = sumarDias(actual, 1);
        }
        semanas.push(semana);
    } while (actual.mes === mes);
    return semanas;
};

export const DIAS_SEMANA = [
    { corto: 'L', largo: 'lunes' },
    { corto: 'M', largo: 'martes' },
    { corto: 'M', largo: 'miércoles' },
    { corto: 'J', largo: 'jueves' },
    { corto: 'V', largo: 'viernes' },
    { corto: 'S', largo: 'sábado' },
    { corto: 'D', largo: 'domingo' },
];

const formatoMes = new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' });
const formatoLargo = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
const formatoCorto = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

const aDate = ({ anio, mes, dia }: Dia) => new Date(anio, mes, dia);
const capitalizar = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);

export const nombreMes = (anio: number, mes: number) => capitalizar(formatoMes.format(new Date(anio, mes, 1)));
export const fechaLarga = (dia: Dia) => formatoLargo.format(aDate(dia));
export const fechaCorta = (dia: Dia) => capitalizar(formatoCorto.format(aDate(dia)));

// "AAAA-MM-DDTHH:MM" (formato local, sin zona) partido en fecha y hora.
export const partirFechaHora = (valor: string) => {
    const [fecha = '', hora = ''] = valor.split('T');
    return { fecha, hora: hora.slice(0, 5) };
};

export const ahoraLocal = () => {
    const ahora = new Date();
    return `${aTexto(hoy())}T${dosDigitos(ahora.getHours())}:${dosDigitos(ahora.getMinutes())}`;
};

export { dosDigitos };
