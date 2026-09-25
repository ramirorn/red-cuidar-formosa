import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router';
import { Camera, Flashlight, FlashlightOff, ImagePlus, LoaderCircle, X } from 'lucide-react';
import { NOMBRES_CLASE } from '@/deteccion/clases';
import { useDetector } from '@/deteccion/useDetector';
import { useVolver } from '@/hooks/useVolver';
import { comprimirImagen } from '@/lib/imagenes';
import { cn } from '@/lib/utils';
import type { Deteccion, TipoReporte } from '@/tipos';
import { MAXIMO_FOTOS, useBorrador } from './borrador';

const INTERVALO_DETECCION_MS = 450;

type EstadoCamara = 'iniciando' | 'activa' | 'sin-acceso';

// Recuadros de la IA dibujados con las mismas proporciones que el video (object-cover = slice).
const Recuadros = ({ detecciones, ancho, alto }: { detecciones: Deteccion[]; ancho: number; alto: number }) => (
    <svg className="pointer-events-none absolute inset-0 size-full" viewBox={`0 0 ${ancho} ${alto}`} preserveAspectRatio="xMidYMid slice" aria-hidden>
        {detecciones.map((deteccion, indice) => {
            const x = deteccion.cajaDelimitadora.x * ancho;
            const y = deteccion.cajaDelimitadora.y * alto;
            const etiqueta = `${NOMBRES_CLASE[deteccion.clase]} ${Math.round(deteccion.confianza * 100)}%`;
            const escala = ancho / 400;
            return (
                <g key={indice}>
                    <rect x={x} y={y} width={deteccion.cajaDelimitadora.ancho * ancho} height={deteccion.cajaDelimitadora.alto * alto}
                        rx={10 * escala} fill="none" stroke="#e11b22" strokeWidth={4 * escala} />
                    <rect x={x} y={Math.max(0, y - 24 * escala)} width={(etiqueta.length * 7 + 16) * escala} height={22 * escala} rx={11 * escala} fill="#e11b22" />
                    <text x={x + 8 * escala} y={Math.max(0, y - 24 * escala) + 15.5 * escala} fill="#fff" fontSize={12.5 * escala} fontWeight={800} fontFamily="Nunito, sans-serif">{etiqueta}</text>
                </g>
            );
        })}
    </svg>
);

export default function Escaner() {
    const navegar = useNavigate();
    const [parametros] = useSearchParams();
    const ubicacion = useLocation();
    const cerrar = useVolver('/app');
    // Si se abrió desde el reporte ("agregar otra foto"), al terminar se vuelve a él.
    const desdeReporte = Boolean((ubicacion.state as { volverAlReporte?: boolean } | null)?.volverAlReporte);
    const borrador = useBorrador();
    const { estado: estadoDetector, detectar } = useDetector();

    const video = useRef<HTMLVideoElement>(null);
    const flujo = useRef<MediaStream | null>(null);
    const [estadoCamara, setEstadoCamara] = useState<EstadoCamara>('iniciando');
    const [detecciones, setDetecciones] = useState<Deteccion[]>([]);
    const [dimensiones, setDimensiones] = useState({ ancho: 1280, alto: 720 });
    const [linterna, setLinterna] = useState<boolean | null>(null);
    const [procesando, setProcesando] = useState(false);

    const esLimpieza = borrador.tipo === 'LIMPIEZA' || parametros.get('tipo') === 'LIMPIEZA';

    // Un reporte nuevo (o de limpieza) empieza con el borrador vacío. `iniciar` es estable.
    const { iniciar } = borrador;
    useEffect(() => {
        const tipo = parametros.get('tipo') as TipoReporte | null;
        const resuelve = parametros.get('resuelve');
        if (parametros.get('nuevo') || tipo || resuelve) iniciar({ ...(tipo ? { tipo } : {}), ...(resuelve ? { reporteResueltoId: resuelve } : {}) });
    }, [parametros, iniciar]);

    useEffect(() => {
        let cancelado = false;
        (async () => {
            try {
                const medio = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 960 } },
                    audio: false,
                });
                if (cancelado) return medio.getTracks().forEach((pista) => pista.stop());
                flujo.current = medio;
                if (video.current) {
                    video.current.srcObject = medio;
                    await video.current.play();
                }
                const pista = medio.getVideoTracks()[0];
                const capacidades = pista?.getCapabilities?.() as (MediaTrackCapabilities & { torch?: boolean }) | undefined;
                if (capacidades?.torch) setLinterna(false);
                return setEstadoCamara('activa');
            } catch {
                return setEstadoCamara('sin-acceso');
            }
        })();
        return () => {
            cancelado = true;
            flujo.current?.getTracks().forEach((pista) => pista.stop());
        };
    }, []);

    // Detección continua sobre el video, espaciada para no gastar batería.
    useEffect(() => {
        if (estadoCamara !== 'activa' || estadoDetector !== 'listo') return undefined;
        let activo = true;
        const ciclo = async () => {
            while (activo) {
                const elemento = video.current;
                if (elemento && elemento.readyState >= 2 && elemento.videoWidth > 0) {
                    setDimensiones({ ancho: elemento.videoWidth, alto: elemento.videoHeight });
                    const resultado = await detectar(elemento);
                    if (activo) setDetecciones(resultado);
                }
                await new Promise((resolver) => setTimeout(resolver, INTERVALO_DETECCION_MS));
            }
        };
        void ciclo();
        return () => { activo = false; };
    }, [estadoCamara, estadoDetector, detectar]);

    const alternarLinterna = async () => {
        const pista = flujo.current?.getVideoTracks()[0];
        if (!pista || linterna === null) return;
        await pista.applyConstraints({ advanced: [{ torch: !linterna } as MediaTrackConstraintSet] }).catch(() => undefined);
        setLinterna(!linterna);
    };

    // El escáner se reemplaza en el historial: "volver" desde el reporte no reabre un escáner vacío.
    const terminar = useCallback(() => (desdeReporte ? navegar(-1) : navegar('/app/reportar', { replace: true })), [navegar, desdeReporte]);

    const capturar = async () => {
        const elemento = video.current;
        if (!elemento || procesando) return;
        setProcesando(true);
        try {
            const lienzo = document.createElement('canvas');
            lienzo.width = elemento.videoWidth;
            lienzo.height = elemento.videoHeight;
            lienzo.getContext('2d')?.drawImage(elemento, 0, 0);
            const blob = await comprimirImagen(lienzo);
            borrador.agregarFoto({ blob, ancho: lienzo.width, alto: lienzo.height, detecciones, capturadaEn: new Date().toISOString() });
            terminar();
        } finally {
            setProcesando(false);
        }
    };

    const desdeGaleria = async (evento: ChangeEvent<HTMLInputElement>) => {
        const archivo = evento.target.files?.[0];
        if (!archivo) return;
        setProcesando(true);
        try {
            const blob = await comprimirImagen(archivo);
            const mapa = await createImageBitmap(blob);
            const resultado = await detectar(blob);
            borrador.agregarFoto({ blob, ancho: mapa.width, alto: mapa.height, detecciones: resultado, capturadaEn: new Date().toISOString() });
            mapa.close();
            terminar();
        } finally {
            setProcesando(false);
        }
    };

    const cantidad = detecciones.length;
    const lleno = borrador.fotos.length >= MAXIMO_FOTOS;

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-tinta text-white">
            <div className="relative flex-1 overflow-hidden">
                <video ref={video} className="absolute inset-0 size-full object-cover" playsInline muted aria-label="Vista de la cámara" />
                {estadoCamara === 'activa' && <Recuadros detecciones={detecciones} ancho={dimensiones.ancho} alto={dimensiones.alto} />}

                {estadoCamara === 'sin-acceso' && (
                    <div className="absolute inset-0 grid place-items-center bg-verde-950 px-8 text-center">
                        <div>
                            <Camera className="mx-auto size-12 text-verde-300" aria-hidden />
                            <p className="mt-4 text-lg font-black">No pudimos abrir la cámara</p>
                            <p className="mt-2 text-sm text-white/75">Podés permitir el acceso desde la configuración del navegador, o elegir una foto de tu galería.</p>
                        </div>
                    </div>
                )}

                <div className="absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
                    <button type="button" onClick={cerrar} aria-label="Cerrar el escáner" className="grid size-11 place-items-center rounded-full bg-black/55 backdrop-blur">
                        <X aria-hidden />
                    </button>

                    <p role="status" aria-live="polite" className={cn(
                        'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-extrabold backdrop-blur',
                        cantidad > 0 && !esLimpieza ? 'bg-rojo-500/90' : 'bg-black/55',
                    )}>
                        {estadoDetector === 'cargando' && <><LoaderCircle className="size-4 animate-spin" aria-hidden />Preparando la IA…</>}
                        {estadoDetector === 'no-disponible' && 'Detección no disponible: sacá la foto igual'}
                        {estadoDetector === 'listo' && (cantidad === 0
                            ? (esLimpieza ? '¡No vemos recipientes con agua!' : 'Recorré el patio despacio')
                            : `${cantidad} ${cantidad === 1 ? 'posible criadero' : 'posibles criaderos'}`)}
                    </p>

                    {linterna !== null ? (
                        <button type="button" onClick={alternarLinterna} aria-label={linterna ? 'Apagar linterna' : 'Encender linterna'} aria-pressed={linterna} className="grid size-11 place-items-center rounded-full bg-black/55 backdrop-blur">
                            {linterna ? <FlashlightOff aria-hidden /> : <Flashlight aria-hidden />}
                        </button>
                    ) : <span className="size-11" />}
                </div>
            </div>

            <div className="bg-tinta px-6 pt-5 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                <p className="text-center text-sm text-white/80">
                    {esLimpieza ? 'Sacá una foto de cómo quedó el lugar.' : 'Marcamos en rojo lo que puede juntar agua.'}
                    {borrador.fotos.length > 0 && ` Foto ${borrador.fotos.length + 1} de ${MAXIMO_FOTOS}.`}
                </p>
                <div className="mt-4 grid grid-cols-3 items-center">
                    <label className={cn('flex cursor-pointer flex-col items-center gap-1 text-xs font-bold text-white/85', lleno && 'pointer-events-none opacity-40')}>
                        <span className="grid size-12 place-items-center rounded-full bg-white/15"><ImagePlus aria-hidden /></span>
                        Galería
                        <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={desdeGaleria} disabled={lleno || procesando} />
                    </label>
                    <button
                        type="button"
                        onClick={capturar}
                        disabled={estadoCamara !== 'activa' || procesando || lleno}
                        aria-label="Sacar foto"
                        className="mx-auto grid size-20 place-items-center rounded-full border-[6px] border-verde-400 bg-white transition active:scale-95 disabled:opacity-50"
                    >
                        {procesando ? <LoaderCircle className="size-8 animate-spin text-tinta" aria-hidden /> : <span className="size-14 rounded-full border-2 border-tinta" />}
                    </button>
                    {borrador.fotos.length > 0 ? (
                        <button type="button" onClick={terminar} className="flex flex-col items-center gap-1 text-xs font-bold text-white/85">
                            <img src={borrador.fotos.at(-1)?.url} alt="" className="size-12 rounded-xl border-2 border-white object-cover" />
                            Continuar
                        </button>
                    ) : <span />}
                </div>
            </div>
        </div>
    );
}
