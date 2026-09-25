// Reduce la foto en el celular antes de guardarla: menos datos móviles y lejos del límite de 5 MB.
const LADO_MAXIMO = 1920;

export const comprimirImagen = async (origen: Blob | HTMLCanvasElement, calidad = 0.82): Promise<Blob> => {
    const mapa = origen instanceof HTMLCanvasElement ? origen : await createImageBitmap(origen);
    const escala = Math.min(1, LADO_MAXIMO / Math.max(mapa.width, mapa.height));
    const lienzo = document.createElement('canvas');
    lienzo.width = Math.round(mapa.width * escala);
    lienzo.height = Math.round(mapa.height * escala);
    lienzo.getContext('2d')?.drawImage(mapa, 0, 0, lienzo.width, lienzo.height);
    return new Promise((resolver, rechazar) => lienzo.toBlob(
        (blob) => (blob ? resolver(blob) : rechazar(new Error('No se pudo procesar la foto'))),
        'image/jpeg',
        calidad,
    ));
};
