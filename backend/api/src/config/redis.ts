import { createClient } from 'redis';
import entorno from './entorno.js';

// Redis es opcional para la API: solo se usa para invalidar la caché del mapa de calor.
// Si no está disponible, la API sigue funcionando y la caché expira por tiempo.

type ClienteRedis = ReturnType<typeof createClient>;

const TIEMPO_MAXIMO_CONEXION_MS = 2000;
const PAUSA_TRAS_FALLO_MS = 30_000;

// Se guarda la promesa de conexión: dos llamadas simultáneas comparten la misma conexión.
// Si Redis no responde a tiempo, se descarta el cliente y la próxima llamada vuelve a intentar:
// una caché caída nunca debe dejar colgada una petición de la API.
let conexion: Promise<ClienteRedis> | null = null;
let reintentarDesde = 0;

export const obtenerRedis = async (): Promise<ClienteRedis | null> => {
    if (!entorno.REDIS_URL) return null;

    if (!conexion) {
        // Tras un fallo se espera un rato antes de reintentar, para no demorar cada petición.
        if (Date.now() < reintentarDesde) throw new Error('Redis no disponible');

        const cliente: ClienteRedis = createClient({
            url: entorno.REDIS_URL,
            // Sin conexión, los comandos fallan de inmediato en lugar de quedar en cola.
            disableOfflineQueue: true,
            socket: { connectTimeout: TIEMPO_MAXIMO_CONEXION_MS, reconnectStrategy: (intentos) => Math.min(intentos * 500, 5000) },
        });
        cliente.on('error', (error) => console.error('Error de Redis:', error.message));

        let temporizador: NodeJS.Timeout | undefined;
        const tiempoAgotado = new Promise<never>((_, rechazar) => {
            temporizador = setTimeout(() => rechazar(new Error('Redis no respondió a tiempo')), TIEMPO_MAXIMO_CONEXION_MS);
        });

        conexion = Promise.race([cliente.connect().then(() => cliente), tiempoAgotado])
            .finally(() => clearTimeout(temporizador))
            .catch((error) => {
                conexion = null;
                reintentarDesde = Date.now() + PAUSA_TRAS_FALLO_MS;
                cliente.destroy();
                throw error;
            });
    }

    return conexion;
};

export const CLAVE_VERSION_MAPA_CALOR = 'mapa_calor:version';
