import type { EstadoManzana, EstadoRuta, Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import type { UsuarioAutenticado } from '../middlewares/autenticacion.middleware.js';
import { alcanceLocalidad, verificarAlcance } from '../utils/alcance.js';
import { ErrorHttp } from '../utils/errorHttp.js';
import { ordenarPorVecinoMasCercano, type Coordenada } from '../utils/geo.js';
import { armarPagina, decodificarCursorEntero } from '../utils/paginacion.js';

export const PARADAS_POR_DEFECTO = 20;
export const PARADAS_MAXIMAS = 60;

interface ManzanaCandidata extends Coordenada {
    id: number;
    codigo: string;
    estado: EstadoManzana;
}

export interface DatosNuevaRuta {
    fecha: string;
    localidadId?: number;
    brigadistaId?: number;
    maxParadas?: number;
    inicio?: Coordenada;
}

const esBrigadista = (usuario: UsuarioAutenticado) => usuario.rol === 'BRIGADISTA';

const validarBrigadista = async (brigadistaId: number, localidadId: number): Promise<void> => {
    const brigadista = await prisma.usuario.findFirst({
        where: { id: brigadistaId, rol: 'BRIGADISTA', activo: true, eliminadoEn: null },
        select: { localidadId: true },
    });
    if (!brigadista || brigadista.localidadId !== localidadId) {
        throw new ErrorHttp(422, 'El brigadista indicado no existe, está inactivo o pertenece a otra localidad');
    }
};

// Arma la ruta del día con las manzanas en ROJO primero y luego las AMARILLAS más recientes,
// excluyendo las que ya están en otra ruta activa de la misma fecha, y ordena las paradas
// por vecino más cercano desde el punto de partida.
export const generarRutaService = async (usuario: UsuarioAutenticado, datos: DatosNuevaRuta) => {
    const localidadId = alcanceLocalidad(usuario, datos.localidadId);
    if (localidadId === null) throw new ErrorHttp(422, 'Debe indicar la localidad de la ruta');

    if (datos.brigadistaId !== undefined) await validarBrigadista(datos.brigadistaId, localidadId);

    const maxParadas = datos.maxParadas ?? PARADAS_POR_DEFECTO;

    // Un bloqueo por (localidad, fecha) evita que dos coordinadores que generan rutas a la vez
    // se asignen las mismas manzanas: la selección y la creación ocurren dentro del mismo bloqueo.
    const { ruta, distanciaTotalM } = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`ruta:${localidadId}:${datos.fecha}`}))`;

        const candidatas = await tx.$queryRaw<ManzanaCandidata[]>`
            SELECT m."id", m."codigo", m."estado",
                   ST_Y(m."centroide") AS "latitud", ST_X(m."centroide") AS "longitud"
            FROM "manzana" m
            WHERE m."localidadId" = ${localidadId}
              AND m."estado" IN ('ROJO', 'AMARILLO')
              AND NOT EXISTS (
                  SELECT 1 FROM "paradaRuta" p
                  JOIN "rutaBrigada" r ON r."id" = p."rutaId"
                  WHERE p."manzanaId" = m."id"
                    AND r."fecha" = ${datos.fecha}::date
                    AND r."estado" IN ('PLANIFICADA', 'EN_CURSO')
              )
            ORDER BY (m."estado" = 'ROJO') DESC, m."ultimoReporteEn" DESC NULLS LAST, m."id"
            LIMIT ${maxParadas}
        `;

        if (candidatas.length === 0) {
            throw new ErrorHttp(422, 'No hay manzanas en rojo o amarillo pendientes de visita para esa fecha');
        }

        const { orden, distanciaTotalM: distancia } = ordenarPorVecinoMasCercano(candidatas, datos.inicio);

        const nueva = await tx.rutaBrigada.create({
            data: {
                localidadId,
                coordinadorId: usuario.id,
                brigadistaId: datos.brigadistaId ?? null,
                fecha: new Date(`${datos.fecha}T00:00:00Z`),
            },
            select: { id: true },
        });

        await tx.paradaRuta.createMany({
            data: orden.map((manzana, indice) => ({ rutaId: nueva.id, manzanaId: manzana.id, orden: indice + 1 })),
        });

        return { ruta: nueva, distanciaTotalM: distancia };
    });

    const detalle = await obtenerRutaService(usuario, ruta.id);
    return { ...detalle, distanciaTotalEstimadaM: distanciaTotalM };
};

export interface FiltrosRutas {
    fecha?: string;
    estado?: EstadoRuta;
    localidadId?: number;
    limite: number;
    cursor?: string;
}

export const listarRutasService = async (usuario: UsuarioAutenticado, filtros: FiltrosRutas) => {
    const localidadId = alcanceLocalidad(usuario, filtros.localidadId);

    const where: Prisma.rutaBrigadaWhereInput = {
        ...(localidadId === null ? {} : { localidadId }),
        // Un brigadista solo ve las rutas que tiene asignadas.
        ...(esBrigadista(usuario) ? { brigadistaId: usuario.id } : {}),
        ...(filtros.fecha ? { fecha: new Date(`${filtros.fecha}T00:00:00Z`) } : {}),
        ...(filtros.estado ? { estado: filtros.estado } : {}),
    };

    const rutas = await prisma.rutaBrigada.findMany({
        where,
        select: {
            id: true,
            fecha: true,
            estado: true,
            localidadId: true,
            coordinador: { select: { id: true, nombre: true, apellido: true } },
            brigadista: { select: { id: true, nombre: true, apellido: true } },
            _count: { select: { paradas: true } },
        },
        orderBy: { id: 'desc' },
        take: filtros.limite + 1,
        ...(filtros.cursor ? { cursor: { id: decodificarCursorEntero(filtros.cursor) }, skip: 1 } : {}),
    });

    const pagina = armarPagina(rutas, filtros.limite);

    // El avance de todas las rutas de la página se obtiene en una sola consulta agrupada.
    const visitadas = await prisma.paradaRuta.groupBy({
        by: ['rutaId'],
        where: { rutaId: { in: pagina.datos.map((ruta) => ruta.id) }, visitadaEn: { not: null } },
        _count: { _all: true },
    });
    const visitadasPorRuta = new Map(visitadas.map((fila) => [fila.rutaId, fila._count._all]));

    return {
        datos: pagina.datos.map(({ _count, ...ruta }) => ({
            ...ruta,
            paradasTotales: _count.paradas,
            paradasVisitadas: visitadasPorRuta.get(ruta.id) ?? 0,
        })),
        paginacion: pagina.paginacion,
    };
};

// Carga la ruta y verifica alcance territorial y, para brigadistas, la asignación.
const cargarRutaAutorizada = async (usuario: UsuarioAutenticado, id: number) => {
    const ruta = await prisma.rutaBrigada.findUnique({
        where: { id },
        select: { id: true, estado: true, localidadId: true, brigadistaId: true },
    });

    if (!ruta) throw new ErrorHttp(404, 'Recurso no encontrado');
    verificarAlcance(usuario, ruta.localidadId);
    if (esBrigadista(usuario) && ruta.brigadistaId !== usuario.id) throw new ErrorHttp(404, 'Recurso no encontrado');

    return ruta;
};

export const obtenerRutaService = async (usuario: UsuarioAutenticado, id: number) => {
    await cargarRutaAutorizada(usuario, id);

    const ruta = await prisma.rutaBrigada.findUniqueOrThrow({
        where: { id },
        select: {
            id: true,
            fecha: true,
            estado: true,
            localidadId: true,
            createdAt: true,
            coordinador: { select: { id: true, nombre: true, apellido: true } },
            brigadista: { select: { id: true, nombre: true, apellido: true } },
            paradas: {
                select: {
                    id: true,
                    orden: true,
                    visitadaEn: true,
                    manzana: { select: { id: true, codigo: true, estado: true } },
                },
                orderBy: { orden: 'asc' },
            },
        },
    });

    // Coordenadas de todas las paradas en una sola consulta.
    const ids = ruta.paradas.map((parada) => parada.manzana.id);
    const coordenadas = ids.length === 0 ? [] : await prisma.$queryRaw<({ id: number } & Coordenada)[]>`
        SELECT "id", ST_Y("centroide") AS "latitud", ST_X("centroide") AS "longitud"
        FROM "manzana" WHERE "id" = ANY(${ids})
    `;
    const porId = new Map(coordenadas.map(({ id: manzanaId, ...coordenada }) => [manzanaId, coordenada]));

    return {
        ...ruta,
        paradas: ruta.paradas.map((parada) => ({ ...parada, ubicacion: porId.get(parada.manzana.id) ?? null })),
    };
};

const TRANSICIONES_RUTA: Record<EstadoRuta, EstadoRuta[]> = {
    PLANIFICADA: ['EN_CURSO', 'CANCELADA'],
    EN_CURSO: ['FINALIZADA', 'CANCELADA'],
    FINALIZADA: [],
    CANCELADA: [],
};

export const esTransicionRutaValida = (actual: EstadoRuta, nuevo: EstadoRuta, esBrigadistaAsignado: boolean): boolean =>
    TRANSICIONES_RUTA[actual].includes(nuevo) && !(esBrigadistaAsignado && nuevo === 'CANCELADA');

export const cambiarEstadoRutaService = async (usuario: UsuarioAutenticado, id: number, nuevo: EstadoRuta) => {
    const ruta = await cargarRutaAutorizada(usuario, id);

    if (!esTransicionRutaValida(ruta.estado, nuevo, esBrigadista(usuario))) {
        throw new ErrorHttp(409, `No se puede pasar una ruta de ${ruta.estado} a ${nuevo}`);
    }

    const { count } = await prisma.rutaBrigada.updateMany({ where: { id, estado: ruta.estado }, data: { estado: nuevo } });
    if (count === 0) throw new ErrorHttp(409, 'La ruta fue modificada por otro usuario; recargue e intente nuevamente');

    return { id, estado: nuevo };
};

export const marcarParadaVisitadaService = async (usuario: UsuarioAutenticado, rutaId: number, paradaId: number) => {
    const ruta = await cargarRutaAutorizada(usuario, rutaId);
    if (ruta.estado !== 'EN_CURSO') throw new ErrorHttp(409, 'Solo se pueden marcar paradas de una ruta en curso');

    const parada = await prisma.paradaRuta.findFirst({ where: { id: paradaId, rutaId }, select: { id: true, visitadaEn: true } });
    if (!parada) throw new ErrorHttp(404, 'Recurso no encontrado');

    // Idempotente: una segunda marca conserva la hora de la primera visita.
    if (parada.visitadaEn) return { id: parada.id, visitadaEn: parada.visitadaEn };

    return prisma.paradaRuta.update({
        where: { id: paradaId },
        data: { visitadaEn: new Date() },
        select: { id: true, visitadaEn: true },
    });
};
