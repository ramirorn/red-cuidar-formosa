import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { gunzipSync, gzipSync } from "node:zlib";
import { Prisma, type PrismaClient } from "@prisma/client";

// Manzanas y zonas de la Copa a partir de OpenStreetMap.
// OSM no tiene manzanas dibujadas: se arman con las calles (cada polígono cerrado por calles es una
// manzana). Los barrios salen de los límites o puntos con nombre de OSM; los barrios muy chicos se
// suman al vecino más cercano y los muy grandes (Nueva Formosa, Circuito 5) se parten en zonas.

// UTM 21S: permite medir en metros en toda la provincia.
const SRID_METRICO = 32721;

// Una manzana real ronda los 100 x 100 m; fuera de este rango suelen ser plazas partidas, playones o campo.
const AREA_MINIMA_M2 = 1_000;
const AREA_MAXIMA_M2 = 55_000;
// 4πA/P²: 1 es un círculo, un cuadrado da 0,79. Descarta tiras finas entre calles paralelas.
const COMPACIDAD_MINIMA = 0.3;
// La mitad del ancho de una calle: separa las manzanas en el mapa.
const RETIRO_CALLE_M = 5;

// Tamaño de las zonas que compiten en la Copa (en manzanas).
const ZONA_MINIMA = 10;
const ZONA_MAXIMA = 120;
const ZONA_OBJETIVO = 80;

export const BBOX_CONOCIDAS: Record<string, [number, number, number, number]> = {
    // [sur, oeste, norte, este]: el ejido urbano, sin el riacho ni el río Paraguay.
    "Formosa Capital": [-26.235, -58.265, -26.135, -58.13],
    Clorinda: [-25.31, -57.745, -25.265, -57.695],
};

// Copia local de la descarga: si está en el repositorio, la semilla arma las manzanas reales sin internet.
export const archivoDeCache = (localidad: string) =>
    new URL(`../../prisma/datos/osm-${localidad.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json.gz`, import.meta.url);

export const leerCache = async (localidad: string): Promise<RespuestaOverpass | null> => {
    const archivo = archivoDeCache(localidad);
    return existsSync(archivo) ? JSON.parse(gunzipSync(await readFile(archivo)).toString("utf8")) : null;
};

export const guardarCache = async (localidad: string, datos: RespuestaOverpass) => {
    await mkdir(new URL("../../prisma/datos/", import.meta.url), { recursive: true });
    await writeFile(archivoDeCache(localidad), gzipSync(JSON.stringify(datos)));
    return archivoDeCache(localidad).pathname;
};

const TIPOS_CALLE = "motorway|trunk|primary|secondary|tertiary|unclassified|residential|living_street|road|motorway_link|trunk_link|primary_link|secondary_link|tertiary_link|pedestrian";

export const consultaOverpass = ([s, o, n, e]: [number, number, number, number]) => {
    const caja = `(${s},${o},${n},${e})`;
    return `[out:json][timeout:240];
(
  way["highway"~"^(${TIPOS_CALLE})$"]${caja};
  way["railway"="rail"]${caja};
  way["waterway"~"^(river|canal|stream|drain)$"]${caja};
  way["natural"="water"]${caja};
  relation["natural"="water"]${caja};
  node["place"~"^(neighbourhood|suburb|quarter)$"]["name"]${caja};
  way["place"~"^(neighbourhood|suburb|quarter)$"]["name"]${caja};
  relation["place"~"^(neighbourhood|suburb|quarter)$"]["name"]${caja};
  relation["boundary"="administrative"]["admin_level"~"^(9|10)$"]["name"]${caja};
);
out geom;`;
};

const SERVIDORES_OVERPASS = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://maps.mail.ru/osm/tools/overpass/api/interpreter",
];

export const descargarOsm = async (bbox: [number, number, number, number]): Promise<RespuestaOverpass> => {
    const cuerpo = new URLSearchParams({ data: consultaOverpass(bbox) });
    let ultimoError: unknown;
    for (const servidor of SERVIDORES_OVERPASS) {
        try {
            console.log(`Descargando calles y barrios de OpenStreetMap (${new URL(servidor).host})…`);
            const respuesta = await fetch(servidor, { method: "POST", body: cuerpo, signal: AbortSignal.timeout(300_000) });
            if (!respuesta.ok) throw new Error(`respondió ${respuesta.status}`);
            return (await respuesta.json()) as RespuestaOverpass;
        } catch (error) {
            ultimoError = error;
            console.warn(`  No se pudo: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    throw new Error(`Ningún servidor de OpenStreetMap respondió: ${String(ultimoError)}`);
};

// ---------------------------------------------------------------------------
// Formato de Overpass (out geom)
// ---------------------------------------------------------------------------

interface Punto { lat: number; lon: number }
interface ElementoOverpass {
    type: "node" | "way" | "relation";
    id: number;
    lat?: number;
    lon?: number;
    tags?: Record<string, string>;
    geometry?: Punto[];
    members?: { type: string; role: string; geometry?: Punto[] }[];
}
export interface RespuestaOverpass { elements: ElementoOverpass[] }

const linea = (puntos: Punto[]) => ({ type: "LineString", coordinates: puntos.map((p) => [p.lon, p.lat]) });
const cerrada = (puntos: Punto[]) => puntos.length >= 4 && puntos[0]!.lat === puntos.at(-1)!.lat && puntos[0]!.lon === puntos.at(-1)!.lon;

const esBarrio = (tags: Record<string, string> = {}) =>
    Boolean(tags.name) && (["neighbourhood", "suburb", "quarter"].includes(tags.place ?? "") || (tags.boundary === "administrative" && ["9", "10"].includes(tags.admin_level ?? "")));
const esAgua = (tags: Record<string, string> = {}) => tags.natural === "water";

// "Barrio San Martín" → "San Martín"
export const nombreDeBarrio = (nombre: string) => nombre.replace(/^\s*(barrio|b[°º]|bº)\s+/i, "").trim();

interface Separado {
    calles: object[];
    // Cada área de agua (laguna, riacho) con sus líneas: se arma por separado.
    agua: { lineas: object[] }[];
    areasBarrio: { nombre: string; lineas: object[] }[];
    puntosBarrio: { nombre: string; lon: number; lat: number }[];
}

const separar = ({ elements }: RespuestaOverpass): Separado => {
    const resultado: Separado = { calles: [], agua: [], areasBarrio: [], puntosBarrio: [] };
    for (const elemento of elements) {
        const tags = elemento.tags ?? {};
        if (elemento.type === "node" && esBarrio(tags) && elemento.lat !== undefined && elemento.lon !== undefined) {
            resultado.puntosBarrio.push({ nombre: nombreDeBarrio(tags.name!), lon: elemento.lon, lat: elemento.lat });
            continue;
        }
        if (elemento.type === "way" && elemento.geometry && elemento.geometry.length >= 2) {
            if (esBarrio(tags) && cerrada(elemento.geometry)) resultado.areasBarrio.push({ nombre: nombreDeBarrio(tags.name!), lineas: [linea(elemento.geometry)] });
            else if (esAgua(tags) && cerrada(elemento.geometry)) resultado.agua.push({ lineas: [linea(elemento.geometry)] });
            else if (tags.highway || tags.railway || tags.waterway) resultado.calles.push(linea(elemento.geometry));
            continue;
        }
        if (elemento.type === "relation" && elemento.members) {
            const lineas = elemento.members.filter((m) => m.type === "way" && m.role !== "inner" && m.geometry && m.geometry.length >= 2).map((m) => linea(m.geometry!));
            if (lineas.length === 0) continue;
            if (esBarrio(tags)) resultado.areasBarrio.push({ nombre: nombreDeBarrio(tags.name!), lineas });
            else if (esAgua(tags)) resultado.agua.push({ lineas });
        }
    }
    return resultado;
};

// ---------------------------------------------------------------------------
// Agrupamiento en zonas
// ---------------------------------------------------------------------------

interface ManzanaPlana { id: number; x: number; y: number; barrio: string | null }

// k-medias simple y determinista (arranca en cuantiles del eje más largo).
export const agrupar = (puntos: { x: number; y: number }[], k: number): number[] => {
    if (k <= 1) return puntos.map(() => 0);
    const ancho = Math.max(...puntos.map((p) => p.x)) - Math.min(...puntos.map((p) => p.x));
    const alto = Math.max(...puntos.map((p) => p.y)) - Math.min(...puntos.map((p) => p.y));
    const eje = ancho >= alto ? "x" : "y";
    const ordenados = [...puntos].sort((a, b) => a[eje] - b[eje]);
    let centros = Array.from({ length: k }, (_, i) => ({ ...ordenados[Math.floor(((i + 0.5) / k) * ordenados.length)]! }));
    let asignacion = puntos.map(() => 0);
    for (let vuelta = 0; vuelta < 30; vuelta++) {
        asignacion = puntos.map((p) => {
            let mejor = 0;
            centros.forEach((c, i) => { if ((p.x - c.x) ** 2 + (p.y - c.y) ** 2 < (p.x - centros[mejor]!.x) ** 2 + (p.y - centros[mejor]!.y) ** 2) mejor = i; });
            return mejor;
        });
        centros = centros.map((c, i) => {
            const grupo = puntos.filter((_, j) => asignacion[j] === i);
            return grupo.length === 0 ? c : { x: grupo.reduce((s, p) => s + p.x, 0) / grupo.length, y: grupo.reduce((s, p) => s + p.y, 0) / grupo.length };
        });
    }
    return asignacion;
};

// Nombres de las partes de un barrio grande: puntos cardinales cuando son pocas, números si son muchas.
export const nombresDePartes = (barrio: string, centros: { x: number; y: number }[]): string[] => {
    const k = centros.length;
    const ancho = Math.max(...centros.map((c) => c.x)) - Math.min(...centros.map((c) => c.x));
    const alto = Math.max(...centros.map((c) => c.y)) - Math.min(...centros.map((c) => c.y));
    const horizontal = ancho >= alto;
    const orden = centros.map((c, i) => ({ i, v: horizontal ? c.x : -c.y })).sort((a, b) => a.v - b.v).map((o) => o.i);
    const etiquetas = k === 2 ? (horizontal ? ["Oeste", "Este"] : ["Norte", "Sur"])
        : k === 3 ? (horizontal ? ["Oeste", "Centro", "Este"] : ["Norte", "Centro", "Sur"])
        : Array.from({ length: k }, (_, i) => String(i + 1));
    const nombres: string[] = new Array(k);
    orden.forEach((indice, posicion) => { nombres[indice] = `${barrio} - Zona ${etiquetas[posicion]}`; });
    return nombres;
};

// Barrios chicos al barrio más cercano; los que quedan sin barrio, al barrio de la manzana más cercana.
export const armarZonas = (manzanas: ManzanaPlana[]): { barrio: string; nombre: string; ids: number[] }[] => {
    const conBarrio = manzanas.filter((m) => m.barrio);
    if (conBarrio.length === 0) {
        // Sin barrios en OSM: sectores de tamaño parejo.
        const k = Math.max(1, Math.round(manzanas.length / ZONA_OBJETIVO));
        const grupos = agrupar(manzanas, k);
        const nombres = nombresDePartes("Sector", Array.from({ length: k }, (_, i) => centro(manzanas.filter((_, j) => grupos[j] === i))));
        return nombres.map((nombre, i) => ({ barrio: nombre, nombre, ids: manzanas.filter((_, j) => grupos[j] === i).map((m) => m.id) }));
    }

    for (const manzana of manzanas.filter((m) => !m.barrio)) {
        manzana.barrio = masCercana(manzana, conBarrio).barrio;
    }

    const porBarrio = () => {
        const mapa = new Map<string, ManzanaPlana[]>();
        for (const m of manzanas) mapa.set(m.barrio!, [...(mapa.get(m.barrio!) ?? []), m]);
        return mapa;
    };

    // Fusiona de a uno, empezando por el más chico, hasta que todos alcanzan el mínimo.
    for (;;) {
        const barrios = [...porBarrio()].sort((a, b) => a[1].length - b[1].length);
        const [nombre, lista] = barrios[0]!;
        if (lista.length >= ZONA_MINIMA || barrios.length === 1) break;
        const propio = centro(lista);
        const otros = barrios.slice(1).map(([otro, manzanasOtro]) => ({ otro, distancia: distanciaMinima(propio, manzanasOtro) }));
        const destino = otros.sort((a, b) => a.distancia - b.distancia)[0]!.otro;
        for (const m of lista) m.barrio = destino;
        console.log(`  ${nombre} (${lista.length} manzanas) se suma a ${destino}`);
    }

    const zonas: { barrio: string; nombre: string; ids: number[] }[] = [];
    for (const [barrio, lista] of porBarrio()) {
        if (lista.length <= ZONA_MAXIMA) {
            zonas.push({ barrio, nombre: barrio, ids: lista.map((m) => m.id) });
            continue;
        }
        const k = Math.ceil(lista.length / ZONA_OBJETIVO);
        const grupos = agrupar(lista, k);
        const nombres = nombresDePartes(barrio, Array.from({ length: k }, (_, i) => centro(lista.filter((_, j) => grupos[j] === i))));
        nombres.forEach((nombre, i) => {
            const ids = lista.filter((_, j) => grupos[j] === i).map((m) => m.id);
            if (ids.length > 0) zonas.push({ barrio, nombre, ids });
        });
    }
    return zonas;
};

const centro = (puntos: { x: number; y: number }[]) => ({
    x: puntos.reduce((s, p) => s + p.x, 0) / Math.max(1, puntos.length),
    y: puntos.reduce((s, p) => s + p.y, 0) / Math.max(1, puntos.length),
});
const masCercana = <T extends { x: number; y: number }>(p: { x: number; y: number }, lista: T[]): T =>
    lista.reduce((mejor, m) => ((m.x - p.x) ** 2 + (m.y - p.y) ** 2 < (mejor.x - p.x) ** 2 + (mejor.y - p.y) ** 2 ? m : mejor));
const distanciaMinima = (p: { x: number; y: number }, lista: { x: number; y: number }[]) => {
    const m = masCercana(p, lista);
    return Math.hypot(m.x - p.x, m.y - p.y);
};

// ---------------------------------------------------------------------------
// Carga en la base
// ---------------------------------------------------------------------------

// Borra todo lo que cuelga de las manzanas de la localidad (datos de prueba sobre la grilla vieja).
const vaciarLocalidad = async (tx: Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0], localidadId: number) => {
    await tx.$executeRaw`DELETE FROM "intervencion" WHERE "manzanaId" IN (SELECT "id" FROM "manzana" WHERE "localidadId" = ${localidadId})`;
    await tx.$executeRaw`DELETE FROM "rutaBrigada" WHERE "localidadId" = ${localidadId}`;
    await tx.$executeRaw`DELETE FROM "reporte" WHERE "manzanaId" IN (SELECT "id" FROM "manzana" WHERE "localidadId" = ${localidadId})`;
    await tx.$executeRaw`UPDATE "suscripcionPush" SET "manzanaId" = NULL WHERE "manzanaId" IN (SELECT "id" FROM "manzana" WHERE "localidadId" = ${localidadId})`;
    await tx.$executeRaw`DELETE FROM "manzana" WHERE "localidadId" = ${localidadId}`;
    await tx.$executeRaw`DELETE FROM "canjePremio" WHERE "localidadId" = ${localidadId}`;
    await tx.$executeRaw`DELETE FROM "zonaCompetencia" WHERE "localidadId" = ${localidadId}`;
};

export const cargarDesdeOsm = async (prisma: PrismaClient, localidadId: number, datos: RespuestaOverpass, opciones: { reemplazar: boolean }) => {
    const { calles, agua, areasBarrio, puntosBarrio } = separar(datos);
    if (calles.length === 0) throw new Error("Los datos de OpenStreetMap no traen calles para esta zona");

    const existentes = await prisma.manzana.count({ where: { localidadId } });
    if (existentes > 0 && !opciones.reemplazar) {
        throw new Error(`La localidad ya tiene ${existentes} manzanas. Use --reemplazar para borrarlas (y todo lo que depende de ellas) y cargar las de OSM.`);
    }

    const coleccion = (geometrias: object[]) => JSON.stringify({ type: "FeatureCollection", features: geometrias.map((geometry) => ({ type: "Feature", geometry, properties: {} })) });

    return prisma.$transaction(async (tx) => {
        await vaciarLocalidad(tx, localidadId);

        // 1. Manzanas: lo que queda del área al restarle las calles (con su ancho), filtrado por tamaño y
        //    forma. Restar calles "anchas" cierra también las esquinas donde en OSM las calles casi se tocan.
        await tx.$executeRaw`
            CREATE TEMP TABLE osm_lineas ON COMMIT DROP AS
            SELECT ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(f->>'geometry'), 4326), ${SRID_METRICO}::int) AS geom
            FROM json_array_elements(${coleccion(calles)}::json->'features') f`;
        // Agua y barrios se arman de a una área: en OSM hay polígonos mal cerrados que harían fallar todo
        // el lote. Cada uno va en un punto de guardado; si falla, se omite ese solo.
        const armarAreas = async (tabla: 'osm_agua' | 'osm_barrios', areas: { nombre?: string; lineas: object[] }[]) => {
            await tx.$executeRawUnsafe(`CREATE TEMP TABLE ${tabla} (nombre text, geom geometry) ON COMMIT DROP`);
            let omitidas = 0;
            for (const area of areas) {
                await tx.$executeRawUnsafe('SAVEPOINT area_osm');
                try {
                    const lineas = coleccion(area.lineas);
                    const geom = Prisma.sql`ST_CollectionExtract(ST_MakeValid(ST_BuildArea(ST_Node(ST_Collect(
                        ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(f->>'geometry'), 4326), ${SRID_METRICO}::int))))), 3)`;
                    await tx.$executeRaw`INSERT INTO ${Prisma.raw(tabla)} (nombre, geom)
                        SELECT ${area.nombre ?? null}, ${geom} FROM json_array_elements(${lineas}::json->'features') f HAVING count(*) > 0`;
                    await tx.$executeRawUnsafe('RELEASE SAVEPOINT area_osm');
                } catch {
                    await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT area_osm');
                    omitidas++;
                }
            }
            if (omitidas > 0) console.warn(`  ${omitidas} áreas de ${tabla === 'osm_agua' ? 'agua' : 'barrio'} con geometría inválida en OSM: se omiten`);
        };
        await armarAreas('osm_agua', agua);

        await tx.$executeRaw`
            CREATE TEMP TABLE osm_bloques ON COMMIT DROP AS
            WITH calles AS (SELECT ST_Buffer(ST_Collect(geom), ${RETIRO_CALLE_M}::float8, 'quad_segs=2') AS geom FROM osm_lineas),
                 caja AS (SELECT ST_Envelope(ST_Collect(geom)) AS geom FROM osm_lineas),
                 poligonos AS (SELECT (ST_Dump(ST_Difference(caja.geom, calles.geom))).geom AS geom FROM caja, calles)
            SELECT ST_SimplifyPreserveTopology(p.geom, 1) AS geom
            FROM poligonos p
            WHERE ST_Area(p.geom) BETWEEN ${AREA_MINIMA_M2}::float8 AND ${AREA_MAXIMA_M2}::float8
              AND 4 * pi() * ST_Area(p.geom) / (ST_Perimeter(p.geom) ^ 2) >= ${COMPACIDAD_MINIMA}::float8
              AND NOT EXISTS (SELECT 1 FROM osm_agua a WHERE a.geom IS NOT NULL AND ST_Contains(a.geom, ST_PointOnSurface(p.geom)))`;

        const insertadas = await tx.$executeRaw`
            INSERT INTO "manzana" ("localidadId", "codigo", "geom", "centroide", "updatedAt")
            SELECT ${localidadId}, 'M-' || lpad(row_number() OVER (ORDER BY ST_Y(ST_Centroid(geom)) DESC, ST_X(ST_Centroid(geom)))::text, 5, '0'),
                   ST_Transform(geom, 4326), ST_Transform(ST_PointOnSurface(geom), 4326), now()
            FROM osm_bloques
            WHERE NOT ST_IsEmpty(geom) AND GeometryType(geom) = 'POLYGON'`;

        // 2. Barrio de cada manzana: el área de barrio que la contiene o, si OSM solo tiene el punto, el más cercano (a menos de 1,5 km).
        await armarAreas('osm_barrios', areasBarrio);
        const planas = await tx.$queryRaw<ManzanaPlana[]>`
            WITH m AS (SELECT "id", ST_Transform("centroide", ${SRID_METRICO}::int) AS c FROM "manzana" WHERE "localidadId" = ${localidadId}),
                 puntos AS (
                    SELECT p->>'nombre' AS nombre, ST_Transform(ST_SetSRID(ST_MakePoint((p->>'lon')::float8, (p->>'lat')::float8), 4326), ${SRID_METRICO}::int) AS geom
                    FROM json_array_elements(${JSON.stringify(puntosBarrio)}::json) p)
            SELECT m."id", ST_X(m.c) AS x, ST_Y(m.c) AS y,
                   COALESCE(
                       (SELECT b.nombre FROM osm_barrios b WHERE b.geom IS NOT NULL AND ST_Contains(b.geom, m.c) ORDER BY ST_Area(b.geom) LIMIT 1),
                       (SELECT p.nombre FROM puntos p WHERE ST_DWithin(p.geom, m.c, 1500) ORDER BY p.geom <-> m.c LIMIT 1)
                   ) AS barrio
            FROM m`;

        // 3. Zonas: barrios de tamaño razonable; la forma es la unión de sus manzanas.
        const zonas = armarZonas(planas);
        for (const zona of zonas) {
            const [{ id }] = await tx.$queryRaw<{ id: number }[]>`
                INSERT INTO "zonaCompetencia" ("localidadId", "barrio", "nombre", "geom", "updatedAt")
                SELECT ${localidadId}, ${zona.barrio}, ${zona.nombre},
                       ST_Multi(ST_CollectionExtract(ST_MakeValid(ST_Transform(ST_Buffer(ST_Union(ST_Buffer(ST_Transform("geom", ${SRID_METRICO}::int), ${RETIRO_CALLE_M + 2}::float8)), -2), 4326)), 3)),
                       now()
                FROM "manzana" WHERE "id" = ANY(${zona.ids}::int[])
                RETURNING "id"` as [{ id: number }];
            await tx.$executeRaw`UPDATE "manzana" SET "zonaId" = ${id} WHERE "id" = ANY(${zona.ids}::int[])`;
        }

        const barrios = new Set(zonas.map((z) => z.barrio)).size;
        return { manzanas: insertadas, zonas: zonas.length, barrios, conDatosDeBarrio: areasBarrio.length + puntosBarrio.length };
    }, { timeout: 600_000, maxWait: 30_000 });
};
