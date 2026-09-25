import type { CajaDelimitadora, Deteccion } from '@/tipos';

// Privacidad: del patio solo se envía el pedazo donde está el recipiente, no la foto entera.
// Las cajas están normalizadas (0 a 1) respecto de la foto completa.

const MARGEN = 0.12;
// Mínimos del recorte: el servidor rechaza imágenes de menos de 64 px por lado.
export const LADO_MINIMO_PX = 96;

const acotar = (valor: number) => Math.min(1, Math.max(0, valor));

// Recorte sugerido: el rectángulo que abarca todo lo que marcó la IA, con un margen para dar contexto.
export const recorteSugerido = (detecciones: Deteccion[]): CajaDelimitadora | null => {
    if (detecciones.length === 0) return null;
    const x1 = Math.min(...detecciones.map(({ cajaDelimitadora: caja }) => caja.x));
    const y1 = Math.min(...detecciones.map(({ cajaDelimitadora: caja }) => caja.y));
    const x2 = Math.max(...detecciones.map(({ cajaDelimitadora: caja }) => caja.x + caja.ancho));
    const y2 = Math.max(...detecciones.map(({ cajaDelimitadora: caja }) => caja.y + caja.alto));
    const margenX = (x2 - x1) * MARGEN;
    const margenY = (y2 - y1) * MARGEN;
    const x = acotar(x1 - margenX);
    const y = acotar(y1 - margenY);
    return { x, y, ancho: acotar(x2 + margenX) - x, alto: acotar(y2 + margenY) - y };
};

// Tamaño mínimo normalizado para una foto de ancho × alto píxeles.
export const tamanoMinimo = (ancho: number, alto: number) => ({ ancho: Math.min(1, LADO_MINIMO_PX / ancho), alto: Math.min(1, LADO_MINIMO_PX / alto) });

// Las detecciones pasan a coordenadas del recorte; las que quedan casi afuera se descartan.
export const deteccionesEnRecorte = (detecciones: Deteccion[], recorte: CajaDelimitadora): Deteccion[] =>
    detecciones.flatMap((deteccion) => {
        const caja = deteccion.cajaDelimitadora;
        const x1 = Math.max(caja.x, recorte.x);
        const y1 = Math.max(caja.y, recorte.y);
        const x2 = Math.min(caja.x + caja.ancho, recorte.x + recorte.ancho);
        const y2 = Math.min(caja.y + caja.alto, recorte.y + recorte.alto);
        if (x2 <= x1 || y2 <= y1) return [];
        const dentro = ((x2 - x1) * (y2 - y1)) / (caja.ancho * caja.alto);
        if (dentro < 0.5) return [];
        return [{
            ...deteccion,
            cajaDelimitadora: {
                x: acotar((x1 - recorte.x) / recorte.ancho),
                y: acotar((y1 - recorte.y) / recorte.alto),
                ancho: acotar((x2 - x1) / recorte.ancho),
                alto: acotar((y2 - y1) / recorte.alto),
            },
        }];
    });

// Genera la imagen recortada. Al re-dibujarla en un canvas se pierden todos los metadatos (EXIF, GPS).
export const recortarImagen = async (foto: Blob, recorte: CajaDelimitadora): Promise<Blob> => {
    const mapa = await createImageBitmap(foto);
    try {
        const sx = Math.round(recorte.x * mapa.width);
        const sy = Math.round(recorte.y * mapa.height);
        const ancho = Math.max(1, Math.round(recorte.ancho * mapa.width));
        const alto = Math.max(1, Math.round(recorte.alto * mapa.height));
        const lienzo = document.createElement('canvas');
        lienzo.width = ancho;
        lienzo.height = alto;
        lienzo.getContext('2d')?.drawImage(mapa, sx, sy, ancho, alto, 0, 0, ancho, alto);
        return await new Promise<Blob>((resolver, rechazar) => lienzo.toBlob(
            (blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo recortar la foto'))),
            'image/jpeg',
            0.85,
        ));
    } finally {
        mapa.close();
    }
};
