import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { toast } from 'sonner';
import { Ban, CircleCheck, Flag, Footprints, Play } from 'lucide-react';
import { useUsuarioPanel } from '@/autenticacion/SesionPanel';
import { MapaRuta } from '@/componentes/mapa/MapaRuta';
import { ChipRuta } from '@/componentes/panel/Chips';
import { Dialogo } from '@/componentes/panel/Dialogo';
import { EncabezadoPagina } from '@/componentes/panel/Encabezado';
import { Cargando, ErrorCarga } from '@/componentes/panel/Estados';
import { Boton, BotonEnlace } from '@/componentes/ui/Boton';
import { ChipEstado } from '@/componentes/ui/ChipEstado';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { useCambiarEstadoRuta, useRuta } from '@/hooks/usePanel';
import { errorAmigable } from '@/lib/errores';
import { nombreCompleto } from '@/lib/etiquetasPanel';
import { formatearDia, formatearFecha } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { EstadoRuta } from '@/tipos/panel';

export default function DetalleRuta() {
    const id = Number(useParams().id);
    const { puede } = useUsuarioPanel();
    const { data: ruta, error, isLoading, refetch } = useRuta(id);
    const cambiar = useCambiarEstadoRuta();
    const [seleccionada, setSeleccionada] = useState<number | null>(null);
    const [cancelando, setCancelando] = useState(false);

    if (isLoading) return <Cargando texto="Cargando la ruta…" />;
    if (error || !ruta) {
        return (
            <div className="space-y-4">
                <EncabezadoPagina titulo="Ruta" volverA="/panel/rutas" />
                <ErrorCarga error={error} porDefecto="No encontramos esta ruta." alReintentar={() => void refetch()} />
            </div>
        );
    }

    const paradas = [...ruta.paradas].sort((a, b) => a.orden - b.orden);
    const visitadas = paradas.filter((parada) => parada.visitadaEn).length;

    const aplicar = async (estado: Exclude<EstadoRuta, 'PLANIFICADA'>) => {
        try {
            await cambiar.mutateAsync({ id: ruta.id, estado });
            toast.success(estado === 'EN_CURSO' ? 'Ruta iniciada' : estado === 'FINALIZADA' ? 'Ruta finalizada' : 'Ruta cancelada');
            setCancelando(false);
        } catch (causa) {
            toast.error(errorAmigable(causa, 'No pudimos cambiar el estado de la ruta.'));
        }
    };

    const activa = ruta.estado === 'PLANIFICADA' || ruta.estado === 'EN_CURSO';

    return (
        <div className="space-y-6">
            <EncabezadoPagina
                volverA="/panel/rutas"
                rotulo={`Ruta #${ruta.id}`}
                titulo={<span className="flex flex-wrap items-center gap-3 first-letter:uppercase">{formatearDia(ruta.fecha)} <ChipRuta estado={ruta.estado} className="text-sm" /></span>}
                descripcion={`Armada por ${nombreCompleto(ruta.coordinador)} · Brigadista: ${ruta.brigadista ? nombreCompleto(ruta.brigadista) : 'sin asignar'}`}
                acciones={(
                    <>
                        {puede('rutas:ejecutar') && activa && (
                            <BotonEnlace to={`/panel/campo/${ruta.id}`} variante="contorno" icono={<Footprints className="size-5" aria-hidden />}>Abrir en campo</BotonEnlace>
                        )}
                        {puede('rutas:ejecutar') && ruta.estado === 'PLANIFICADA' && (
                            <Boton onClick={() => void aplicar('EN_CURSO')} disabled={cambiar.isPending} icono={<Play className="size-5" aria-hidden />}>Iniciar</Boton>
                        )}
                        {puede('rutas:ejecutar') && ruta.estado === 'EN_CURSO' && (
                            <Boton onClick={() => void aplicar('FINALIZADA')} disabled={cambiar.isPending} icono={<Flag className="size-5" aria-hidden />}>Finalizar</Boton>
                        )}
                        {puede('rutas:gestionar') && activa && (
                            <Boton variante="fantasma" onClick={() => setCancelando(true)} icono={<Ban className="size-5" aria-hidden />}>Cancelar</Boton>
                        )}
                    </>
                )}
            />

            <div className="grid items-start gap-6 xl:grid-cols-[1fr_24rem]">
                <Tarjeta className="overflow-hidden">
                    <MapaRuta paradas={paradas} seleccionadaId={seleccionada} alElegir={(parada) => setSeleccionada(parada.id)} className="h-[60vh] min-h-96 w-full" />
                </Tarjeta>

                <Tarjeta className="flex flex-col p-5">
                    <div className="flex items-center justify-between">
                        <h2 className="font-black">Paradas</h2>
                        <span className="text-sm font-extrabold tabular-nums">{visitadas} de {paradas.length} visitadas</span>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-gris-superficie" aria-hidden>
                        <span className="block h-full rounded-full bg-verde-600 transition-all" style={{ width: `${paradas.length ? (visitadas / paradas.length) * 100 : 0}%` }} />
                    </div>
                    <ol className="mt-4 max-h-[52vh] space-y-1 overflow-y-auto">
                        {paradas.map((parada) => (
                            <li key={parada.id}>
                                <button type="button" onClick={() => setSeleccionada(parada.id)}
                                    className={cn('flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-bruma', seleccionada === parada.id && 'bg-bruma')}>
                                    <span className={cn('grid size-8 shrink-0 place-items-center rounded-full text-sm font-black',
                                        parada.visitadaEn ? 'bg-verde-600 text-white' : 'border-2 border-tinta')}>
                                        {parada.visitadaEn ? <CircleCheck className="size-4" aria-label="Visitada" /> : parada.orden}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-extrabold">Manzana {parada.manzana.codigo}</span>
                                        <span className="text-xs text-gris-texto">{parada.visitadaEn ? `Visitada ${formatearFecha(parada.visitadaEn)}` : 'Pendiente'}</span>
                                    </span>
                                    <ChipEstado estado={parada.manzana.estado} tamano="chico" />
                                </button>
                            </li>
                        ))}
                    </ol>
                    {puede('intervenciones:leer') && (
                        <Link to="/panel/intervenciones" className="mt-4 border-t border-gris-borde pt-4 text-sm font-extrabold text-verde-700 hover:underline">Ver intervenciones registradas</Link>
                    )}
                </Tarjeta>
            </div>

            <Dialogo abierto={cancelando} alCambiar={setCancelando} titulo="¿Cancelar la ruta?" descripcion="Las manzanas pendientes vuelven a estar disponibles para otra ruta del mismo día.">
                <div className="flex flex-col gap-3 sm:flex-row-reverse">
                    <Boton variante="acento" onClick={() => void aplicar('CANCELADA')} disabled={cambiar.isPending}>Sí, cancelar</Boton>
                    <Boton variante="contorno" onClick={() => setCancelando(false)}>Volver</Boton>
                </div>
            </Dialogo>
        </div>
    );
}
