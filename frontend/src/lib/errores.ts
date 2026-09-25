import { isAxiosError } from 'axios';

// Los mensajes del backend ya están en español y no filtran detalles internos, pero igual solo se
// muestran los de estados esperables; para el resto se usa un texto propio.
const ESTADOS_CON_MENSAJE = new Set([400, 403, 404, 409, 413, 415, 422, 429, 503]);
const PATRONES_SOSPECHOSOS = /prisma|sql|stack|exception|at \w+ \(/i;

export const errorAmigable = (error: unknown, porDefecto: string): string => {
    if (isAxiosError(error)) {
        if (!error.response) return 'No hay conexión. Revisá tu señal e intentá de nuevo.';
        const mensaje = (error.response.data as { message?: unknown } | undefined)?.message;
        if (ESTADOS_CON_MENSAJE.has(error.response.status) && typeof mensaje === 'string' && !PATRONES_SOSPECHOSOS.test(mensaje)) {
            return mensaje.slice(0, 200);
        }
    }
    return porDefecto;
};
