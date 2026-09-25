import "dotenv/config";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { PrismaClient } from "@prisma/client";
import { asignarZonasAManzanas } from "./zonas.js";

// Importa las zonas de la Copa Red-Cuidar desde un GeoJSON (Polygon/MultiPolygon en EPSG:4326).
// Cada feature es un barrio o una parte de un barrio grande. Propiedades:
//   barrio: nombre del barrio ("Nueva Formosa")
//   nombre: nombre de la zona ("Nueva Formosa - Zona Norte"); si falta, se usa el del barrio.
// Después reasigna cada manzana de la localidad a la zona que contiene su centro.
// Uso: npm run importar-zonas -- --localidad "Formosa Capital" --archivo zonas.geojson [--reemplazar]

const prisma = new PrismaClient();

const { values } = parseArgs({
    options: {
        localidad: { type: "string" },
        archivo: { type: "string" },
        reemplazar: { type: "boolean", default: false },
    },
});

const main = async () => {
    if (!values.localidad || !values.archivo) {
        throw new Error('Uso: --localidad "<nombre>" --archivo <ruta.geojson> [--reemplazar]');
    }

    const localidad = await prisma.localidad.findUnique({ where: { nombre: values.localidad } });
    if (!localidad) throw new Error(`No existe la localidad "${values.localidad}". Ejecute primero la semilla.`);

    const coleccion = JSON.parse(await readFile(values.archivo, "utf8"));
    if (coleccion?.type !== "FeatureCollection" || !Array.isArray(coleccion.features)) {
        throw new Error("El archivo debe ser un GeoJSON FeatureCollection");
    }

    let importadas = 0;
    const descartadas: string[] = [];

    await prisma.$transaction(async (tx) => {
        // --reemplazar borra las zonas que ya no están en el archivo (las que tienen premios emitidos no se tocan).
        if (values.reemplazar) {
            const nombres = coleccion.features.map((feature: any) => String(feature?.properties?.nombre ?? feature?.properties?.barrio ?? ""));
            await tx.zonaCompetencia.deleteMany({ where: { localidadId: localidad.id, nombre: { notIn: nombres }, canjes: { none: {} } } });
        }

        for (const [indice, feature] of coleccion.features.entries()) {
            const barrio = String(feature?.properties?.barrio ?? "").trim().slice(0, 120);
            const nombre = String(feature?.properties?.nombre ?? barrio).trim().slice(0, 160);
            const tipo = feature?.geometry?.type;
            if (!barrio || !nombre || (tipo !== "Polygon" && tipo !== "MultiPolygon")) {
                descartadas.push(`#${indice + 1}`);
                continue;
            }
            // ST_MakeValid corrige polígonos mal cerrados; ST_Multi unifica Polygon y MultiPolygon.
            await tx.$executeRaw`
                INSERT INTO "zonaCompetencia" ("localidadId", "barrio", "nombre", "geom", "updatedAt")
                VALUES (${localidad.id}, ${barrio}, ${nombre},
                    ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(feature.geometry)}), 4326)), 3)), now())
                ON CONFLICT ("localidadId", "nombre") DO UPDATE SET "geom" = EXCLUDED."geom", "barrio" = EXCLUDED."barrio", "updatedAt" = now()
            `;
            importadas++;
        }
    });

    const asignadas = await asignarZonasAManzanas(prisma, localidad.id);
    const sinZona = await prisma.manzana.count({ where: { localidadId: localidad.id, zonaId: null } });
    console.log(`Zonas importadas: ${importadas}. Descartadas: ${descartadas.length ? descartadas.join(", ") : "ninguna"}.`);
    console.log(`Manzanas asignadas a una zona: ${asignadas}. Sin zona (no compiten): ${sinZona}.`);
};

main()
    .catch((error) => {
        console.error(error.message);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
