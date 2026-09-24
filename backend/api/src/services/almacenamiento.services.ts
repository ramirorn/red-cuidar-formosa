import { createHash, randomUUID } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import entorno from '../config/entorno.js';
import { MIMES_PERMITIDOS } from '../middlewares/subidaImagen.middleware.js';
import { ErrorHttp } from '../utils/errorHttp.js';

const LADO_MAXIMO_PX = 1920;
const LADO_MINIMO_PX = 64;
const PIXELES_MAXIMOS_ENTRADA = 40_000_000;

export interface ImagenProcesada {
    contenido: Buffer;
    sha256: string;
    ancho: number;
    alto: number;
    tamanoBytes: number;
    mime: 'image/jpeg';
}

// Verifica la firma binaria real del archivo y re-codifica la imagen:
// - descarta archivos disfrazados (un ejecutable renombrado a .jpg),
// - limita los píxeles de entrada (bombas de descompresión),
// - elimina los metadatos EXIF, incluida la ubicación GPS original del dispositivo.
export const procesarImagenService = async (original: Buffer): Promise<ImagenProcesada> => {
    const tipo = await fileTypeFromBuffer(original);

    if (!tipo || !MIMES_PERMITIDOS.includes(tipo.mime)) {
        throw new ErrorHttp(415, 'El archivo no es una imagen JPEG, PNG o WebP válida');
    }

    try {
        const { data, info } = await sharp(original, { limitInputPixels: PIXELES_MAXIMOS_ENTRADA, failOn: 'error' })
            .rotate()
            .resize({ width: LADO_MAXIMO_PX, height: LADO_MAXIMO_PX, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 80, mozjpeg: true })
            .toBuffer({ resolveWithObject: true });

        if (info.width < LADO_MINIMO_PX || info.height < LADO_MINIMO_PX) {
            throw new ErrorHttp(422, 'La imagen es demasiado pequeña');
        }

        return {
            contenido: data,
            sha256: createHash('sha256').update(original).digest('hex'),
            ancho: info.width,
            alto: info.height,
            tamanoBytes: info.size,
            mime: 'image/jpeg',
        };
    } catch (error) {
        if (error instanceof ErrorHttp) throw error;
        throw new ErrorHttp(422, 'La imagen está dañada o no se puede procesar');
    }
};

const directorioBase = (): string => path.resolve(entorno.DIR_EVIDENCIAS);

// El nombre del archivo lo genera el servidor: el nombre original del cliente nunca se usa.
export const guardarImagenService = async (contenido: Buffer): Promise<string> => {
    const ahora = new Date();
    const relativa = path.posix.join(
        String(ahora.getUTCFullYear()),
        String(ahora.getUTCMonth() + 1).padStart(2, '0'),
        `${randomUUID()}.jpg`,
    );
    const absoluta = path.join(directorioBase(), relativa);

    await mkdir(path.dirname(absoluta), { recursive: true });
    await writeFile(absoluta, contenido, { flag: 'wx', mode: 0o640 });

    return relativa;
};

export const eliminarImagenesService = async (rutasRelativas: string[]): Promise<void> => {
    await Promise.allSettled(rutasRelativas.map((ruta) => unlink(path.join(directorioBase(), ruta))));
};

// Resuelve la ruta en disco y bloquea cualquier intento de salir del directorio de evidencias.
export const rutaAbsolutaEvidencia = (rutaRelativa: string): string => {
    const base = directorioBase();
    const absoluta = path.resolve(base, rutaRelativa);

    if (!absoluta.startsWith(base + path.sep)) {
        throw new ErrorHttp(404, 'Recurso no encontrado');
    }

    return absoluta;
};
