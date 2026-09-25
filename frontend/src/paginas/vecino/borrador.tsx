import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { recorteSugerido } from '@/lib/recorte';
import type { CajaDelimitadora, Deteccion, TipoReporte } from '@/tipos';

// Reporte en armado: vive en memoria mientras el vecino pasa del escáner a la confirmación.
// Recién al enviarlo se guarda en la cola del dispositivo.

export const MAXIMO_FOTOS = 3;

export interface FotoBorrador {
    id: string;
    blob: Blob;
    url: string;
    ancho: number;
    alto: number;
    detecciones: Deteccion[];
    capturadaEn: string;
    // Parte de la foto que se envía (normalizada). null: todavía no se marcó el recipiente.
    recorte: CajaDelimitadora | null;
}

interface Borrador {
    tipo: TipoReporte | null;
    idClienteResuelto: string | null;
    fotos: FotoBorrador[];
}

interface ContextoBorrador extends Borrador {
    iniciar: (opciones: { tipo?: TipoReporte; idClienteResuelto?: string }) => void;
    elegirTipo: (tipo: TipoReporte) => void;
    agregarFoto: (foto: Omit<FotoBorrador, 'id' | 'url' | 'recorte'>) => void;
    ajustarRecorte: (id: string, recorte: CajaDelimitadora) => void;
    quitarFoto: (id: string) => void;
    descartar: () => void;
}

const VACIO: Borrador = { tipo: null, idClienteResuelto: null, fotos: [] };
const Contexto = createContext<ContextoBorrador | null>(null);

export const ProveedorBorrador = ({ children }: { children: ReactNode }) => {
    const [borrador, setBorrador] = useState<Borrador>(VACIO);

    const liberar = (fotos: FotoBorrador[]) => fotos.forEach((foto) => URL.revokeObjectURL(foto.url));

    const iniciar = useCallback((opciones: { tipo?: TipoReporte; idClienteResuelto?: string }) => setBorrador((actual) => {
        liberar(actual.fotos);
        return { tipo: opciones.tipo ?? null, idClienteResuelto: opciones.idClienteResuelto ?? null, fotos: [] };
    }), []);

    // El recorte arranca en lo que marcó la IA; si no marcó nada, el vecino lo marca a mano.
    const agregarFoto = useCallback((foto: Omit<FotoBorrador, 'id' | 'url' | 'recorte'>) => setBorrador((actual) => (
        actual.fotos.length >= MAXIMO_FOTOS
            ? actual
            : { ...actual, fotos: [...actual.fotos, { ...foto, id: crypto.randomUUID(), url: URL.createObjectURL(foto.blob), recorte: recorteSugerido(foto.detecciones) }] }
    )), []);

    const ajustarRecorte = useCallback((id: string, recorte: CajaDelimitadora) => setBorrador((actual) => ({
        ...actual,
        fotos: actual.fotos.map((foto) => (foto.id === id ? { ...foto, recorte } : foto)),
    })), []);

    const quitarFoto = useCallback((id: string) => setBorrador((actual) => {
        liberar(actual.fotos.filter((foto) => foto.id === id));
        return { ...actual, fotos: actual.fotos.filter((foto) => foto.id !== id) };
    }), []);

    const valor = useMemo<ContextoBorrador>(() => ({
        ...borrador,
        iniciar,
        elegirTipo: (tipo) => setBorrador((actual) => ({ ...actual, tipo })),
        agregarFoto,
        ajustarRecorte,
        quitarFoto,
        descartar: () => setBorrador((actual) => {
            liberar(actual.fotos);
            return VACIO;
        }),
    }), [borrador, iniciar, agregarFoto, ajustarRecorte, quitarFoto]);

    return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
};

export const useBorrador = () => {
    const contexto = useContext(Contexto);
    if (!contexto) throw new Error('useBorrador debe usarse dentro de ProveedorBorrador');
    return contexto;
};
