import { borrarAjuste, guardarAjuste, leerAjuste } from './bd';

// Sesión anónima del vecino.
// El token se guarda en IndexedDB (no en memoria como el del panel) a propósito: tiene que sobrevivir
// al cierre del navegador y estar disponible para el service worker cuando envía reportes sin la app
// abierta. Es anónimo, no identifica a nadie y solo sirve para las rutas ciudadanas.

interface SesionGuardada {
    sesionId: string;
    token: string;
}

const CLAVE = 'sesion';
let enCurso: Promise<SesionGuardada> | null = null;

const crearSesion = async (): Promise<SesionGuardada> => {
    const respuesta = await fetch('/api/sesiones', { method: 'POST' });
    if (!respuesta.ok) throw new Error(`No se pudo crear la sesión (${respuesta.status})`);
    const { data } = (await respuesta.json()) as { data: SesionGuardada };
    await guardarAjuste(CLAVE, data);
    return data;
};

export const obtenerSesion = (): Promise<SesionGuardada> => {
    enCurso ??= (async () => (await leerAjuste<SesionGuardada>(CLAVE)) ?? crearSesion())()
        .finally(() => { enCurso = null; });
    return enCurso;
};

// La sesión se borra en el servidor tras 30 días sin uso: si el token deja de valer, se crea otra.
export const renovarSesion = async (): Promise<SesionGuardada> => {
    await borrarAjuste(CLAVE);
    return obtenerSesion();
};
