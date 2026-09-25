// Utilidades geográficas del lado del cliente.

// Recuadro aproximado de la provincia (el backend rechaza coordenadas fuera de él).
export const LIMITES_FORMOSA = { latitudMinima: -27.0, latitudMaxima: -21.9, longitudMinima: -62.4, longitudMaxima: -57.5 };
export const CENTRO_FORMOSA_CAPITAL: [number, number] = [-26.1849, -58.1731];

export const estaEnFormosa = (latitud: number, longitud: number) =>
    latitud >= LIMITES_FORMOSA.latitudMinima && latitud <= LIMITES_FORMOSA.latitudMaxima
    && longitud >= LIMITES_FORMOSA.longitudMinima && longitud <= LIMITES_FORMOSA.longitudMaxima;

// Punto dentro de polígono (ray casting). Anillo en orden [longitud, latitud], como GeoJSON.
export const puntoEnPoligono = (longitud: number, latitud: number, anillo: number[][]) => {
    let adentro = false;
    for (let i = 0, j = anillo.length - 1; i < anillo.length; j = i++) {
        const [xi = 0, yi = 0] = anillo[i] ?? [];
        const [xj = 0, yj = 0] = anillo[j] ?? [];
        if ((yi > latitud) !== (yj > latitud) && longitud < ((xj - xi) * (latitud - yi)) / (yj - yi) + xi) adentro = !adentro;
    }
    return adentro;
};

export interface Ubicacion {
    latitud: number;
    longitud: number;
    precisionM: number;
}

export const obtenerUbicacion = (): Promise<Ubicacion> => new Promise((resolver, rechazar) => {
    if (!('geolocation' in navigator)) {
        rechazar(new Error('Tu navegador no permite obtener la ubicación.'));
        return;
    }
    navigator.geolocation.getCurrentPosition(
        ({ coords }) => resolver({ latitud: coords.latitude, longitud: coords.longitude, precisionM: coords.accuracy }),
        (error) => rechazar(new Error(error.code === error.PERMISSION_DENIED
            ? 'Necesitamos tu ubicación para saber a qué manzana corresponde el reporte.'
            : 'No pudimos obtener tu ubicación. Probá al aire libre o con el GPS activado.')),
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
});

// Recuadro chico alrededor de un punto (para pedir las manzanas cercanas).
export const recuadroAlrededor = (latitud: number, longitud: number, delta = 0.004) => ({
    latitudMinima: latitud - delta,
    latitudMaxima: latitud + delta,
    longitudMinima: longitud - delta,
    longitudMaxima: longitud + delta,
});
