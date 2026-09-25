import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { ColeccionManzanas, Deteccion, NivelTriaje, TipoReporte } from '@/tipos';

// Base local del dispositivo. La usan la app y el service worker (Background Sync y push).

export type EstadoEnCola = 'pendiente' | 'enviando' | 'error';

// Las fotos se guardan como bytes y no como Blob: algunos navegadores (Safari de iOS en versiones
// anteriores) no guardan Blobs en IndexedDB de forma confiable.
export interface FotoGuardada {
    datos: ArrayBuffer;
    tipo: string;
}

// Privacidad: el reporte guarda solo la manzana (calculada en el celular), nunca coordenadas,
// y las fotos ya recortadas al objeto.
export interface ReporteEnCola {
    idCliente: string;
    tipo: TipoReporte;
    manzanaId: number;
    manzanaCodigo: string;
    capturadoEn: string;
    confianzaIa?: number;
    descripcion?: string;
    idClienteResuelto?: string;
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

// "Mis reportes": el servidor no sabe qué reportes son de este celular. Los recuerda el propio celular
// por su idCliente (que funciona como llave) para poder preguntar por su estado.
export interface ReportePropio {
    idCliente: string;
    tipo: TipoReporte;
    manzanaCodigo: string;
    creadoEn: string;
}

// Manzanas de una localidad descargadas para calcular la manzana sin enviar la ubicación.
export interface ManzanasDeLocalidad {
    localidadId: number;
    descargadoEn: string;
    coleccion: ColeccionManzanas;
}

interface EsquemaLocal extends DBSchema {
    ajustes: { key: string; value: unknown };
    cola: { key: string; value: ReporteEnCola; indexes: { porCreacion: string } };
    chat: { key: number; value: MensajeGuardado };
    alertas: { key: number; value: AlertaRecibida };
    propios: { key: string; value: ReportePropio; indexes: { porCreacion: string } };
    manzanas: { key: number; value: ManzanasDeLocalidad };
}

let conexion: Promise<IDBPDatabase<EsquemaLocal>> | null = null;

export const abrirBase = () => {
    conexion ??= openDB<EsquemaLocal>('red-cuidar-formosa', 2, {
        upgrade(bd, versionAnterior, _versionNueva, transaccion) {
            if (versionAnterior < 1) {
                bd.createObjectStore('ajustes');
                bd.createObjectStore('cola', { keyPath: 'idCliente' }).createIndex('porCreacion', 'creadoEn');
                bd.createObjectStore('chat', { keyPath: 'id', autoIncrement: true });
                bd.createObjectStore('alertas', { keyPath: 'id', autoIncrement: true });
            }
            if (versionAnterior < 2) {
                bd.createObjectStore('propios', { keyPath: 'idCliente' }).createIndex('porCreacion', 'creadoEn');
                bd.createObjectStore('manzanas', { keyPath: 'localidadId' });
                // La versión 1 guardaba coordenadas y fotos completas en la cola: se descartan.
                if (versionAnterior >= 1) {
                    void transaccion.objectStore('cola').clear();
                    void transaccion.objectStore('ajustes').delete('ultimaUbicacion');
                }
            }
        },
    });
    return conexion;
};

export const leerAjuste = async <T>(clave: string): Promise<T | undefined> => (await abrirBase()).get('ajustes', clave) as Promise<T | undefined>;
export const guardarAjuste = async (clave: string, valor: unknown) => { await (await abrirBase()).put('ajustes', valor, clave); };
export const borrarAjuste = async (clave: string) => { await (await abrirBase()).delete('ajustes', clave); };
