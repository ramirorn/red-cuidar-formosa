import { abrirBase, type FotoGuardada, type ReporteEnCola } from './bd';
import { obtenerSesion, renovarSesion } from './sesion';

// Cola de reportes del vecino: todo reporte se guarda primero en el dispositivo y después se envía.
// Así funciona igual con o sin señal. El `idCliente` hace que reenviar el mismo reporte sea seguro:
// el backend responde 200 con el reporte que ya tenía en lugar de duplicarlo.

export const CANAL_COLA = 'red-cuidar-cola';
export const ETIQUETA_SINCRONIZACION = 'sincronizar-reportes';

// Errores definitivos: reintentar no cambia el resultado (datos o foto inválidos, foto repetida).
const ESTADOS_DEFINITIVOS = new Set([400, 409, 413, 415, 422]);

export type NuevoReporte = Omit<ReporteEnCola, 'estado' | 'intentos' | 'ultimoError' | 'creadoEn' | 'fotos'> & { fotos: Blob[] };

export const fotoComoBlob = (foto: FotoGuardada) => new Blob([foto.datos], { type: foto.tipo });

export interface ResultadoSincronizacion {
    enviados: number;
    pendientes: number;
    errores: number;
}

const avisarCambio = () => {
    if (typeof BroadcastChannel === 'undefined') return;
    const canal = new BroadcastChannel(CANAL_COLA);
    canal.postMessage({ tipo: 'cambio' });
    canal.close();
};

export const listarCola = async (): Promise<ReporteEnCola[]> =>
    (await abrirBase()).getAllFromIndex('cola', 'porCreacion');

export const encolarReporte = async ({ fotos, ...reporte }: NuevoReporte) => {
    const guardadas = await Promise.all(fotos.map(async (foto) => ({ datos: await foto.arrayBuffer(), tipo: foto.type || 'image/jpeg' })));
    const creadoEn = new Date().toISOString();
    const bd = await abrirBase();
    await bd.put('cola', { ...reporte, fotos: guardadas, estado: 'pendiente', intentos: 0, creadoEn });
    // El celular recuerda sus propios reportes: el servidor no guarda de quién es cada uno.
    await bd.put('propios', { idCliente: reporte.idCliente, tipo: reporte.tipo, manzanaCodigo: reporte.manzanaCodigo, creadoEn });
    avisarCambio();
};

export const descartarDeCola = async (idCliente: string) => {
    const bd = await abrirBase();
    await bd.delete('cola', idCliente);
    await bd.delete('propios', idCliente);
    avisarCambio();
};

// Pasados 30 días se olvidan (en el servidor ya se decidieron o se descartaron).
const RECORDAR_PROPIOS_MS = 30 * 24 * 60 * 60 * 1000;

export const listarPropios = async () => {
    const bd = await abrirBase();
    const todos = await bd.getAllFromIndex('propios', 'porCreacion');
    const limite = Date.now() - RECORDAR_PROPIOS_MS;
    const viejos = todos.filter((propio) => new Date(propio.creadoEn).getTime() < limite);
    await Promise.all(viejos.map((propio) => bd.delete('propios', propio.idCliente)));
    return todos.filter((propio) => !viejos.includes(propio)).reverse();
};

export const reintentarReporte = async (idCliente: string) => {
    const bd = await abrirBase();
    const reporte = await bd.get('cola', idCliente);
    if (reporte) await bd.put('cola', { ...reporte, estado: 'pendiente' });
    avisarCambio();
};

const armarFormulario = (reporte: ReporteEnCola) => {
    const formulario = new FormData();
    formulario.set('idCliente', reporte.idCliente);
    formulario.set('tipo', reporte.tipo);
    // Solo la manzana: la ubicación exacta nunca sale del celular.
    formulario.set('manzanaId', String(reporte.manzanaId));
    formulario.set('capturadoEn', reporte.capturadoEn);
    if (reporte.confianzaIa !== undefined) formulario.set('confianzaIa', reporte.confianzaIa.toFixed(3));
    if (reporte.descripcion) formulario.set('descripcion', reporte.descripcion);
    if (reporte.idClienteResuelto) formulario.set('idClienteResuelto', reporte.idClienteResuelto);
    if (reporte.detecciones.length > 0) formulario.set('detecciones', JSON.stringify(reporte.detecciones));
    reporte.fotos.forEach((foto, indice) => formulario.append('imagenes', fotoComoBlob(foto), `foto-${indice + 1}.jpg`));
    return formulario;
};

const enviar = async (reporte: ReporteEnCola, token: string) => fetch('/api/reportes', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: armarFormulario(reporte),
});

const sincronizarAhora = async (): Promise<ResultadoSincronizacion> => {
    const bd = await abrirBase();
    const resultado: ResultadoSincronizacion = { enviados: 0, pendientes: 0, errores: 0 };

    for (const reporte of await listarCola()) {
        if (reporte.estado === 'error') {
            resultado.errores++;
            continue;
        }

        try {
            let { token } = await obtenerSesion();
            let respuesta = await enviar(reporte, token);
            if (respuesta.status === 401) {
                ({ token } = await renovarSesion());
                respuesta = await enviar(reporte, token);
            }

            if (respuesta.ok) {
                await bd.delete('cola', reporte.idCliente);
                resultado.enviados++;
            } else if (ESTADOS_DEFINITIVOS.has(respuesta.status)) {
                const cuerpo = (await respuesta.json().catch(() => null)) as { message?: string } | null;
                await bd.put('cola', { ...reporte, estado: 'error', intentos: reporte.intentos + 1, ultimoError: cuerpo?.message?.slice(0, 200) ?? 'El reporte no es válido' });
                resultado.errores++;
            } else {
                // 429, 5xx: se reintenta más tarde.
                await bd.put('cola', { ...reporte, estado: 'pendiente', intentos: reporte.intentos + 1 });
                resultado.pendientes++;
            }
        } catch {
            // Sin conexión: queda pendiente para la próxima oportunidad.
            resultado.pendientes++;
        }
    }

    avisarCambio();
    return resultado;
};

// Un solo envío a la vez entre la app y el service worker (Web Locks donde está disponible).
export const sincronizarCola = async (): Promise<ResultadoSincronizacion> => {
    if (typeof navigator !== 'undefined' && 'locks' in navigator) {
        // await aplana la promesa que devuelve el candado.
        return await navigator.locks.request(ETIQUETA_SINCRONIZACION, sincronizarAhora);
    }
    return sincronizarAhora();
};

interface RegistroConSincronizacion extends ServiceWorkerRegistration {
    sync?: { register: (etiqueta: string) => Promise<void> };
}

// Pide al navegador que envíe la cola cuando haya señal, aunque el vecino cierre la app
// (Background Sync; donde no existe, se envía al volver a abrirla).
export const pedirSincronizacionEnSegundoPlano = async () => {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    const registro = (await navigator.serviceWorker.getRegistration()) as RegistroConSincronizacion | undefined;
    await registro?.sync?.register(ETIQUETA_SINCRONIZACION).catch(() => undefined);
};
