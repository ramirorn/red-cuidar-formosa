import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowRight, CircleAlert, CircleCheck, Clock, Grid3x3, Syringe } from 'lucide-react';
import { useUsuarioPanel } from '@/autenticacion/SesionPanel';
import { EncabezadoPagina } from '@/componentes/panel/Encabezado';
import { ConfianzaIa } from '@/componentes/panel/Chips';
import { ErrorCarga } from '@/componentes/panel/Estados';
import { SelectorLocalidad, SelectorPeriodo, usePeriodo } from '@/componentes/panel/Filtros';
import { ESTADOS_MANZANA } from '@/componentes/ui/ChipEstado';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { useMetricas, useReportes } from '@/hooks/usePanel';
import { TIPOS_INTERVENCION, TIPOS_REPORTE } from '@/lib/etiquetasPanel';
import { hace } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { EstadoManzana, TipoReporte } from '@/tipos';
import type { Metricas } from '@/tipos/panel';

const COLORES_TIPO: Record<TipoReporte, string> = {
    CRIADERO: '#e11b22',
    MICROBASURAL: '#f2b705',
    LIMPIEZA: '#1e8c2f',
};

const ORDEN_MANZANAS: EstadoManzana[] = ['ROJO', 'AMARILLO', 'VERDE', 'SIN_DATOS'];

const formatoDia = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'short', timeZone: 'UTC' });

// Serie diaria completa (los días sin reportes van en cero, si no el gráfico engaña).
const armarSerie = (metricas: Metricas) => {
    const desde = new Date(metricas.rango.desde);
    const hasta = new Date(metricas.rango.hasta);
    const porDia = new Map<string, Record<TipoReporte, number>>();
    for (let dia = new Date(Date.UTC(desde.getUTCFullYear(), desde.getUTCMonth(), desde.getUTCDate())); dia <= hasta; dia.setUTCDate(dia.getUTCDate() + 1)) {
        porDia.set(dia.toISOString().slice(0, 10), { CRIADERO: 0, MICROBASURAL: 0, LIMPIEZA: 0 });
    }
    for (const { dia, tipo, cantidad } of metricas.reportesPorDia) {
        const fila = porDia.get(dia);
        if (fila) fila[tipo] += cantidad;
    }
    return [...porDia.entries()].map(([dia, valores]) => ({ dia: formatoDia.format(new Date(`${dia}T00:00:00Z`)), ...valores }));
};

const Indicador = ({ titulo, valor, detalle, Icono, tono, a }: { titulo: string; valor: number | string; detalle?: string; Icono: typeof Clock; tono: string; a?: string }) => {
    const contenido = (
        <>
            <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-extrabold text-tinta-suave">{titulo}</p>
                <span className={cn('hidden size-10 shrink-0 place-items-center rounded-xl sm:grid', tono)}><Icono className="size-5" aria-hidden /></span>
            </div>
            <p className="mt-2 text-3xl font-black tabular-nums sm:text-4xl">{valor}</p>
            {detalle && <p className="mt-1 flex items-center gap-1 text-xs font-bold text-gris-texto">{detalle}{a && <ArrowRight className="size-3.5" aria-hidden />}</p>}
        </>
    );
    return a ? (
        <Link to={a} className="rounded-tarjeta border border-gris-borde bg-white p-4 shadow-suave transition hover:-translate-y-0.5 hover:shadow-elevada sm:p-5">{contenido}</Link>
    ) : (
        <div className="rounded-tarjeta border border-gris-borde bg-white p-4 shadow-suave sm:p-5">{contenido}</div>
    );
};

const DistribucionManzanas = ({ metricas }: { metricas: Metricas }) => {
    const total = metricas.manzanas.reduce((suma, { cantidad }) => suma + cantidad, 0);
    const cantidadDe = (estado: EstadoManzana) => metricas.manzanas.find((fila) => fila.estado === estado)?.cantidad ?? 0;
    return (
        <Tarjeta className="p-6">
            <h2 className="font-black">Manzanas por estado</h2>
            <p className="text-sm text-tinta-suave">Situación actual de {total.toLocaleString('es-AR')} manzanas</p>
            <div className="mt-5 flex h-4 overflow-hidden rounded-full bg-gris-superficie" role="img"
                aria-label={ORDEN_MANZANAS.map((estado) => `${ESTADOS_MANZANA[estado].etiqueta}: ${cantidadDe(estado)}`).join(', ')}>
                {ORDEN_MANZANAS.map((estado) => (
                    <span key={estado} style={{ width: `${total ? (cantidadDe(estado) / total) * 100 : 0}%`, background: ESTADOS_MANZANA[estado].color }} />
                ))}
            </div>
            <ul className="mt-5 space-y-3">
                {ORDEN_MANZANAS.map((estado) => {
                    const { etiqueta, color, Icono } = ESTADOS_MANZANA[estado];
                    return (
                        <li key={estado} className="flex items-center gap-3 text-sm">
                            <Icono className="size-4 shrink-0" style={{ color }} aria-hidden />
                            <span className="flex-1 font-bold">{etiqueta}</span>
                            <span className="font-black tabular-nums">{cantidadDe(estado).toLocaleString('es-AR')}</span>
                            <span className="w-12 text-right text-xs text-gris-texto tabular-nums">{total ? Math.round((cantidadDe(estado) / total) * 100) : 0}%</span>
                        </li>
                    );
                })}
            </ul>
        </Tarjeta>
    );
};

const ParaRevisar = ({ localidadId }: { localidadId: number | undefined }) => {
    const { data, isLoading } = useReportes({ estado: 'PENDIENTE', orden: 'prioridad', localidadId });
    const pendientes = data?.pages[0]?.datos.slice(0, 5) ?? [];
    return (
        <Tarjeta className="p-6">
            <div className="flex items-center justify-between gap-3">
                <div>
                    <h2 className="font-black">Para revisar primero</h2>
                    <p className="text-sm text-tinta-suave">Pendientes ordenados por la confianza de la IA</p>
                </div>
                <Link to="/panel/reportes?estado=PENDIENTE&orden=prioridad" className="text-sm font-extrabold text-verde-700 hover:underline">Ver todos</Link>
            </div>
            <ul className="mt-4 divide-y divide-gris-borde">
                {isLoading && <li className="py-6 text-center text-sm text-gris-texto">Cargando…</li>}
                {!isLoading && pendientes.length === 0 && <li className="py-6 text-center text-sm text-gris-texto">No hay reportes pendientes. ¡Bien!</li>}
                {pendientes.map((reporte) => (
                    <li key={reporte.id}>
                        <Link to={`/panel/reportes/${reporte.id}`} className="flex items-center gap-3 py-3 hover:bg-gris-superficie/60">
                            <span className="size-2.5 shrink-0 rounded-full" style={{ background: COLORES_TIPO[reporte.tipo] }} aria-hidden />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate text-sm font-extrabold">{TIPOS_REPORTE[reporte.tipo]} · {reporte.manzana?.codigo ?? 'Sin manzana'}</span>
                                <span className="text-xs text-gris-texto">{hace(reporte.createdAt)}</span>
                            </span>
                            <ConfianzaIa valor={reporte.confianzaIa} />
                        </Link>
                    </li>
                ))}
            </ul>
        </Tarjeta>
    );
};

export default function Resumen() {
    const { usuario, puede } = useUsuarioPanel();
    const { dias, setDias, rango } = usePeriodo(30);
    const [localidadId, setLocalidadId] = useState<number | undefined>();
    const { data: metricas, error, refetch, isFetching } = useMetricas({ ...rango, localidadId });

    const serie = useMemo(() => (metricas ? armarSerie(metricas) : []), [metricas]);

    const contar = (filtro: (fila: Metricas['reportes'][number]) => boolean) =>
        metricas?.reportes.filter(filtro).reduce((suma, { cantidad }) => suma + cantidad, 0) ?? 0;
    const pendientes = contar(({ estado }) => estado === 'PENDIENTE');
    const confirmados = contar(({ estado, tipo }) => estado === 'VALIDADO' && tipo !== 'LIMPIEZA');
    const resueltos = contar(({ estado }) => estado === 'RESUELTO');
    const intervenciones = metricas?.intervenciones.reduce((suma, { cantidad }) => suma + cantidad, 0) ?? 0;
    const rojas = metricas?.manzanas.find(({ estado }) => estado === 'ROJO')?.cantidad ?? 0;

    return (
        <div className="space-y-6">
            <EncabezadoPagina
                rotulo={usuario.localidad?.nombre ?? 'Provincia de Formosa'}
                titulo={`Hola, ${usuario.nombre}`}
                descripcion="Así viene la prevención del dengue en el período elegido."
                acciones={(
                    <>
                        <SelectorPeriodo dias={dias} alCambiar={setDias} />
                        <SelectorLocalidad valor={localidadId} alCambiar={setLocalidadId} />
                    </>
                )}
            />

            {error && <ErrorCarga error={error} alReintentar={() => void refetch()} />}

            <div className={cn('grid grid-cols-2 gap-3 transition-opacity sm:gap-4 xl:grid-cols-5 [&>*:last-child]:col-span-2 xl:[&>*:last-child]:col-span-1', isFetching && 'opacity-70')}>
                <Indicador titulo="Por validar" valor={pendientes} detalle="Ir a la bandeja" Icono={Clock} tono="bg-amber-50 text-amber-700" a="/panel/reportes?estado=PENDIENTE&orden=prioridad" />
                <Indicador titulo="Criaderos confirmados" valor={confirmados} detalle="Esperan intervención" Icono={CircleAlert} tono="bg-rojo-50 text-rojo-600" a="/panel/reportes?estado=VALIDADO" />
                <Indicador titulo="Resueltos" valor={resueltos} detalle="En el período" Icono={CircleCheck} tono="bg-verde-50 text-verde-700" />
                <Indicador titulo="Intervenciones" valor={intervenciones} detalle={puede('intervenciones:leer') ? 'Ver registro' : 'En el período'} Icono={Syringe} tono="bg-bruma text-verde-800" {...(puede('intervenciones:leer') ? { a: '/panel/intervenciones' } : {})} />
                <Indicador titulo="Manzanas en rojo" valor={rojas} detalle={puede('mapa_calor:leer') ? 'Ver en el mapa' : 'Ahora'} Icono={Grid3x3} tono="bg-rojo-50 text-rojo-600" {...(puede('mapa_calor:leer') ? { a: '/panel/mapa' } : {})} />
            </div>

            <div className="grid gap-6 xl:grid-cols-[2fr_1fr]">
                <Tarjeta className="p-6">
                    <h2 className="font-black">Reportes por día</h2>
                    <p className="text-sm text-tinta-suave">Lo que llega de la app de los vecinos y del chat</p>
                    <div className="mt-4 h-72" role="img" aria-label="Gráfico de barras con la cantidad de reportes por día y por tipo">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={serie} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                                <CartesianGrid vertical={false} stroke="#dcdfd8" strokeDasharray="4 4" />
                                <XAxis dataKey="dia" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b6f6a' }} minTickGap={16} />
                                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#6b6f6a' }} />
                                <Tooltip cursor={{ fill: '#eef6ef' }} contentStyle={{ borderRadius: 14, border: '1px solid #dcdfd8', fontFamily: 'Nunito', fontWeight: 700 }} />
                                <Legend iconType="circle" wrapperStyle={{ fontSize: 13, fontWeight: 700 }} />
                                {(Object.keys(COLORES_TIPO) as TipoReporte[]).map((tipo, indice, lista) => (
                                    <Bar key={tipo} dataKey={tipo} name={TIPOS_REPORTE[tipo]} stackId="tipos" fill={COLORES_TIPO[tipo]}
                                        radius={indice === lista.length - 1 ? [6, 6, 0, 0] : 0} maxBarSize={28} />
                                ))}
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </Tarjeta>
                {metricas && <DistribucionManzanas metricas={metricas} />}
            </div>

            <div className="grid gap-6 xl:grid-cols-2">
                {puede('reportes:leer') && <ParaRevisar localidadId={localidadId} />}
                <Tarjeta className="p-6">
                    <h2 className="font-black">Intervenciones de campo</h2>
                    <p className="text-sm text-tinta-suave">Registradas por las brigadas en el período</p>
                    <ul className="mt-4 divide-y divide-gris-borde">
                        {(metricas?.intervenciones.length ?? 0) === 0 && <li className="py-6 text-center text-sm text-gris-texto">Todavía no hay intervenciones en este período.</li>}
                        {metricas?.intervenciones.map(({ tipo, cantidad, cantidadProductoTotal }) => (
                            <li key={tipo} className="flex items-center justify-between gap-3 py-3 text-sm">
                                <span className="font-bold">{TIPOS_INTERVENCION[tipo]}</span>
                                <span className="text-right">
                                    <span className="font-black tabular-nums">{cantidad}</span>
                                    {tipo === 'APLICACION_BTI' && cantidadProductoTotal !== null && (
                                        <span className="block text-xs text-gris-texto">{cantidadProductoTotal.toLocaleString('es-AR')} de producto en total</span>
                                    )}
                                </span>
                            </li>
                        ))}
                    </ul>
                </Tarjeta>
            </div>

            {metricas && (
                <p className="text-xs text-gris-texto">
                    Desde el {new Date(metricas.rango.desde).toLocaleDateString('es-AR')} hasta el {new Date(metricas.rango.hasta).toLocaleDateString('es-AR')}.
                    Los reportes de vecinos siempre los valida una persona: la IA solo ayuda a ordenar la bandeja.
                </p>
            )}
        </div>
    );
}
