import type { Response } from 'express';
import { Prisma } from '@prisma/client';

// Error con código HTTP. Los servicios lo lanzan y los controladores lo responden
// con el mismo formato de la plantilla: { status: 'error', message }.
export class ErrorHttp extends Error {
    readonly estado: number;
    readonly detalles: unknown;

    constructor(estado: number, mensaje: string, detalles?: unknown) {
        super(mensaje);
        this.name = 'ErrorHttp';
        this.estado = estado;
        this.detalles = detalles;
    }
}

export const responderError = (res: Response, error: unknown): void => {
    if (error instanceof ErrorHttp) {
        res.status(error.estado).json({
            status: 'error',
            message: error.message,
            ...(error.detalles !== undefined ? { errors: error.detalles } : {}),
        });
        return;
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        res.status(409).json({
            status: 'error',
            message: 'El recurso ya existe',
        });
        return;
    }

    // Nunca se expone el detalle interno al cliente.
    console.error(error);
    res.status(500).json({
        status: 'error',
        message: 'Error interno del servidor',
    });
};
