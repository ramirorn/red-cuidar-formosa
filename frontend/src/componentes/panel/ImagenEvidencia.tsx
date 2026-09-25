import { useEffect, useState } from 'react';
import { ImageOff, LoaderCircle, Maximize2 } from 'lucide-react';
import { NOMBRES_CLASE } from '@/deteccion/clases';
import { useImagenEvidencia } from '@/hooks/usePanel';
import { cn } from '@/lib/utils';
import type { Deteccion } from '@/tipos';
import type { EvidenciaBreve } from '@/tipos/panel';
import { Dialogo } from './Dialogo';

const useUrlObjeto = (blob: Blob | undefined) => {
    const [url, setUrl] = useState<string | null>(null);
    useEffect(() => {
        if (!blob) return undefined;
        const nueva = URL.createObjectURL(blob);
        setUrl(nueva);
        return () => URL.revokeObjectURL(nueva);
    }, [blob]);
    return url;
};

// Recuadros de la IA sobre la foto (coordenadas normalizadas 0–1).
const Recuadros = ({ detecciones }: { detecciones: Deteccion[] }) => (
    <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
        {detecciones.map((deteccion, indice) => (
            <rect key={indice} x={deteccion.cajaDelimitadora.x * 100} y={deteccion.cajaDelimitadora.y * 100}
                width={deteccion.cajaDelimitadora.ancho * 100} height={deteccion.cajaDelimitadora.alto * 100}
                fill="none" stroke="#e11b22" strokeWidth={3} vectorEffect="non-scaling-stroke" />
        ))}
    </svg>
);

interface Propiedades {
    evidencia: EvidenciaBreve;
    detecciones?: Deteccion[];
    className?: string;
}

// Foto protegida: se descarga con el token (cada descarga queda en la auditoría) y se muestra desde memoria.
export const ImagenEvidencia = ({ evidencia, detecciones = [], className }: Propiedades) => {
    const { data, isLoading, error } = useImagenEvidencia(evidencia.id);
    const url = useUrlObjeto(data);
    const [ampliada, setAmpliada] = useState(false);
    const etiqueta = evidencia.momento === 'DESPUES' ? 'Después de limpiar' : 'Foto del vecino';

    return (
        <figure className={cn('overflow-hidden rounded-tarjeta border border-gris-borde bg-gris-superficie', className)}>
            <div className="relative" style={{ aspectRatio: `${evidencia.ancho} / ${evidencia.alto}` }}>
                {isLoading && <span className="absolute inset-0 grid place-items-center"><LoaderCircle className="size-6 animate-spin text-gris-texto" aria-label="Cargando foto" /></span>}
                {error && (
                    <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-sm font-bold text-gris-texto">
                        <ImageOff className="size-6" aria-hidden />No se pudo cargar la foto
                    </span>
                )}
                {url && (
                    <button type="button" onClick={() => setAmpliada(true)} className="group absolute inset-0" aria-label={`Ampliar: ${etiqueta}`}>
                        <img src={url} alt={etiqueta} className="size-full object-cover" />
                        <Recuadros detecciones={detecciones} />
                        <span className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-black/55 text-white opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">
                            <Maximize2 className="size-4" aria-hidden />
                        </span>
                    </button>
                )}
            </div>
            <figcaption className="flex items-center justify-between px-4 py-2.5 text-xs font-bold text-tinta-suave">
                <span>{etiqueta}</span><span>{evidencia.ancho}×{evidencia.alto}</span>
            </figcaption>

            <Dialogo abierto={ampliada} alCambiar={setAmpliada} titulo={etiqueta} className="sm:max-w-4xl">
                {url && (
                    <div className="relative">
                        <img src={url} alt={etiqueta} className="w-full rounded-2xl" />
                        <Recuadros detecciones={detecciones} />
                    </div>
                )}
                {detecciones.length > 0 && (
                    <p className="mt-3 text-sm text-tinta-suave">
                        La IA marcó: {detecciones.map((deteccion) => `${NOMBRES_CLASE[deteccion.clase]} (${Math.round(deteccion.confianza * 100)}%)`).join(', ')}.
                    </p>
                )}
            </Dialogo>
        </figure>
    );
};
