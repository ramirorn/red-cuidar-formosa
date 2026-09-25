import "dotenv/config";
import { parseArgs } from "node:util";
import prisma from "../src/config/prisma.js";
import { calcularRankingService, edicionDe, LUGARES_PREMIADOS, mesArgentino, pedirPremioService } from "../src/services/copa.services.js";

// Premio de PRUEBA para probar el canje en el panel sin esperar el cierre de un mes real.
// Toma un reporte validado (sin premio) de una zona del podio de la última edición cerrada y pide el
// premio como lo haría el celular del vecino. El código se canjea en Panel → Canje de premios.
// Uso: npm run premio-de-prueba -- [--localidad "Formosa Capital"] [--mes 2026-08]

const { values } = parseArgs({
    options: {
        localidad: { type: "string", default: "Formosa Capital" },
        mes: { type: "string" },
    },
});

const mesAnterior = (mes: string) => {
    const [anio, numero] = mes.split("-").map(Number) as [number, number];
    return numero === 1 ? `${anio - 1}-12` : `${anio}-${String(numero - 1).padStart(2, "0")}`;
};

const main = async () => {
    const localidad = await prisma.localidad.findUnique({ where: { nombre: values.localidad! } });
    if (!localidad) throw new Error(`No existe la localidad "${values.localidad}".`);

    // La última edición con resultado definitivo y premios vigentes.
    const ahora = new Date();
    let mes = values.mes ?? mesAnterior(mesArgentino(ahora));
    if (!values.mes && edicionDe(mes, ahora).estado !== "definitiva") mes = mesAnterior(mes);
    const edicion = edicionDe(mes, ahora);
    if (edicion.estado !== "definitiva") throw new Error(`La ${edicion.nombre} todavía no es definitiva (lo será el ${edicion.definitivaDesde.toLocaleString("es-AR")}).`);
    if (ahora >= edicion.premiosVencen) throw new Error(`Los premios de la ${edicion.nombre} ya vencieron. Probá con --mes y un mes más reciente.`);

    const { zonas } = await calcularRankingService(localidad.id, mes, ahora);
    const podio = zonas.filter((zona) => zona.puntos > 0).slice(0, LUGARES_PREMIADOS);
    if (podio.length === 0) throw new Error(`La ${edicion.nombre} no tiene podio. Corré antes: npm run simular-datos`);

    const reporte = await prisma.reporte.findFirst({
        where: {
            estado: { in: ["VALIDADO", "RESUELTO"] },
            premioReclamadoEn: null,
            createdAt: { gte: edicion.inicio, lt: edicion.fin },
            manzana: { zonaId: { in: podio.map((zona) => zona.id) } },
        },
        select: { idCliente: true },
        orderBy: { createdAt: "asc" },
    });
    if (!reporte) throw new Error("Ya se usaron todos los reportes del podio para premios. Corré de nuevo npm run simular-datos.");

    const premio = await pedirPremioService(mes, [reporte.idCliente], ahora);
    if (!premio) throw new Error("No se pudo generar el premio.");

    console.log(`\n  Premio de prueba · ${premio.edicion.nombre}`);
    console.log(`  Zona:    ${premio.zona.nombre} (podio: ${podio.map((zona, i) => `${i + 1}º ${zona.nombre}`).join(", ")})`);
    console.log(`  Código:  ${premio.codigo}`);
    console.log(`  Vence:   ${premio.venceEn.toLocaleDateString("es-AR")}`);
    console.log(`\n  Canjealo en el panel (coordinación o administración): Canje de premios → escribí el código.\n`);
};

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
