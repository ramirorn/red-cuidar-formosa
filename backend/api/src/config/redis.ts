import { createClient } from 'redis';
import entorno from './entorno.js';

// Redis es opcional para la API: solo se usa para invalidar la caché del mapa de calor.
// Si no está disponible, la API sigue funcionando y la caché expira por tiempo.

type ClienteRedis = ReturnType<typeof createClient>;

let cliente: ClienteRedis | null = null;

export const obtenerRedis = async (): Promise<ClienteRedis | null> => {
    if (!entorno.REDIS_URL) return null;

    if (!cliente) {
        cliente = createClient({
            url: entorno.REDIS_URL,
            socket: { connectTimeout: 2000, reconnectStrategy: (intentos) => Math.min(intentos * 500, 5000) },
        });
        cliente.on('error', (error) => console.error('Error de Redis:', error.message));
        await cliente.connect();
    }

    return cliente;
};

export const CLAVE_VERSION_MAPA_CALOR = 'mapa_calor:version';
