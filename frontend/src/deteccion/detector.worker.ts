/// <reference lib="webworker" />
import * as tf from '@tensorflow/tfjs';
import { load, type ObjectDetection } from '@tensorflow-models/coco-ssd';
import type { Deteccion } from '@/tipos';
import { CLASES_COCO, CONFIANZA_MINIMA } from './clases';

// El modelo corre fuera del hilo principal para que la cámara no se trabe.

export type MensajeAlDetector =
    | { tipo: 'cargar' }
    | { tipo: 'detectar'; id: number; imagen: ImageBitmap };

export type MensajeDelDetector =
    | { tipo: 'listo' }
    | { tipo: 'no-disponible'; motivo: string }
    | { tipo: 'resultado'; id: number; detecciones: Deteccion[] };

const contexto = self as unknown as DedicatedWorkerGlobalScope;
let modelo: Promise<ObjectDetection> | null = null;

const cargarModelo = () => {
    modelo ??= (async () => {
        // WebGL es mucho más rápido; si el celular no lo soporta, se usa el procesador.
        if (!(await tf.setBackend('webgl').catch(() => false))) await tf.setBackend('cpu');
        await tf.ready();
        return load({ base: 'lite_mobilenet_v2' });
    })();
    return modelo;
};

contexto.onmessage = async ({ data }: MessageEvent<MensajeAlDetector>) => {
    if (data.tipo === 'cargar') {
        try {
            await cargarModelo();
            contexto.postMessage({ tipo: 'listo' } satisfies MensajeDelDetector);
        } catch (error) {
            modelo = null;
            contexto.postMessage({ tipo: 'no-disponible', motivo: (error as Error).message } satisfies MensajeDelDetector);
        }
        return;
    }

    const { id, imagen } = data;
    try {
        const detector = await cargarModelo();
        // El tensor vive en la memoria de la GPU: se libera apenas termina la detección.
        const tensor = tf.browser.fromPixels(imagen);
        const predicciones = await detector.detect(tensor, 20, CONFIANZA_MINIMA).finally(() => tensor.dispose());
        const detecciones: Deteccion[] = predicciones.flatMap((prediccion) => {
            const clase = CLASES_COCO[prediccion.class];
            if (!clase) return [];
            const [x, y, ancho, alto] = prediccion.bbox;
            const recortar = (valor: number) => Math.min(1, Math.max(0, valor));
            return [{
                clase,
                confianza: Math.round(prediccion.score * 1000) / 1000,
                cajaDelimitadora: {
                    x: recortar(x / imagen.width),
                    y: recortar(y / imagen.height),
                    ancho: recortar(ancho / imagen.width),
                    alto: recortar(alto / imagen.height),
                },
            }];
        });
        contexto.postMessage({ tipo: 'resultado', id, detecciones } satisfies MensajeDelDetector);
    } catch {
        contexto.postMessage({ tipo: 'resultado', id, detecciones: [] } satisfies MensajeDelDetector);
    } finally {
        imagen.close();
    }
};
