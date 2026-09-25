import { useCallback, useEffect, useMemo, useState } from 'react';
import { useMap } from 'react-leaflet';
import { LocateFixed, ZoomIn } from 'lucide-react';
import type { Recuadro } from '@/api/vecino.api';
import { MapaManzanas, ZOOM_MINIMO_MANZANAS } from '@/componentes/mapa/MapaManzanas';
import { recuadroAlrededor } from '@/lib/geo';
import { manzanasEnArea } from '@/sinConexion/manzanasLocales';
import type { ColeccionManzanas } from '@/tipos';

// Botón dentro del mapa que vuelve a la ubicación del vecino después de moverlo. Si la ubicación
// cambia (Actualizar ubicación), el mapa la sigue.
const BotonCentrar = ({ centro }: { centro: [number, number] }) => {
    const mapa = useMap();
    const [latitud, longitud] = centro;
    useEffect(() => { mapa.setView([latitud, longitud], mapa.getZoom()); }, [mapa, latitud, longitud]);
    return (
        <button type="button" onClick={() => mapa.flyTo(centro, 17, { duration: 0.5 })} aria-label="Volver a mi ubicación"
            className="absolute right-2.5 bottom-2.5 z-[500] grid size-10 place-items-center rounded-xl bg-white text-tinta shadow-elevada transition active:scale-95">
            <LocateFixed className="size-5" aria-hidden />
        </button>
    );
};

interface Propiedades {
    coleccion: ColeccionManzanas | null;
    ubicacion: [number, number];
    seleccionadaId: number | null;
    className?: string;
}

// Mapa chico de "tu manzana": se puede mover y acercar, y dibuja las manzanas de lo que está a la vista
// (salen de la copia local de la localidad, así que funciona sin conexión).
export const MapaMiManzana = ({ coleccion, ubicacion, seleccionadaId, className }: Propiedades) => {
    const [vista, setVista] = useState<{ recuadro: Recuadro | null; lejos: boolean }>({ recuadro: null, lejos: false });
    const alMover = useCallback((recuadro: Recuadro | null, zoom: number) => setVista({ recuadro, lejos: zoom < ZOOM_MINIMO_MANZANAS }), []);
    const manzanas = useMemo(() => {
        if (!coleccion || vista.lejos) return [];
        return manzanasEnArea(coleccion, vista.recuadro ?? recuadroAlrededor(ubicacion[0], ubicacion[1]));
    }, [coleccion, vista, ubicacion]);

    return (
        <MapaManzanas centro={ubicacion} zoom={17} manzanas={manzanas} seleccionadaId={seleccionadaId} ubicacion={ubicacion}
            alMover={alMover} enLienzo className={className}>
            <BotonCentrar centro={ubicacion} />
            {vista.lejos && (
                <p className="pointer-events-none absolute inset-x-0 top-2.5 z-[500] mx-auto flex w-fit items-center gap-1.5 rounded-full bg-tinta px-3 py-1.5 text-xs font-bold text-white">
                    <ZoomIn className="size-3.5" aria-hidden />Acercá para ver las manzanas
                </p>
            )}
        </MapaManzanas>
    );
};
