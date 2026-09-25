import "dotenv/config";
import { parseArgs } from "node:util";
import type { EstadoManzana, Prisma } from "@prisma/client";
import prisma from "../src/config/prisma.js";
import { recalcularEstadosService, UMBRAL_LLUVIA_MM } from "../src/services/manzana.services.js";
import { crearAzar, elegirColorFinal, simularHistoria, type HistoriaManzana } from "../src/utils/simulacion.js";

// Datos SIMULADOS para la demostración: dos meses de reportes, limpiezas e intervenciones en cada
// manzana de una localidad, para que el mapa, la Copa, las métricas y la bandeja tengan contenido.
// Se puede repetir: primero borra la simulación anterior. Las manzanas con datos reales no se tocan.
// Uso: npm run simular-datos -- [--localidad "Formosa Capital"] [--semilla 2026] [--pendientes 20] [--borrar]

const MARCA = "Dato simulado para la demostración";
const LOTE = 5000;

const { values } = parseArgs({
    options: {
        localidad: { type: "string", default: "Formosa Capital" },
        semilla: { type: "string", default: "2026" },
        // Máximo de reportes pendientes que quedan en la bandeja de Epidemiología.
        pendientes: { type: "string", default: "20" },
        // Solo borra la simulación anterior.
        borrar: { type: "boolean", default: false },
    },
});

const usuarioSimulado = (email: string, rol: "EPIDEMIOLOGO" | "BRIGADISTA", nombre: string, localidadId: number | null) =>
    prisma.usuario.upsert({
        where: { email },
        // Inactivo y sin clave válida: no puede iniciar sesión, solo firma los datos simulados.
        create: { email, rol, nombre, apellido: "(simulación)", password: "!", activo: false, localidadId },
        update: {},
        select: { id: true },
    });

const borrarSimulacion = async (localidadId: number, usuarios: number[]) => {
    const deLocalidad = { manzana: { localidadId } };
    const intervenciones = await prisma.intervencion.deleteMany({ where: { usuarioId: { in: usuarios }, ...deLocalidad } });
    const reportes = await prisma.reporte.deleteMany({ where: { descripcion: MARCA, ...deLocalidad } });
    await prisma.historialEstadoManzana.deleteMany({ where: { motivo: { startsWith: "Simulación:" }, ...deLocalidad } });
    // Las manzanas que quedaron sin nada vuelven a "sin datos".
    await prisma.$executeRaw`
        UPDATE "manzana" m SET "estado" = 'SIN_DATOS', "ultimaLimpiezaEn" = NULL, "ultimoReporteEn" = NULL, "estadoActualizadoEn" = NULL
        WHERE m."localidadId" = ${localidadId}
          AND NOT EXISTS (SELECT 1 FROM "reporte" r WHERE r."manzanaId" = m."id")
          AND NOT EXISTS (SELECT 1 FROM "intervencion" i WHERE i."manzanaId" = m."id")`;
    return { reportes: reportes.count, intervenciones: intervenciones.count };
};

// Desde cuándo una limpieza no queda "lavada": después de la última lluvia que acumuló el umbral.
const limpiezaSeguraDesde = async (localidadId: number) => {
    const registros = await prisma.registroMeteorologico.findMany({
        where: { localidadId, esPronostico: false },
        orderBy: { observadoEn: "desc" },
        select: { observadoEn: true, precipitacionMm: true },
        take: 2000,
    });
    let acumulado = 0;
    for (const registro of registros) {
        acumulado += registro.precipitacionMm;
        if (acumulado >= UMBRAL_LLUVIA_MM) return registro.observadoEn;
    }
    return new Date(0);
};

const enLotes = async <T>(filas: T[], guardar: (lote: T[]) => Promise<unknown>) => {
    for (let inicio = 0; inicio < filas.length; inicio += LOTE) await guardar(filas.slice(inicio, inicio + LOTE));
};

const main = async () => {
    const localidad = await prisma.localidad.findUnique({ where: { nombre: values.localidad! } });
    if (!localidad) throw new Error(`No existe la localidad "${values.localidad}". Ejecute primero la semilla.`);

    const epidemiologia = await usuarioSimulado("epidemiologia.simulada@redcuidar.local", "EPIDEMIOLOGO", "Epidemiología", null);
    const brigadista = await usuarioSimulado(`brigadista.simulado.${localidad.id}@redcuidar.local`, "BRIGADISTA", "Brigada", localidad.id);

    const borrados = await borrarSimulacion(localidad.id, [brigadista.id]);
    if (borrados.reportes + borrados.intervenciones > 0) {
        console.log(`Simulación anterior borrada: ${borrados.reportes} reportes y ${borrados.intervenciones} intervenciones.`);
    }
    if (values.borrar) return;

    const manzanas = await prisma.manzana.findMany({
        where: { localidadId: localidad.id, reportes: { none: {} }, intervenciones: { none: {} } },
        select: { id: true, zonaId: true },
        orderBy: { id: "asc" },
    });
    if (manzanas.length === 0) {
        console.log("No hay manzanas sin datos en esta localidad: no se simuló nada.");
        return;
    }

    const semilla = Number(values.semilla) || 2026;
    const maxPendientes = Number(values.pendientes) || 0;
    const ahora = new Date();
    const seguraDesde = await limpiezaSeguraDesde(localidad.id);

    // Cada zona tiene su "nivel de cuidado": así hay barrios que van mejor que otros en la Copa.
    const cuidadoDe = new Map<number | null, number>();
    const cuidado = (zonaId: number | null) => {
        if (!cuidadoDe.has(zonaId)) cuidadoDe.set(zonaId, zonaId === null ? 0.55 : crearAzar(semilla * 7919 + zonaId).entre(0.25, 0.9));
        return cuidadoDe.get(zonaId)!;
    };

    const historias: { id: number; historia: HistoriaManzana }[] = [];
    let pendientes = 0;
    for (const manzana of manzanas) {
        const azar = crearAzar(semilla * 104729 + manzana.id);
        const colorFinal = elegirColorFinal(azar, cuidado(manzana.zonaId));
        const conPendiente = colorFinal === "AMARILLO" && pendientes < maxPendientes && azar.si(0.08);
        if (conPendiente) pendientes++;
        historias.push({ id: manzana.id, historia: simularHistoria(azar, { ahora, cuidado: cuidado(manzana.zonaId), colorFinal, limpiezaSeguraDesde: seguraDesde, conPendiente }) });
    }

    const reportes: Prisma.reporteCreateManyInput[] = historias.flatMap(({ id, historia }) => historia.reportes.map((reporte) => ({
        id: reporte.id,
        idCliente: crypto.randomUUID(),
        manzanaId: id,
        tipo: reporte.tipo,
        estado: reporte.estado,
        confianzaIa: Math.round((0.55 + Math.random() * 0.4) * 100) / 100,
        descripcion: MARCA,
        capturadoEn: reporte.capturadoEn,
        createdAt: reporte.capturadoEn,
        ...(reporte.estado === "PENDIENTE" ? {} : { validadoPorId: epidemiologia.id, validadoEn: reporte.validadoEn ?? reporte.capturadoEn }),
        ...(reporte.estado === "RECHAZADO" ? { motivoRechazo: "En la foto no se ve un recipiente con agua" } : {}),
    })));
    // Primero los reportes sin cierre: las limpiezas apuntan (reporteResueltoId) al criadero que cierran.
    const cierres = historias.flatMap(({ historia }) => historia.reportes.filter((reporte) => reporte.reporteResueltoId));
    await enLotes(reportes, (lote) => prisma.reporte.createMany({ data: lote }));
    await enLotes(cierres, (lote) => prisma.$executeRaw`
        UPDATE "reporte" r SET "reporteResueltoId" = v.resuelto
        FROM (SELECT unnest(${lote.map((c) => c.id)}::uuid[]) AS id, unnest(${lote.map((c) => c.reporteResueltoId!)}::uuid[]) AS resuelto) v
        WHERE r."id" = v.id`);

    const intervenciones: Prisma.intervencionCreateManyInput[] = historias.flatMap(({ id, historia }) => historia.intervenciones.map((intervencion) => ({
        tipo: intervencion.tipo,
        manzanaId: id,
        usuarioId: brigadista.id,
        realizadaEn: intervencion.realizadaEn,
        createdAt: intervencion.realizadaEn,
        observaciones: MARCA,
        ...(intervencion.tipo === "APLICACION_BTI" ? { cantidadProducto: 5, unidadProducto: "g", tipoCuerpoAgua: "Tanque sin tapa" } : {}),
    })));
    await enLotes(intervenciones, (lote) => prisma.intervencion.createMany({ data: lote }));

    const cambios: Prisma.historialEstadoManzanaCreateManyInput[] = historias.flatMap(({ id, historia }) => historia.cambios.map((cambio) => ({
        manzanaId: id, estadoAnterior: cambio.anterior, estadoNuevo: cambio.nuevo, motivo: cambio.motivo, createdAt: cambio.en,
    })));
    await enLotes(cambios, (lote) => prisma.historialEstadoManzana.createMany({ data: lote }));

    await enLotes(historias, (lote) => prisma.$executeRaw`
        UPDATE "manzana" m SET
            "estado" = v.estado::"EstadoManzana",
            "ultimaLimpiezaEn" = v.limpieza,
            "ultimoReporteEn" = v.reporte,
            "estadoActualizadoEn" = v.cambio,
            "updatedAt" = now()
        FROM (SELECT
            unnest(${lote.map((h) => h.id)}::int[]) AS id,
            unnest(${lote.map((h) => h.historia.estadoFinal)}::text[]) AS estado,
            unnest(${lote.map((h) => h.historia.ultimaLimpiezaEn)}::timestamp[]) AS limpieza,
            unnest(${lote.map((h) => h.historia.ultimoReporteEn)}::timestamp[]) AS reporte,
            unnest(${lote.map((h) => h.historia.cambios.at(-1)?.en ?? null)}::timestamp[]) AS cambio
        ) v
        WHERE m."id" = v.id`);

    // Control: el recalculo real no debería cambiar casi nada (solo si llovió justo en el medio).
    const control = await recalcularEstadosService(localidad.id);

    const conteo = historias.reduce<Record<string, number>>((total, { historia }) => ({ ...total, [historia.estadoFinal]: (total[historia.estadoFinal] ?? 0) + 1 }), {});
    const porcentaje = (estado: EstadoManzana) => `${Math.round(((conteo[estado] ?? 0) / historias.length) * 100)} %`;
    console.log(`Simulación lista en ${localidad.nombre}: ${historias.length} manzanas.`);
    console.log(`  Verde ${porcentaje("VERDE")} · Amarillo ${porcentaje("AMARILLO")} · Rojo ${porcentaje("ROJO")}`);
    console.log(`  ${reportes.length} reportes (${pendientes} pendientes en la bandeja), ${intervenciones.length} intervenciones, ${cambios.length} cambios de color.`);
    console.log(`  Recalculo de control: ${control.actualizadas} de ${control.revisadas} manzanas cambiaron.`);
};

main()
    .catch((error) => {
        console.error(error instanceof Error ? error.message : error);
        process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
