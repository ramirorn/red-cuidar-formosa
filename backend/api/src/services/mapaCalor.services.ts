import entorno from '../config/entorno.js';
import { CLAVE_VERSION_MAPA_CALOR, obtenerRedis } from '../config/redis.js';
import type { UsuarioAutenticado } from '../middlewares/autenticacion.middleware.js';
import { alcanceLocalidad } from '../utils/alcance.js';
import { ErrorHttp } from '../utils/errorHttp.js';
import { resolverRango } from '../utils/rangoFechas.js';

const TIEMPO_ESPERA_MOTOR_MS = 5000;

// El motor predictivo guarda en caché el mapa de calor con esta versión como parte de la clave.
// Al incrementarla, toda la caché anterior queda obsoleta sin tener que borrar claves una por una.
export const invalidarCacheMapaCalorService = async (): Promise<void> => {
    try {
        const redis = await obtenerRedis();
        await redis?.incr(CLAVE_VERSION_MAPA_CALOR);
    } catch (error) {
        console.error('No se pudo invalidar la caché del mapa de calor:', (error as Error).message);
    }
};

export interface FiltrosMapaCalor {
    localidadId?: number;
    desde?: Date;
    hasta?: Date;
}

// La API Node es la única puerta de entrada: autentica, aplica el alcance territorial
// y recién entonces consulta al motor, que no está expuesto fuera de la red interna.
const consultarMotor = async (ruta: string, parametros: Record<string, string>) => {
    const url = new URL(ruta, entorno.URL_MOTOR_PREDICTIVO);
    for (const [nombre, valor] of Object.entries(parametros)) url.searchParams.set(nombre, valor);

    let respuesta: Response;
    try {
        respuesta = await fetch(url, {
            headers: { 'x-clave-servicio': entorno.CLAVE_SERVICIO_INTERNO },
            signal: AbortSignal.timeout(TIEMPO_ESPERA_MOTOR_MS),
        });
    } catch {
        throw new ErrorHttp(503, 'El motor predictivo no está disponible');
    }

    if (!respuesta.ok) {
        console.error(`El motor predictivo respondió ${respuesta.status}`);
        throw new ErrorHttp(502, 'El motor predictivo devolvió un error');
    }

    return respuesta.json();
};

export const obtenerMapaCalorService = async (usuario: UsuarioAutenticado, filtros: FiltrosMapaCalor) => {
    const localidadId = alcanceLocalidad(usuario, filtros.localidadId);
    const { desde, hasta } = resolverRango(filtros.desde, filtros.hasta);

    return consultarMotor('/mapa-calor', {
        desde: desde.toISOString(),
        hasta: hasta.toISOString(),
        ...(localidadId !== null ? { localidad_id: String(localidadId) } : {}),
    });
};

// Riesgo esperado para las próximas 72 horas (lluvia pronosticada), calculado por el motor.
export const obtenerPrediccionesService = async (usuario: UsuarioAutenticado, localidadSolicitada?: number) => {
    const localidadId = alcanceLocalidad(usuario, localidadSolicitada);

    return consultarMotor('/predicciones', localidadId !== null ? { localidad_id: String(localidadId) } : {});
};
