import { useCallback, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { MapPinned, Plus, Syringe } from 'lucide-react';
import type { Recuadro } from '@/api/vecino.api';
import { useUsuarioPanel } from '@/autenticacion/SesionPanel';
import { MapaManzanas, ZOOM_MINIMO_MANZANAS } from '@/componentes/mapa/MapaManzanas';
import { Filtro } from '@/componentes/panel/Campos';
import { Desplegable } from '@/componentes/ui/Desplegable';
import { Dialogo } from '@/componentes/panel/Dialogo';
import { EncabezadoPagina } from '@/componentes/panel/Encabezado';
import { CargarMas, EsqueletoFilas, ErrorCarga, EstadoVacio } from '@/componentes/panel/Estados';
import { BarraFiltros, SelectorLocalidad, SelectorPeriodo, usePeriodo } from '@/componentes/panel/Filtros';
import { FormularioIntervencion } from '@/componentes/panel/FormularioIntervencion';
import { Boton } from '@/componentes/ui/Boton';
import { ChipEstado } from '@/componentes/ui/ChipEstado';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { useIntervenciones, useLocalidadesPanel } from '@/hooks/usePanel';
import { useManzanas } from '@/hooks/useVecino';
import { nombreCompleto, TIPOS_INTERVENCION, UNIDADES } from '@/lib/etiquetasPanel';
import { formatearFecha } from '@/lib/formato';
import { CENTRO_FORMOSA_CAPITAL } from '@/lib/geo';
import type { FeatureManzana } from '@/tipos';
import type { Intervencion, TipoIntervencion } from '@/tipos/panel';

const TIPOS = Object.keys(TIPOS_INTERVENCION) as TipoIntervencion[];

const detalleProducto = (intervencion: Intervencion) =>
    intervencion.cantidadProducto !== null && intervencion.unidadProducto
        ? `${intervencion.cantidadProducto.toLocaleString('es-AR')} ${UNIDADES[intervencion.unidadProducto]}${intervencion.tipoCuerpoAgua ? ` · ${intervencion.tipoCuerpoAgua}` : ''}`
        : null;

// Paso 1 del registro manual: elegir la manzana tocándola en el mapa.
const ElegirManzana = ({ alElegir }: { alElegir: (manzana: FeatureManzana) => void }) => {
    const { usuario } = useUsuarioPanel();
    const { data: localidades = [] } = useLocalidadesPanel();
    const [recuadro, setRecuadro] = useState<Recuadro | null>(null);
    const [zoom, setZoom] = useState(16);
    const { data } = useManzanas(recuadro);
    const centro = useMemo<[number, number]>(() => {
        const propia = localidades.find(({ id }) => id === usuario.localidadId);
        return propia?.latitud != null && propia.longitud != null ? [propia.latitud, propia.longitud] : CENTRO_FORMOSA_CAPITAL;
    }, [localidades, usuario.localidadId]);
    const alMover = useCallback((nuevo: Recuadro | null, nuevoZoom: number) => { setRecuadro(nuevo); setZoom(nuevoZoom); }, []);

    return (
        <div>
            <div className="relative overflow-hidden rounded-2xl border border-gris-borde">
                <MapaManzanas centro={centro} zoom={16} manzanas={data?.features ?? []} alMover={alMover} alElegir={alElegir} className="h-80 w-full" />
                {zoom < ZOOM_MINIMO_MANZANAS && (
                    <p className="pointer-events-none absolute top-3 left-1/2 z-[400] -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-extrabold shadow-suave">Acercate para ver las manzanas</p>
                )}
            </div>
            <p className="mt-3 flex items-center gap-2 text-sm text-tinta-suave"><MapPinned className="size-4" aria-hidden />Tocá la manzana donde se trabajó.</p>
        </div>
    );
};

const RegistrarIntervencion = ({ alTerminar }: { alTerminar: () => void }) => {
    const [manzana, setManzana] = useState<FeatureManzana | null>(null);
    if (!manzana) return <ElegirManzana alElegir={setManzana} />;
    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between gap-3 rounded-2xl bg-gris-superficie p-3">
                <span className="flex items-center gap-2 text-sm font-extrabold">Manzana {manzana.properties.codigo}<ChipEstado estado={manzana.properties.estado} tamano="chico" /></span>
                <Boton variante="fantasma" tamano="chico" onClick={() => setManzana(null)}>Cambiar</Boton>
            </div>
            <FormularioIntervencion manzana={{ id: manzana.id, codigo: manzana.properties.codigo }} alTerminar={alTerminar} />
        </div>
    );
};

export default function Intervenciones() {
    const { puede } = useUsuarioPanel();
    const { dias, setDias, rango } = usePeriodo(30);
    const [localidadId, setLocalidadId] = useState<number | undefined>();
    const [tipo, setTipo] = useState<TipoIntervencion | undefined>();
    const [registrando, setRegistrando] = useState(false);
    const { data, error, isLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useIntervenciones({ ...rango, localidadId, tipo });
    const intervenciones = data?.pages.flatMap((pagina) => pagina.datos) ?? [];

    return (
        <div className="space-y-6">
            <EncabezadoPagina
                rotulo="Trabajo de campo"
                titulo="Intervenciones"
                descripcion="Aplicaciones de BTI, fumigaciones, descacharrados e inspecciones. Cada una actualiza el color de la manzana."
                acciones={puede('intervenciones:registrar') && (
                    <Boton onClick={() => setRegistrando(true)} icono={<Plus className="size-5" aria-hidden />}>Registrar</Boton>
                )}
            />

            <BarraFiltros>
                <SelectorPeriodo dias={dias} alCambiar={setDias} />
                <Filtro etiqueta="Tipo">
                    {(id) => (
                        <Desplegable id={id} valor={tipo ?? ''} alCambiar={(valor) => setTipo((valor || undefined) as TipoIntervencion | undefined)}
                            opciones={[{ valor: '', etiqueta: 'Todos' }, ...TIPOS.map((valor) => ({ valor, etiqueta: TIPOS_INTERVENCION[valor] }))]} />
                    )}
                </Filtro>
                <SelectorLocalidad valor={localidadId} alCambiar={setLocalidadId} />
            </BarraFiltros>

            {error && <ErrorCarga error={error} alReintentar={() => void refetch()} />}

            <Tarjeta className="overflow-hidden">
                {isLoading && <EsqueletoFilas />}
                {!isLoading && intervenciones.length === 0 && !error && (
                    <EstadoVacio className="m-4 border-0" icono={<Syringe className="size-6" aria-hidden />} titulo="No hay intervenciones en este período" />
                )}
                {intervenciones.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[44rem] text-left text-sm">
                            <thead className="border-b border-gris-borde bg-gris-superficie/70 text-xs font-extrabold tracking-wide text-gris-texto uppercase">
                                <tr>
                                    <th scope="col" className="px-5 py-3">Intervención</th>
                                    <th scope="col" className="px-3 py-3">Manzana</th>
                                    <th scope="col" className="px-3 py-3">Fecha</th>
                                    <th scope="col" className="px-3 py-3">Registró</th>
                                    <th scope="col" className="px-3 py-3">Reporte</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gris-borde">
                                {intervenciones.map((intervencion) => (
                                    <tr key={intervencion.id} className="align-top">
                                        <td className="px-5 py-3.5">
                                            <p className="font-extrabold">{TIPOS_INTERVENCION[intervencion.tipo]}</p>
                                            {detalleProducto(intervencion) && <p className="text-xs text-gris-texto">{detalleProducto(intervencion)}</p>}
                                            {intervencion.observaciones && <p className="mt-1 max-w-sm text-xs text-tinta-suave">{intervencion.observaciones}</p>}
                                        </td>
                                        <td className="px-3 py-3.5 font-bold">{intervencion.manzana.codigo}</td>
                                        <td className="px-3 py-3.5">{formatearFecha(intervencion.realizadaEn)}</td>
                                        <td className="px-3 py-3.5">{nombreCompleto(intervencion.usuario)}</td>
                                        <td className="px-3 py-3.5">
                                            {intervencion.reporteId ? <Link to={`/panel/reportes/${intervencion.reporteId}`} className="font-bold text-verde-700 underline">Ver</Link> : <span className="text-gris-texto">—</span>}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <CargarMas hayMas={Boolean(hasNextPage)} cargando={isFetchingNextPage} alCargar={() => void fetchNextPage()} />
            </Tarjeta>

            <Dialogo abierto={registrando} alCambiar={setRegistrando} titulo="Registrar intervención" className="sm:max-w-xl">
                <RegistrarIntervencion alTerminar={() => setRegistrando(false)} />
            </Dialogo>
        </div>
    );
}
