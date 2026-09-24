import { describe, expect, it } from 'vitest';
import { armarMensajeLluvia } from '../services/notificacion.services.js';
import { procesarConLimite } from '../utils/concurrencia.js';

describe('armarMensajeLluvia', () => {
    it('incluye la localidad, los milímetros redondeados y la acción esperada', () => {
        const mensaje = armarMensajeLluvia('Clorinda', 23.6);
        expect(mensaje.titulo).toBe('Llovió en Clorinda');
        expect(mensaje.cuerpo).toContain('24 mm');
        expect(mensaje.cuerpo).toContain('cepillá');
        expect(mensaje.url).toBe('/?accion=reportar-limpieza');
    });
});

describe('procesarConLimite', () => {
    it('procesa todos los elementos sin superar el límite de tareas simultáneas', async () => {
        let activas = 0;
        let maximo = 0;
        const procesados: number[] = [];

        await procesarConLimite(Array.from({ length: 25 }, (_, i) => i), 4, async (elemento) => {
            activas++;
            maximo = Math.max(maximo, activas);
            await new Promise((resolver) => setTimeout(resolver, 2));
            procesados.push(elemento);
            activas--;
        });

        expect(procesados.sort((a, b) => a - b)).toEqual(Array.from({ length: 25 }, (_, i) => i));
        expect(maximo).toBeLessThanOrEqual(4);
    });

    it('no falla con una lista vacía', async () => {
        await expect(procesarConLimite([], 5, async () => {})).resolves.toBeUndefined();
    });
});
