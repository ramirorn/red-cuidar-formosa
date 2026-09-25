import { useCallback, useEffect, useState } from 'react';
import { vecinoApi } from '@/api/vecino.api';
import { borrarAjuste, guardarAjuste, leerAjuste } from '@/sinConexion/bd';
import { errorAmigable } from '@/lib/errores';

const aUint8 = (base64: string) => {
    const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
    const binario = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binario, (letra) => letra.charCodeAt(0));
};

// rechazado: el vecino eligió no recibir alertas (queda guardado hasta que toque "Quiero recibirlas").
export type EstadoPush = 'cargando' | 'no-soportado' | 'rechazado' | 'denegado' | 'inactivo' | 'activo';

const RECHAZO = 'alertasRechazadas';

// Suscripción a las alertas post-lluvia (Web Push).
export const usePush = () => {
    const [estado, setEstado] = useState<EstadoPush>('cargando');
    const [localidadId, setLocalidadId] = useState<number | undefined>();
    const [error, setError] = useState<string | null>(null);

    const soportado = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

    const actualizar = useCallback(async () => {
        if (!soportado) return setEstado('no-soportado');
        setLocalidadId(await leerAjuste<number>('localidadAlertas'));
        const registro = await navigator.serviceWorker.getRegistration();
        const suscripcion = Notification.permission === 'granted' ? await registro?.pushManager.getSubscription() : null;
        if (suscripcion) return setEstado('activo');
        if (await leerAjuste<boolean>(RECHAZO)) return setEstado('rechazado');
        return setEstado(Notification.permission === 'denied' ? 'denegado' : 'inactivo');
    }, [soportado]);

    useEffect(() => { void actualizar(); }, [actualizar]);

    const activar = async (idLocalidad: number) => {
        setError(null);
        try {
            const permiso = await Notification.requestPermission();
            // Cerrar el aviso del navegador o bloquearlo cuenta como "no": se recuerda.
            if (permiso !== 'granted') {
                await guardarAjuste(RECHAZO, true);
                return setEstado('rechazado');
            }
            await borrarAjuste(RECHAZO);
            const registro = await navigator.serviceWorker.ready;
            const clave = await vecinoApi.clavePublicaPush();
            const suscripcion = await registro.pushManager.getSubscription()
                ?? await registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: aUint8(clave) });
            await vecinoApi.guardarSuscripcion(suscripcion.toJSON(), idLocalidad);
            await guardarAjuste('localidadAlertas', idLocalidad);
            setLocalidadId(idLocalidad);
            return setEstado('activo');
        } catch (causa) {
            setError(errorAmigable(causa, 'No pudimos activar las alertas. Probá de nuevo más tarde.'));
            return undefined;
        }
    };

    const desactivar = async () => {
        setError(null);
        try {
            const registro = await navigator.serviceWorker.ready;
            const suscripcion = await registro.pushManager.getSubscription();
            if (suscripcion) {
                await vecinoApi.eliminarSuscripcion(suscripcion.endpoint).catch(() => undefined);
                await suscripcion.unsubscribe();
            }
            await guardarAjuste(RECHAZO, true);
            setEstado('rechazado');
        } catch (causa) {
            setError(errorAmigable(causa, 'No pudimos desactivar las alertas.'));
        }
    };

    // Vuelve a mostrar la opción de activar. Si el navegador las bloqueó, hay que habilitarlas desde su configuración.
    const volverAOfrecer = async () => {
        setError(null);
        await borrarAjuste(RECHAZO);
        setEstado(Notification.permission === 'denied' ? 'denegado' : 'inactivo');
    };

    return { estado, localidadId, error, activar, desactivar, volverAOfrecer };
};
