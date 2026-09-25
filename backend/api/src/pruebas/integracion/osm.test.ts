import { beforeEach, describe, expect, it } from 'vitest';
import { cargarDesdeOsm, type RespuestaOverpass } from '../../utils/osm.js';
import { crearTerritorio, enManzana, limpiarBase, prisma, type Territorio } from './ayudantes.js';

let territorio: Territorio;

beforeEach(async () => {
    await limpiarBase();
    territorio = await crearTerritorio();
});

// Calles cada ~100 m (8 x 6 manzanas), una laguna que tapa dos manzanas y dos barrios.
const datosOsm = (): RespuestaOverpass => {
    const elementos: RespuestaOverpass['elements'] = [];
    let id = 1;
    const origen = { lat: -26.19, lon: -58.18 };
    const paso = 0.001;
    const calle = (desde: [number, number], hasta: [number, number]) =>
        elementos.push({ type: 'way', id: id++, tags: { highway: 'residential' }, geometry: [desde, hasta].map(([x, y]) => ({ lat: origen.lat + y * paso, lon: origen.lon + x * paso })) });
    for (let x = 0; x <= 8; x++) calle([x, 0], [x, 6]);
    for (let y = 0; y <= 6; y++) calle([0, y], [8, y]);
    const laguna = [[6.1, 4.1], [7.9, 4.1], [7.9, 4.9], [6.1, 4.9], [6.1, 4.1]] as const;
    elementos.push({ type: 'way', id: id++, tags: { natural: 'water' }, geometry: laguna.map(([x, y]) => ({ lat: origen.lat + y * paso, lon: origen.lon + x * paso })) });
    elementos.push({ type: 'node', id: id++, tags: { place: 'neighbourhood', name: 'Barrio San Martín' }, lat: origen.lat + 3 * paso, lon: origen.lon + 1.5 * paso });
    elementos.push({ type: 'node', id: id++, tags: { place: 'neighbourhood', name: 'Centro' }, lat: origen.lat + 3 * paso, lon: origen.lon + 6.5 * paso });
    return { elements: elementos };
};

describe('importar manzanas desde OpenStreetMap', () => {
    it('sin --reemplazar no pisa las manzanas que ya existen', async () => {
        await expect(cargarDesdeOsm(prisma, territorio.localidades.capital, datosOsm(), { reemplazar: false })).rejects.toThrow(/--reemplazar/);
        expect(await prisma.manzana.count({ where: { localidadId: territorio.localidades.capital } })).toBe(9);
    });

    it('arma las manzanas cerradas por calles, sin la laguna, y las reparte en barrios', async () => {
        await prisma.reporte.create({ data: { idCliente: crypto.randomUUID(), tipo: 'CRIADERO', capturadoEn: new Date(), ...enManzana('capital-00') } });

        const resultado = await cargarDesdeOsm(prisma, territorio.localidades.capital, datosOsm(), { reemplazar: true });

        expect(resultado.manzanas).toBe(46);
        expect(resultado.barrios).toBe(2);
        const zonas = await prisma.zonaCompetencia.findMany({ where: { localidadId: territorio.localidades.capital }, include: { _count: { select: { manzanas: true } } } });
        expect(zonas.map((z) => z.nombre).sort()).toEqual(['Centro', 'San Martín']);
        expect(zonas.reduce((total, z) => total + z._count.manzanas, 0)).toBe(46);
        // Lo que colgaba de la grilla vieja se borra; la otra localidad no se toca.
        expect(await prisma.reporte.count()).toBe(0);
        expect(await prisma.manzana.count({ where: { localidadId: territorio.localidades.clorinda } })).toBe(9);

        // Cada centro de manzana cae dentro de la forma de su zona (lo usa importar-zonas para reasignar).
        const [{ fuera }] = await prisma.$queryRaw<{ fuera: number }[]>`
            SELECT count(*)::int AS fuera FROM "manzana" m JOIN "zonaCompetencia" z ON z."id" = m."zonaId"
            WHERE NOT ST_Contains(z."geom", m."centroide")` as [{ fuera: number }];
        expect(fuera).toBe(0);
    });
});
