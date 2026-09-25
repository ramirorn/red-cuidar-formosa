// Token de acceso del personal institucional.
// - El token de acceso (15 min) vive solo en memoria: no queda en el disco ni al alcance de otra pestaña.
// - El de refresco lo maneja el navegador en una cookie httpOnly; el JavaScript nunca lo ve.
// - El backend rota el token de refresco en cada uso y, si recibe uno ya usado, cierra todas las
//   sesiones. Por eso el refresco es de a uno: una sola promesa por pestaña y un candado entre pestañas.

let tokenAcceso: string | null = null;
let refrescoEnCurso: Promise<string | null> | null = null;

const CANDADO_REFRESCO = 'red-cuidar-refresco-panel';

type Oyente = () => void;
const oyentesExpiracion = new Set<Oyente>();

export const leerToken = () => tokenAcceso;

export const guardarToken = (token: string | null) => {
    tokenAcceso = token;
};

export const alExpirarSesion = (oyente: Oyente) => {
    oyentesExpiracion.add(oyente);
    return () => { oyentesExpiracion.delete(oyente); };
};

export const avisarSesionExpirada = () => {
    tokenAcceso = null;
    oyentesExpiracion.forEach((oyente) => oyente());
};

const pedirRefresco = async (): Promise<string | null> => {
    const respuesta = await fetch('/api/auth/refrescar', { method: 'POST', credentials: 'same-origin' });
    if (!respuesta.ok) return null;
    const cuerpo = (await respuesta.json()) as { data?: { token?: string } };
    return cuerpo.data?.token ?? null;
};

// Devuelve un token nuevo o null si la sesión ya no es válida. Nunca lanza por un 401.
export const refrescarToken = (): Promise<string | null> => {
    refrescoEnCurso ??= (async () => {
        try {
            const token = typeof navigator !== 'undefined' && 'locks' in navigator
                ? await navigator.locks.request(CANDADO_REFRESCO, pedirRefresco)
                : await pedirRefresco();
            tokenAcceso = token;
            return token;
        } finally {
            refrescoEnCurso = null;
        }
    })();
    return refrescoEnCurso;
};
