import "dotenv/config";

// Lee y valida las variables de entorno al arrancar: si falta algo crítico, el proceso no inicia.

const requerida = (nombre: string): string => {
    const valor = process.env[nombre];
    if (!valor) {
        throw new Error(`Falta la variable de entorno obligatoria ${nombre}`);
    }
    return valor;
};

const secreto = (nombre: string): string => {
    const valor = requerida(nombre);
    if (valor.length < 32) {
        throw new Error(`La variable ${nombre} debe tener al menos 32 caracteres`);
    }
    return valor;
};

const numero = (nombre: string, porDefecto: number): number => {
    const valor = process.env[nombre];
    if (valor === undefined || valor === "") return porDefecto;
    const convertido = Number(valor);
    if (Number.isNaN(convertido)) {
        throw new Error(`La variable ${nombre} debe ser numérica`);
    }
    return convertido;
};

const entorno = {
    NODE_ENV: process.env.NODE_ENV ?? "development",
    PORT: numero("PORT", 3000),
    JWT_SECRET: secreto("JWT_SECRET"),
    JWT_SECRET_SESIONES: secreto("JWT_SECRET_SESIONES"),
    CLAVE_SERVICIO_INTERNO: secreto("CLAVE_SERVICIO_INTERNO"),
    CORS_ORIGENES: (process.env.CORS_ORIGENES ?? "http://localhost:5173")
        .split(",")
        .map((origen) => origen.trim())
        .filter(Boolean),
    CONFIAR_PROXY: numero("CONFIAR_PROXY", 0),
    DIR_EVIDENCIAS: process.env.DIR_EVIDENCIAS ?? "./almacenamiento/evidencias",
    REDIS_URL: process.env.REDIS_URL ?? "",
    URL_MOTOR_PREDICTIVO: process.env.URL_MOTOR_PREDICTIVO ?? "http://localhost:8000",
    // Recuadro aproximado de la provincia de Formosa: descarta coordenadas fuera del territorio.
    LIMITES_PROVINCIA: {
        latitudMinima: numero("LATITUD_MINIMA", -27.0),
        latitudMaxima: numero("LATITUD_MAXIMA", -21.9),
        longitudMinima: numero("LONGITUD_MINIMA", -62.4),
        longitudMaxima: numero("LONGITUD_MAXIMA", -57.5),
    },
};

export const esProduccion = entorno.NODE_ENV === "production";

export default entorno;
