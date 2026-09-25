import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Camera, CameraOff, CircleAlert, CircleCheck, Ticket } from 'lucide-react';
import { Campo, Entrada } from '@/componentes/panel/Campos';
import { EncabezadoPagina } from '@/componentes/panel/Encabezado';
import { Boton } from '@/componentes/ui/Boton';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { useCanjearPremio } from '@/hooks/usePanel';
import { errorAmigable } from '@/lib/errores';
import { formatearFecha } from '@/lib/formato';
import type { CanjeRealizado } from '@/tipos/panel';

// BarcodeDetector todavía no está en los tipos de TypeScript; solo existe en Chrome/Android.
interface Detector { detect: (fuente: HTMLVideoElement) => Promise<{ rawValue: string }[]> }
type ConstructorDetector = new (opciones: { formats: string[] }) => Detector;
const ConDetector = (globalThis as { BarcodeDetector?: ConstructorDetector }).BarcodeDetector;

const PATRON_CODIGO = /^(REDCUIDAR:)?\s*RC-?[A-Z0-9]{4}-?[A-Z0-9]{4}$/i;

const Escaner = ({ alLeer }: { alLeer: (texto: string) => void }) => {
    const video = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    // Con la función en una ref la cámara no se reinicia en cada render del padre.
    const alLeerActual = useRef(alLeer);
    alLeerActual.current = alLeer;

    useEffect(() => {
        let flujo: MediaStream | null = null;
        let activo = true;
        const detector = new ConDetector!({ formats: ['qr_code'] });
        const buscar = async () => {
            if (!activo || !video.current) return;
            try {
                const [lectura] = await detector.detect(video.current);
                if (lectura && PATRON_CODIGO.test(lectura.rawValue.trim())) { alLeerActual.current(lectura.rawValue.trim()); return; }
            } catch { /* cuadro vacío o video sin datos todavía */ }
            setTimeout(() => void buscar(), 300);
        };
        void navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(async (obtenido) => {
                flujo = obtenido;
                if (!activo || !video.current) return;
                video.current.srcObject = obtenido;
                await video.current.play();
                void buscar();
            })
            .catch(() => setError('No pudimos usar la cámara. Revisá los permisos o escribí el código a mano.'));
        return () => {
            activo = false;
            flujo?.getTracks().forEach((pista) => pista.stop());
        };
    }, []);

    if (error) return <p className="rounded-xl bg-rojo-50 p-3 text-sm font-bold text-rojo-700">{error}</p>;
    return (
        <div className="relative overflow-hidden rounded-2xl bg-tinta">
            <video ref={video} muted playsInline className="aspect-square w-full object-cover" aria-label="Cámara para leer el QR del premio" />
            <span className="pointer-events-none absolute inset-10 rounded-2xl border-4 border-white/80" aria-hidden />
        </div>
    );
};

export default function Canjes() {
    const canjear = useCanjearPremio();
    const [codigo, setCodigo] = useState('');
    const [camara, setCamara] = useState(false);
    const [resultado, setResultado] = useState<{ ok: true; canje: CanjeRealizado } | { ok: false; mensaje: string } | null>(null);

    const enviar = async (texto: string) => {
        setResultado(null);
        try {
            const canje = await canjear.mutateAsync(texto);
            setResultado({ ok: true, canje });
            setCodigo('');
        } catch (error) {
            setResultado({ ok: false, mensaje: errorAmigable(error, 'No pudimos canjear el premio. Intentá de nuevo.') });
        }
    };

    const leido = (texto: string) => {
        setCamara(false);
        setCodigo(texto.replace(/^REDCUIDAR:/i, '').toUpperCase());
        void enviar(texto);
    };

    const alEnviar = (evento: FormEvent) => {
        evento.preventDefault();
        if (codigo.trim()) void enviar(codigo.trim());
    };

    return (
        <div className="mx-auto max-w-xl space-y-6">
            <EncabezadoPagina rotulo="Copa Red-Cuidar" titulo="Canjear premio"
                descripcion="Escaneá el QR que muestra el vecino o escribí el código. Cada código se entrega una sola vez y es anónimo: no dice quién es ni qué reportó." />

            <Tarjeta className="space-y-4 p-5">
                {ConDetector && (camara
                    ? <><Escaner alLeer={leido} /><Boton variante="contorno" anchoCompleto onClick={() => setCamara(false)} icono={<CameraOff className="size-4" aria-hidden />}>Cerrar cámara</Boton></>
                    : <Boton variante="contorno" anchoCompleto onClick={() => { setResultado(null); setCamara(true); }} icono={<Camera className="size-4" aria-hidden />}>Escanear QR</Boton>)}

                <form onSubmit={alEnviar} className="space-y-3">
                    <Campo etiqueta="Código del premio" ayuda="Formato RC-XXXX-XXXX">
                        {(props) => (
                            <Entrada {...props} value={codigo} onChange={(evento) => setCodigo(evento.target.value.toUpperCase())}
                                placeholder="RC-XXXX-XXXX" autoComplete="off" spellCheck={false} className="font-mono tracking-widest" />
                        )}
                    </Campo>
                    <Boton type="submit" anchoCompleto disabled={!codigo.trim() || canjear.isPending} icono={<Ticket className="size-4" aria-hidden />}>
                        {canjear.isPending ? 'Canjeando…' : 'Canjear'}
                    </Boton>
                </form>
            </Tarjeta>

            {resultado?.ok === true && (
                <Tarjeta role="status" className="border-2 border-verde-500 bg-verde-50 p-5">
                    <p className="flex items-center gap-2 text-lg font-black text-verde-800"><CircleCheck className="size-6" aria-hidden />Premio entregado</p>
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
                        <dt className="text-gris-texto">Código</dt><dd className="font-mono font-bold">{resultado.canje.codigo}</dd>
                        <dt className="text-gris-texto">Zona</dt><dd className="font-bold">{resultado.canje.zona.nombre}</dd>
                        <dt className="text-gris-texto">Localidad</dt><dd>{resultado.canje.localidad}</dd>
                        <dt className="text-gris-texto">Edición</dt><dd>{resultado.canje.edicion}</dd>
                        <dt className="text-gris-texto">Entregado</dt><dd>{formatearFecha(resultado.canje.canjeadoEn)}</dd>
                    </dl>
                </Tarjeta>
            )}
            {resultado?.ok === false && (
                <p role="alert" className="flex items-center gap-2 rounded-tarjeta border border-rojo-200 bg-rojo-50 p-4 text-sm font-bold text-rojo-700">
                    <CircleAlert className="size-5 shrink-0" aria-hidden />{resultado.mensaje}
                </p>
            )}
        </div>
    );
}
