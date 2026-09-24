import { describe, expect, it } from 'vitest';
import { PERMISOS, tienePermiso } from '../config/permisos.js';
import { esTransicionRutaValida } from '../services/ruta.services.js';
import { distanciaMetros, ordenarPorVecinoMasCercano } from '../utils/geo.js';

describe('distanciaMetros', () => {
    it('mide ~111 km por grado de latitud', () => {
        const distancia = distanciaMetros({ latitud: -26, longitud: -58 }, { latitud: -25, longitud: -58 });
        expect(distancia).toBeGreaterThan(110_000);
        expect(distancia).toBeLessThan(112_000);
    });
});

describe('ordenarPorVecinoMasCercano', () => {
    const puntos = [
        { id: 'lejos', latitud: -26.10, longitud: -58.10 },
        { id: 'cerca', latitud: -26.19, longitud: -58.19 },
        { id: 'medio', latitud: -26.15, longitud: -58.15 },
    ];

    it('recorre desde el inicio hacia la parada más próxima en cada paso', () => {
        const { orden } = ordenarPorVecinoMasCercano(puntos, { latitud: -26.20, longitud: -58.20 });
        expect(orden.map((punto) => punto.id)).toEqual(['cerca', 'medio', 'lejos']);
    });

    it('sin inicio arranca por la primera parada (la de mayor prioridad)', () => {
        const { orden } = ordenarPorVecinoMasCercano(puntos);
        expect(orden[0]?.id).toBe('lejos');
    });

    it('no pierde ni repite paradas y suma la distancia recorrida', () => {
        const { orden, distanciaTotalM } = ordenarPorVecinoMasCercano(puntos);
        expect(new Set(orden.map((punto) => punto.id)).size).toBe(puntos.length);
        expect(distanciaTotalM).toBeGreaterThan(0);
    });

    it('acepta una lista vacía', () => {
        expect(ordenarPorVecinoMasCercano([])).toEqual({ orden: [], distanciaTotalM: 0 });
    });
});

describe('ciclo de vida de la ruta', () => {
    it('sigue PLANIFICADA -> EN_CURSO -> FINALIZADA', () => {
        expect(esTransicionRutaValida('PLANIFICADA', 'EN_CURSO', true)).toBe(true);
        expect(esTransicionRutaValida('EN_CURSO', 'FINALIZADA', true)).toBe(true);
        expect(esTransicionRutaValida('FINALIZADA', 'EN_CURSO', false)).toBe(false);
    });

    it('solo el coordinador puede cancelar', () => {
        expect(esTransicionRutaValida('PLANIFICADA', 'CANCELADA', false)).toBe(true);
        expect(esTransicionRutaValida('PLANIFICADA', 'CANCELADA', true)).toBe(false);
    });

    it('el brigadista ejecuta rutas pero no las arma', () => {
        expect(tienePermiso('BRIGADISTA', PERMISOS.RUTAS_EJECUTAR)).toBe(true);
        expect(tienePermiso('BRIGADISTA', PERMISOS.RUTAS_GESTIONAR)).toBe(false);
        expect(tienePermiso('AUDITOR', PERMISOS.RUTAS_EJECUTAR)).toBe(false);
    });
});
