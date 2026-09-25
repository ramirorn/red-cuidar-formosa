import { useCallback, useEffect, useState } from 'react';
import { vecinoApi } from '@/api/vecino.api';
import { guardarAjuste, leerAjuste } from '@/sinConexion/bd';
import { errorAmigable } from '@/lib/errores';

const aUint8 = (base64: string) => {
    const relleno = '='.repeat((4 - (base64.length % 4)) % 4);
    const binario = atob((base64 + relleno).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from(binario, (letra) => letra.charCodeAt(0));
};

export type EstadoPush = 'cargando' | 'no-soportado' | 'denegado' | 'inactivo' | 'activo';

// Suscripción a las alertas post-lluvia (Web Push).
export const usePush = () => {
    const [estado, setEstado] = useState<EstadoPush>('cargando');
    const [localidadId, setLocalidadId] = useState<number | undefined>();
    const [error, setError] = useState<string | null>(null);

    const soportado = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

    const actualizar = useCallback(async () => {
        if (!soportado) return setEstado('no-soportado');
        if (Notification.permission === 'denied') return setEstado('denegado');
        setLocalidadId(await leerAjuste<number>('localidadAlertas'));
        const registro = await navigator.serviceWorker.getRegistration();
        const suscripcion = await registro?.pushManager.getSubscription();
        return setEstado(suscripcion ? 'activo' : 'inactivo');
    }, [soportado]);

    useEffect(() => { void actualizar(); }, [actualizar]);

    const activar = async (idLocalidad: number) => {
        setError(null);
        try {
            const permiso = await Notification.requestPermission();
            if (permiso !== 'granted') return setEstado('denegado');
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
            setEstado('inactivo');
        } catch (causa) {
            setError(errorAmigable(causa, 'No pudimos desactivar las alertas.'));
        }
    };

    return { estado, localidadId, error, activar, desactivar };
};
