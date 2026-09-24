import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, type NivelRiesgo } from "@prisma/client";

// Carga inicial: localidades priorizadas, primer ADMINISTRADOR y, opcionalmente,
// una grilla sintética de manzanas para desarrollo local. Es idempotente.

const prisma = new PrismaClient();

const LOCALIDADES: { nombre: string; nivelRiesgoBase: NivelRiesgo }[] = [
    { nombre: "Formosa Capital", nivelRiesgoBase: "CRITICO" },
    { nombre: "Clorinda", nivelRiesgoBase: "CRITICO" },
    { nombre: "Pirané", nivelRiesgoBase: "ALTO" },
    { nombre: "El Colorado", nivelRiesgoBase: "ALTO" },
    { nombre: "Laguna Blanca", nivelRiesgoBase: "ALTO" },
    { nombre: "Las Lomitas", nivelRiesgoBase: "MODERADO_ALTO" },
    { nombre: "Palo Santo", nivelRiesgoBase: "MODERADO_ALTO" },
    { nombre: "Estanislao del Campo", nivelRiesgoBase: "MODERADO_ALTO" },
];

const crearLocalidades = async () => {
    for (const localidad of LOCALIDADES) {
        await prisma.localidad.upsert({
            where: { nombre: localidad.nombre },
            create: localidad,
            update: { nivelRiesgoBase: localidad.nivelRiesgoBase },
        });
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

const main = async () => {
    await crearLocalidades();
    await crearAdministrador();
    await crearGrillaEjemplo();
};

main()
    .catch((error) => {
        console.error(error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
