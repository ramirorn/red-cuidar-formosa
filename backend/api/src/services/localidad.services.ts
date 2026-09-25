import prisma from '../config/prisma.js';

export interface LocalidadPublica {
    id: number;
    nombre: string;
    nivelRiesgoBase: string;
    latitud: number | null;
    longitud: number | null;
}

// Catálogo chico y casi fijo: la PWA lo usa para los selectores y para centrar el mapa.
export const listarLocalidadesService = () => prisma.$queryRaw<LocalidadPublica[]>`
    SELECT "id", "nombre", "nivelRiesgoBase"::text AS "nivelRiesgoBase",
           ST_Y("centroide") AS "latitud", ST_X("centroide") AS "longitud"
    FROM "localidad"
    ORDER BY "nombre"
`;
