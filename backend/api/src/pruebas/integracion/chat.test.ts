import { createServer, type Server } from 'node:http';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import entorno from '../../config/entorno.js';
import { app, crearSesion, limpiarBase, prisma } from './ayudantes.js';

// Flujo de n8n simulado: responde lo que indique la prueba.
let responder: (cuerpo: Record<string, unknown>) => { estado: number; cuerpo: unknown } = () => ({ estado: 200, cuerpo: {} });
let recibido: Record<string, unknown> | null = null;
let servidor: Server;
let urlFlujo = '';

beforeAll(async () => {
    servidor = createServer((req, res) => {
        let datos = '';
        req.on('data', (parte) => { datos += parte; });
        req.on('end', () => {
            recibido = JSON.parse(datos);
            const { estado, cuerpo } = responder(recibido!);
            res.writeHead(estado, { 'content-type': 'application/json' }).end(JSON.stringify(cuerpo));
        });
    });
    await new Promise<void>((listo) => servidor.listen(0, listo));
    const direccion = servidor.address();
    urlFlujo = `http://127.0.0.1:${typeof direccion === 'object' && direccion ? direccion.port : 0}/webhook/chat`;
});

afterAll(() => new Promise<void>((listo) => servidor.close(() => listo())));

beforeEach(async () => {
    await limpiarBase();
    entorno.URL_CHAT_ORQUESTADOR = urlFlujo;
    recibido = null;
});

const enviar = async (mensaje: string) => {
    const { token } = await crearSesion();
    return request(app).post('/api/chat/mensajes').set('Authorization', `Bearer ${token}`).send({ mensaje, historial: [] });
};

describe('chat IA Mosquito', () => {
    it('usa la respuesta del flujo de n8n y le manda el mensaje con los nombres de Webhook y de Chat Trigger', async () => {
        responder = () => ({ estado: 200, cuerpo: [{ output: 'Respuesta del modelo', nivelTriaje: 'LEVE' }] });
        const respuesta = await enviar('me picaron');
        expect(respuesta.status).toBe(200);
        expect(respuesta.body.data).toMatchObject({ respuesta: 'Respuesta del modelo', nivelTriaje: 'LEVE', origen: 'ia' });
        expect(recibido).toMatchObject({ mensaje: 'me picaron', chatInput: 'me picaron' });
        expect(recibido!.sessionId).toBe(recibido!.sesionId);
        expect(await prisma.triajeChat.count({ where: { nivel: 'LEVE' } })).toBe(1);
    });

    it('si el flujo falla o responde vacío, contesta el asistente básico', async () => {
        responder = () => ({ estado: 200, cuerpo: { respuesta: '' } });
        const vacio = await enviar('¿Qué es el BTI?');
        expect(vacio.body.data).toMatchObject({ origen: 'basico', nivelTriaje: 'SIN_RIESGO' });
        expect(vacio.body.data.respuesta).toMatch(/larvicida biológico/);

        responder = () => ({ estado: 500, cuerpo: {} });
        const caido = await enviar('hola');
        expect(caido.body.data.origen).toBe('basico');
    });

    it('sin URL configurada responde el asistente básico', async () => {
        entorno.URL_CHAT_ORQUESTADOR = '';
        const respuesta = await enviar('¿Cómo limpio un tanque de agua?');
        expect(respuesta.body.data.origen).toBe('basico');
        expect(recibido).toBeNull();
    });

    it('ante un signo de alarma fuerza URGENTE con el 107 aunque el modelo diga otra cosa', async () => {
        responder = () => ({ estado: 200, cuerpo: { respuesta: 'Tomá agua y descansá.', nivelTriaje: 'LEVE' } });
        const respuesta = await enviar('tengo fiebre y me sangra la nariz');
        expect(respuesta.body.data.nivelTriaje).toBe('URGENTE');
        expect(respuesta.body.data.respuesta).toContain('107');
        expect(await prisma.triajeChat.count({ where: { nivel: 'URGENTE' } })).toBe(1);
    });
});
