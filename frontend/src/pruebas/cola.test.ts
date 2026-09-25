import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { abrirBase, guardarAjuste } from '@/sinConexion/bd';
import { encolarReporte, listarCola, listarPropios, sincronizarCola, type NuevoReporte } from '@/sinConexion/cola';

const reporte = (idCliente: string): NuevoReporte => ({
    idCliente,
    tipo: 'CRIADERO',
    manzanaId: 12,
    manzanaCodigo: 'EJ-0101',
    capturadoEn: new Date().toISOString(),
    detecciones: [],
    fotos: [new Blob(['foto'], { type: 'image/jpeg' })],
});

const respuesta = (estado: number, cuerpo: unknown = {}) => new Response(JSON.stringify(cuerpo), { status: estado });

beforeEach(async () => {
    await (await abrirBase()).clear('cola');
    await (await abrirBase()).clear('propios');
    await guardarAjuste('sesion', { sesionId: 'sesion-1', token: 'token-1' });
    vi.restoreAllMocks();
});

describe('cola de reportes sin conexión', () => {
    it('envía los reportes pendientes y los quita de la cola', async () => {
        const enviar = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(201));
        await encolarReporte(reporte('a'));
        await encolarReporte(reporte('b'));

        const resultado = await sincronizarCola();

        expect(resultado).toEqual({ enviados: 2, pendientes: 0, errores: 0 });
        expect(await listarCola()).toEqual([]);
        expect(enviar.mock.calls[0]?.[1]?.headers).toEqual({ Authorization: 'Bearer token-1' });
    });

    it('sin señal deja el reporte pendiente para el próximo intento', async () => {
        vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'));
        await encolarReporte(reporte('a'));

        const resultado = await sincronizarCola();

        expect(resultado).toEqual({ enviados: 0, pendientes: 1, errores: 0 });
        expect((await listarCola())[0]?.estado).toBe('pendiente');
    });

    it('un error definitivo (foto repetida) queda marcado y no se reintenta solo', async () => {
        const enviar = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(409, { message: 'Una de las imágenes ya fue enviada en otro reporte' }));
        await encolarReporte(reporte('a'));

        await sincronizarCola();
        await sincronizarCola();

        const [guardado] = await listarCola();
        expect(guardado?.estado).toBe('error');
        expect(guardado?.ultimoError).toContain('ya fue enviada');
        expect(enviar).toHaveBeenCalledTimes(1);
    });

    it('si la sesión venció crea otra y reintenta una vez', async () => {
        const enviar = vi.spyOn(globalThis, 'fetch')
            .mockResolvedValueOnce(respuesta(401))
            .mockResolvedValueOnce(respuesta(201, { data: { sesionId: 'sesion-2', token: 'token-2' } }))
            .mockResolvedValueOnce(respuesta(201));
        await encolarReporte(reporte('a'));

        const resultado = await sincronizarCola();

        expect(resultado.enviados).toBe(1);
        expect(enviar.mock.calls[1]?.[0]).toBe('/api/sesiones');
        expect(enviar.mock.calls[2]?.[1]?.headers).toEqual({ Authorization: 'Bearer token-2' });
    });

    it('un error del servidor (503) se reintenta más adelante', async () => {
        vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(503));
        await encolarReporte(reporte('a'));

        const resultado = await sincronizarCola();

        expect(resultado.pendientes).toBe(1);
        expect((await listarCola())[0]).toMatchObject({ estado: 'pendiente', intentos: 1 });
    });

    it('envía solo la manzana, nunca coordenadas, y recuerda el reporte en el celular', async () => {
        const enviar = vi.spyOn(globalThis, 'fetch').mockResolvedValue(respuesta(201));
        await encolarReporte(reporte('privado'));

        await sincronizarCola();

        const formulario = enviar.mock.calls[0]![1]!.body as FormData;
        expect(formulario.get('manzanaId')).toBe('12');
        expect(formulario.has('latitud')).toBe(false);
        expect(formulario.has('longitud')).toBe(false);
        expect((await listarPropios()).map((propio) => propio.idCliente)).toEqual(['privado']);
    });
});
