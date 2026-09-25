import { describe, expect, it } from 'vitest';
import { detectarTriaje, responderBasico } from '../services/asistenteBasico.services.js';
import { interpretarRespuestaFlujo } from '../integraciones/n8nChat.js';

describe('asistente básico: triaje', () => {
    it.each([
        ['Mi hijo tiene fiebre y le sangran las encías', 'URGENTE'],
        ['tengo un dolor de panza muy fuerte', 'URGENTE'],
        ['Vomita todo y no para', 'URGENTE'],
        ['le cuesta respirar', 'URGENTE'],
        ['Tengo fiebre y me duele el cuerpo', 'MODERADO'],
        ['me duele detrás de los ojos', 'MODERADO'],
        ['tengo 38,5', 'MODERADO'],
        ['me picaron mucho anoche', 'LEVE'],
        ['¿Cómo limpio un tanque de agua?', 'SIN_RIESGO'],
        ['no tengo fiebre, solo quiero saber del BTI', 'SIN_RIESGO'],
        ['tengo fiebre pero sin sangrado', 'MODERADO'],
    ])('"%s" → %s', (mensaje, nivel) => {
        expect(detectarTriaje(mensaje)).toBe(nivel);
    });
});

describe('asistente básico: respuestas', () => {
    it('ante un signo de alarma indica guardia o 107', () => {
        const { respuesta, nivelTriaje } = responderBasico('tengo fiebre y sangrado de nariz');
        expect(nivelTriaje).toBe('URGENTE');
        expect(respuesta).toContain('107');
    });

    it('nunca recomienda aspirina ni ibuprofeno ante síntomas', () => {
        const { respuesta } = responderBasico('Tengo fiebre y me duele la cabeza');
        expect(respuesta).toMatch(/no te automediques: nada de aspirina ni ibuprofeno/i);
    });

    it.each([
        ['¿Cómo limpio un tanque de agua?', /tanque/i],
        ['¿Qué es el BTI?', /larvicida biológico/i],
        ['¿Dónde pone huevos el mosquito?', /pone los huevos/i],
        ['¿el dengue se contagia?', /no se contagia de persona a persona/i],
        ['hola', /Puedo ayudarte con/],
        ['asdfgh', /Puedo ayudarte con/],
    ])('"%s" responde el tema correcto', (mensaje, patron) => {
        expect(responderBasico(mensaje).respuesta).toMatch(patron);
    });
});

describe('respuesta del flujo de n8n', () => {
    it.each([
        [{ respuesta: 'Hola', nivelTriaje: 'LEVE' }, { respuesta: 'Hola', nivelTriaje: 'LEVE' }],
        [{ output: 'Desde un AI Agent' }, { respuesta: 'Desde un AI Agent', nivelTriaje: null }],
        [[{ text: 'En lista', triaje: 'urgente' }], { respuesta: 'En lista', nivelTriaje: 'URGENTE' }],
        [[{ json: { respuesta: 'Item de n8n' } }], { respuesta: 'Item de n8n', nivelTriaje: null }],
        ['Texto plano', { respuesta: 'Texto plano', nivelTriaje: null }],
    ])('%j', (cuerpo, esperado) => {
        expect(interpretarRespuestaFlujo(cuerpo)).toEqual(esperado);
    });

    it('sin texto no hay respuesta', () => {
        expect(interpretarRespuestaFlujo({ respuesta: '' })).toBeNull();
        expect(interpretarRespuestaFlujo({ otra: 1 })).toBeNull();
        expect(interpretarRespuestaFlujo(null)).toBeNull();
    });
});
