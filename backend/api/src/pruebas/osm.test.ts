import { describe, expect, it } from 'vitest';
import { armarZonas, nombreDeBarrio, nombresDePartes } from '../utils/osm.js';

// Grilla de manzanas de 100 m con el barrio indicado.
const grilla = (columnas: number, filas: number, barrio: string | null, desdeX = 0, primerId = 1) =>
    Array.from({ length: columnas * filas }, (_, i) => ({ id: primerId + i, x: desdeX + (i % columnas) * 100, y: Math.floor(i / columnas) * 100, barrio }));

describe('zonas de la Copa desde OSM', () => {
    it('quita el prefijo "Barrio" del nombre', () => {
        expect(nombreDeBarrio('Barrio San Martín')).toBe('San Martín');
        expect(nombreDeBarrio('Bº Obrero')).toBe('Obrero');
        expect(nombreDeBarrio('Centro')).toBe('Centro');
    });

    it('un barrio de tamaño normal es una sola zona', () => {
        const zonas = armarZonas(grilla(5, 6, 'San Martín'));
        expect(zonas).toEqual([{ barrio: 'San Martín', nombre: 'San Martín', ids: expect.any(Array) }]);
        expect(zonas[0]!.ids).toHaveLength(30);
    });

    it('un barrio grande se parte en zonas y ninguna manzana queda afuera', () => {
        const manzanas = grilla(20, 10, 'Nueva Formosa');
        const zonas = armarZonas(manzanas);
        expect(zonas.length).toBe(3);
        expect(zonas.map((z) => z.nombre)).toEqual(expect.arrayContaining(['Nueva Formosa - Zona Oeste', 'Nueva Formosa - Zona Centro', 'Nueva Formosa - Zona Este']));
        expect(zonas.flatMap((z) => z.ids).sort((a, b) => a - b)).toEqual(manzanas.map((m) => m.id));
        expect(zonas.every((z) => z.barrio === 'Nueva Formosa')).toBe(true);
    });

    it('un barrio chico se suma al más cercano y las manzanas sin barrio van al barrio vecino', () => {
        const zonas = armarZonas([...grilla(5, 5, 'Centro'), ...grilla(2, 2, 'Chiquito', 500, 100), ...grilla(2, 2, null, 700, 200)]);
        expect(zonas).toHaveLength(1);
        expect(zonas[0]!.nombre).toBe('Centro');
        expect(zonas[0]!.ids).toHaveLength(33);
    });

    it('sin barrios en OSM arma sectores parejos', () => {
        const zonas = armarZonas(grilla(20, 8, null));
        expect(zonas.length).toBe(2);
        expect(zonas.every((z) => z.nombre.startsWith('Sector - Zona'))).toBe(true);
    });

    it('nombra las partes por punto cardinal según el eje más largo', () => {
        expect(nombresDePartes('X', [{ x: 0, y: 0 }, { x: 0, y: 900 }])).toEqual(['X - Zona Sur', 'X - Zona Norte']);
        expect(nombresDePartes('X', [{ x: 900, y: 0 }, { x: 0, y: 0 }])).toEqual(['X - Zona Este', 'X - Zona Oeste']);
    });
});
