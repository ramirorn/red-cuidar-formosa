import { describe, expect, it } from 'vitest';
import { desafiosPersonales } from '@/progreso/desafios';
import { insigniasCumplidas } from '@/progreso/insignias';
import { calcularRacha } from '@/progreso/racha';
import { diasParaCerrar, semanaAnterior, semanaDe } from '@/progreso/semanas';
import type { Actividad } from '@/sinConexion/bd';

// Viernes 25 de septiembre de 2026, mediodía en Argentina: semana del lunes 21.
const HOY = new Date('2026-09-25T15:00:00Z');
const semanas = (...lunes: string[]) => new Set(lunes);

describe('semanas argentinas', () => {
    it('van de lunes a domingo en hora de Argentina', () => {
        expect(semanaDe(HOY)).toBe('2026-09-21');
        // Domingo 27 a las 23:30 en Argentina (lunes 02:30 UTC): sigue siendo la misma semana.
        expect(semanaDe(new Date('2026-09-28T02:30:00Z'))).toBe('2026-09-21');
        expect(semanaDe(new Date('2026-09-28T03:00:00Z'))).toBe('2026-09-28');
        expect(semanaAnterior('2026-09-21')).toBe('2026-09-14');
        expect(diasParaCerrar(HOY)).toBe(2);
    });
});

describe('racha', () => {
    it('cuenta semanas seguidas; la semana en curso no la corta', () => {
        expect(calcularRacha(semanas('2026-09-21', '2026-09-14', '2026-09-07'), HOY)).toMatchObject({ semanas: 3, estaSemanaHecha: true });
        expect(calcularRacha(semanas('2026-09-14', '2026-09-07'), HOY)).toMatchObject({ semanas: 2, estaSemanaHecha: false, comodinDisponible: true });
    });

    it('una semana salteada por mes no corta la racha', () => {
        const racha = calcularRacha(semanas('2026-09-21', '2026-09-07', '2026-08-31'), HOY);
        expect(racha.semanas).toBe(3);
        expect(racha.comodinesUsados).toEqual(['2026-09-14']);
    });

    it('dos salteadas en el mismo mes, o dos seguidas, la cortan', () => {
        // Saltea el 21/9 y el 7/9 (dos del mismo mes, no seguidas): el segundo corta.
        expect(calcularRacha(semanas('2026-09-28', '2026-09-14', '2026-08-31'), new Date('2026-10-01T15:00:00Z')).semanas).toBe(2);
        // Una en septiembre y otra en agosto, no seguidas: no corta.
        expect(calcularRacha(semanas('2026-09-21', '2026-09-07', '2026-08-24'), HOY).semanas).toBe(3);
        // 14/9 y 7/9 seguidas (y del mismo mes): solo cuenta la actual.
        expect(calcularRacha(semanas('2026-09-21', '2026-08-31'), HOY).semanas).toBe(1);
        // 31/8 (agosto) y 7/9 (septiembre) seguidas, de meses distintos: igual se corta.
        expect(calcularRacha(semanas('2026-09-14', '2026-08-24'), HOY).semanas).toBe(1);
    });

    it('si ya usó el comodín del mes, avisa que esta semana no la salva', () => {
        expect(calcularRacha(semanas('2026-09-14', '2026-08-31'), HOY)).toMatchObject({ semanas: 2, comodinDisponible: false });
    });

    it('sin actividad no hay racha ni comodín', () => {
        expect(calcularRacha(semanas(), HOY)).toMatchObject({ semanas: 0, comodinDisponible: false });
    });
});

const actividad = (...items: [Actividad['tipo'], string][]): Actividad[] => items.map(([tipo, fecha]) => ({ tipo, fecha }));

describe('desafíos personales', () => {
    it('revisar el patio 2 veces siempre, y uno que rota por semana', () => {
        const desafios = desafiosPersonales(actividad(['REVISION', '2026-09-22T12:00:00Z'], ['REVISION', '2026-09-15T12:00:00Z']), HOY);
        expect(desafios[0]).toMatchObject({ clave: 'REVISIONES', meta: 2, progreso: 1, cumplido: false });
        expect(desafios).toHaveLength(2);
        const siguiente = desafiosPersonales([], new Date('2026-10-02T15:00:00Z'));
        expect(siguiente[1]!.clave).not.toBe(desafios[1]!.clave);
    });
});

describe('insignias', () => {
    it('se ganan por revisar, por la racha y por lo que confirman', () => {
        const reporte = (tipo: 'CRIADERO' | 'LIMPIEZA', estado: 'VALIDADO' | 'PENDIENTE') => ({ idCliente: crypto.randomUUID(), tipo, estado, manzanaCodigo: 'M-1', creadoEn: '' });
        expect(insigniasCumplidas({
            actividad: actividad(['REVISION', '2026-09-22T12:00:00Z']), rachaActual: 4, desafiosCumplidos: false, ganoPremio: false,
            reportes: [reporte('LIMPIEZA', 'VALIDADO'), reporte('CRIADERO', 'VALIDADO'), reporte('CRIADERO', 'VALIDADO'), reporte('CRIADERO', 'PENDIENTE')],
        })).toEqual(['PRIMERA_REVISION', 'RACHA_4', 'PRIMERA_LIMPIEZA']);
    });
});
