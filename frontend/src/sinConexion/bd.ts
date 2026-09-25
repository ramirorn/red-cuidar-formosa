import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Deteccion, NivelTriaje, TipoReporte } from '@/tipos';

// Base local del dispositivo. La usan la app y el service worker (Background Sync y push).

export type EstadoEnCola = 'pendiente' | 'enviando' | 'error';

// Las fotos se guardan como bytes y no como Blob: algunos navegadores (Safari de iOS en versiones
// anteriores) no guardan Blobs en IndexedDB de forma confiable.
export interface FotoGuardada {
    datos: ArrayBuffer;
    tipo: string;
}

export interface ReporteEnCola {
    idCliente: string;
    tipo: TipoReporte;
    latitud: number;
    longitud: number;
    precisionGpsM?: number;
    capturadoEn: string;
    confianzaIa?: number;
    descripcion?: string;
    reporteResueltoId?: string;
    detecciones: Deteccion[];
    fotos: FotoGuardada[];
    estado: EstadoEnCola;
    intentos: number;
    ultimoError?: string;
    creadoEn: string;
}

export interface MensajeGuardado {
    id?: number;
    rol: 'usuario' | 'asistente';
    contenido: string;
    firma?: string;
    nivelTriaje?: NivelTriaje | null;
    fecha: string;
}

export interface AlertaRecibida {
    id?: number;
    titulo: string;
    cuerpo: string;
    url?: string;
    fecha: string;
}

interface EsquemaLocal extends DBSchema {
    ajustes: { key: string; value: unknown };
    cola: { key: string; value: ReporteEnCola; indexes: { porCreacion: string } };
    chat: { key: number; value: MensajeGuardado };
    alertas: { key: number; value: AlertaRecibida };
}

let conexion: Promise<IDBPDatabase<EsquemaLocal>> | null = null;

export const abrirBase = () => {
    conexion ??= openDB<EsquemaLocal>('red-cuidar-formosa', 1, {
        upgrade(bd) {
            bd.createObjectStore('ajustes');
            bd.createObjectStore('cola', { keyPath: 'idCliente' }).createIndex('porCreacion', 'creadoEn');
            bd.createObjectStore('chat', { keyPath: 'id', autoIncrement: true });
            bd.createObjectStore('alertas', { keyPath: 'id', autoIncrement: true });
        },
    });
    return conexion;
};

export const leerAjuste = async <T>(clave: string): Promise<T | undefined> => (await abrirBase()).get('ajustes', clave) as Promise<T | undefined>;
export const guardarAjuste = async (clave: string, valor: unknown) => { await (await abrirBase()).put('ajustes', valor, clave); };
export const borrarAjuste = async (clave: string) => { await (await abrirBase()).delete('ajustes', clave); };
