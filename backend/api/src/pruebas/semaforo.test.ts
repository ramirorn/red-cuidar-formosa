import { describe, expect, it } from 'vitest';
import { crearSemaforo } from '../utils/semaforo.js';
import { ErrorHttp } from '../utils/errorHttp.js';

const esperar = (ms: number) => new Promise((resolver) => setTimeout(resolver, ms));

describe('crearSemaforo', () => {
    it('no supera la cantidad de tareas simultáneas y completa todas', async () => {
        const conLugar = crearSemaforo(2, 10, 'saturado');
        let activas = 0;
        let maximo = 0;

        const resultados = await Promise.all(Array.from({ length: 8 }, (_, i) => conLugar(async () => {
            activas++;
            maximo = Math.max(maximo, activas);
            await esperar(3);
            activas--;
            return i;
        })));

        expect(maximo).toBe(2);
        expect(resultados).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    });

    it('responde 503 cuando la fila de espera está llena', async () => {
        const conLugar = crearSemaforo(1, 1, 'saturado');
        const lenta = () => esperar(20);

        const primera = conLugar(lenta);
        const segunda = conLugar(lenta);
        await expect(conLugar(lenta)).rejects.toMatchObject({ estado: 503 });
        await Promise.all([primera, segunda]);
    });

    it('libera el lugar aunque la tarea falle', async () => {
        const conLugar = crearSemaforo(1, 0, 'saturado');

        await expect(conLugar(async () => { throw new Error('falla'); })).rejects.toThrow('falla');
        await expect(conLugar(async () => 'ok')).resolves.toBe('ok');
        expect(new ErrorHttp(503, 'x').estado).toBe(503);
    });
});
