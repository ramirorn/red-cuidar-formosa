import { useSyncExternalStore } from 'react';

const suscribir = (avisar: () => void) => {
    window.addEventListener('online', avisar);
    window.addEventListener('offline', avisar);
    return () => {
        window.removeEventListener('online', avisar);
        window.removeEventListener('offline', avisar);
    };
};

export const useEnLinea = () => useSyncExternalStore(suscribir, () => navigator.onLine, () => true);
