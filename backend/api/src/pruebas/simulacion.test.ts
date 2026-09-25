import { describe, expect, it } from 'vitest';
import { calcularEstadoManzana } from '../services/manzana.services.js';
import { crearAzar, elegirColorFinal, simularHistoria } from '../utils/simulacion.js';

const AHORA = new Date('2026-09-25T15:00:00Z');

describe('simulación de manzanas', () => {
    it('el color final coincide siempre con la regla real (así el recalculo diario no lo cambia)', () => {
        const conteo = { VERDE: 0, AMARILLO: 0, ROJO: 0 };
        for (let id = 1; id <= 500; id++) {
            const azar = crearAzar(id);
            const cuidado = azar.entre(0.25, 0.9);
            const colorFinal = elegirColorFinal(azar, cuidado);
            const historia = simularHistoria(azar, { ahora: AHORA, cuidado, colorFinal, limpiezaSeguraDesde: new Date(0), conPendiente: colorFinal === 'AMARILLO' && id % 10 === 0 });
            const { reportes, intervenciones } = historia;

            const esperado = calcularEstadoManzana({
                tieneCriaderoActivo: reportes.some((r) => r.tipo !== 'LIMPIEZA' && r.estado === 'VALIDADO'),
                tienePendientes: reportes.some((r) => r.estado === 'PENDIENTE'),
                tieneActividad: reportes.length + intervenciones.length > 0,
                ultimaLimpiezaEn: historia.ultimaLimpiezaEn,
                lluviaPosteriorMm: 0,
            }, AHORA);
            expect(historia.estadoFinal).toBe(esperado);
            expect(historia.estadoFinal).toBe(colorFinal);
            // Los pendientes tienen menos de 72 h (si no, la tarea de privacidad los descarta).
            for (const r of reportes.filter((r) => r.estado === 'PENDIENTE')) expect(AHORA.getTime() - r.capturadoEn.getTime()).toBeLessThan(72 * 3600_000);
            // El historial termina en el color final y cada cambio sigue al anterior.
            historia.cambios.forEach((cambio, i) => expect(cambio.anterior).toBe(i === 0 ? 'SIN_DATOS' : historia.cambios[i - 1]!.nuevo));
            expect(historia.cambios.at(-1)?.nuevo).toBe(colorFinal);
            conteo[colorFinal]++;
        }
        // Reparto realista: más verde que amarillo, y el rojo es minoría.
        expect(conteo.VERDE).toBeGreaterThan(conteo.AMARILLO);
        expect(conteo.ROJO).toBeLessThan(conteo.AMARILLO);
    });

    it('la misma semilla da los mismos datos', () => {
        const a = crearAzar(42); const b = crearAzar(42);
        expect([a.numero(), a.numero()]).toEqual([b.numero(), b.numero()]);
    });
});
