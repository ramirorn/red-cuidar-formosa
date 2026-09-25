import { useCallback, useEffect, useState } from 'react';
import { Camera, ChevronDown, Crosshair, Info, LoaderCircle, X, ZoomIn } from 'lucide-react';
import { MapaManzanas } from '@/componentes/mapa/MapaManzanas';
import { BotonEnlace } from '@/componentes/ui/Boton';
import { ChipEstado, ESTADOS_MANZANA } from '@/componentes/ui/ChipEstado';
import { useManzanas } from '@/hooks/useVecino';
import type { Recuadro } from '@/api/vecino.api';
import { CENTRO_FORMOSA_CAPITAL, obtenerUbicacion } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { leerAjuste } from '@/sinConexion/bd';
import type { EstadoManzana, FeatureManzana } from '@/tipos';

const ORDEN: EstadoManzana[] = ['VERDE', 'AMARILLO', 'ROJO', 'SIN_DATOS'];

export default function MapaBarrio() {
    const [centro, setCentro] = useState<[number, number]>(CENTRO_FORMOSA_CAPITAL);
    const [ubicacion, setUbicacion] = useState<[number, number] | null>(null);
    const [recuadro, setRecuadro] = useState<Recuadro | null>(null);
    const [zoomBajo, setZoomBajo] = useState(false);
    const [seleccionada, setSeleccionada] = useState<FeatureManzana | null>(null);
    const [leyendaAbierta, setLeyendaAbierta] = useState(true);
    const [buscando, setBuscando] = useState(false);
    const { data, isFetching } = useManzanas(recuadro);

    useEffect(() => {
        void leerAjuste<{ latitud: number; longitud: number }>('ultimaUbicacion').then((guardada) => {
            if (guardada) {
                setCentro([guardada.latitud, guardada.longitud]);
                setUbicacion([guardada.latitud, guardada.longitud]);
            }
        });
    }, []);

    const alMover = useCallback((nuevo: Recuadro | null) => {
        setRecuadro(nuevo);
        setZoomBajo(nuevo === null);
    }, []);

    const irAMiUbicacion = async () => {
        setBuscando(true);
        try {
            const { latitud, longitud } = await obtenerUbicacion();
            setUbicacion([latitud, longitud]);
            setCentro([latitud, longitud]);
        } finally {
            setBuscando(false);
        }
    };

    const manzanas = data?.features ?? [];
    const verdes = manzanas.filter((manzana) => manzana.properties.estado === 'VERDE').length;
    const conDatos = manzanas.filter((manzana) => manzana.properties.estado !== 'SIN_DATOS').length;

    return (
        <div className="relative h-[calc(100dvh-8.5rem)] lg:h-[calc(100dvh-4rem)]">
            <MapaManzanas
                key={`${centro[0]},${centro[1]}`}
                centro={centro}
                zoom={17}
                manzanas={manzanas}
                seleccionadaId={seleccionada?.id ?? null}
                ubicacion={ubicacion}
                alMover={alMover}
                alElegir={setSeleccionada}
                className="size-full"
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex flex-col items-center gap-2 p-3">
                {conDatos > 0 && !zoomBajo && (
                    <p className="pointer-events-auto rounded-full bg-white px-4 py-2 text-sm font-extrabold shadow-elevada">
                        En esta zona: <span className="text-verde-700">{Math.round((verdes / conDatos) * 100)}% en verde</span>
                    </p>
                )}
                {zoomBajo && (
                    <p className="pointer-events-auto flex items-center gap-2 rounded-full bg-tinta px-4 py-2 text-sm font-bold text-white shadow-elevada">
                        <ZoomIn className="size-4" aria-hidden />Acercá el mapa para ver las manzanas
                    </p>
                )}
                {isFetching && <LoaderCircle className="size-5 animate-spin text-verde-700" aria-label="Cargando manzanas" />}
            </div>

            <div className="absolute bottom-4 left-3 z-[500]">
                <div className="rounded-2xl bg-white shadow-elevada">
                    <button type="button" onClick={() => setLeyendaAbierta(!leyendaAbierta)} aria-expanded={leyendaAbierta}
                        className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-sm font-extrabold">
                        <span className="flex items-center gap-2"><Info className="size-4" aria-hidden />Referencias</span>
                        <ChevronDown className={cn('size-4 transition', leyendaAbierta && 'rotate-180')} aria-hidden />
                    </button>
                    {leyendaAbierta && (
                        <ul className="space-y-2 px-4 pb-3">
                            {ORDEN.map((estado) => <li key={estado}><ChipEstado estado={estado} tamano="chico" /></li>)}
                        </ul>
                    )}
                </div>
            </div>

            <button type="button" onClick={irAMiUbicacion} aria-label="Ir a mi ubicación"
                className="absolute right-3 bottom-4 z-[500] grid size-12 place-items-center rounded-full bg-white shadow-elevada">
                {buscando ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Crosshair className="size-5" aria-hidden />}
            </button>

            {seleccionada && (
                <div role="dialog" aria-label={`Manzana ${seleccionada.properties.codigo}`} className="absolute inset-x-0 bottom-0 z-[600] rounded-t-panel bg-white p-5 shadow-elevada">
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <p className="text-xs font-extrabold tracking-widest text-gris-texto uppercase">Manzana</p>
                            <p className="text-2xl font-black">{seleccionada.properties.codigo}</p>
                        </div>
                        <button type="button" onClick={() => setSeleccionada(null)} aria-label="Cerrar" className="grid size-10 place-items-center rounded-full hover:bg-gris-superficie"><X aria-hidden /></button>
                    </div>
                    <ChipEstado estado={seleccionada.properties.estado} tamano="grande" className="mt-3" />
                    <p className="mt-3 text-sm leading-relaxed text-tinta-suave">{ESTADOS_MANZANA[seleccionada.properties.estado].descripcion}</p>
                    <BotonEnlace to="/app/escanear?nuevo=1" anchoCompleto className="mt-4" icono={<Camera className="size-4" aria-hidden />}>Reportar acá</BotonEnlace>
                </div>
            )}
        </div>
    );
}
