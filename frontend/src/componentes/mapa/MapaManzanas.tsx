import 'leaflet/dist/leaflet.css';
import { useEffect, useMemo, type ReactNode } from 'react';
import { CircleMarker, GeoJSON, MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { cn } from '@/lib/utils';
import type { LatLngBoundsExpression, PathOptions } from 'leaflet';
import type { Recuadro } from '@/api/vecino.api';
import { ESTADOS_MANZANA } from '@/componentes/ui/ChipEstado';
import type { FeatureManzana } from '@/tipos';

export const ZOOM_MINIMO_MANZANAS = 15;

const estiloDe = (feature: FeatureManzana, seleccionada: boolean): PathOptions => {
    const color = getComputedStyle(document.documentElement).getPropertyValue(`--color-estado-${feature.properties.estado === 'SIN_DATOS' ? 'sin-datos' : feature.properties.estado.toLowerCase()}`).trim()
        || ESTADOS_MANZANA[feature.properties.estado].color;
    return {
        color: '#1a1a1a',
        weight: seleccionada ? 3.5 : 1.5,
        fillColor: color,
        fillOpacity: feature.properties.estado === 'SIN_DATOS' ? 0.35 : 0.72,
    };
};

const recuadroDe = (mapa: L.Map): Recuadro => {
    const limites = mapa.getBounds();
    return {
        longitudMinima: limites.getWest(),
        latitudMinima: limites.getSouth(),
        longitudMaxima: limites.getEast(),
        latitudMaxima: limites.getNorth(),
    };
};

// Informa el recuadro visible (solo con zoom suficiente: el backend limita el tamaño del recuadro).
const Observador = ({ alMover }: { alMover: (recuadro: Recuadro | null, zoom: number) => void }) => {
    const mapa = useMapEvents({
        moveend: () => alMover(mapa.getZoom() >= ZOOM_MINIMO_MANZANAS ? recuadroDe(mapa) : null, mapa.getZoom()),
    });
    useEffect(() => {
        alMover(mapa.getZoom() >= ZOOM_MINIMO_MANZANAS ? recuadroDe(mapa) : null, mapa.getZoom());
    }, [mapa, alMover]);
    return null;
};

// Lleva el mapa a un punto cuando cambia el enfoque pedido (por ejemplo, al elegir una manzana de una lista).
const Enfocar = ({ enfoque }: { enfoque: { centro: [number, number]; zoom: number } }) => {
    const mapa = useMap();
    useEffect(() => { mapa.flyTo(enfoque.centro, enfoque.zoom, { duration: 0.6 }); }, [mapa, enfoque]);
    return null;
};

interface Propiedades {
    centro: [number, number];
    zoom?: number;
    manzanas: FeatureManzana[];
    seleccionadaId?: number | null;
    ubicacion?: [number, number] | null;
    alMover?: (recuadro: Recuadro | null, zoom: number) => void;
    alElegir?: (manzana: FeatureManzana) => void;
    className?: string;
    limites?: LatLngBoundsExpression;
    enfoque?: { centro: [number, number]; zoom: number } | null;
    children?: ReactNode;
    // Dibuja en canvas: mucho más liviano cuando hay miles de puntos (mapa de riesgo provincial).
    enLienzo?: boolean;
}

export const MapaManzanas = ({ centro, zoom = 17, manzanas, seleccionadaId, ubicacion, alMover, alElegir, className, enfoque, children, enLienzo = false }: Propiedades) => {
    // GeoJSON de react-leaflet no se re-renderiza al cambiar datos: la clave fuerza el reemplazo.
    const clave = useMemo(() => manzanas.map((manzana) => `${manzana.id}:${manzana.properties.estado}`).join('|') + `#${seleccionadaId ?? ''}`, [manzanas, seleccionadaId]);

    return (
        <MapContainer
            center={centro}
            zoom={zoom}
            className={cn('isolate', className)}
            attributionControl
            preferCanvas={enLienzo}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
                maxZoom={19}
            />
            {alMover && <Observador alMover={alMover} />}
            <GeoJSON
                key={clave}
                data={{ type: 'FeatureCollection', features: manzanas } as GeoJSON.FeatureCollection}
                style={(feature) => estiloDe(feature as unknown as FeatureManzana, (feature as unknown as FeatureManzana).id === seleccionadaId)}
                onEachFeature={(feature, capa) => {
                    const manzana = feature as unknown as FeatureManzana;
                    capa.bindTooltip(`${manzana.properties.codigo} · ${ESTADOS_MANZANA[manzana.properties.estado].etiqueta}`);
                    if (alElegir) capa.on('click', () => alElegir(manzana));
                }}
            />
            {enfoque && <Enfocar enfoque={enfoque} />}
            {children}
            {ubicacion && <CircleMarker center={ubicacion} radius={9} pathOptions={{ color: '#fff', weight: 3, fillColor: '#2563eb', fillOpacity: 1 }} />}
        </MapContainer>
    );
};
