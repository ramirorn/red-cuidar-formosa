import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import {
    BellRing,
    Camera,
    ChevronRight,
    Crosshair,
    Lightbulb,
    ListChecks,
    LoaderCircle,
    Map,
    MessageCircleHeart,
    ScanSearch,
    Sparkles,
    UserRoundX,
    WifiOff,
} from 'lucide-react';
import { MapaManzanas } from '@/componentes/mapa/MapaManzanas';
import { Boton, BotonEnlace } from '@/componentes/ui/Boton';
import { ChipEstado } from '@/componentes/ui/ChipEstado';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { Manuscrita, Rotulo } from '@/componentes/ui/Tipografia';
import { Mancha, Subrayado } from '@/componentes/ilustraciones/Garabatos';
import { useMiManzana } from '@/hooks/useVecino';
import { obtenerUbicacion, type Ubicacion } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { guardarAjuste, leerAjuste } from '@/sinConexion/bd';
import type { EstadoManzana } from '@/tipos';

const FRASES: Record<EstadoManzana, string> = {
    ROJO: 'Hay un criadero confirmado cerca. Si ya lo eliminaste, mandá la foto de cómo quedó.',
    AMARILLO: 'Hay reportes en revisión o llovió después de la última limpieza. Revisá los recipientes.',
    VERDE: '¡Tu cuadra está limpia! Mantenela así revisando el patio después de cada lluvia.',
    SIN_DATOS: 'Todavía nadie reportó en tu manzana. ¡Sé el primero en escanear tu patio!',
};

// ---------------------------------------------------------------------------
// Bienvenida (solo la primera vez)
// ---------------------------------------------------------------------------

const DIAPOSITIVAS = [
    { Icono: ScanSearch, titulo: 'Tu cámara ve lo que a veces no vemos', texto: 'La IA marca en rojo baldes, botellas, macetas y otros recipientes que juntan agua.' },
    { Icono: Sparkles, titulo: 'Pintá tu manzana de verde', texto: 'Cada limpieza confirmada suma para tu cuadra en el mapa del barrio.' },
    { Icono: BellRing, titulo: 'Te avisamos después de la lluvia', texto: 'Un recordatorio para vaciar, cepillar y tapar los recipientes.' },
];

const Bienvenida = ({ alTerminar }: { alTerminar: () => void }) => {
    const [actual, setActual] = useState(0);
    const diapositiva = DIAPOSITIVAS[actual] ?? DIAPOSITIVAS[0]!;
    const ultima = actual === DIAPOSITIVAS.length - 1;

    return (
        <div className="relative flex min-h-[calc(100dvh-10rem)] flex-col justify-between overflow-hidden px-6 py-8 text-center">
            <Mancha className="absolute -top-24 left-1/2 w-[34rem] -translate-x-1/2 text-verde-100" />
            <div className="relative">
                <img src="/marca/logo-apilado.webp" alt="Red-Cuidar Formosa" width="720" height="500" className="mx-auto h-28 w-auto" />
                <div key={actual} className="mt-8 animate-aparecer">
                    <span className="mx-auto grid size-24 place-items-center rounded-full border-2 border-tinta bg-white shadow-suave">
                        <diapositiva.Icono className="size-11 text-verde-600" strokeWidth={2} aria-hidden />
                    </span>
                    <h1 className="mt-6 text-2xl leading-tight font-black">{diapositiva.titulo}</h1>
                    <p className="mx-auto mt-3 max-w-xs leading-relaxed text-tinta-suave">{diapositiva.texto}</p>
                </div>
                <div className="mt-6 flex justify-center gap-2" aria-hidden>
                    {DIAPOSITIVAS.map((_, indice) => (
                        <span key={indice} className={cn('h-2 rounded-full transition-all', indice === actual ? 'w-6 bg-verde-600' : 'w-2 bg-gris-borde')} />
                    ))}
                </div>
            </div>
            <div className="relative mt-8 space-y-3">
                <p className="flex items-center justify-center gap-2 text-sm font-bold text-tinta-suave">
                    <UserRoundX className="size-4 text-verde-600" aria-hidden />No necesitás registrarte ni dar tu teléfono
                </p>
                <Boton tamano="grande" anchoCompleto onClick={() => (ultima ? alTerminar() : setActual(actual + 1))}>
                    {ultima ? 'Empezar' : 'Siguiente'}
                </Boton>
                <p className="flex items-center justify-center gap-2 text-xs text-gris-texto">
                    <WifiOff className="size-3.5" aria-hidden />Funciona sin internet: tus reportes se envían cuando vuelve la señal
                </p>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Tarjeta "Tu manzana"
// ---------------------------------------------------------------------------

const TuManzana = () => {
    const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
    const [buscando, setBuscando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { manzana, cercanas, isFetching } = useMiManzana(ubicacion);

    useEffect(() => {
        void leerAjuste<Ubicacion>('ultimaUbicacion').then((guardada) => guardada && setUbicacion(guardada));
    }, []);

    const ubicar = async () => {
        setBuscando(true);
        setError(null);
        try {
            const nueva = await obtenerUbicacion();
            setUbicacion(nueva);
            await guardarAjuste('ultimaUbicacion', nueva);
        } catch (causa) {
            setError((causa as Error).message);
        } finally {
            setBuscando(false);
        }
    };

    const estado = manzana?.properties.estado ?? null;

    return (
        <Tarjeta className="overflow-hidden">
            <div className="flex items-center justify-between px-5 pt-5">
                <Rotulo>Tu manzana</Rotulo>
                {estado && <ChipEstado estado={estado} tamano="chico" />}
            </div>

            {ubicacion ? (
                <>
                    <div className="mx-5 mt-4 h-44 overflow-hidden rounded-2xl border border-gris-borde">
                        <MapaManzanas
                            centro={[ubicacion.latitud, ubicacion.longitud]}
                            manzanas={cercanas}
                            seleccionadaId={manzana?.id ?? null}
                            ubicacion={[ubicacion.latitud, ubicacion.longitud]}
                            interactivo={false}
                            className="size-full"
                        />
                    </div>
                    <div className="p-5">
                        {manzana && estado ? (
                            <>
                                <p className="text-xl font-black">Manzana {manzana.properties.codigo}</p>
                                <p className="mt-1 text-sm leading-relaxed text-tinta-suave">{FRASES[estado]}</p>
                            </>
                        ) : (
                            <p className="text-sm leading-relaxed text-tinta-suave">
                                {isFetching ? 'Buscando tu manzana…' : 'Tu ubicación todavía no tiene manzanas cargadas en el mapa. Igual podés reportar.'}
                            </p>
                        )}
                        <button type="button" onClick={ubicar} className="mt-3 flex items-center gap-2 text-sm font-extrabold text-verde-700">
                            {buscando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Crosshair className="size-4" aria-hidden />}
                            Actualizar ubicación
                        </button>
                    </div>
                </>
            ) : (
                <div className="p-5">
                    <p className="text-sm leading-relaxed text-tinta-suave">Mirá de qué color está tu cuadra. Usamos tu ubicación solo para mostrarte el mapa.</p>
                    {error && <p role="alert" className="mt-2 text-sm font-bold text-rojo-600">{error}</p>}
                    <Boton variante="contorno" className="mt-4" onClick={ubicar} disabled={buscando}
                        icono={buscando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <Crosshair className="size-4" aria-hidden />}>
                        Ver mi manzana
                    </Boton>
                </div>
            )}
        </Tarjeta>
    );
};

// ---------------------------------------------------------------------------
// Inicio
// ---------------------------------------------------------------------------

const ACCESOS = [
    { a: '/app/mapa', texto: 'Mapa del barrio', Icono: Map, clases: 'bg-verde-50 text-verde-700' },
    { a: '/app/reportes', texto: 'Mis reportes', Icono: ListChecks, clases: 'bg-amber-50 text-amber-800' },
    { a: '/app/chat', texto: 'IA Mosquito', Icono: MessageCircleHeart, clases: 'bg-rojo-50 text-rojo-700' },
    { a: '/app/consejos', texto: 'Consejos', Icono: Lightbulb, clases: 'bg-bruma text-verde-800' },
];

export default function InicioVecino() {
    const [bienvenidaVista, setBienvenidaVista] = useState<boolean | null>(null);

    useEffect(() => {
        void leerAjuste<boolean>('bienvenidaVista').then((vista) => setBienvenidaVista(Boolean(vista)));
    }, []);

    if (bienvenidaVista === null) return null;
    if (!bienvenidaVista) {
        return <Bienvenida alTerminar={() => { void guardarAjuste('bienvenidaVista', true); setBienvenidaVista(true); }} />;
    }

    return (
        <div className="space-y-5 px-4 py-6">
            <div>
                <h1 className="text-2xl font-black">¡Hola, vecino!</h1>
                <Manuscrita className="text-2xl text-verde-600">Cuidemos el barrio juntos</Manuscrita>
                <Subrayado className="w-24 text-verde-500" />
            </div>

            <TuManzana />

            <BotonEnlace to="/app/escanear?nuevo=1" tamano="grande" anchoCompleto className="h-16 text-lg" icono={<Camera className="size-6" aria-hidden />}>
                Escanear mi patio
            </BotonEnlace>
            <BotonEnlace to="/app/limpieza" variante="contorno" anchoCompleto icono={<Sparkles className="size-4" aria-hidden />}>
                Ya limpié: sacar foto de cómo quedó
            </BotonEnlace>

            <nav aria-label="Accesos rápidos" className="grid grid-cols-2 gap-3">
                {ACCESOS.map(({ a, texto, Icono, clases }) => (
                    <Link key={a} to={a} className="flex items-center justify-between gap-2 rounded-tarjeta border border-gris-borde bg-white p-4 shadow-suave transition hover:-translate-y-0.5">
                        <span className="flex items-center gap-3">
                            <span className={cn('grid size-10 place-items-center rounded-xl', clases)}><Icono className="size-5" aria-hidden /></span>
                            <span className="text-sm font-extrabold">{texto}</span>
                        </span>
                        <ChevronRight className="size-4 text-gris-texto" aria-hidden />
                    </Link>
                ))}
            </nav>

            <Link to="/app/alertas" className="flex items-center gap-3 rounded-tarjeta bg-verde-600 p-4 text-white shadow-suave">
                <BellRing className="size-6 shrink-0" aria-hidden />
                <span className="flex-1 text-sm font-bold">Activá las alertas: te avisamos después de cada lluvia.</span>
                <ChevronRight className="size-4" aria-hidden />
            </Link>
        </div>
    );
}
