import { abrirBase, type Actividad, type TipoActividad } from '@/sinConexion/bd';
import { calcularRacha } from './racha';
import { semanaDe } from './semanas';

// Se guarda un año de actividad: alcanza para cualquier racha razonable y ocupa muy poco.
const GUARDAR_MS = 400 * 24 * 60 * 60 * 1000;
// Actividades que cuentan como "cuidé el patio" para la racha.
const CUENTAN_PARA_RACHA: TipoActividad[] = ['REVISION', 'REPORTE', 'LIMPIEZA'];

export const listarActividad = async (): Promise<Actividad[]> => {
    const bd = await abrirBase();
    const limite = new Date(Date.now() - GUARDAR_MS).toISOString();
    const todas = await bd.getAllFromIndex('actividad', 'porFecha');
    const viejas = todas.filter((item) => item.fecha < limite);
    if (viejas.length > 0) {
        const transaccion = bd.transaction('actividad', 'readwrite');
        await Promise.all([...viejas.map((item) => transaccion.store.delete(item.id!)), transaccion.done]);
    }
    return todas.filter((item) => item.fecha >= limite);
};

export const semanasActivas = (actividad: Actividad[]) =>
    new Set(actividad.filter((item) => CUENTAN_PARA_RACHA.includes(item.tipo)).map((item) => semanaDe(new Date(item.fecha))));

// Mirar el mapa o los consejos cuenta una vez por día (entrar muchas veces no suma).
const UNA_POR_DIA: TipoActividad[] = ['MAPA', 'CONSEJOS'];

// Registra la actividad y devuelve cómo quedó la racha (para felicitar en el momento).
export const guardarActividad = async (tipo: TipoActividad) => {
    const bd = await abrirBase();
    const ahora = new Date().toISOString();
    const yaHoy = UNA_POR_DIA.includes(tipo)
        && (await bd.getAllFromIndex('actividad', 'porFecha', IDBKeyRange.lowerBound(ahora.slice(0, 10)))).some((item) => item.tipo === tipo);
    if (!yaHoy) await bd.add('actividad', { tipo, fecha: ahora });
    return calcularRacha(semanasActivas(await listarActividad()));
};
