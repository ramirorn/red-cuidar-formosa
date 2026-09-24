import type { Request, Response, NextFunction } from 'express';
import multer from 'multer';

export const TAMANO_MAXIMO_IMAGEN = 5 * 1024 * 1024;
export const CANTIDAD_MAXIMA_IMAGENES = 3;
export const MIMES_PERMITIDOS = ['image/jpeg', 'image/png', 'image/webp'];

// Primer filtro: tamaño, cantidad y tipo declarado. El tipo declarado lo controla el cliente,
// por eso el servicio vuelve a verificar la firma binaria y re-codifica cada imagen.
const cargador = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: TAMANO_MAXIMO_IMAGEN,
        files: CANTIDAD_MAXIMA_IMAGENES,
        fields: 20,
        fieldSize: 20 * 1024,
        parts: 30,
    },
    fileFilter: (_req, archivo, aceptar) => {
        if (archivo.fieldname !== 'imagenes' || !MIMES_PERMITIDOS.includes(archivo.mimetype)) {
            aceptar(new multer.MulterError('LIMIT_UNEXPECTED_FILE', archivo.fieldname));
            return;
        }
        aceptar(null, true);
    },
}).array('imagenes', CANTIDAD_MAXIMA_IMAGENES);

const MENSAJES: Partial<Record<multer.ErrorCode, string>> = {
    LIMIT_FILE_SIZE: 'Cada imagen debe pesar como máximo 5 MB',
    LIMIT_FILE_COUNT: `Se permiten como máximo ${CANTIDAD_MAXIMA_IMAGENES} imágenes`,
    LIMIT_UNEXPECTED_FILE: 'Solo se aceptan imágenes JPEG, PNG o WebP en el campo "imagenes"',
};

export const subirImagenes = (req: Request, res: Response, next: NextFunction): void => {
    cargador(req, res, (error: unknown) => {
        if (error instanceof multer.MulterError) {
            res.status(error.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({
                status: 'error',
                message: MENSAJES[error.code] ?? 'La carga de archivos no es válida',
            });
            return;
        }
        if (error) {
            next(error);
            return;
        }
        next();
    });
};
