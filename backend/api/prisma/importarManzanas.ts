import "dotenv/config";
import { readFile } from "node:fs/promises";
import { parseArgs } from "node:util";
import { PrismaClient } from "@prisma/client";

// Importa manzanas desde un GeoJSON (FeatureCollection de Polygon/MultiPolygon en EPSG:4326),
// por ejemplo derivado de OpenStreetMap o del catastro provincial.
// Uso: npm run importar-manzanas -- --localidad "Formosa Capital" --archivo manzanas.geojson [--campo-codigo id]

const prisma = new PrismaClient();
const TAMANO_LOTE = 500;

const { values } = parseArgs({
    options: {
        localidad: { type: "string" },
        archivo: { type: "string" },
        "campo-codigo": { type: "string", default: "codigo" },
    },
});

const main = async () => {
    if (!values.localidad || !values.archivo) {
        throw new Error('Uso: --localidad "<nombre>" --archivo <ruta.geojson> [--campo-codigo codigo]');
    }

    const localidad = await prisma.localidad.findUnique({ where: { nombre: values.localidad } });
    if (!localidad) throw new Error(`No existe la localidad "${values.localidad}". Ejecute primero la semilla.`);

    const coleccion = JSON.parse(await readFile(values.archivo, "utf8"));
    if (coleccion?.type !== "FeatureCollection" || !Array.isArray(coleccion.features)) {
        throw new Error("El archivo debe ser un GeoJSON FeatureCollection");
    }

    let importadas = 0;
    let descartadas = 0;

    for (let inicio = 0; inicio < coleccion.features.length; inicio += TAMANO_LOTE) {
        const lote = coleccion.features.slice(inicio, inicio + TAMANO_LOTE);

        await prisma.$transaction(async (tx) => {
            for (const [indice, feature] of lote.entries()) {
                const tipo = feature?.geometry?.type;
                if (tipo !== "Polygon" && tipo !== "MultiPolygon") {
                    descartadas++;
                    continue;
                }

                const codigo = String(feature.properties?.[values["campo-codigo"] as string] ?? `IMP-${inicio + indice + 1}`).slice(0, 50);
                const geometria = JSON.stringify(feature.geometry);

                // ST_MakeValid corrige polígonos mal formados; de un MultiPolygon se toma la parte mayor.
                await tx.$executeRaw`
                    WITH g AS (
                        SELECT (
                            SELECT d.geom FROM ST_Dump(ST_CollectionExtract(ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${geometria}), 4326)), 3)) d
                            ORDER BY ST_Area(d.geom) DESC LIMIT 1
                        ) AS geom
                    )
                    INSERT INTO "manzana" ("localidadId", "codigo", "geom", "centroide", "updatedAt")
                    SELECT ${localidad.id}, ${codigo}, g.geom, ST_PointOnSurface(g.geom), now()
                    FROM g WHERE g.geom IS NOT NULL
                    ON CONFLICT ("localidadId", "codigo")
                    DO UPDATE SET "geom" = EXCLUDED."geom", "centroide" = EXCLUDED."centroide", "updatedAt" = now()
                `;
                importadas++;
            }
        });
    }

    console.log(`Manzanas importadas o actualizadas: ${importadas}. Descartadas: ${descartadas}.`);
};

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
