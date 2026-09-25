import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Brush, Crosshair, Gift, LoaderCircle, Medal, ShieldCheck, Sparkles, TriangleAlert, Trophy } from 'lucide-react';
import { Boton, BotonEnlace } from '@/componentes/ui/Boton';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { Manuscrita, Rotulo } from '@/componentes/ui/Tipografia';
import { Subrayado } from '@/componentes/ilustraciones/Garabatos';
import { useCopaPodio, useCopaZona, usePremio } from '@/hooks/useCopa';
import { useMiManzana } from '@/hooks/useVecino';
import { diasHasta, mensajeDeZona } from '@/lib/copa';
import { formatearFecha, mesAnterior, mesArgentino } from '@/lib/formato';
import { obtenerUbicacion, type Ubicacion } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { guardarAjuste, leerAjuste } from '@/sinConexion/bd';
import type { PremioCopa, PuntosCopa, ZonaCopa } from '@/tipos';

const puntosPorManzana = (valor: number) => valor.toLocaleString('es-AR', { maximumFractionDigits: 1 });

// Podio: el primero al centro y más alto, como en una entrega de medallas.
const Podio = ({ zonas, propiaId }: { zonas: ZonaCopa[]; propiaId: number | null }) => {
    const lugares = [zonas[1], zonas[0], zonas[2]];
    const alturas = ['h-24', 'h-32', 'h-20'];
    return (
        <ol className="grid grid-cols-3 items-end gap-2" aria-label="Podio">
            {lugares.map((zona, indice) => {
                const puesto = [2, 1, 3][indice]!;
                return (
                    <li key={puesto} className="flex flex-col items-center text-center">
                        {zona ? (
                            <>
                                <p className={cn('line-clamp-2 min-h-10 px-1 text-sm leading-tight font-black', zona.id === propiaId && 'text-verde-700')}>{zona.nombre}</p>
                                <p className="mt-0.5 text-xs text-gris-texto">{puntosPorManzana(zona.puntosPorManzana)} pts/manzana</p>
                            </>
                        ) : (
                            <p className="min-h-10 text-sm font-bold text-gris-texto">¿Tu zona?</p>
                        )}
                        <div className={cn('mt-2 flex w-full flex-col items-center justify-start rounded-t-2xl pt-3 text-white', alturas[indice],
                            puesto === 1 ? 'bg-verde-600' : puesto === 2 ? 'bg-verde-500' : 'bg-verde-400', !zona && 'bg-gris-borde')}>
                            {puesto === 1 ? <Trophy className="size-7" aria-hidden /> : <Medal className="size-6" aria-hidden />}
                            <span className="mt-1 text-lg font-black" aria-label={`Puesto ${puesto}`}>{puesto}º</span>
                        </div>
                    </li>
                );
            })}
        </ol>
    );
};

const QrPremio = ({ premio }: { premio: PremioCopa }) => {
    const [imagen, setImagen] = useState<string | null>(null);
    useEffect(() => {
        void QRCode.toDataURL(`REDCUIDAR:${premio.codigo}`, { margin: 1, width: 480, errorCorrectionLevel: 'M', color: { dark: '#1a1a1a', light: '#ffffff' } })
            .then(setImagen);
    }, [premio.codigo]);

    return (
        <Tarjeta className="overflow-hidden border-2 border-verde-600">
            <div className="bg-verde-600 px-5 py-4 text-white">
                <p className="flex items-center gap-2 text-lg font-black"><Gift className="size-6" aria-hidden />¡Ganaste un premio!</p>
                <p className="text-sm text-white/85">Tu zona, {premio.zona.nombre}, quedó en el podio de la {premio.edicion.nombre}.</p>
            </div>
            {premio.canjeadoEn ? (
                <p className="p-5 text-center font-bold text-verde-700">Premio entregado el {formatearFecha(premio.canjeadoEn)}. ¡Gracias por cuidar el barrio!</p>
            ) : (
                <div className="flex flex-col items-center gap-3 p-5 text-center">
                    {imagen ? <img src={imagen} alt={`Código QR del premio ${premio.codigo}`} className="size-56 rounded-xl" /> : <span className="size-56 animate-pulse rounded-xl bg-gris-superficie" />}
                    <p className="font-mono text-2xl font-black tracking-widest">{premio.codigo}</p>
                    <p className="text-sm text-tinta-suave">Mostrá este código en el punto de entrega de tu municipio. Vence el {formatearFecha(premio.venceEn)}.</p>
                    <p className="flex items-center gap-1.5 text-xs text-gris-texto"><ShieldCheck className="size-4 text-verde-600" aria-hidden />Es anónimo: no dice quién sos ni qué reportaste.</p>
                </div>
            )}
        </Tarjeta>
    );
};

const Reglas = ({ puntos }: { puntos: PuntosCopa }) => (
    <Tarjeta className="p-5">
        <h2 className="font-black">¿Cómo suma tu zona?</h2>
        <ul className="mt-3 space-y-2.5 text-sm">
            <li className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-verde-50 text-verde-700"><Sparkles className="size-5" aria-hidden /></span><span className="flex-1">Limpieza validada</span><strong>+{puntos.LIMPIEZA}</strong></li>
            <li className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-verde-50 text-verde-700"><Brush className="size-5" aria-hidden /></span><span className="flex-1">Semana con tu manzana en verde</span><strong>+{puntos.SEMANA_VERDE}</strong></li>
            <li className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-rojo-50 text-rojo-600"><TriangleAlert className="size-5" aria-hidden /></span><span className="flex-1">Criadero encontrado y validado</span><strong>+{puntos.CRIADERO}</strong></li>
        </ul>
        <p className="mt-4 text-xs leading-relaxed text-gris-texto">
            Se compara por puntos por manzana, así los barrios chicos compiten de igual a igual. Solo suma lo que revisa y valida
            el equipo de salud: enviar muchas veces lo mismo no suma. Compiten las zonas de tu localidad y se reinicia cada mes.
        </p>
    </Tarjeta>
);

export default function Copa() {
    const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
    const [buscando, setBuscando] = useState(false);
    const { manzana, localidadId, isFetching: buscandoManzana } = useMiManzana(ubicacion);
    const zonaId = manzana?.properties.zonaId ?? null;
    const mes = mesArgentino();
    const anterior = mesAnterior(mes);

    const { data: podio, isLoading } = useCopaPodio(localidadId);
    const { data: situacion } = useCopaZona(zonaId);
    const { data: situacionAnterior } = useCopaZona(zonaId, anterior);
    const { data: premio } = usePremio(anterior);

    useEffect(() => {
        void leerAjuste<Ubicacion>('ultimaUbicacion').then((guardada) => guardada && setUbicacion(guardada));
    }, []);

    const ubicar = async () => {
        setBuscando(true);
        try {
            const nueva = await obtenerUbicacion();
            setUbicacion(nueva);
            await guardarAjuste('ultimaUbicacion', nueva);
        } finally {
            setBuscando(false);
        }
    };

    return (
        <div className="space-y-5 px-4 py-6">
            <div>
                <Rotulo>{podio?.edicion.nombre ?? 'Copa mensual'}</Rotulo>
                <h1 className="mt-1 flex items-center gap-2 text-3xl font-black"><Trophy className="size-8 text-verde-600" aria-hidden />Copa Red-Cuidar</h1>
                <Manuscrita className="text-2xl text-verde-600">¡Que tu barrio sea el más cuidado!</Manuscrita>
                <Subrayado className="w-28 text-verde-500" />
                {podio?.edicion.estado === 'en-curso' && (
                    <p className="mt-2 text-sm font-bold text-tinta-suave">
                        {diasHasta(podio.edicion.cierraEn) === 0 ? 'Cierra hoy a la medianoche.' : `Faltan ${diasHasta(podio.edicion.cierraEn)} días para el cierre.`} Habrá premios para las zonas del podio.
                    </p>
                )}
            </div>

            {premio?.tipo === 'premio' && <QrPremio premio={premio.premio} />}
            {premio?.tipo === 'esperando' && (
                <p className="rounded-2xl bg-bruma p-4 text-sm font-bold text-verde-900">Estamos terminando de revisar los reportes del mes pasado. En unos días vas a saber si tu zona ganó.</p>
            )}

            {!ubicacion ? (
                <Tarjeta className="p-5">
                    <p className="font-black">¿En qué zona competís?</p>
                    <p className="mt-1 text-sm text-tinta-suave">Tu zona se calcula en tu celular con tu ubicación, que nunca se envía.</p>
                    <Boton className="mt-4" variante="contorno" onClick={ubicar} disabled={buscando}
                        icono={buscando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Crosshair className="size-4" aria-hidden />}>
                        Ver mi zona
                    </Boton>
                </Tarjeta>
            ) : buscandoManzana || isLoading ? (
                <div className="h-48 animate-pulse rounded-tarjeta bg-white" />
            ) : !podio || !manzana ? (
                <Tarjeta className="p-5 text-sm text-tinta-suave">Tu ubicación no está dentro de una manzana registrada, así que todavía no podemos mostrarte tu zona.</Tarjeta>
            ) : (
                <>
                    <Tarjeta className="p-5">
                        <h2 className="mb-4 font-black">Podio de tu localidad</h2>
                        <Podio zonas={podio.podio} propiaId={zonaId} />
                        <p className="mt-3 text-center text-xs text-gris-texto">Compiten {podio.totalZonas} zonas.</p>
                    </Tarjeta>

                    {situacion ? (
                        <Tarjeta className={cn('p-5', situacion.zona.enPodio && 'border-verde-300 bg-verde-50')}>
                            <p className="text-xs font-extrabold tracking-widest text-gris-texto uppercase">Tu zona</p>
                            <div className="mt-1 flex items-end justify-between gap-3">
                                <div>
                                    <p className="text-xl font-black">{situacion.zona.nombre}</p>
                                    <p className="text-sm text-tinta-suave">{situacion.zona.puntos} puntos · {puntosPorManzana(situacion.zona.puntosPorManzana)} por manzana</p>
                                </div>
                                <p className="text-right"><span className="block text-3xl font-black text-verde-700">{situacion.zona.posicion}º</span><span className="text-xs text-gris-texto">de {situacion.totalZonas}</span></p>
                            </div>
                            <p className="mt-4 rounded-2xl bg-white p-3 text-sm font-bold leading-relaxed text-verde-900">{mensajeDeZona(situacion)}</p>
                            {!situacion.zona.enPodio && (
                                <BotonEnlace to="/app/escanear?nuevo=1" anchoCompleto className="mt-4">Sumar puntos: escanear mi patio</BotonEnlace>
                            )}
                        </Tarjeta>
                    ) : (
                        <Tarjeta className="p-5 text-sm text-tinta-suave">Tu manzana todavía no tiene una zona asignada en la Copa.</Tarjeta>
                    )}

                    {situacionAnterior && situacionAnterior.zona.puntos > 0 && premio?.tipo !== 'premio' && (
                        <Tarjeta className="p-5">
                            <p className="text-xs font-extrabold tracking-widest text-gris-texto uppercase">{situacionAnterior.edicion.nombre}</p>
                            <p className="mt-2 text-sm font-bold leading-relaxed">{mensajeDeZona(situacionAnterior)}</p>
                        </Tarjeta>
                    )}
                </>
            )}

            {podio && <Reglas puntos={podio.puntos} />}
        </div>
    );
}
