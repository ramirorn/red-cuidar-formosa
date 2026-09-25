import { vecinoApi } from '@/api/vecino.api';
import { puntoEnPoligono } from '@/lib/geo';
import type { ColeccionManzanas, FeatureManzana, Localidad } from '@/tipos';
import { abrirBase, guardarAjuste, leerAjuste } from './bd';

// Privacidad: la manzana del vecino se calcula en el celular. Se descargan todas las manzanas de su
// localidad (el pedido solo revela la localidad) y se busca localmente cuál contiene el punto del GPS.
// El punto nunca sale del dispositivo.

const VIGENCIA_MS = 5 * 60 * 1000; // los colores cambian con los reportes
const LOCALIDADES_A_PROBAR = 3;
const DISTANCIA_MAXIMA_KM = 40;

type Recuadro = [number, number, number, number]; // longitud y latitud mínimas y máximas
const recuadros = new WeakMap<FeatureManzana, Recuadro>();

const recuadroDe = (manzana: FeatureManzana): Recuadro => {
    let recuadro = recuadros.get(manzana);
    if (!recuadro) {
        const puntos = manzana.geometry.coordinates.flat();
        recuadro = [
            Math.min(...puntos.map((punto) => punto[0]!)), Math.min(...puntos.map((punto) => punto[1]!)),
            Math.max(...puntos.map((punto) => punto[0]!)), Math.max(...puntos.map((punto) => punto[1]!)),
        ];
        recuadros.set(manzana, recuadro);
    }
    return recuadro;
};

export const manzanaQueContiene = (coleccion: ColeccionManzanas, latitud: number, longitud: number) =>
    coleccion.features.find((manzana) => {
        const [x1, y1, x2, y2] = recuadroDe(manzana);
        if (longitud < x1 || longitud > x2 || latitud < y1 || latitud > y2) return false;
        return manzana.geometry.coordinates.some((anillo) => puntoEnPoligono(longitud, latitud, anillo));
    }) ?? null;

// Manzanas cuyo recuadro toca el área pedida (para dibujar solo lo visible).
export const manzanasEnArea = (coleccion: ColeccionManzanas, area: { latitudMinima: number; latitudMaxima: number; longitudMinima: number; longitudMaxima: number }) =>
    coleccion.features.filter((manzana) => {
        const [x1, y1, x2, y2] = recuadroDe(manzana);
        return x2 >= area.longitudMinima && x1 <= area.longitudMaxima && y2 >= area.latitudMinima && y1 <= area.latitudMaxima;
    });

// Catálogo de localidades, con copia local para usarlo sin conexión.
export const obtenerLocalidades = async (): Promise<Localidad[]> => {
    try {
        const localidades = await vecinoApi.localidades();
        await guardarAjuste('localidades', localidades);
        return localidades;
    } catch (error) {
        const guardadas = await leerAjuste<Localidad[]>('localidades');
        if (guardadas) return guardadas;
        throw error;
    }
};

// Descarga (o reutiliza) las manzanas de una localidad. Sin conexión usa la copia guardada.
export const obtenerManzanasDeLocalidad = async (localidadId: number, { forzar = false } = {}): Promise<ColeccionManzanas> => {
    const bd = await abrirBase();
    const guardadas = await bd.get('manzanas', localidadId);
    const vigente = guardadas && Date.now() - new Date(guardadas.descargadoEn).getTime() < VIGENCIA_MS;
    if (guardadas && vigente && !forzar) return guardadas.coleccion;

    try {
        const coleccion = await vecinoApi.manzanasDeLocalidad(localidadId);
        await bd.put('manzanas', { localidadId, descargadoEn: new Date().toISOString(), coleccion });
        return coleccion;
    } catch (error) {
        if (guardadas) return guardadas.coleccion;
        throw error;
    }
};

const distanciaKm = (latitud1: number, longitud1: number, latitud2: number, longitud2: number) => {
    const radianes = (grados: number) => (grados * Math.PI) / 180;
    const a = Math.sin(radianes(latitud2 - latitud1) / 2) ** 2
        + Math.cos(radianes(latitud1)) * Math.cos(radianes(latitud2)) * Math.sin(radianes(longitud2 - longitud1) / 2) ** 2;
    return 6371 * 2 * Math.asin(Math.sqrt(a));
};

export type ResultadoManzana =
    | { tipo: 'encontrada'; manzana: FeatureManzana; localidadId: number; coleccion: ColeccionManzanas }
    | { tipo: 'fuera'; localidadId: number | null; coleccion: ColeccionManzanas | null };

// Busca en las localidades más cercanas (una manzana puede quedar más cerca del centro de otra localidad).
export const ubicarEnManzana = async (latitud: number, longitud: number): Promise<ResultadoManzana> => {
    const localidades = (await obtenerLocalidades())
        .filter((localidad) => localidad.latitud !== null && localidad.longitud !== null)
        .map((localidad) => ({ ...localidad, distancia: distanciaKm(latitud, longitud, localidad.latitud!, localidad.longitud!) }))
        .filter(({ distancia }) => distancia <= DISTANCIA_MAXIMA_KM)
        .sort((a, b) => a.distancia - b.distancia)
        .slice(0, LOCALIDADES_A_PROBAR);

    let primera: { localidadId: number; coleccion: ColeccionManzanas } | null = null;
    for (const localidad of localidades) {
        const coleccion = await obtenerManzanasDeLocalidad(localidad.id);
        primera ??= { localidadId: localidad.id, coleccion };
        const manzana = manzanaQueContiene(coleccion, latitud, longitud);
        if (manzana) {
            await guardarAjuste('ultimaLocalidad', localidad.id);
            return { tipo: 'encontrada', manzana, localidadId: localidad.id, coleccion };
        }
    }
    return { tipo: 'fuera', localidadId: primera?.localidadId ?? null, coleccion: primera?.coleccion ?? null };
};
