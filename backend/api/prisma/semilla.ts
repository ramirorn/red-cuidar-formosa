import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, type NivelRiesgo } from "@prisma/client";
import { cargarDesdeOsm, leerCache } from "../src/utils/osm.js";
import { asignarZonasAManzanas } from "./zonas.js";

// Carga inicial: localidades priorizadas, primer ADMINISTRADOR y, opcionalmente,
// una grilla sintética de manzanas para desarrollo local. Es idempotente.

const prisma = new PrismaClient();
const asignarZonas = (localidadId: number) => asignarZonasAManzanas(prisma, localidadId);

// Coordenadas aproximadas del centro de cada localidad: solo se usan para consultar el clima.
const LOCALIDADES: { nombre: string; nivelRiesgoBase: NivelRiesgo; latitud: number; longitud: number }[] = [
    { nombre: "Formosa Capital", nivelRiesgoBase: "CRITICO", latitud: -26.1849, longitud: -58.1731 },
    { nombre: "Clorinda", nivelRiesgoBase: "CRITICO", latitud: -25.2848, longitud: -57.7185 },
    { nombre: "Pirané", nivelRiesgoBase: "ALTO", latitud: -25.7324, longitud: -59.1088 },
    { nombre: "El Colorado", nivelRiesgoBase: "ALTO", latitud: -26.3081, longitud: -59.3728 },
    { nombre: "Laguna Blanca", nivelRiesgoBase: "ALTO", latitud: -25.1289, longitud: -58.2487 },
    { nombre: "Las Lomitas", nivelRiesgoBase: "MODERADO_ALTO", latitud: -24.7096, longitud: -60.5936 },
    { nombre: "Palo Santo", nivelRiesgoBase: "MODERADO_ALTO", latitud: -25.5633, longitud: -59.3378 },
    { nombre: "Estanislao del Campo", nivelRiesgoBase: "MODERADO_ALTO", latitud: -25.0547, longitud: -60.0937 },
];

const crearLocalidades = async () => {
    for (const { latitud, longitud, ...localidad } of LOCALIDADES) {
        const registro = await prisma.localidad.upsert({
            where: { nombre: localidad.nombre },
            create: localidad,
            update: { nivelRiesgoBase: localidad.nivelRiesgoBase },
        });
        await prisma.$executeRaw`
            UPDATE "localidad" SET "centroide" = ST_SetSRID(ST_MakePoint(${longitud}::float8, ${latitud}::float8), 4326)
            WHERE "id" = ${registro.id}
        `;
    }
    console.log(`Localidades cargadas: ${LOCALIDADES.length}`);
};

const crearAdministrador = async () => {
    const email = process.env.SEMILLA_ADMIN_EMAIL?.toLowerCase();
    const password = process.env.SEMILLA_ADMIN_PASSWORD;

    if (!email || !password) {
        console.log("Sin SEMILLA_ADMIN_EMAIL / SEMILLA_ADMIN_PASSWORD: no se crea administrador");
        return;
    }
    if (password.length < 12) {
        throw new Error("SEMILLA_ADMIN_PASSWORD debe tener al menos 12 caracteres");
    }

    const existente = await prisma.usuario.findFirst({ where: { rol: "ADMINISTRADOR", eliminadoEn: null } });
    if (existente) {
        console.log("Ya existe un administrador: no se crea otro");
        return;
    }

    await prisma.usuario.create({
        data: {
            nombre: "Administrador",
            apellido: "Inicial",
            email,
            password: await bcrypt.hash(password, 12),
            rol: "ADMINISTRADOR",
        },
    });
    console.log(`Administrador creado: ${email}`);
};

// Grilla de 10 x 10 manzanas de ~100 m alrededor del centro de Formosa Capital.
// Son datos SINTÉTICOS para desarrollo; las manzanas reales se cargan con importar-manzanas.
const crearGrillaEjemplo = async () => {
    if (process.env.SEMILLA_MANZANAS_EJEMPLO !== "true") return;

    const localidad = await prisma.localidad.findUniqueOrThrow({ where: { nombre: "Formosa Capital" } });
    const origen = { longitud: -58.1800, latitud: -26.1900 };
    const lado = 0.001;
    const calle = 0.0002;

    for (let fila = 0; fila < 10; fila++) {
        for (let columna = 0; columna < 10; columna++) {
            const x = origen.longitud + columna * lado;
            const y = origen.latitud + fila * lado;
            const x2 = x + lado - calle;
            const y2 = y + lado - calle;
            const codigo = `EJ-${String(fila).padStart(2, "0")}${String(columna).padStart(2, "0")}`;

            await prisma.$executeRaw`
                INSERT INTO "manzana" ("localidadId", "codigo", "geom", "centroide", "updatedAt")
                VALUES (
                    ${localidad.id}, ${codigo},
                    ST_MakeEnvelope(${x}::float8, ${y}::float8, ${x2}::float8, ${y2}::float8, 4326),
                    ST_Centroid(ST_MakeEnvelope(${x}::float8, ${y}::float8, ${x2}::float8, ${y2}::float8, 4326)),
                    now()
                )
                ON CONFLICT ("localidadId", "codigo") DO NOTHING
            `;
        }
    }
    console.log("Grilla sintética de 100 manzanas cargada en Formosa Capital");
};

// Zonas de la Copa Red-Cuidar sobre la grilla sintética, con nombres de barrios reales de Formosa
// Capital. Muestra los dos casos: barrios chicos (una zona) y un barrio grande dividido en zonas.
// Las zonas reales las define la provincia con la administración y se cargan con importar-zonas.
const ZONAS_EJEMPLO = [
    { barrio: "San Martín", nombre: "San Martín", columnas: [0, 4], filas: [0, 5] },
    { barrio: "Centro", nombre: "Centro", columnas: [4, 7], filas: [0, 5] },
    { barrio: "Villa del Carmen", nombre: "Villa del Carmen", columnas: [7, 10], filas: [0, 5] },
    { barrio: "Nueva Formosa", nombre: "Nueva Formosa - Zona Oeste", columnas: [0, 4], filas: [5, 10] },
    { barrio: "Nueva Formosa", nombre: "Nueva Formosa - Zona Centro", columnas: [4, 7], filas: [5, 10] },
    { barrio: "Nueva Formosa", nombre: "Nueva Formosa - Zona Este", columnas: [7, 10], filas: [5, 10] },
];

const crearZonasEjemplo = async () => {
    if (process.env.SEMILLA_MANZANAS_EJEMPLO !== "true") return;

    const localidad = await prisma.localidad.findUniqueOrThrow({ where: { nombre: "Formosa Capital" } });
    const origen = { longitud: -58.1800, latitud: -26.1900 };
    const lado = 0.001;

    for (const zona of ZONAS_EJEMPLO) {
        const [x1, x2] = zona.columnas.map((columna) => origen.longitud + columna * lado) as [number, number];
        const [y1, y2] = zona.filas.map((fila) => origen.latitud + fila * lado) as [number, number];
        await prisma.$executeRaw`
            INSERT INTO "zonaCompetencia" ("localidadId", "barrio", "nombre", "geom", "updatedAt")
            VALUES (${localidad.id}, ${zona.barrio}, ${zona.nombre},
                ST_Multi(ST_MakeEnvelope(${x1}::float8, ${y1}::float8, ${x2}::float8, ${y2}::float8, 4326)), now())
            ON CONFLICT ("localidadId", "nombre") DO UPDATE SET "geom" = EXCLUDED."geom", "barrio" = EXCLUDED."barrio", "updatedAt" = now()
        `;
    }
    const asignadas = await asignarZonas(localidad.id);
    console.log(`Zonas de ejemplo de la Copa Red-Cuidar: ${ZONAS_EJEMPLO.length} zonas, ${asignadas} manzanas asignadas`);
};

// Si el repositorio trae la descarga de OpenStreetMap (npm run importar-osm), se usan las manzanas y
// barrios reales; si no, la grilla sintética. En ambos casos solo cuando la localidad no tiene manzanas.
const crearManzanas = async () => {
    if (process.env.SEMILLA_MANZANAS_EJEMPLO !== "true") return;
    const localidad = await prisma.localidad.findUniqueOrThrow({ where: { nombre: "Formosa Capital" } });
    if (await prisma.manzana.count({ where: { localidadId: localidad.id } }) > 0) {
        console.log("Formosa Capital ya tiene manzanas: no se tocan");
        return;
    }
    const osm = await leerCache(localidad.nombre);
    if (osm) {
        const resultado = await cargarDesdeOsm(prisma, localidad.id, osm, { reemplazar: false });
        console.log(`Manzanas reales de OpenStreetMap: ${resultado.manzanas} manzanas en ${resultado.zonas} zonas de la Copa`);
        return;
    }
    await crearGrillaEjemplo();
    await crearZonasEjemplo();
};

const main = async () => {
    await crearLocalidades();
    await crearAdministrador();
    await crearManzanas();
};

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
