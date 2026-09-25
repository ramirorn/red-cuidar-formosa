import { useState, type ReactNode } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import { toast } from 'sonner';
import { Bot, CircleCheck, CircleX, LoaderCircle, Hourglass, ShieldCheck, Syringe } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useUsuarioPanel } from '@/autenticacion/SesionPanel';
import { AreaTexto, Campo } from '@/componentes/panel/Campos';
import { ChipReporte, ConfianzaIa } from '@/componentes/panel/Chips';
import { Dialogo } from '@/componentes/panel/Dialogo';
import { EncabezadoPagina } from '@/componentes/panel/Encabezado';
import { Cargando, ErrorCarga } from '@/componentes/panel/Estados';
import { FormularioIntervencion } from '@/componentes/panel/FormularioIntervencion';
import { ImagenEvidencia } from '@/componentes/panel/ImagenEvidencia';
import { Boton } from '@/componentes/ui/Boton';
import { ChipEstado } from '@/componentes/ui/ChipEstado';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { NOMBRES_CLASE } from '@/deteccion/clases';
import { useCambiarEstadoReporte, useReporte } from '@/hooks/usePanel';
import { errorAmigable } from '@/lib/errores';
import { accionesReporte, nombreCompleto, TIPOS_REPORTE } from '@/lib/etiquetasPanel';
import { formatearFecha } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { EstadoReporte } from '@/tipos';
import type { ReporteDetalle } from '@/tipos/panel';

type Accion = Exclude<EstadoReporte, 'PENDIENTE'>;

const TEXTOS_ACCION: Record<Accion, { texto: string; ayuda: string; Icono: typeof CircleCheck; variante: 'primario' | 'acento' | 'contorno' }> = {
    VALIDADO: { texto: 'Validar', ayuda: 'La foto muestra un riesgo real. La manzana pasa a rojo.', Icono: ShieldCheck, variante: 'acento' },
    RESUELTO: { texto: 'Marcar resuelto', ayuda: 'El criadero ya se eliminó.', Icono: CircleCheck, variante: 'primario' },
    RECHAZADO: { texto: 'Rechazar', ayuda: 'No hay riesgo o la foto no sirve.', Icono: CircleX, variante: 'contorno' },
};

// Para la limpieza que manda un vecino, "validar" confirma que el lugar quedó limpio.
const textoAccion = (accion: Accion, reporte: ReporteDetalle) =>
    reporte.tipo === 'LIMPIEZA' && accion === 'VALIDADO'
        ? { ...TEXTOS_ACCION.VALIDADO, texto: 'Confirmar limpieza', ayuda: 'La foto muestra el lugar limpio. Suma verde a la manzana.', variante: 'primario' as const }
        : TEXTOS_ACCION[accion];

const Dato = ({ etiqueta, children }: { etiqueta: string; children: ReactNode }) => (
    <div className="flex items-start justify-between gap-4 py-2.5 text-sm">
        <dt className="text-gris-texto">{etiqueta}</dt>
        <dd className="text-right font-bold">{children}</dd>
    </div>
);

// Tiempo que le queda a un reporte pendiente antes de descartarse (con su foto).
const Vencimiento = ({ venceEn }: { venceEn: string }) => {
    const horas = Math.max(0, Math.floor((new Date(venceEn).getTime() - Date.now()) / 3_600_000));
    const urgente = horas < 24;
    return (
        <p className={cn('flex items-center gap-2 rounded-2xl p-3 text-sm font-bold', urgente ? 'bg-rojo-50 text-rojo-700' : 'bg-amber-50 text-amber-800')}>
            <Hourglass className="size-4 shrink-0" aria-hidden />
            {horas === 0 ? 'Vence en menos de una hora' : `Vence en ${horas} ${horas === 1 ? 'hora' : 'horas'}`}: si nadie lo revisa, se descarta con su foto.
        </p>
    );
};

// Explica por qué no hay foto: privacidad del vecino.
const SinFoto = ({ reporte, puedeVerFotos }: { reporte: ReporteDetalle; puedeVerFotos: boolean }) => (
    <Tarjeta className="flex items-start gap-3 p-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-bruma text-verde-700"><ShieldCheck className="size-5" aria-hidden /></span>
        <div className="text-sm">
            <p className="font-black">{reporte.estado !== 'PENDIENTE' ? 'La foto ya se borró' : 'Las fotos solo las ve Epidemiología'}</p>
            <p className="mt-1 leading-relaxed text-tinta-suave">
                {reporte.estado !== 'PENDIENTE'
                    ? 'Para proteger la privacidad del vecino, la foto se borra en cuanto el reporte se valida o se rechaza.'
                    : puedeVerFotos
                        ? 'Este reporte no tiene fotos disponibles.'
                        : 'Para proteger la privacidad del vecino, solo Epidemiología revisa las fotos y decide si el reporte es válido.'}
            </p>
        </div>
    </Tarjeta>
);

export default function DetalleReporte() {
    const { id = '' } = useParams();
    const ubicacion = useLocation();
    const volverA = (ubicacion.state as { volver?: string } | null)?.volver ?? '/panel/reportes';
    const { puede } = useUsuarioPanel();
    const { data: reporte, error, isLoading, refetch } = useReporte(id);
    const cambiar = useCambiarEstadoReporte();
    const [rechazando, setRechazando] = useState(false);
    const [motivo, setMotivo] = useState('');
    const [intervencion, setIntervencion] = useState(false);

    if (isLoading) return <Cargando texto="Cargando el reporte…" />;
    if (error || !reporte) {
        return (
            <div className="space-y-4">
                <EncabezadoPagina titulo="Reporte" volverA={volverA} />
                <ErrorCarga error={error} porDefecto="No encontramos este reporte." {...(isAxiosError(error) && error.response?.status === 404 ? {} : { alReintentar: () => void refetch() })} />
            </div>
        );
    }

    const acciones = puede('reportes:validar') ? accionesReporte(reporte.estado, reporte.tipo) : [];
    const puedeIntervenir = puede('intervenciones:registrar') && reporte.manzana && reporte.tipo !== 'LIMPIEZA' && reporte.estado !== 'RESUELTO' && reporte.estado !== 'RECHAZADO';

    const aplicar = async (estado: Accion, motivoRechazo?: string) => {
        try {
            await cambiar.mutateAsync({ id: reporte.id, estado, ...(motivoRechazo ? { motivoRechazo } : {}) });
            toast.success(estado === 'RECHAZADO' ? 'Reporte rechazado' : estado === 'RESUELTO' ? 'Reporte resuelto' : 'Reporte validado');
            setRechazando(false);
            setMotivo('');
        } catch (causa) {
            // 409: otra persona lo cambió mientras tanto; se recarga para mostrar el estado real.
            toast.error(errorAmigable(causa, 'No pudimos cambiar el estado.'));
            void refetch();
        }
    };

    const unaSolaFoto = reporte.evidencias.length === 1;

    return (
        <div className="space-y-6">
            <EncabezadoPagina
                volverA={volverA}
                rotulo={`Reporte · ${reporte.origen === 'CHAT' ? 'desde el chat' : 'desde la app'}`}
                titulo={<span className="flex flex-wrap items-center gap-3">{TIPOS_REPORTE[reporte.tipo]} en {reporte.manzana?.codigo ?? 'zona sin manzana'} <ChipReporte estado={reporte.estado} className="text-sm" /></span>}
                descripcion={`Recibido el ${formatearFecha(reporte.createdAt)}.`}
            />

            <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
                <div className="space-y-6">
                    {reporte.venceEn && <Vencimiento venceEn={reporte.venceEn} />}
                    {reporte.evidencias.length > 0 ? (
                        <>
                            <div className={unaSolaFoto ? 'mx-auto max-w-xl' : 'grid gap-4 sm:grid-cols-2'}>
                                {reporte.evidencias.map((evidencia) => (
                                    <ImagenEvidencia key={evidencia.id} evidencia={evidencia} detecciones={unaSolaFoto ? reporte.detecciones : []} />
                                ))}
                            </div>
                            <p className="flex items-center gap-2 text-xs text-gris-texto">
                                <ShieldCheck className="size-4 text-verde-600" aria-hidden />
                                Es solo el recorte que marcó el vecino. Se borra cuando decidas; cada vista queda en la auditoría.
                            </p>
                        </>
                    ) : <SinFoto reporte={reporte} puedeVerFotos={puede('evidencias:ver')} />}

                    {reporte.detecciones.length > 0 && (
                        <Tarjeta className="p-5">
                            <h2 className="flex items-center gap-2 font-black"><Bot className="size-5 text-verde-700" aria-hidden />Lo que marcó la IA en el celular</h2>
                            <ul className="mt-3 flex flex-wrap gap-2">
                                {reporte.detecciones.map((deteccion, indice) => (
                                    <li key={indice} className="rounded-full bg-rojo-50 px-3 py-1 text-sm font-bold text-rojo-700">
                                        {NOMBRES_CLASE[deteccion.clase]} · {Math.round(deteccion.confianza * 100)}%
                                    </li>
                                ))}
                            </ul>
                            <p className="mt-3 text-xs text-gris-texto">Es una ayuda para mirar la foto; la decisión es tuya.</p>
                        </Tarjeta>
                    )}

                    {reporte.descripcion && (
                        <Tarjeta className="p-5">
                            <h2 className="font-black">Lo que escribió el vecino</h2>
                            <p className="mt-2 leading-relaxed whitespace-pre-line text-tinta-suave">{reporte.descripcion}</p>
                        </Tarjeta>
                    )}
                </div>

                <div className="space-y-6">
                    {(acciones.length > 0 || puedeIntervenir) && (
                        <Tarjeta className="p-5">
                            <h2 className="font-black">¿Qué hacemos?</h2>
                            <div className="mt-4 space-y-3">
                                {acciones.map((accion) => {
                                    const { texto, ayuda, Icono, variante } = textoAccion(accion, reporte);
                                    return (
                                        <div key={accion}>
                                            <Boton variante={variante} anchoCompleto disabled={cambiar.isPending}
                                                onClick={() => (accion === 'RECHAZADO' ? setRechazando(true) : void aplicar(accion))}
                                                icono={cambiar.isPending && cambiar.variables?.estado === accion ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Icono className="size-5" aria-hidden />}>
                                                {texto}
                                            </Boton>
                                            <p className="mt-1 px-2 text-center text-xs text-gris-texto">{ayuda}</p>
                                        </div>
                                    );
                                })}
                                {puedeIntervenir && (
                                    <Boton variante="blanco" anchoCompleto className="ring-1 ring-verde-200" onClick={() => setIntervencion(true)} icono={<Syringe className="size-5" aria-hidden />}>
                                        Registrar intervención
                                    </Boton>
                                )}
                            </div>
                        </Tarjeta>
                    )}

                    <Tarjeta className="px-5 py-3">
                        <dl className="divide-y divide-gris-borde">
                            <Dato etiqueta="Manzana">
                                <span className="flex flex-col items-end gap-1">{reporte.manzana.codigo}<ChipEstado estado={reporte.manzana.estado} tamano="chico" /></span>
                            </Dato>
                            <Dato etiqueta="Foto tomada">{formatearFecha(reporte.capturadoEn)}</Dato>
                            <Dato etiqueta="Confianza de la IA"><ConfianzaIa valor={reporte.confianzaIa} /></Dato>
                            {reporte.validadoEn && <Dato etiqueta="Revisado por">{nombreCompleto(reporte.validadoPor)}<span className="block text-xs font-normal text-gris-texto">{formatearFecha(reporte.validadoEn)}</span></Dato>}
                            {reporte.motivoRechazo && <Dato etiqueta="Motivo del rechazo">{reporte.motivoRechazo}</Dato>}
                            {reporte.reporteResueltoId && (
                                <Dato etiqueta="Cierra el reporte">
                                    <Link to={`/panel/reportes/${reporte.reporteResueltoId}`} className="text-verde-700 underline">Ver criadero original</Link>
                                </Dato>
                            )}
                        </dl>
                    </Tarjeta>

                </div>
            </div>

            <Dialogo abierto={rechazando} alCambiar={setRechazando} titulo="Rechazar el reporte" descripcion="El motivo queda registrado y ayuda a mejorar la app.">
                <form onSubmit={(evento) => { evento.preventDefault(); void aplicar('RECHAZADO', motivo.trim()); }} className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                        {['La foto no muestra un criadero', 'Foto borrosa o sin contexto', 'Reporte repetido', 'Fuera de la zona'].map((sugerencia) => (
                            <button key={sugerencia} type="button" onClick={() => setMotivo(sugerencia)} className="rounded-full border border-gris-borde px-3 py-1.5 text-xs font-bold hover:bg-bruma">{sugerencia}</button>
                        ))}
                    </div>
                    <Campo etiqueta="Motivo" ayuda="Entre 3 y 300 caracteres.">
                        {(props) => <AreaTexto {...props} value={motivo} onChange={(evento) => setMotivo(evento.target.value)} minLength={3} maxLength={300} required autoFocus />}
                    </Campo>
                    <Boton type="submit" variante="acento" anchoCompleto disabled={motivo.trim().length < 3 || cambiar.isPending}>Rechazar</Boton>
                </form>
            </Dialogo>

            {reporte.manzana && (
                <Dialogo abierto={intervencion} alCambiar={setIntervencion} titulo="Registrar intervención">
                    <FormularioIntervencion manzana={reporte.manzana} reporteId={reporte.id}
                        tipoInicial={reporte.tipo === 'MICROBASURAL' ? 'DESCACHARRADO' : undefined} alTerminar={() => setIntervencion(false)} />
                </Dialogo>
            )}
        </div>
    );
}
