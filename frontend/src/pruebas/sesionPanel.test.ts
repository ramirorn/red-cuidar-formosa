import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import MockAdapter from 'axios-mock-adapter';
import { clientePanel } from '@/api/panel.api';
import { alExpirarSesion, guardarToken, leerToken, refrescarToken } from '@/autenticacion/tokenPanel';
import { accionesReporte } from '@/lib/etiquetasPanel';

const respuestaRefresco = (token: string) => new Response(JSON.stringify({ status: 'success', data: { token } }), { status: 200 });

describe('refresco del token del panel', () => {
    beforeEach(() => guardarToken(null));
    afterEach(() => vi.unstubAllGlobals());

    it('varias peticiones que vencen a la vez generan un solo refresco (el backend revoca todo si se reusa)', async () => {
        const fetch = vi.fn(async () => respuestaRefresco('nuevo'));
        vi.stubGlobal('fetch', fetch);

        const tokens = await Promise.all([refrescarToken(), refrescarToken(), refrescarToken()]);

        expect(tokens).toEqual(['nuevo', 'nuevo', 'nuevo']);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(leerToken()).toBe('nuevo');
    });

    it('si la cookie ya no sirve devuelve null sin lanzar', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));

        await expect(refrescarToken()).resolves.toBeNull();
        expect(leerToken()).toBeNull();
    });
});

describe('cliente del panel', () => {
    let simulador: MockAdapter;
    beforeEach(() => { simulador = new MockAdapter(clientePanel); guardarToken('viejo'); });
    afterEach(() => { simulador.restore(); vi.unstubAllGlobals(); });

    it('ante un 401 renueva el token y repite la petición una sola vez', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => respuestaRefresco('renovado')));
        const autorizaciones: string[] = [];
        simulador.onGet('/institucional/reportes').reply((config) => {
            autorizaciones.push(String(config.headers?.Authorization));
            return autorizaciones.length === 1 ? [401, {}] : [200, { status: 'success', data: [] }];
        });

        const respuesta = await clientePanel.get('/institucional/reportes');

        expect(respuesta.status).toBe(200);
        expect(autorizaciones).toEqual(['Bearer viejo', 'Bearer renovado']);
    });

    it('si no se puede renovar avisa que la sesión terminó', async () => {
        vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));
        const oyente = vi.fn();
        const quitar = alExpirarSesion(oyente);
        simulador.onGet('/institucional/metricas').reply(401, {});

        await expect(clientePanel.get('/institucional/metricas')).rejects.toMatchObject({ response: { status: 401 } });
        expect(oyente).toHaveBeenCalledOnce();
        quitar();
    });

    it('un 401 del login (credenciales) no intenta renovar', async () => {
        const fetch = vi.fn();
        vi.stubGlobal('fetch', fetch);
        simulador.onPost('/auth/login').reply(401, { status: 'error', message: 'Credenciales inválidas' });

        await expect(clientePanel.post('/auth/login', {})).rejects.toBeTruthy();
        expect(fetch).not.toHaveBeenCalled();
    });
});

describe('acciones sobre un reporte', () => {
    it('siguen las transiciones del backend', () => {
        expect(accionesReporte('PENDIENTE', 'CRIADERO')).toEqual(['VALIDADO', 'RECHAZADO']);
        expect(accionesReporte('VALIDADO', 'CRIADERO')).toEqual(['RESUELTO', 'RECHAZADO']);
        expect(accionesReporte('RECHAZADO', 'MICROBASURAL')).toEqual(['VALIDADO']);
        expect(accionesReporte('RESUELTO', 'CRIADERO')).toEqual([]);
    });

    it('una limpieza validada no se puede "resolver"', () => {
        expect(accionesReporte('VALIDADO', 'LIMPIEZA')).toEqual(['RECHAZADO']);
    });
});
