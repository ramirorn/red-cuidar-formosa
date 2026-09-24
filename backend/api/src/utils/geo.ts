export interface Coordenada {
    latitud: number;
    longitud: number;
}

const RADIO_TIERRA_M = 6_371_000;
const aRadianes = (grados: number) => (grados * Math.PI) / 180;

// Distancia en línea recta (fórmula de Haversine). Suficiente para ordenar paradas dentro de una localidad.
export const distanciaMetros = (a: Coordenada, b: Coordenada): number => {
    const dLat = aRadianes(b.latitud - a.latitud);
    const dLon = aRadianes(b.longitud - a.longitud);
    const h = Math.sin(dLat / 2) ** 2
        + Math.cos(aRadianes(a.latitud)) * Math.cos(aRadianes(b.latitud)) * Math.sin(dLon / 2) ** 2;
    return 2 * RADIO_TIERRA_M * Math.asin(Math.sqrt(h));
};

// Heurística del vecino más cercano: desde el inicio, siempre visita la parada pendiente más próxima.
// No garantiza el recorrido óptimo, pero para las decenas de paradas de una jornada da rutas razonables
// en O(n²) sin depender de servicios externos de ruteo.
export const ordenarPorVecinoMasCercano = <T extends Coordenada>(
    puntos: T[],
    inicio?: Coordenada,
): { orden: T[]; distanciaTotalM: number } => {
    const pendientes = [...puntos];
    const orden: T[] = [];
    let distanciaTotalM = 0;
    let actual: Coordenada | undefined = inicio;

    if (!actual) {
        const primero = pendientes.shift();
        if (!primero) return { orden, distanciaTotalM };
        orden.push(primero);
        actual = primero;
    }

    while (pendientes.length > 0) {
        let indiceMasCercano = 0;
        let menorDistancia = Number.POSITIVE_INFINITY;

        pendientes.forEach((punto, indice) => {
            const distancia = distanciaMetros(actual as Coordenada, punto);
            if (distancia < menorDistancia) {
                menorDistancia = distancia;
                indiceMasCercano = indice;
            }
        });

        const [siguiente] = pendientes.splice(indiceMasCercano, 1) as [T];
        orden.push(siguiente);
        distanciaTotalM += menorDistancia;
        actual = siguiente;
    }

    return { orden, distanciaTotalM: Math.round(distanciaTotalM) };
};
