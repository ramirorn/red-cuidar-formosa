import { ErrorHttp } from './errorHttp.js';

// Limita cuántas tareas costosas corren a la vez dentro del proceso (procesar imágenes, consultar al LLM).
// Si la fila de espera se llena, responde 503 en lugar de acumular trabajo sin límite.
export const crearSemaforo = (simultaneas: number, maximoEnEspera: number, mensajeSaturado: string) => {
    let activas = 0;
    const espera: (() => void)[] = [];

    return async <T>(tarea: () => Promise<T>): Promise<T> => {
        if (activas >= simultaneas) {
            if (espera.length >= maximoEnEspera) throw new ErrorHttp(503, mensajeSaturado);
            await new Promise<void>((liberar) => espera.push(liberar));
        } else {
            activas++;
        }

        try {
            return await tarea();
        } finally {
            const siguiente = espera.shift();
            // El lugar pasa directo a la próxima tarea en espera; si no hay ninguna, se libera.
            if (siguiente) siguiente();
            else activas--;
        }
    };
};
