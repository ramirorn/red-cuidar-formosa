import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { divIcon, latLngBounds } from 'leaflet';
import type { ParadaRuta } from '@/tipos/panel';

// Ícono numerado: verde si ya se visitó, rojo si es la próxima, blanco el resto.
const iconoParada = (orden: number, visitada: boolean, proxima: boolean) => divIcon({
    className: '',
    iconSize: [30, 30],
    iconAnchor: [15, 15],
    html: `<span style="display:grid;place-items:center;width:30px;height:30px;border-radius:9999px;font:800 13px Nunito,sans-serif;
        border:2.5px solid ${visitada ? '#fff' : '#1a1a1a'};
        background:${visitada ? '#187526' : proxima ? '#e11b22' : '#fff'};
        color:${visitada || proxima ? '#fff' : '#1a1a1a'};
        box-shadow:0 2px 6px rgb(0 0 0 / .3)">${visitada ? '✓' : orden}</span>`,
});

const Encuadrar = ({ puntos }: { puntos: [number, number][] }) => {
    const mapa = useMap();
    useEffect(() => {
        if (puntos.length > 0) mapa.fitBounds(latLngBounds(puntos), { padding: [36, 36], maxZoom: 17 });
    }, [mapa, puntos]);
    return null;
};

interface Propiedades {
    paradas: ParadaRuta[];
    seleccionadaId?: number | null;
    alElegir?: (parada: ParadaRuta) => void;
    ubicacion?: [number, number] | null;
    className?: string;
}

export const MapaRuta = ({ paradas, seleccionadaId, alElegir, ubicacion, className }: Propiedades) => {
    const ordenadas = useMemo(() => [...paradas].sort((a, b) => a.orden - b.orden), [paradas]);
    const puntos = useMemo(() => ordenadas.map(({ ubicacion: punto }) => [punto.latitud, punto.longitud] as [number, number]), [ordenadas]);
    const proxima = ordenadas.find((parada) => !parada.visitadaEn)?.id;

    return (
        <MapContainer center={puntos[0] ?? [-26.1849, -58.1731]} zoom={15} className={className} attributionControl>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://tile.openstreetmap.org/{z}/{x}/{y}.png" maxZoom={19} />
            <Encuadrar puntos={puntos} />
            <Polyline positions={puntos} pathOptions={{ color: '#187526', weight: 4, opacity: 0.75, dashArray: '8 8' }} />
            {ordenadas.map((parada) => (
                <Marker key={parada.id} position={[parada.ubicacion.latitud, parada.ubicacion.longitud]}
                    icon={iconoParada(parada.orden, Boolean(parada.visitadaEn), parada.id === proxima)}
                    zIndexOffset={parada.id === seleccionadaId ? 1000 : 0}
                    eventHandlers={alElegir ? { click: () => alElegir(parada) } : {}}
                    keyboard>
                    <Tooltip direction="top" offset={[0, -14]}>Parada {parada.orden} · {parada.manzana.codigo}</Tooltip>
                </Marker>
            ))}
            {ubicacion && (
                <Marker position={ubicacion} icon={divIcon({ className: '', iconSize: [18, 18], iconAnchor: [9, 9],
                    html: '<span style="display:block;width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid #fff;box-shadow:0 0 0 6px rgb(37 99 235 / .25)"></span>' })} />
            )}
        </MapContainer>
    );
};
