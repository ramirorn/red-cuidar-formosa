import "dotenv/config";
import { parseArgs } from "node:util";
import { PrismaClient } from "@prisma/client";
import { BBOX_CONOCIDAS, cargarDesdeOsm, descargarOsm, guardarCache, leerCache } from "../src/utils/osm.js";

// Arma las manzanas y las zonas de la Copa de una localidad con las calles y barrios reales de OpenStreetMap.
// La descarga se guarda en prisma/datos/: si se sube al repositorio, la semilla la usa sin internet.
// Uso: npm run importar-osm -- [--localidad "Formosa Capital"] [--bbox sur,oeste,norte,este] [--reemplazar] [--descargar]

const prisma = new PrismaClient();

const { values } = parseArgs({
    options: {
        localidad: { type: "string", default: "Formosa Capital" },
        bbox: { type: "string" },
        reemplazar: { type: "boolean", default: false },
        // Vuelve a descargar aunque haya una copia guardada.
        descargar: { type: "boolean", default: false },
    },
});

const main = async () => {
    const nombre = values.localidad!;
    const localidad = await prisma.localidad.findUnique({ where: { nombre } });
    if (!localidad) throw new Error(`No existe la localidad "${nombre}". Ejecute primero la semilla.`);

    const bbox = values.bbox ? (values.bbox.split(",").map(Number) as [number, number, number, number]) : BBOX_CONOCIDAS[nombre];
    if (!bbox || bbox.length !== 4 || bbox.some(Number.isNaN)) throw new Error(`Indique el recuadro de "${nombre}" con --bbox sur,oeste,norte,este`);

    const guardados = values.descargar ? null : await leerCache(nombre);
    if (guardados) console.log("Usando la copia guardada de OpenStreetMap (--descargar para bajarla de nuevo)");
    const datos = guardados ?? (await descargarOsm(bbox));
    if (!guardados) console.log(`Copia guardada en ${await guardarCache(nombre, datos)}`);

    const resultado = await cargarDesdeOsm(prisma, localidad.id, datos, { reemplazar: values.reemplazar! });
    console.log(`Listo: ${resultado.manzanas} manzanas, ${resultado.barrios} barrios en ${resultado.zonas} zonas de la Copa.`);
    if (resultado.conDatosDeBarrio === 0) console.log("OSM no trae barrios para esta zona: se armaron sectores de tamaño parejo.");
};

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
