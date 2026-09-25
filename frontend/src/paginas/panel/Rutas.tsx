import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ChevronRight, LoaderCircle, Plus, Route, Sparkles } from 'lucide-react';
import { useUsuarioPanel } from '@/autenticacion/SesionPanel';
import { Campo, Entrada, Filtro, Selector } from '@/componentes/panel/Campos';
import { ChipRuta } from '@/componentes/panel/Chips';
import { Dialogo } from '@/componentes/panel/Dialogo';
import { EncabezadoPagina } from '@/componentes/panel/Encabezado';
import { CargarMas, EsqueletoFilas, ErrorCarga, EstadoVacio } from '@/componentes/panel/Estados';
import { BarraFiltros, SelectorLocalidad } from '@/componentes/panel/Filtros';
import { Boton } from '@/componentes/ui/Boton';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { useBrigadistas, useGenerarRuta, useLocalidadesPanel, useRutas } from '@/hooks/usePanel';
import { errorAmigable } from '@/lib/errores';
import { ESTADOS_RUTA, nombreCompleto } from '@/lib/etiquetasPanel';
import { formatearDia, hoyIso } from '@/lib/formato';
import type { EstadoRuta } from '@/tipos/panel';

const ESTADOS = Object.keys(ESTADOS_RUTA) as EstadoRuta[];

const Avance = ({ visitadas, totales }: { visitadas: number; totales: number }) => (
    <span className="flex items-center gap-2">
        <span className="h-2 w-24 overflow-hidden rounded-full bg-gris-superficie" aria-hidden>
            <span className="block h-full rounded-full bg-verde-600" style={{ width: `${totales ? (visitadas / totales) * 100 : 0}%` }} />
        </span>
        <span className="text-xs font-extrabold tabular-nums">{visitadas}/{totales}</span>
    </span>
);

const GenerarRuta = ({ alTerminar }: { alTerminar: (id: number) => void }) => {
    const { usuario, esProvincial } = useUsuarioPanel();
    const { data: localidades = [] } = useLocalidadesPanel();
    const [fecha, setFecha] = useState(hoyIso());
    const [localidadId, setLocalidadId] = useState<number | undefined>(usuario.localidadId ?? undefined);
    const [brigadistaId, setBrigadistaId] = useState<number | undefined>();
    const [maxParadas, setMaxParadas] = useState(20);
    const { data: brigadistas = [], isLoading: cargandoBrigadistas } = useBrigadistas(esProvincial ? localidadId : undefined, !esProvincial || localidadId !== undefined);
    const generar = useGenerarRuta();

    const enviar = async () => {
        try {
            const ruta = await generar.mutateAsync({
                fecha,
                maxParadas,
                ...(esProvincial && localidadId ? { localidadId } : {}),
                ...(brigadistaId ? { brigadistaId } : {}),
            });
            toast.success(`Ruta generada con ${ruta.paradas.length} paradas`);
            alTerminar(ruta.id);
        } catch (causa) {
            toast.error(errorAmigable(causa, 'No pudimos generar la ruta.'));
        }
    };

    return (
        <form onSubmit={(evento) => { evento.preventDefault(); void enviar(); }} className="space-y-4">
            <p className="flex gap-2 rounded-2xl bg-bruma p-4 text-sm leading-relaxed text-verde-900">
                <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
                Toma primero las manzanas en rojo y después las amarillas más recientes, sin repetir las de otra ruta del mismo día, y las ordena para caminar lo menos posible.
            </p>
            <Campo etiqueta="Fecha">{(props) => <Entrada {...props} type="date" value={fecha} min={hoyIso()} onChange={(evento) => setFecha(evento.target.value)} required />}</Campo>
            {esProvincial && (
                <Campo etiqueta="Localidad" ayuda="Las rutas se arman dentro de una localidad.">
                    {(props) => (
                        <Selector {...props} value={localidadId ?? ''} required onChange={(evento) => { setLocalidadId(evento.target.value ? Number(evento.target.value) : undefined); setBrigadistaId(undefined); }}>
                            <option value="">Elegí una localidad</option>
                            {localidades.map((localidad) => <option key={localidad.id} value={localidad.id}>{localidad.nombre}</option>)}
                        </Selector>
                    )}
                </Campo>
            )}
            <Campo etiqueta="Brigadista" ayuda={brigadistas.length === 0 && !cargandoBrigadistas ? 'No hay brigadistas activos en esta localidad: la ruta queda sin asignar.' : 'Solo la persona asignada ve la ruta en su vista de campo.'}>
                {(props) => (
                    <Selector {...props} value={brigadistaId ?? ''} onChange={(evento) => setBrigadistaId(evento.target.value ? Number(evento.target.value) : undefined)}>
                        <option value="">Sin asignar por ahora</option>
                        {brigadistas.map((brigadista) => <option key={brigadista.id} value={brigadista.id}>{nombreCompleto(brigadista)}</option>)}
                    </Selector>
                )}
            </Campo>
            <Campo etiqueta={`Cantidad máxima de paradas: ${maxParadas}`}>
                {(props) => <input {...props} type="range" min={5} max={60} step={1} value={maxParadas} onChange={(evento) => setMaxParadas(Number(evento.target.value))} className="w-full accent-verde-600" />}
            </Campo>
            <Boton type="submit" anchoCompleto disabled={generar.isPending || (esProvincial && !localidadId)}
                icono={generar.isPending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Route className="size-5" aria-hidden />}>
                {generar.isPending ? 'Generando…' : 'Generar ruta'}
            </Boton>
        </form>
    );
};

export default function Rutas() {
    const { puede } = useUsuarioPanel();
    const navegar = useNavigate();
    const [fecha, setFecha] = useState('');
    const [estado, setEstado] = useState<EstadoRuta | undefined>();
    const [localidadId, setLocalidadId] = useState<number | undefined>();
    const [generando, setGenerando] = useState(false);
    const { data, error, isLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useRutas({ fecha: fecha || undefined, estado, localidadId });
    const rutas = data?.pages.flatMap((pagina) => pagina.datos) ?? [];

    return (
        <div className="space-y-6">
            <EncabezadoPagina
                rotulo="Brigadas"
                titulo="Rutas de brigada"
                descripcion="Recorridos diarios armados con las manzanas que más necesitan una visita."
                acciones={puede('rutas:gestionar') && (
                    <Boton onClick={() => setGenerando(true)} icono={<Plus className="size-5" aria-hidden />}>Generar ruta</Boton>
                )}
            />

            <BarraFiltros>
                <Filtro etiqueta="Fecha">{(id) => <Entrada id={id} type="date" value={fecha} onChange={(evento) => setFecha(evento.target.value)} />}</Filtro>
                <Filtro etiqueta="Estado">
                    {(id) => (
                        <Selector id={id} value={estado ?? ''} onChange={(evento) => setEstado((evento.target.value || undefined) as EstadoRuta | undefined)}>
                            <option value="">Todos</option>
                            {ESTADOS.map((valor) => <option key={valor} value={valor}>{ESTADOS_RUTA[valor].etiqueta}</option>)}
                        </Selector>
                    )}
                </Filtro>
                <SelectorLocalidad valor={localidadId} alCambiar={setLocalidadId} />
                {fecha && <Boton variante="fantasma" tamano="chico" onClick={() => setFecha('')}>Todas las fechas</Boton>}
            </BarraFiltros>

            {error && <ErrorCarga error={error} alReintentar={() => void refetch()} />}

            <Tarjeta className="overflow-hidden">
                {isLoading && <EsqueletoFilas />}
                {!isLoading && rutas.length === 0 && !error && (
                    <EstadoVacio className="m-4 border-0" icono={<Route className="size-6" aria-hidden />} titulo="No hay rutas con estos filtros"
                        descripcion={puede('rutas:gestionar') ? 'Generá la ruta del día para que la brigada salga a recorrer.' : undefined}
                        accion={puede('rutas:gestionar') && <Boton tamano="chico" onClick={() => setGenerando(true)}>Generar ruta</Boton>} />
                )}
                <ul className="divide-y divide-gris-borde">
                    {rutas.map((ruta) => (
                        <li key={ruta.id}>
                            <Link to={`/panel/rutas/${ruta.id}`} className="flex flex-wrap items-center gap-x-6 gap-y-2 px-5 py-4 transition hover:bg-bruma/60">
                                <span className="min-w-48 flex-1">
                                    <span className="block font-extrabold first-letter:uppercase">{formatearDia(ruta.fecha)}</span>
                                    <span className="text-xs text-gris-texto">Ruta #{ruta.id} · armó {nombreCompleto(ruta.coordinador)}</span>
                                </span>
                                <span className="min-w-40 text-sm">
                                    <span className="block text-xs text-gris-texto">Brigadista</span>
                                    <span className="font-bold">{ruta.brigadista ? nombreCompleto(ruta.brigadista) : 'Sin asignar'}</span>
                                </span>
                                <Avance visitadas={ruta.paradasVisitadas} totales={ruta.paradasTotales} />
                                <ChipRuta estado={ruta.estado} />
                                <ChevronRight className="size-4 text-gris-texto" aria-hidden />
                            </Link>
                        </li>
                    ))}
                </ul>
                <CargarMas hayMas={Boolean(hasNextPage)} cargando={isFetchingNextPage} alCargar={() => void fetchNextPage()} />
            </Tarjeta>

            <Dialogo abierto={generando} alCambiar={setGenerando} titulo="Generar ruta del día">
                <GenerarRuta alTerminar={(id) => { setGenerando(false); navegar(`/panel/rutas/${id}`); }} />
            </Dialogo>
        </div>
    );
}
