import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import { Bot, ChevronRight, Hourglass, Image, MessageCircle, Smartphone } from 'lucide-react';
import { AvisoPorVencer } from '@/componentes/panel/AvisoPorVencer';
import { EncabezadoPagina } from '@/componentes/panel/Encabezado';
import { Filtro } from '@/componentes/panel/Campos';
import { Desplegable } from '@/componentes/ui/Desplegable';
import { ChipReporte, ConfianzaIa } from '@/componentes/panel/Chips';
import { CargarMas, EsqueletoFilas, ErrorCarga, EstadoVacio } from '@/componentes/panel/Estados';
import { BarraFiltros, SelectorLocalidad } from '@/componentes/panel/Filtros';
import { ChipEstado } from '@/componentes/ui/ChipEstado';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { useReportes } from '@/hooks/usePanel';
import { ESTADOS_REPORTE_PANEL, TIPOS_REPORTE } from '@/lib/etiquetasPanel';
import { formatearFecha, hace } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { EstadoReporte, TipoReporte } from '@/tipos';
import type { FiltrosReportes, ReporteListado } from '@/tipos/panel';

const ESTADOS = Object.keys(ESTADOS_REPORTE_PANEL) as EstadoReporte[];
const TIPOS = Object.keys(TIPOS_REPORTE) as TipoReporte[];

// Los filtros viven en la URL: se pueden compartir, y "volver" desde el detalle los conserva.
const leerFiltros = (parametros: URLSearchParams): FiltrosReportes => {
    const estado = parametros.get('estado');
    const tipo = parametros.get('tipo');
    const localidad = Number(parametros.get('localidadId'));
    return {
        ...(estado && ESTADOS.includes(estado as EstadoReporte) ? { estado: estado as EstadoReporte } : {}),
        ...(tipo && TIPOS.includes(tipo as TipoReporte) ? { tipo: tipo as TipoReporte } : {}),
        ...(Number.isInteger(localidad) && localidad > 0 ? { localidadId: localidad } : {}),
        orden: parametros.get('orden') === 'prioridad' ? 'prioridad' : 'recientes',
    };
};

const aParametros = (filtros: FiltrosReportes) => {
    const parametros = new URLSearchParams();
    if (filtros.estado) parametros.set('estado', filtros.estado);
    if (filtros.tipo) parametros.set('tipo', filtros.tipo);
    if (filtros.localidadId) parametros.set('localidadId', String(filtros.localidadId));
    if (filtros.orden === 'prioridad') parametros.set('orden', 'prioridad');
    return parametros;
};

// Horas que le quedan a un pendiente antes de descartarse (72 h desde que llegó).
const HorasRestantes = ({ creadoEn }: { creadoEn: string }) => {
    const horas = Math.max(0, Math.floor((new Date(creadoEn).getTime() + 72 * 3_600_000 - Date.now()) / 3_600_000));
    return (
        <span className={cn('mt-1 flex items-center gap-1 text-xs font-bold', horas < 24 ? 'text-rojo-600' : 'text-gris-texto')}>
            <Hourglass className="size-3" aria-hidden />Vence en {horas} h
        </span>
    );
};

const Origen = ({ origen }: { origen: ReporteListado['origen'] }) => (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-gris-texto">
        {origen === 'CHAT' ? <MessageCircle className="size-3.5" aria-hidden /> : <Smartphone className="size-3.5" aria-hidden />}
        {origen === 'CHAT' ? 'Chat' : 'App'}
    </span>
);

export default function BandejaReportes() {
    const [parametros, setParametros] = useSearchParams();
    const navegar = useNavigate();
    // Estado de React (actualizaciones encoladas) reflejado en la URL: dos cambios seguidos no se pisan.
    const [filtros, setFiltros] = useState(() => leerFiltros(parametros));
    useEffect(() => { setParametros(aParametros(filtros), { replace: true }); }, [filtros, setParametros]);
    const { data, error, isLoading, isFetching, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useReportes(filtros);
    const reportes = data?.pages.flatMap((pagina) => pagina.datos) ?? [];
    const volver = { volver: `/panel/reportes${parametros.size ? `?${parametros}` : ''}` };

    const cambiar = (clave: keyof FiltrosReportes, valor: string | undefined) => {
        setFiltros((previos) => {
            const nuevos: FiltrosReportes = { ...previos };
            if (valor) Object.assign(nuevos, { [clave]: clave === 'localidadId' ? Number(valor) : valor });
            else delete nuevos[clave];
            return nuevos;
        });
    };

    return (
        <div className="space-y-6">
            <EncabezadoPagina
                rotulo="Validación"
                titulo="Reportes de vecinos"
                descripcion="Todo reporte lo valida Epidemiología. La IA solo ayuda a decidir qué mirar primero. Un pendiente sin revisar se descarta a las 72 horas."
            />

            <AvisoPorVencer />

            <BarraFiltros>
                <Filtro etiqueta="Estado">
                    {(id) => (
                        <Desplegable id={id} valor={filtros.estado ?? ''} alCambiar={(valor) => cambiar('estado', valor)}
                            opciones={[{ valor: '', etiqueta: 'Todos' }, ...ESTADOS.map((estado) => ({ valor: estado, etiqueta: ESTADOS_REPORTE_PANEL[estado] }))]} />
                    )}
                </Filtro>
                <Filtro etiqueta="Tipo">
                    {(id) => (
                        <Desplegable id={id} valor={filtros.tipo ?? ''} alCambiar={(valor) => cambiar('tipo', valor)}
                            opciones={[{ valor: '', etiqueta: 'Todos' }, ...TIPOS.map((tipo) => ({ valor: tipo, etiqueta: TIPOS_REPORTE[tipo] }))]} />
                    )}
                </Filtro>
                <SelectorLocalidad valor={filtros.localidadId} alCambiar={(valor) => cambiar('localidadId', valor ? String(valor) : undefined)} />
                <Filtro etiqueta="Orden">
                    {(id) => (
                        <Desplegable id={id} valor={filtros.orden ?? 'recientes'} alCambiar={(valor) => cambiar('orden', valor)}
                            opciones={[{ valor: 'recientes', etiqueta: 'Más recientes' }, { valor: 'prioridad', etiqueta: 'Prioridad de la IA', descripcion: 'Mayor confianza de la IA primero' }]} />
                    )}
                </Filtro>
                <p className="ml-auto self-center text-xs font-bold text-gris-texto" aria-live="polite">
                    {isFetching && !isFetchingNextPage ? 'Actualizando…' : `${reportes.length}${hasNextPage ? '+' : ''} reportes · últimos 30 días`}
                </p>
            </BarraFiltros>

            {error && <ErrorCarga error={error} alReintentar={() => void refetch()} />}

            <Tarjeta className="overflow-hidden">
                {isLoading && <EsqueletoFilas />}
                {!isLoading && reportes.length === 0 && !error && (
                    <EstadoVacio className="m-4 border-0" titulo="No hay reportes con estos filtros" descripcion="Probá con otro estado o con toda la provincia." />
                )}

                {reportes.length > 0 && (
                    <>
                        {/* Escritorio: tabla. Cada fila abre el detalle. */}
                        <table className="hidden w-full text-left text-sm md:table">
                            <thead className="border-b border-gris-borde bg-gris-superficie/70 text-xs font-extrabold tracking-wide text-gris-texto uppercase">
                                <tr>
                                    <th scope="col" className="px-5 py-3">Reporte</th>
                                    <th scope="col" className="px-3 py-3">Manzana</th>
                                    <th scope="col" className="px-3 py-3">Recibido</th>
                                    <th scope="col" className="px-3 py-3"><span className="inline-flex items-center gap-1"><Bot className="size-3.5" aria-hidden />IA</span></th>
                                    <th scope="col" className="px-3 py-3">Estado</th>
                                    <th scope="col" className="px-3 py-3"><span className="sr-only">Abrir</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gris-borde">
                                {reportes.map((reporte) => (
                                    <tr key={reporte.id} onClick={() => navegar(`/panel/reportes/${reporte.id}`, { state: volver })} className="cursor-pointer transition hover:bg-bruma/60">
                                        <td className="px-5 py-3.5">
                                            <p className="font-extrabold">{TIPOS_REPORTE[reporte.tipo]}</p>
                                            <p className="mt-0.5 flex items-center gap-3">
                                                <Origen origen={reporte.origen} />
                                                <span className="inline-flex items-center gap-1 text-xs font-bold text-gris-texto"><Image className="size-3.5" aria-hidden />{reporte._count.evidencias}</span>
                                            </p>
                                        </td>
                                        <td className="px-3 py-3.5">
                                            {reporte.manzana ? (
                                                <span className="flex flex-col items-start gap-1">
                                                    <span className="font-bold">{reporte.manzana.codigo}</span>
                                                    <ChipEstado estado={reporte.manzana.estado} tamano="chico" />
                                                </span>
                                            ) : <span className="text-gris-texto">Fuera de manzanas</span>}
                                        </td>
                                        <td className="px-3 py-3.5">
                                            <p className="font-bold">{hace(reporte.createdAt)}</p>
                                            <p className="text-xs text-gris-texto">{formatearFecha(reporte.createdAt)}</p>
                                        </td>
                                        <td className="px-3 py-3.5"><ConfianzaIa valor={reporte.confianzaIa} /></td>
                                        <td className="px-3 py-3.5">
                                            <ChipReporte estado={reporte.estado} />
                                            {reporte.estado === 'PENDIENTE' && <HorasRestantes creadoEn={reporte.createdAt} />}
                                        </td>
                                        <td className="px-3 py-3.5 text-right">
                                            <Link to={`/panel/reportes/${reporte.id}`} state={volver} aria-label={`Abrir reporte de ${TIPOS_REPORTE[reporte.tipo].toLowerCase()} en ${reporte.manzana?.codigo ?? 'sin manzana'}`}
                                                onClick={(evento) => evento.stopPropagation()} className="inline-grid size-9 place-items-center rounded-full hover:bg-white">
                                                <ChevronRight className="size-4" aria-hidden />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>

                        {/* Celular: tarjetas. */}
                        <ul className="divide-y divide-gris-borde md:hidden">
                            {reportes.map((reporte) => (
                                <li key={reporte.id}>
                                    <Link to={`/panel/reportes/${reporte.id}`} state={volver} className="flex items-center gap-3 px-4 py-4 active:bg-bruma">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-extrabold">{TIPOS_REPORTE[reporte.tipo]}</p>
                                                <ChipReporte estado={reporte.estado} />
                                            </div>
                                            <p className="mt-1 text-sm text-tinta-suave">{reporte.manzana?.codigo ?? 'Fuera de manzanas'} · {hace(reporte.createdAt)}</p>
                                            <div className="mt-2"><ConfianzaIa valor={reporte.confianzaIa} /></div>
                                        </div>
                                        <ChevronRight className="size-5 text-gris-texto" aria-hidden />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                        <CargarMas hayMas={Boolean(hasNextPage)} cargando={isFetchingNextPage} alCargar={() => void fetchNextPage()} />
                    </>
                )}
            </Tarjeta>
        </div>
    );
}
