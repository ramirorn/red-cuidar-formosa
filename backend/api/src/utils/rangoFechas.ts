import { ErrorHttp } from './errorHttp.js';

const DIA_MS = 24 * 60 * 60 * 1000;
export const DIAS_RANGO_POR_DEFECTO = 30;
export const DIAS_RANGO_MAXIMO = 366;

// Normaliza el rango de fechas de las consultas institucionales y acota su amplitud
// para que ninguna consulta recorra un volumen ilimitado de datos.
export const resolverRango = (desde?: Date, hasta?: Date): { desde: Date; hasta: Date } => {
    const fin = hasta ?? new Date();
    const inicio = desde ?? new Date(fin.getTime() - DIAS_RANGO_POR_DEFECTO * DIA_MS);

    if (inicio > fin) {
        throw new ErrorHttp(400, 'La fecha "desde" debe ser anterior a "hasta"');
    }

    if (fin.getTime() - inicio.getTime() > DIAS_RANGO_MAXIMO * DIA_MS) {
        throw new ErrorHttp(400, `El rango de fechas no puede superar ${DIAS_RANGO_MAXIMO} días`);
    }

    return { desde: inicio, hasta: fin };
};
