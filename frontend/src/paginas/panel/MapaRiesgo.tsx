import { useCallback, useMemo, useState } from 'react';
import { CircleMarker, Tooltip } from 'react-leaflet';
import * as Pestanas from '@radix-ui/react-tabs';
import { CloudRain, Info, Layers } from 'lucide-react';
import type { Recuadro } from '@/api/vecino.api';
import { useUsuarioPanel } from '@/autenticacion/SesionPanel';
import { MapaManzanas, ZOOM_MINIMO_MANZANAS } from '@/componentes/mapa/MapaManzanas';
import { EncabezadoPagina } from '@/componentes/panel/Encabezado';
import { SelectorLocalidad, SelectorPeriodo, usePeriodo } from '@/componentes/panel/Filtros';
import { ChipEstado } from '@/componentes/ui/ChipEstado';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { useLocalidadesPanel, useMapaCalor, usePredicciones } from '@/hooks/usePanel';
import { useManzanas } from '@/hooks/useVecino';
import { errorAmigable } from '@/lib/errores';
import { formatearFecha } from '@/lib/formato';
import { CENTRO_FORMOSA_CAPITAL } from '@/lib/geo';
import { NIVELES_RIESGO, nivelDeRiesgo, porcentaje } from '@/lib/riesgo';
import { cn } from '@/lib/utils';
import type { PuntoRiesgo } from '@/tipos/panel';

type Capa = 'actual' | 'prediccion';

const indiceDe = (punto: PuntoRiesgo, capa: Capa) =>
    (capa === 'actual' ? punto.properties.indiceRiesgo : punto.properties.indiceRiesgoPredicho) ?? 0;

const Leyenda = () => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-bold text-tinta-suave">
        {NIVELES_RIESGO.map(({ etiqueta, color }) => (
            <span key={etiqueta} className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-full ring-2 ring-white" style={{ background: color }} aria-hidden />{etiqueta}
            </span>
        ))}
    </div>
);

export default function MapaRiesgo() {
    const { usuario, esProvincial } = useUsuarioPanel();
    const { data: localidades = [] } = useLocalidadesPanel();
    const [capa, setCapa] = useState<Capa>('actual');
    const [localidadId, setLocalidadId] = useState<number | undefined>();
    const { dias, setDias, rango } = usePeriodo(30);
    const [recuadro, setRecuadro] = useState<Recuadro | null>(null);
    const [zoom, setZoom] = useState(14);
    const [enfoque, setEnfoque] = useState<{ centro: [number, number]; zoom: number } | null>(null);
    const [seleccionada, setSeleccionada] = useState<number | null>(null);

    const actual = useMapaCalor({ ...rango, localidadId }, capa === 'actual');
    const prediccion = usePredicciones(localidadId, capa === 'prediccion');
    const consulta = capa === 'actual' ? actual : prediccion;
    const { data: manzanas } = useManzanas(recuadro);

    const alMover = useCallback((nuevo: Recuadro | null, nuevoZoom: number) => {
        setRecuadro(nuevo);
        setZoom(nuevoZoom);
    }, []);

    // Centro inicial: la localidad elegida o la del usuario; si no, Formosa capital.
    const centro = useMemo<[number, number]>(() => {
        const localidad = localidades.find(({ id }) => id === (localidadId ?? usuario.localidadId));
        return localidad?.latitud != null && localidad.longitud != null ? [localidad.latitud, localidad.longitud] : CENTRO_FORMOSA_CAPITAL;
    }, [localidades, localidadId, usuario.localidadId]);

    const elegirLocalidad = (id: number | undefined) => {
        setLocalidadId(id);
        const localidad = localidades.find((item) => item.id === id);
        if (localidad?.latitud != null && localidad.longitud != null) setEnfoque({ centro: [localidad.latitud, localidad.longitud], zoom: 14 });
    };

    const puntos = consulta.data?.features ?? [];
    const ranking = useMemo(() => [...puntos].sort((a, b) => indiceDe(b, capa) - indiceDe(a, capa)).slice(0, 12), [puntos, capa]);
    const radio = Math.max(4, Math.min(16, (zoom - 11) * 2.5));

    return (
        <div className="space-y-6">
            <EncabezadoPagina
                rotulo="Motor predictivo"
                titulo="Mapa de riesgo"
                descripcion="Combina reportes validados y pendientes, lluvia y el riesgo histórico de cada localidad. Acercate para ver el color de cada manzana."
                acciones={(
                    <>
                        {capa === 'actual' && <SelectorPeriodo dias={dias} alCambiar={setDias} />}
                        {esProvincial && <SelectorLocalidad valor={localidadId} alCambiar={elegirLocalidad} />}
                    </>
                )}
            />

            <Pestanas.Root value={capa} onValueChange={(valor) => setCapa(valor as Capa)}>
                <Pestanas.List aria-label="Capa del mapa" className="inline-flex rounded-full border border-gris-borde bg-white p-1 shadow-suave">
                    {([['actual', 'Riesgo actual', Layers], ['prediccion', 'Próximas 72 horas', CloudRain]] as const).map(([valor, texto, Icono]) => (
                        <Pestanas.Trigger key={valor} value={valor}
                            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold text-tinta-suave transition data-[state=active]:bg-verde-600 data-[state=active]:text-white">
                            <Icono className="size-4" aria-hidden />{texto}
                        </Pestanas.Trigger>
                    ))}
                </Pestanas.List>
            </Pestanas.Root>

            {consulta.error && (
                <p role="status" className="flex items-start gap-2 rounded-tarjeta border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-800">
                    <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                    {errorAmigable(consulta.error, 'No pudimos calcular el riesgo.')} Mientras tanto, el mapa muestra el estado de cada manzana.
                </p>
            )}

            <div className="grid items-start gap-6 xl:grid-cols-[1fr_22rem]">
                <Tarjeta className="overflow-hidden">
                    <div className="relative">
                        <MapaManzanas
                            centro={centro}
                            zoom={14}
                            manzanas={manzanas?.features ?? []}
                            seleccionadaId={seleccionada}
                            alMover={alMover}
                            enfoque={enfoque}
                            enLienzo
                            className="h-[62vh] min-h-96 w-full"
                        >
                            {puntos.map((punto) => {
                                const indice = indiceDe(punto, capa);
                                const [longitud, latitud] = punto.geometry.coordinates;
                                const { color, etiqueta } = nivelDeRiesgo(indice);
                                return (
                                    <CircleMarker key={punto.properties.manzanaId} center={[latitud, longitud]} radius={radio}
                                        pathOptions={{ color: '#fff', weight: 1.5, fillColor: color, fillOpacity: zoom >= ZOOM_MINIMO_MANZANAS ? 0.95 : 0.8 }}
                                        eventHandlers={{ click: () => setSeleccionada(punto.properties.manzanaId) }}>
                                        <Tooltip>
                                            <strong>{punto.properties.codigo}</strong> · Riesgo {etiqueta.toLowerCase()} ({porcentaje(indice)})
                                            {capa === 'actual' && (
                                                <><br />{punto.properties.reportesValidados ?? 0} validados · {punto.properties.reportesPendientes ?? 0} pendientes · {punto.properties.lluvia7dMm ?? 0} mm en 7 días</>
                                            )}
                                        </Tooltip>
                                    </CircleMarker>
                                );
                            })}
                        </MapaManzanas>
                        {zoom < ZOOM_MINIMO_MANZANAS && (
                            <p className="pointer-events-none absolute top-3 left-1/2 z-[400] -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-extrabold shadow-suave">
                                Acercate para ver el estado de cada manzana
                            </p>
                        )}
                    </div>
                    <div className="border-t border-gris-borde px-5 py-4"><Leyenda /></div>
                </Tarjeta>

                <Tarjeta className="flex flex-col p-5">
                    <h2 className="font-black">{capa === 'actual' ? 'Manzanas con más riesgo' : 'Riesgo esperado en 72 h'}</h2>
                    <p className="text-sm text-tinta-suave">
                        {capa === 'actual'
                            ? 'Priorizá la inspección por estas manzanas.'
                            : 'Calculado con la lluvia pronosticada; se actualiza cada hora.'}
                    </p>
                    <ol className="mt-4 max-h-[52vh] flex-1 space-y-1 overflow-y-auto">
                        {consulta.isLoading && <li className="py-6 text-center text-sm text-gris-texto">Calculando…</li>}
                        {!consulta.isLoading && ranking.length === 0 && <li className="py-6 text-center text-sm text-gris-texto">Sin datos para mostrar.</li>}
                        {ranking.map((punto, posicion) => {
                            const indice = indiceDe(punto, capa);
                            const [longitud, latitud] = punto.geometry.coordinates;
                            return (
                                <li key={punto.properties.manzanaId}>
                                    <button type="button"
                                        onClick={() => { setSeleccionada(punto.properties.manzanaId); setEnfoque({ centro: [latitud, longitud], zoom: 17 }); }}
                                        className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left hover:bg-bruma', seleccionada === punto.properties.manzanaId && 'bg-bruma')}>
                                        <span className="w-5 text-xs font-black text-gris-texto tabular-nums">{posicion + 1}</span>
                                        <span className="min-w-0 flex-1">
                                            <span className="block text-sm font-extrabold">{punto.properties.codigo}</span>
                                            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-gris-superficie">
                                                <span className="block h-full rounded-full" style={{ width: porcentaje(indice), background: nivelDeRiesgo(indice).color }} />
                                            </span>
                                        </span>
                                        <span className="w-10 text-right text-sm font-black tabular-nums">{porcentaje(indice)}</span>
                                    </button>
                                </li>
                            );
                        })}
                    </ol>
                    {ranking[0] && (
                        <div className="mt-4 flex items-center justify-between gap-2 border-t border-gris-borde pt-4 text-xs text-gris-texto">
                            <span>Estado de la más riesgosa:</span>
                            <ChipEstado estado={ranking[0].properties.estado} tamano="chico" />
                        </div>
                    )}
                    {capa === 'prediccion' && ranking[0]?.properties.vigenteHasta && (
                        <p className="mt-2 text-xs text-gris-texto">Vigente hasta el {formatearFecha(ranking[0].properties.vigenteHasta)}.</p>
                    )}
                </Tarjeta>
            </div>
        </div>
    );
}
