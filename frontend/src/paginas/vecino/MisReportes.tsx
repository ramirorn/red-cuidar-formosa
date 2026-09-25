import { useState } from 'react';
import { CircleAlert, CloudUpload, LoaderCircle, PackageOpen, RefreshCw, ShieldCheck, Sparkles, Trash2, TriangleAlert } from 'lucide-react';
import { Boton, BotonEnlace } from '@/componentes/ui/Boton';
import { ChipEstadoReporte } from '@/componentes/ui/ChipEstadoReporte';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { Manuscrita } from '@/componentes/ui/Tipografia';
import { useColaReportes } from '@/hooks/useColaReportes';
import { fotoComoBlob } from '@/sinConexion/cola';
import { useEnLinea } from '@/hooks/useEnLinea';
import { useMisReportes } from '@/hooks/useVecino';
import { errorAmigable } from '@/lib/errores';
import { formatearFecha } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { TipoReporte } from '@/tipos';
import type { EstadoPropio } from '@/hooks/useVecino';

const ICONOS: Record<TipoReporte, typeof TriangleAlert> = { CRIADERO: TriangleAlert, MICROBASURAL: PackageOpen, LIMPIEZA: Sparkles };
const NOMBRES: Record<TipoReporte, string> = { CRIADERO: 'Criadero', MICROBASURAL: 'Microbasural', LIMPIEZA: 'Limpieza' };

const FILTROS: { valor: EstadoPropio | 'TODOS'; texto: string }[] = [
    { valor: 'TODOS', texto: 'Todos' },
    { valor: 'PENDIENTE', texto: 'En revisión' },
    { valor: 'VALIDADO', texto: 'Confirmados' },
    { valor: 'RESUELTO', texto: 'Resueltos' },
];

// Reportes guardados en el celular que todavía no llegaron al servidor.
const EnEspera = () => {
    const enLinea = useEnLinea();
    const { reportes, sincronizando, sincronizar, reintentar, descartar } = useColaReportes();
    if (reportes.length === 0) return null;

    return (
        <section aria-labelledby="titulo-espera">
            <div className="flex items-center justify-between gap-3">
                <h2 id="titulo-espera" className="flex items-center gap-2 font-extrabold">
                    <CloudUpload className="size-5 text-gris-texto" aria-hidden />En espera de envío ({reportes.length})
                </h2>
                <Boton variante="contorno" tamano="chico" onClick={() => sincronizar()} disabled={!enLinea || sincronizando}
                    icono={sincronizando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <RefreshCw className="size-4" aria-hidden />}>
                    {sincronizando ? 'Enviando…' : 'Reintentar'}
                </Boton>
            </div>
            {!enLinea && <p className="mt-1 text-sm text-gris-texto">Sin conexión: se envían solos cuando vuelva la señal.</p>}
            <ul className="mt-3 space-y-2">
                {reportes.map((reporte) => {
                    const Icono = ICONOS[reporte.tipo];
                    return (
                        <li key={reporte.idCliente}>
                            <Tarjeta className={cn('flex items-center gap-3 p-3', reporte.estado === 'error' && 'border-rojo-200 bg-rojo-50')}>
                                <img src={reporte.fotos[0] ? URL.createObjectURL(fotoComoBlob(reporte.fotos[0])) : ''} alt="" className="size-14 rounded-xl object-cover" onLoad={(evento) => URL.revokeObjectURL(evento.currentTarget.src)} />
                                <div className="min-w-0 flex-1">
                                    <p className="flex items-center gap-1.5 font-black"><Icono className="size-4" aria-hidden />{NOMBRES[reporte.tipo]}</p>
                                    <p className="text-xs text-gris-texto">Manzana {reporte.manzanaCodigo} · {formatearFecha(reporte.capturadoEn)}</p>
                                    {reporte.estado === 'error' && <p className="mt-1 flex items-center gap-1 text-xs font-bold text-rojo-700"><CircleAlert className="size-3.5" aria-hidden />{reporte.ultimoError}</p>}
                                </div>
                                {reporte.estado === 'error' ? (
                                    <div className="flex gap-1">
                                        <button type="button" onClick={() => reintentar(reporte.idCliente)} aria-label="Reintentar este reporte" className="grid size-10 place-items-center rounded-full hover:bg-white"><RefreshCw className="size-4" aria-hidden /></button>
                                        <button type="button" onClick={() => descartar(reporte.idCliente)} aria-label="Descartar este reporte" className="grid size-10 place-items-center rounded-full text-rojo-600 hover:bg-white"><Trash2 className="size-4" aria-hidden /></button>
                                    </div>
                                ) : (
                                    <span className="rounded-full bg-gris-superficie px-2.5 py-1 text-xs font-extrabold text-gris-texto">Esperando señal</span>
                                )}
                            </Tarjeta>
                        </li>
                    );
                })}
            </ul>
        </section>
    );
};

export default function MisReportes() {
    const [filtro, setFiltro] = useState<EstadoPropio | 'TODOS'>('TODOS');
    const { data, isLoading, fetchStatus, error } = useMisReportes();
    // Sin señal, React Query pausa la consulta: se avisa en lugar de mostrar "cargando" para siempre.
    const enPausa = isLoading && fetchStatus === 'paused';
    const todos = data ?? [];
    const visibles = filtro === 'TODOS' ? todos : todos.filter((reporte) => reporte.estado === filtro);

    return (
        <div className="space-y-6 px-4 py-6">
            <h1 className="text-2xl font-black">Mis reportes</h1>

            <EnEspera />

            <section aria-labelledby="titulo-enviados" className="space-y-3">
                <h2 id="titulo-enviados" className="sr-only">Reportes enviados</h2>
                <div role="tablist" aria-label="Filtrar por estado" className="-mx-4 flex gap-2 overflow-x-auto px-4">
                    {FILTROS.map(({ valor, texto }) => (
                        <button key={valor} type="button" role="tab" aria-selected={filtro === valor} onClick={() => setFiltro(valor)}
                            className={cn('shrink-0 rounded-full px-4 py-2 text-sm font-extrabold', filtro === valor ? 'bg-tinta text-white' : 'bg-white text-tinta ring-1 ring-gris-borde')}>
                            {texto}
                        </button>
                    ))}
                </div>

                {enPausa && <p className="rounded-2xl bg-white p-4 text-sm text-tinta-suave shadow-suave">Sin conexión: tus reportes enviados se muestran cuando vuelva la señal.</p>}
                {isLoading && !enPausa && Array.from({ length: 3 }, (_, i) => <div key={i} className="h-20 animate-pulse rounded-tarjeta bg-white" />)}
                {error && <p role="alert" className="rounded-2xl bg-rojo-50 p-4 text-sm font-bold text-rojo-700">{errorAmigable(error, 'No pudimos cargar tus reportes.')}</p>}

                {!isLoading && !error && visibles.length === 0 && (
                    <div className="rounded-tarjeta bg-white px-6 py-10 text-center shadow-suave">
                        <Manuscrita className="block text-3xl leading-tight text-verde-600">{filtro === 'TODOS' ? 'Todavía no reportaste nada' : 'No hay reportes con este estado'}</Manuscrita>
                        {filtro === 'TODOS' && <div className="mt-5"><BotonEnlace to="/app/escanear?nuevo=1">¡Escaneá tu patio!</BotonEnlace></div>}
                    </div>
                )}

                <ul className="space-y-2">
                    {visibles.map((reporte) => {
                        const Icono = ICONOS[reporte.tipo];
                        return (
                            <li key={reporte.idCliente}>
                                <Tarjeta className="flex items-center gap-3 p-4">
                                    <span className={cn('grid size-11 shrink-0 place-items-center rounded-xl', reporte.tipo === 'LIMPIEZA' ? 'bg-verde-50 text-verde-700' : 'bg-rojo-50 text-rojo-600')}>
                                        <Icono className="size-5" aria-hidden />
                                    </span>
                                    <div className="min-w-0 flex-1">
                                        <p className="font-black">{NOMBRES[reporte.tipo]}<span className="font-semibold text-gris-texto"> · Manzana {reporte.manzanaCodigo}</span></p>
                                        <p className="text-xs text-gris-texto">{formatearFecha(reporte.creadoEn)}</p>
                                    </div>
                                    <ChipEstadoReporte estado={reporte.estado} />
                                </Tarjeta>
                            </li>
                        );
                    })}
                </ul>

                <p className="flex items-start gap-2 pt-2 text-xs leading-relaxed text-gris-texto">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-verde-600" aria-hidden />
                    Esta lista está guardada solo en tu celular. El servidor no sabe qué reportes son tuyos,
                    solo guarda la manzana, y las fotos se borran después de revisarlas.
                </p>
            </section>
        </div>
    );
}
