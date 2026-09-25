import { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router';
import { toast } from 'sonner';
import { CircleCheck, Flag, LoaderCircle, LocateFixed, Navigation, PartyPopper, Play, Syringe } from 'lucide-react';
import { useSesionPanel } from '@/autenticacion/SesionPanel';
import { MapaRuta } from '@/componentes/mapa/MapaRuta';
import { ChipRuta } from '@/componentes/panel/Chips';
import { Dialogo } from '@/componentes/panel/Dialogo';
import { Cargando, ErrorCarga } from '@/componentes/panel/Estados';
import { FormularioIntervencion } from '@/componentes/panel/FormularioIntervencion';
import { Boton } from '@/componentes/ui/Boton';
import { ChipEstado } from '@/componentes/ui/ChipEstado';
import { useEnLinea } from '@/hooks/useEnLinea';
import { useCambiarEstadoRuta, useMarcarParada, useRuta } from '@/hooks/usePanel';
import { errorAmigable } from '@/lib/errores';
import { cn } from '@/lib/utils';
import type { ParadaRuta } from '@/tipos/panel';
import { DisposicionCampo } from './DisposicionCampo';

// Abre la navegación del celular (Google Maps o la app que el sistema tenga asociada).
const enlaceComoLlegar = ({ ubicacion }: ParadaRuta) =>
    `https://www.google.com/maps/dir/?api=1&destination=${ubicacion.latitud},${ubicacion.longitud}&travelmode=walking`;

// Sigue la posición solo mientras la vista está abierta y el brigadista lo pidió.
const usePosicion = (activa: boolean) => {
    const [posicion, setPosicion] = useState<{ latitud: number; longitud: number } | null>(null);
    useEffect(() => {
        if (!activa || !('geolocation' in navigator)) return undefined;
        const id = navigator.geolocation.watchPosition(
            ({ coords }) => setPosicion({ latitud: coords.latitude, longitud: coords.longitude }),
            () => toast.error('No pudimos obtener tu ubicación'),
            { enableHighAccuracy: true, maximumAge: 15_000 },
        );
        return () => navigator.geolocation.clearWatch(id);
    }, [activa]);
    return posicion;
};

export default function CampoRuta() {
    const id = Number(useParams().id);
    const { puede } = useSesionPanel();
    const enLinea = useEnLinea();
    const { data: ruta, error, isLoading, refetch } = useRuta(id);
    const cambiarEstado = useCambiarEstadoRuta();
    const marcar = useMarcarParada();
    const [elegidaId, setElegidaId] = useState<number | null>(null);
    const [registrando, setRegistrando] = useState(false);
    const [seguir, setSeguir] = useState(false);
    const posicion = usePosicion(seguir);

    const paradas = useMemo(() => [...(ruta?.paradas ?? [])].sort((a, b) => a.orden - b.orden), [ruta]);
    const proxima = paradas.find((parada) => !parada.visitadaEn);
    const actual = paradas.find((parada) => parada.id === elegidaId) ?? proxima ?? null;
    const visitadas = paradas.filter((parada) => parada.visitadaEn).length;

    if (isLoading) return <DisposicionCampo volverA="/panel/campo"><Cargando texto="Cargando la ruta…" /></DisposicionCampo>;
    if (error || !ruta) {
        return <DisposicionCampo volverA="/panel/campo"><div className="p-4"><ErrorCarga error={error} porDefecto="No encontramos esta ruta." alReintentar={() => void refetch()} /></div></DisposicionCampo>;
    }

    const enCurso = ruta.estado === 'EN_CURSO';
    const terminada = ruta.estado === 'FINALIZADA' || ruta.estado === 'CANCELADA';

    const cambiar = async (estado: 'EN_CURSO' | 'FINALIZADA') => {
        try {
            await cambiarEstado.mutateAsync({ id: ruta.id, estado });
            toast.success(estado === 'EN_CURSO' ? '¡A recorrer!' : 'Ruta finalizada. ¡Gracias!');
        } catch (causa) {
            toast.error(errorAmigable(causa, 'No pudimos actualizar la ruta.'));
        }
    };

    const marcarSinIntervencion = async (parada: ParadaRuta) => {
        try {
            await marcar.mutateAsync({ rutaId: ruta.id, paradaId: parada.id });
            toast.success(`Parada ${parada.orden} visitada`);
            setElegidaId(null);
        } catch (causa) {
            toast.error(errorAmigable(causa, 'No pudimos marcar la parada.'));
        }
    };

    return (
        <DisposicionCampo volverA="/panel/campo">
            <div className="relative">
                <MapaRuta paradas={paradas} seleccionadaId={actual?.id ?? null} alElegir={(parada) => setElegidaId(parada.id)}
                    ubicacion={posicion ? [posicion.latitud, posicion.longitud] : null} className="h-[38dvh] w-full" />
                <button type="button" onClick={() => setSeguir(!seguir)} aria-pressed={seguir} aria-label={seguir ? 'Dejar de mostrar mi ubicación' : 'Mostrar mi ubicación'}
                    className={cn('absolute right-3 bottom-3 z-[400] grid size-12 place-items-center rounded-full shadow-elevada', seguir ? 'bg-blue-600 text-white' : 'bg-white text-tinta')}>
                    <LocateFixed className="size-5" aria-hidden />
                </button>
            </div>

            <div className="relative -mt-5 space-y-4 rounded-t-panel bg-crema px-4 pt-5 pb-10">
                <div className="flex items-center justify-between gap-3">
                    <div>
                        <p className="text-lg font-black">Ruta #{ruta.id}</p>
                        <p className="text-sm text-tinta-suave">{visitadas} de {paradas.length} manzanas visitadas</p>
                    </div>
                    <ChipRuta estado={ruta.estado} />
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-white" aria-hidden>
                    <span className="block h-full rounded-full bg-verde-600 transition-all" style={{ width: `${paradas.length ? (visitadas / paradas.length) * 100 : 0}%` }} />
                </div>

                {ruta.estado === 'PLANIFICADA' && (
                    <Boton tamano="grande" anchoCompleto onClick={() => void cambiar('EN_CURSO')} disabled={!enLinea || cambiarEstado.isPending}
                        icono={cambiarEstado.isPending ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Play className="size-5" aria-hidden />}>
                        Empezar la ruta
                    </Boton>
                )}

                {enCurso && actual && (
                    <section aria-labelledby="titulo-parada" className="rounded-tarjeta border-2 border-tinta bg-white p-5 shadow-suave">
                        <p className="text-xs font-extrabold tracking-widest text-gris-texto uppercase">
                            {actual.visitadaEn ? 'Ya visitada' : actual.id === proxima?.id ? 'Próxima parada' : 'Parada elegida'} · {actual.orden} de {paradas.length}
                        </p>
                        <div className="mt-1 flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
                            <h1 id="titulo-parada" className="text-2xl font-black">Manzana <span className="whitespace-nowrap">{actual.manzana.codigo}</span></h1>
                            <ChipEstado estado={actual.manzana.estado} tamano="chico" />
                        </div>
                        <div className="mt-4 grid gap-2">
                            <a href={enlaceComoLlegar(actual)} target="_blank" rel="noopener noreferrer"
                                className="inline-flex h-12 items-center justify-center gap-2 rounded-full border-2 border-tinta/85 bg-white font-extrabold hover:bg-gris-superficie">
                                <Navigation className="size-5" aria-hidden />Cómo llegar
                            </a>
                            {!actual.visitadaEn && (
                                <>
                                    {puede('intervenciones:registrar') && (
                                        <Boton tamano="grande" anchoCompleto onClick={() => setRegistrando(true)} disabled={!enLinea} icono={<Syringe className="size-5" aria-hidden />}>
                                            Registrar lo que hice
                                        </Boton>
                                    )}
                                    <Boton variante="fantasma" anchoCompleto onClick={() => void marcarSinIntervencion(actual)} disabled={!enLinea || marcar.isPending}>
                                        Visitada, no hizo falta intervenir
                                    </Boton>
                                </>
                            )}
                        </div>
                    </section>
                )}

                {enCurso && !proxima && (
                    <div className="rounded-tarjeta bg-verde-600 p-5 text-center text-white shadow-suave">
                        <PartyPopper className="mx-auto size-8" aria-hidden />
                        <p className="mt-2 text-lg font-black">¡Visitaste todas las manzanas!</p>
                        <Boton variante="blanco" className="mt-4" onClick={() => void cambiar('FINALIZADA')} disabled={!enLinea || cambiarEstado.isPending} icono={<Flag className="size-5" aria-hidden />}>
                            Finalizar la ruta
                        </Boton>
                    </div>
                )}

                {terminada && <p className="rounded-2xl bg-white p-4 text-center text-sm font-bold text-tinta-suave">Esta ruta ya está {ruta.estado === 'FINALIZADA' ? 'finalizada' : 'cancelada'}.</p>}

                <section aria-label="Todas las paradas">
                    <h2 className="mb-2 text-sm font-extrabold text-gris-texto">Todas las paradas</h2>
                    <ol className="overflow-hidden rounded-tarjeta border border-gris-borde bg-white">
                        {paradas.map((parada) => (
                            <li key={parada.id} className="border-b border-gris-borde last:border-0">
                                <button type="button" onClick={() => { setElegidaId(parada.id); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    className={cn('flex w-full items-center gap-3 px-4 py-3.5 text-left', actual?.id === parada.id && 'bg-bruma')}>
                                    <span className={cn('grid size-9 shrink-0 place-items-center rounded-full text-sm font-black',
                                        parada.visitadaEn ? 'bg-verde-600 text-white' : parada.id === proxima?.id ? 'bg-rojo-500 text-white' : 'border-2 border-tinta')}>
                                        {parada.visitadaEn ? <CircleCheck className="size-5" aria-label="Visitada" /> : parada.orden}
                                    </span>
                                    <span className="flex-1 font-extrabold">Manzana {parada.manzana.codigo}</span>
                                    <ChipEstado estado={parada.manzana.estado} tamano="chico" />
                                </button>
                            </li>
                        ))}
                    </ol>
                </section>

                {enCurso && proxima && (
                    <Boton variante="contorno" anchoCompleto onClick={() => void cambiar('FINALIZADA')} disabled={!enLinea || cambiarEstado.isPending} icono={<Flag className="size-5" aria-hidden />}>
                        Finalizar aunque falten paradas
                    </Boton>
                )}
            </div>

            {actual && (
                <Dialogo abierto={registrando} alCambiar={setRegistrando} titulo={`Manzana ${actual.manzana.codigo}`} descripcion="Al registrar, la parada queda como visitada.">
                    <FormularioIntervencion manzana={actual.manzana} paradaRutaId={actual.id} ubicacion={posicion}
                        alTerminar={() => { setRegistrando(false); setElegidaId(null); }} />
                </Dialogo>
            )}
        </DisposicionCampo>
    );
}
