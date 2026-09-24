import { ErrorHttp } from './errorHttp.js';

// Paginación por cursor (keyset): estable y sin OFFSET, apta para grandes volúmenes.
// El cursor es opaco para el cliente: base64url del id del último elemento recibido.

export const LIMITE_POR_DEFECTO = 50;
export const LIMITE_MAXIMO = 200;

export const codificarCursor = (id: string | number): string => Buffer.from(String(id)).toString('base64url');

const FORMATO_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Un cursor manipulado se rechaza con 400 antes de llegar a la base de datos.
export const decodificarCursor = (cursor: string): string => {
    const valor = Buffer.from(cursor, 'base64url').toString('utf8');
    if (!FORMATO_UUID.test(valor)) {
        throw new ErrorHttp(400, 'Cursor de paginación inválido');
    }
    return valor;
};

export const decodificarCursorEntero = (cursor: string): number => {
    const valor = Number(Buffer.from(cursor, 'base64url').toString('utf8'));
    if (!Number.isSafeInteger(valor) || valor < 1) {
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
