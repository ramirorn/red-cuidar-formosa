import { createHmac } from 'node:crypto';
import prisma from '../config/prisma.js';
import entorno from '../config/entorno.js';
import type { UsuarioAutenticado } from '../middlewares/autenticacion.middleware.js';
import { alcanceLocalidad, verificarAlcance } from '../utils/alcance.js';
import { ErrorHttp } from '../utils/errorHttp.js';

// Copa Red-Cuidar: cada mes, dentro de cada localidad, compiten las zonas (barrios, o partes de un
// barrio grande). Solo suma lo que valida Epidemiología, así que no se puede inflar con spam.
// - Limpieza validada: 10 puntos. Semana con la manzana en verde: 3. Criadero validado: 1.
// - Se rankea por puntos por manzana: un barrio grande no gana solo por tener más manzanas.
// - Empate: gana la zona que llegó primero a ese puntaje.
export const PUNTOS = { LIMPIEZA: 10, SEMANA_VERDE: 3, CRIADERO: 1 } as const;
export const LUGARES_PREMIADOS = 3;

// Argentina no tiene horario de verano: siempre UTC-3.
const DESFASE_ARGENTINA_MS = 3 * 60 * 60 * 1000;
const HORA_MS = 60 * 60 * 1000;
// Los reportes del último día tienen 72 horas para revisarse: recién ahí el resultado es definitivo.
const HORAS_HASTA_DEFINITIVA = 72;
const DIAS_VIGENCIA_PREMIO = 30;

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export type EstadoEdicion = 'en-curso' | 'provisoria' | 'definitiva';

export interface Edicion {
    mes: string;
    nombre: string;
    inicio: Date;
    fin: Date;
    definitivaDesde: Date;
    premiosVencen: Date;
    estado: EstadoEdicion;
}

// "AAAA-MM" del momento indicado, en hora de Argentina.
export const mesArgentino = (momento: Date) => new Date(momento.getTime() - DESFASE_ARGENTINA_MS).toISOString().slice(0, 7);

export const edicionDe = (mes: string, ahora = new Date()): Edicion => {
    const [anio, numeroMes] = mes.split('-').map(Number) as [number, number];
    // 00:00 del día 1 en Argentina = 03:00 UTC.
    const inicio = new Date(Date.UTC(anio, numeroMes - 1, 1) + DESFASE_ARGENTINA_MS);
    const fin = new Date(Date.UTC(anio, numeroMes, 1) + DESFASE_ARGENTINA_MS);
    const definitivaDesde = new Date(fin.getTime() + HORAS_HASTA_DEFINITIVA * HORA_MS);
    const premiosVencen = new Date(fin.getTime() + DIAS_VIGENCIA_PREMIO * 24 * HORA_MS);
    const estado: EstadoEdicion = ahora < fin ? 'en-curso' : ahora < definitivaDesde ? 'provisoria' : 'definitiva';
    return { mes, nombre: `Edición ${MESES[numeroMes - 1]} ${anio}`, inicio, fin, definitivaDesde, premiosVencen, estado };
};

// Cierres semanales (domingo 23:59:59.999 en Argentina) que ya pasaron dentro del mes.
export const cierresSemanales = (edicion: Edicion, ahora = new Date()): Date[] => {
    const cierres: Date[] = [];
    const limite = Math.min(edicion.fin.getTime(), ahora.getTime());
    const local = new Date(edicion.inicio.getTime() - DESFASE_ARGENTINA_MS);
    // Primer domingo del mes (getUTCDay sobre la fecha "local": 0 = domingo).
    local.setUTCDate(local.getUTCDate() + ((7 - local.getUTCDay()) % 7));
    for (let dia = local; ; dia = new Date(dia.getTime() + 7 * 24 * HORA_MS)) {
        const cierre = new Date(dia.getTime() + DESFASE_ARGENTINA_MS + 24 * HORA_MS - 1);
        if (cierre.getTime() > limite) break;
        cierres.push(cierre);
    }
    return cierres;
};

interface FilaZona {
    id: number;
    nombre: string;
    barrio: string;
    manzanas: number;
    limpiezas: number;
    criaderos: number;
    semanasVerdes: number;
    ultimoPunto: Date | null;
}

export interface ZonaRankeada {
    id: number;
    nombre: string;
    barrio: string;
    posicion: number;
    manzanas: number;
    limpiezas: number;
    criaderos: number;
    semanasVerdes: number;
    puntos: number;
    puntosPorManzana: number;
}

const ESTADOS_QUE_SUMAN = ['VALIDADO', 'RESUELTO'];

export const calcularRankingService = async (localidadId: number, mes: string, ahora = new Date()) => {
    const edicion = edicionDe(mes, ahora);
    const cierres = cierresSemanales(edicion, ahora).map((cierre) => cierre.toISOString());

    // El mes de un reporte es el de su envío; el momento en que sumó (desempate) es el de su validación.
    const filas = await prisma.$queryRaw<FilaZona[]>`
        WITH zonas AS (
            SELECT z."id", z."nombre", z."barrio", COUNT(m."id")::int AS "manzanas"
            FROM "zonaCompetencia" z
            JOIN "manzana" m ON m."zonaId" = z."id"
            WHERE z."localidadId" = ${localidadId}
            GROUP BY z."id"
        ),
        reportes AS (
            SELECT m."zonaId",
                   COUNT(*) FILTER (WHERE r."tipo" = 'LIMPIEZA')::int AS "limpiezas",
                   COUNT(*) FILTER (WHERE r."tipo" <> 'LIMPIEZA')::int AS "criaderos",
                   MAX(COALESCE(r."validadoEn", r."createdAt")) AS "ultimo"
            FROM "reporte" r
            JOIN "manzana" m ON m."id" = r."manzanaId"
            WHERE m."zonaId" IN (SELECT "id" FROM zonas)
              AND r."estado"::text = ANY(${ESTADOS_QUE_SUMAN})
              AND r."createdAt" >= ${edicion.inicio} AND r."createdAt" < ${edicion.fin}
            GROUP BY m."zonaId"
        ),
        cierres AS (SELECT unnest(${cierres}::timestamp[]) AS "cierre"),
        verdes AS (
            SELECT m."zonaId", COUNT(*)::int AS "semanas", MAX(c."cierre") AS "ultimo"
            FROM "manzana" m
            CROSS JOIN cierres c
            JOIN LATERAL (
                SELECT h."estadoNuevo" FROM "historialEstadoManzana" h
                WHERE h."manzanaId" = m."id" AND h."createdAt" <= c."cierre"
                ORDER BY h."createdAt" DESC, h."id" DESC
                LIMIT 1
            ) estado ON estado."estadoNuevo" = 'VERDE'
            WHERE m."zonaId" IN (SELECT "id" FROM zonas)
            GROUP BY m."zonaId"
        )
        SELECT z."id", z."nombre", z."barrio", z."manzanas",
               COALESCE(rp."limpiezas", 0) AS "limpiezas",
               COALESCE(rp."criaderos", 0) AS "criaderos",
               COALESCE(v."semanas", 0) AS "semanasVerdes",
               GREATEST(rp."ultimo", v."ultimo") AS "ultimoPunto"
        FROM zonas z
        LEFT JOIN reportes rp ON rp."zonaId" = z."id"
        LEFT JOIN verdes v ON v."zonaId" = z."id"
    `;

    const zonas = filas
        .map((fila) => {
            const puntos = fila.limpiezas * PUNTOS.LIMPIEZA + fila.criaderos * PUNTOS.CRIADERO + fila.semanasVerdes * PUNTOS.SEMANA_VERDE;
            return { ...fila, puntos, puntosPorManzana: Math.round((puntos / fila.manzanas) * 100) / 100 };
        })
        .sort((a, b) => b.puntosPorManzana - a.puntosPorManzana
            || (a.ultimoPunto?.getTime() ?? Infinity) - (b.ultimoPunto?.getTime() ?? Infinity)
            || a.nombre.localeCompare(b.nombre, 'es'))
        .map(({ ultimoPunto: _ultimo, ...zona }, indice): ZonaRankeada => ({ ...zona, posicion: indice + 1 }));

    return { edicion, zonas };
};

// Solo ganan zonas que sumaron algo: sin puntos no hay podio.
const ganadoras = (zonas: ZonaRankeada[]) => zonas.filter((zona) => zona.puntos > 0).slice(0, LUGARES_PREMIADOS);

const edicionPublica = ({ mes, nombre, estado, fin, definitivaDesde, premiosVencen }: Edicion) =>
    ({ mes, nombre, estado, cierraEn: fin, definitivaDesde, premiosVencen });

// ---------------------------------------------------------------------------
// Vista pública (PWA): el podio y la situación de una zona. Nunca los últimos puestos.
// ---------------------------------------------------------------------------

export const obtenerPodioService = async (localidadId: number, mes: string) => {
    const { edicion, zonas } = await calcularRankingService(localidadId, mes);
    return {
        edicion: edicionPublica(edicion),
        podio: ganadoras(zonas),
        totalZonas: zonas.length,
        puntos: PUNTOS,
    };
};

export const obtenerSituacionZonaService = async (zonaId: number, mes: string) => {
    const zona = await prisma.zonaCompetencia.findUnique({ where: { id: zonaId }, select: { localidadId: true } });
    if (!zona) throw new ErrorHttp(404, 'Recurso no encontrado');

    const { edicion, zonas } = await calcularRankingService(zona.localidadId, mes);
    const propia = zonas.find((item) => item.id === zonaId);
    if (!propia) throw new ErrorHttp(404, 'La zona todavía no tiene manzanas');

    const podio = ganadoras(zonas);
    const enPodio = podio.some((item) => item.id === zonaId);
    // Cuánto le falta para alcanzar al último del podio (si no hay podio completo, alcanza con sumar).
    const referencia = podio.length === LUGARES_PREMIADOS ? podio[LUGARES_PREMIADOS - 1]! : null;
    const faltanPorManzana = enPodio ? 0 : Math.max(0, (referencia?.puntosPorManzana ?? 0) - propia.puntosPorManzana);
    // En limpiezas validadas, que es lo que el vecino puede hacer: las necesarias para superar al último
    // del podio (en un empate gana quien llegó antes). Con el podio incompleto alcanza con una.
    const faltanLimpiezas = enPodio ? 0 : referencia
        ? Math.floor(Math.max(0, referencia.puntosPorManzana * propia.manzanas - propia.puntos) / PUNTOS.LIMPIEZA) + 1
        : 1;

    return {
        edicion: edicionPublica(edicion),
        zona: { ...propia, enPodio },
        totalZonas: zonas.length,
        faltanPuntosPorManzana: Math.round(faltanPorManzana * 100) / 100,
        faltanLimpiezas,
    };
};

// ---------------------------------------------------------------------------
// Premio: código anónimo para quien aportó reportes validados en una zona ganadora.
// ---------------------------------------------------------------------------

// Alfabeto sin caracteres que se confunden al leerlos en voz alta (0/O, 1/I/L).
const ALFABETO = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

const codigoDePremio = (mes: string, idCliente: string) => {
    const resumen = createHmac('sha256', entorno.JWT_SECRET_SESIONES).update(`copa|${mes}|${idCliente}`).digest();
    const caracteres = Array.from(resumen.subarray(0, 8), (byte) => ALFABETO[byte % ALFABETO.length]).join('');
    return `RC-${caracteres.slice(0, 4)}-${caracteres.slice(4)}`;
};

export const pedirPremioService = async (mes: string, idsCliente: string[], ahora = new Date()) => {
    const edicion = edicionDe(mes, ahora);
    if (edicion.estado !== 'definitiva') throw new ErrorHttp(409, 'La edición todavía no cerró: los premios se entregan cuando el resultado es definitivo');
    if (ahora >= edicion.premiosVencen) throw new ErrorHttp(410, 'Los premios de esta edición ya vencieron');

    const reportes = await prisma.reporte.findMany({
        where: {
            idCliente: { in: idsCliente },
            estado: { in: ['VALIDADO', 'RESUELTO'] },
            createdAt: { gte: edicion.inicio, lt: edicion.fin },
            manzana: { zonaId: { not: null } },
        },
        select: { id: true, idCliente: true, premioReclamadoEn: true, manzana: { select: { localidadId: true, zonaId: true } } },
    });
    if (reportes.length === 0) return null;

    const ganadorasPorLocalidad = new Map<number, Set<number>>();
    for (const localidadId of new Set(reportes.map((reporte) => reporte.manzana.localidadId))) {
        const { zonas } = await calcularRankingService(localidadId, mes, ahora);
        ganadorasPorLocalidad.set(localidadId, new Set(ganadoras(zonas).map((zona) => zona.id)));
    }
    const elegibles = reportes
        .filter((reporte) => ganadorasPorLocalidad.get(reporte.manzana.localidadId)?.has(reporte.manzana.zonaId!))
        .sort((a, b) => a.idCliente.localeCompare(b.idCliente));
    if (elegibles.length === 0) return null;

    // Un premio por celular: el código sale siempre del mismo reporte base, así pedirlo de nuevo
    // (por ejemplo, si se borró el QR) devuelve el mismo código y no uno nuevo.
    const base = elegibles[0]!;
    const codigo = codigoDePremio(mes, base.idCliente);
    const sinReclamar = elegibles.filter((reporte) => !reporte.premioReclamadoEn);

    let canje = await prisma.canjePremio.findUnique({ where: { codigo }, include: { zona: { select: { nombre: true, barrio: true } } } });
    if (!canje) {
        if (sinReclamar.length === 0) throw new ErrorHttp(409, 'Ya se generó un premio con estos reportes');
        canje = await prisma.canjePremio.create({
            data: {
                codigo,
                edicion: mes,
                localidadId: base.manzana.localidadId,
                zonaId: base.manzana.zonaId!,
                venceEn: edicion.premiosVencen,
            },
            include: { zona: { select: { nombre: true, barrio: true } } },
        });
    }
    // Se marca cada reporte por separado (sin unirlos entre sí): ninguno sirve para otro premio.
    if (sinReclamar.length > 0) {
        await prisma.reporte.updateMany({ where: { id: { in: sinReclamar.map(({ id }) => id) } }, data: { premioReclamadoEn: ahora } });
    }

    return { codigo: canje.codigo, zona: canje.zona, edicion: edicionPublica(edicion), venceEn: canje.venceEn, canjeadoEn: canje.canjeadoEn };
};

// ---------------------------------------------------------------------------
// Panel institucional
// ---------------------------------------------------------------------------

export const obtenerRankingInstitucionalService = async (usuario: UsuarioAutenticado, localidadSolicitada: number | undefined, mes: string) => {
    const localidadId = alcanceLocalidad(usuario, localidadSolicitada);
    if (localidadId === null) throw new ErrorHttp(400, 'Indicá la localidad: la Copa se juega dentro de cada localidad');
    const { edicion, zonas } = await calcularRankingService(localidadId, mes);
    const premiados = new Set(ganadoras(zonas).map((zona) => zona.id));
    const canjes = await prisma.canjePremio.groupBy({
        by: ['zonaId'],
        where: { edicion: mes, localidadId },
        _count: { _all: true, canjeadoEn: true },
    });
    const porZona = new Map(canjes.map((fila) => [fila.zonaId, { emitidos: fila._count._all, canjeados: fila._count.canjeadoEn }]));
    return {
        edicion: edicionPublica(edicion),
        localidadId,
        zonas: zonas.map((zona) => ({ ...zona, premiada: premiados.has(zona.id), premios: porZona.get(zona.id) ?? { emitidos: 0, canjeados: 0 } })),
        puntos: PUNTOS,
    };
};

// Acepta el código tal como lo lee la cámara ("REDCUIDAR:RC-XXXX-XXXX") o tipeado a mano.
export const normalizarCodigo = (texto: string) => {
    const limpio = texto.toUpperCase().replace(/^REDCUIDAR:/, '').replace(/[^A-Z0-9]/g, '');
    const cuerpo = limpio.startsWith('RC') ? limpio.slice(2) : limpio;
    return cuerpo.length === 8 ? `RC-${cuerpo.slice(0, 4)}-${cuerpo.slice(4)}` : null;
};

export const canjearPremioService = async (usuario: UsuarioAutenticado, texto: string, ahora = new Date()) => {
    const codigo = normalizarCodigo(texto);
    if (!codigo) throw new ErrorHttp(400, 'El código no tiene el formato de un premio (RC-XXXX-XXXX)');

    const canje = await prisma.canjePremio.findUnique({
        where: { codigo },
        include: { zona: { select: { nombre: true, barrio: true } }, localidad: { select: { nombre: true } } },
    });
    if (!canje) throw new ErrorHttp(404, 'El código no corresponde a ningún premio');
    verificarAlcance(usuario, canje.localidadId);

    const detalle = { codigo, edicion: canje.edicion, zona: canje.zona, localidad: canje.localidad.nombre };
    if (canje.canjeadoEn) throw new ErrorHttp(409, `Este premio ya se entregó el ${canje.canjeadoEn.toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`);
    if (ahora >= canje.venceEn) throw new ErrorHttp(410, 'Este premio ya venció');

    // La condición sobre canjeadoEn evita entregar dos veces el mismo premio desde dos puestos a la vez.
    const { count } = await prisma.canjePremio.updateMany({
        where: { id: canje.id, canjeadoEn: null },
        data: { canjeadoEn: ahora, canjeadoPorId: usuario.id },
    });
    if (count === 0) throw new ErrorHttp(409, 'Este premio ya se entregó');

    return { ...detalle, canjeadoEn: ahora };
};
