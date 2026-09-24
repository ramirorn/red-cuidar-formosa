import { ErrorHttp } from './errorHttp.js';

// Paginación por cursor (keyset): estable y sin OFFSET, apta para grandes volúmenes.
// El cursor es opaco para el cliente: base64url del id del último elemento recibido.

export const LIMITE_POR_DEFECTO = 50;
export const LIMITE_MAXIMO = 200;

export const codificarCursor = (id: string | number): string => Buffer.from(String(id)).toString('base64url');

export const decodificarCursor = (cursor: string): string => {
    const valor = Buffer.from(cursor, 'base64url').toString('utf8');
    if (!valor || valor.length > 64) {
        throw new ErrorHttp(400, 'Cursor de paginación inválido');
    }
    return valor;
};

// Recibe take = limite + 1 elementos; si sobra uno, hay página siguiente.
export const armarPagina = <T extends { id: string | number }>(elementos: T[], limite: number) => {
    const hayMas = elementos.length > limite;
    const datos = hayMas ? elementos.slice(0, limite) : elementos;
    const ultimo = datos[datos.length - 1];

    return {
        datos,
        paginacion: {
            limite,
            siguienteCursor: hayMas && ultimo ? codificarCursor(ultimo.id) : null,
        },
    };
};
