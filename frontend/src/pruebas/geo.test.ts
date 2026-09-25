import { estaEnFormosa, puntoEnPoligono } from '@/lib/geo';

describe('utilidades geográficas', () => {
    const cuadrado = [[-58.18, -26.19], [-58.179, -26.19], [-58.179, -26.189], [-58.18, -26.189], [-58.18, -26.19]];

    it('detecta si un punto está dentro de la manzana', () => {
        expect(puntoEnPoligono(-58.1795, -26.1895, cuadrado)).toBe(true);
        expect(puntoEnPoligono(-58.1792, -26.1893, cuadrado)).toBe(true);
        expect(puntoEnPoligono(-58.17, -26.1895, cuadrado)).toBe(false);
    });

    it('acepta solo ubicaciones dentro de la provincia', () => {
        expect(estaEnFormosa(-26.18, -58.17)).toBe(true);
        expect(estaEnFormosa(-34.6, -58.38)).toBe(false);
    });
});
