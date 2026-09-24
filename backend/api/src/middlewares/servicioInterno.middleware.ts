import type { Request, Response, NextFunction } from 'express';
import { createHash, timingSafeEqual } from 'node:crypto';
import entorno from '../config/entorno.js';

const resumen = (valor: string): Buffer => createHash('sha256').update(valor).digest();

// Autentica llamadas entre servicios (n8n, motor predictivo) con una clave compartida.
// Se comparan los resúmenes en tiempo constante para no filtrar la clave por tiempos de respuesta.
export const verificarServicioInterno = (req: Request, res: Response, next: NextFunction): void => {
    const clave = req.header('x-clave-servicio');

    if (!clave || !timingSafeEqual(resumen(clave), resumen(entorno.CLAVE_SERVICIO_INTERNO))) {
        res.status(401).json({
            status: 'error',
            message: 'Acceso denegado. Servicio no autorizado.',
        });
        return;
    }

    next();
};
