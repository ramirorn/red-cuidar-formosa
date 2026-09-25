import { describe, expect, it } from 'vitest';
import { deteccionesEnRecorte, recorteSugerido } from '@/lib/recorte';
import { manzanaQueContiene, manzanasEnArea } from '@/sinConexion/manzanasLocales';
import type { ColeccionManzanas, Deteccion } from '@/tipos';

const deteccion = (x: number, y: number, ancho: number, alto: number): Deteccion => ({
    clase: 'BALDE', confianza: 0.8, cajaDelimitadora: { x, y, ancho, alto },
});

describe('recorte de fotos', () => {
    it('sin detecciones no hay recorte sugerido: el vecino tiene que marcarlo', () => {
        expect(recorteSugerido([])).toBeNull();
    });

    it('sugiere el rectángulo que abarca las detecciones con un margen, sin salirse de la foto', () => {
        const recorte = recorteSugerido([deteccion(0.4, 0.4, 0.2, 0.2), deteccion(0.9, 0.9, 0.1, 0.1)])!;

        expect(recorte.x).toBeLessThan(0.4);
        expect(recorte.y).toBeLessThan(0.4);
        expect(recorte.x + recorte.ancho).toBeCloseTo(1);
        expect(recorte.y + recorte.alto).toBeCloseTo(1);
    });

    it('pasa las detecciones a coordenadas del recorte y descarta las que quedan afuera', () => {
        const dentro = deteccion(0.5, 0.5, 0.2, 0.2);
        const afuera = deteccion(0.0, 0.0, 0.1, 0.1);

        const resultado = deteccionesEnRecorte([dentro, afuera], { x: 0.4, y: 0.4, ancho: 0.4, alto: 0.4 });

        expect(resultado).toHaveLength(1);
        expect(resultado[0]!.cajaDelimitadora.x).toBeCloseTo(0.25);
        expect(resultado[0]!.cajaDelimitadora.ancho).toBeCloseTo(0.5);
    });
});

const cuadrado = (id: number, x: number, y: number): ColeccionManzanas['features'][number] => ({
    type: 'Feature',
    id,
    geometry: { type: 'Polygon', coordinates: [[[x, y], [x + 0.001, y], [x + 0.001, y + 0.001], [x, y + 0.001], [x, y]]] },
    properties: { codigo: `M-${id}`, estado: 'SIN_DATOS', localidadId: 1 },
});

describe('manzana calculada en el celular', () => {
    const coleccion: ColeccionManzanas = { type: 'FeatureCollection', features: [cuadrado(1, -58.18, -26.19), cuadrado(2, -58.178, -26.19)] };

    it('encuentra la manzana que contiene el punto', () => {
        expect(manzanaQueContiene(coleccion, -26.1895, -58.1775)?.id).toBe(2);
    });

    it('un punto entre manzanas (la calle) no está en ninguna', () => {
        expect(manzanaQueContiene(coleccion, -26.1895, -58.1785)).toBeNull();
    });

    it('filtra solo las manzanas del área visible', () => {
        const visibles = manzanasEnArea(coleccion, { longitudMinima: -58.1782, longitudMaxima: -58.17, latitudMinima: -26.2, latitudMaxima: -26.18 });
        expect(visibles.map((manzana) => manzana.id)).toEqual([2]);
    });
});
