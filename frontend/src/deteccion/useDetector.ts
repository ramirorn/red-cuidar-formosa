import { useCallback, useEffect, useRef, useState } from 'react';
import type { Deteccion } from '@/tipos';
import type { MensajeAlDetector, MensajeDelDetector } from './detector.worker';

export type EstadoDetector = 'cargando' | 'listo' | 'no-disponible';

const TIEMPO_MAXIMO_CARGA_MS = 25_000;

// Envuelve el worker de detección: una sola imagen en proceso por vez (se descartan cuadros intermedios).
export const useDetector = () => {
    const [estado, setEstado] = useState<EstadoDetector>('cargando');
    const worker = useRef<Worker | null>(null);
    const pendientes = useRef(new Map<number, (detecciones: Deteccion[]) => void>());
    const siguienteId = useRef(0);

    useEffect(() => {
        const nuevo = new Worker(new URL('./detector.worker.ts', import.meta.url), { type: 'module' });
        worker.current = nuevo;
        nuevo.onmessage = ({ data }: MessageEvent<MensajeDelDetector>) => {
            if (data.tipo === 'listo') setEstado('listo');
            else if (data.tipo === 'no-disponible') setEstado('no-disponible');
            else {
                pendientes.current.get(data.id)?.(data.detecciones);
                pendientes.current.delete(data.id);
            }
        };
        nuevo.onerror = () => setEstado('no-disponible');
        nuevo.postMessage({ tipo: 'cargar' } satisfies MensajeAlDetector);
        // Con mala conexión la primera descarga del modelo puede no terminar nunca: se sigue sin IA.
        const limite = setTimeout(() => setEstado((actual) => (actual === 'cargando' ? 'no-disponible' : actual)), TIEMPO_MAXIMO_CARGA_MS);
        const enEspera = pendientes.current;
        return () => {
            clearTimeout(limite);
            nuevo.terminate();
            worker.current = null;
            enEspera.forEach((resolver) => resolver([]));
            enEspera.clear();
        };
    }, []);

    const detectar = useCallback(async (origen: ImageBitmapSource): Promise<Deteccion[]> => {
        if (!worker.current || estado !== 'listo') return [];
        const imagen = await createImageBitmap(origen);
        const id = siguienteId.current++;
        return new Promise((resolver) => {
            pendientes.current.set(id, resolver);
            worker.current?.postMessage({ tipo: 'detectar', id, imagen } satisfies MensajeAlDetector, [imagen]);
        });
    }, [estado]);

    return { estado, detectar };
};
