import { useEffect } from 'react';
import { Link, NavLink, Outlet, useMatches, useNavigate } from 'react-router';
import { ArrowLeft, BellRing, Camera, Trophy, CloudUpload, House, Lightbulb, ListChecks, Map, MessageCircleHeart, Wifi, WifiOff } from 'lucide-react';
import { BotonEnlace } from '@/componentes/ui/Boton';
import { useColaReportes } from '@/hooks/useColaReportes';
import { useEnLinea } from '@/hooks/useEnLinea';
import { useVolver } from '@/hooks/useVolver';
import { leerAjuste } from '@/sinConexion/bd';
import { obtenerManzanasDeLocalidad } from '@/sinConexion/manzanasLocales';
import { cn } from '@/lib/utils';

const NAVEGACION = [
    { a: '/app', texto: 'Inicio', Icono: House, fin: true },
    { a: '/app/mapa', texto: 'Mapa', Icono: Map },
    { a: '/app/reportes', texto: 'Reportes', Icono: ListChecks },
    { a: '/app/chat', texto: 'Chat', Icono: MessageCircleHeart },
];

// En la computadora hay lugar para todas las secciones en la barra superior.
const NAVEGACION_ESCRITORIO = [
    ...NAVEGACION,
    { a: '/app/copa', texto: 'Copa', Icono: Trophy },
    { a: '/app/alertas', texto: 'Alertas', Icono: BellRing },
    { a: '/app/consejos', texto: 'Consejos', Icono: Lightbulb },
];

const IndicadorConexion = () => {
    const enLinea = useEnLinea();
    const { pendientes, sincronizar } = useColaReportes();

    // Al abrir la app y al volver la señal, se envían los reportes que quedaron en el dispositivo.
    useEffect(() => {
        if (enLinea && pendientes > 0) void sincronizar({ silencioso: true });
    }, [enLinea, pendientes, sincronizar]);

    // Con señal, se actualizan en segundo plano las manzanas de la localidad del vecino: así puede
    // saber en qué manzana está (y reportar) aunque después se quede sin conexión.
    useEffect(() => {
        if (!enLinea) return;
        void leerAjuste<number>('ultimaLocalidad').then((localidadId) => {
            if (localidadId) void obtenerManzanasDeLocalidad(localidadId).catch(() => undefined);
        });
    }, [enLinea]);

    return (
        <Link
            to="/app/reportes"
            className={cn(
                'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-extrabold',
                enLinea ? 'bg-verde-50 text-verde-700' : 'bg-gris-superficie text-gris-texto',
            )}
            aria-label={enLinea ? 'En línea' : 'Sin conexión'}
        >
            {enLinea ? <Wifi className="size-4" aria-hidden /> : <WifiOff className="size-4" aria-hidden />}
            {enLinea ? 'En línea' : 'Sin conexión'}
            {pendientes > 0 && (
                <span className="flex items-center gap-1 rounded-full bg-white px-2 py-0.5 text-tinta">
                    <CloudUpload className="size-3.5" aria-hidden />{pendientes}
                </span>
            )}
        </Link>
    );
};

// Estructura de la PWA: barra superior compacta y navegación inferior al alcance del pulgar.
export interface DatosPantalla {
    // Pantallas secundarias (no están en la barra inferior): destino de "volver".
    volverA?: string;
    directo?: boolean;
    titulo?: string;
    // Ancho en la computadora: "amplio" (inicio), "completo" (mapa) o angosto por defecto (lectura).
    ancho?: 'amplio' | 'completo';
}

// Botón de la barra superior: vuelve a la pantalla anterior o, si se entró directo, al respaldo.
const BotonAtras = ({ respaldo, directo }: { respaldo: string; directo: boolean }) => {
    const volver = useVolver(respaldo);
    const navegar = useNavigate();
    return (
        <button type="button" onClick={() => (directo ? navegar(respaldo) : volver())} aria-label="Volver"
            className="-ml-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-gris-superficie active:bg-bruma">
            <ArrowLeft className="size-6" aria-hidden />
        </button>
    );
};

export default function DisposicionVecino() {
    const datos = useMatches().map((coincidencia) => coincidencia.handle as DatosPantalla | undefined).filter(Boolean) as DatosPantalla[];
    const subpantalla = datos.findLast((dato) => dato.volverA);
    const ancho = datos.findLast((dato) => dato.ancho)?.ancho;

    return (
        <div className="flex min-h-dvh flex-col bg-crema">
            <header className="sticky top-0 z-30 border-b border-gris-borde/70 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
                <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4 lg:h-16 lg:max-w-6xl lg:px-8">
                    <div className="flex min-w-0 items-center gap-1">
                        {subpantalla?.volverA && <BotonAtras respaldo={subpantalla.volverA} directo={subpantalla.directo ?? false} />}
                        {/* El logo lleva a la página principal del sitio; el inicio de la app es la pestaña "Inicio". */}
                        <Link to="/" aria-label="Red-Cuidar Formosa, ir a la página principal" className="shrink-0">
                            <img src="/marca/logo-horizontal.webp" alt="Red-Cuidar Formosa" width="529" height="234" className="h-10 w-auto lg:h-11" />
                        </Link>
                    </div>

                    <nav aria-label="Secciones de la app" className="hidden lg:block">
                        <ul className="flex items-center gap-1">
                            {NAVEGACION_ESCRITORIO.map(({ a, texto, Icono, fin }) => (
                                <li key={a}>
                                    <NavLink to={a} end={fin} className={({ isActive }) => cn(
                                        'flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-extrabold transition',
                                        isActive ? 'bg-verde-100 text-verde-800' : 'text-tinta-suave hover:bg-gris-superficie hover:text-tinta',
                                    )}>
                                        <Icono className="size-4" strokeWidth={2.4} aria-hidden />{texto}
                                    </NavLink>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className="flex items-center gap-2">
                        <BotonEnlace to="/app/escanear?nuevo=1" tamano="chico" className="hidden lg:inline-flex" icono={<Camera className="size-4" aria-hidden />}>Escanear</BotonEnlace>
                        <IndicadorConexion />
                    </div>
                </div>
            </header>

            <main className={cn(
                'mx-auto w-full max-w-2xl flex-1 pb-28 lg:pb-12',
                ancho === 'amplio' && 'lg:max-w-6xl lg:px-4',
                ancho === 'completo' && 'lg:max-w-none lg:pb-0',
                !ancho && 'lg:max-w-3xl lg:pt-4',
            )}>
                <Outlet />
            </main>

            {/* Celular: navegación inferior al alcance del pulgar. En la computadora va arriba. */}
            <nav aria-label="Secciones de la app" className="fixed inset-x-0 bottom-0 z-30 border-t border-gris-borde bg-white pb-[env(safe-area-inset-bottom)] lg:hidden">
                <ul className="mx-auto grid max-w-2xl grid-cols-4">
                    {NAVEGACION.map(({ a, texto, Icono, fin }) => (
                        <li key={a}>
                            <NavLink
                                to={a}
                                end={fin}
                                className={({ isActive }) => cn(
                                    'flex flex-col items-center gap-1 py-2.5 text-xs font-extrabold',
                                    isActive ? 'text-verde-600' : 'text-gris-texto hover:text-tinta',
                                )}
                            >
                                {({ isActive }) => (
                                    <>
                                        <span className={cn('grid h-8 w-14 place-items-center rounded-full transition', isActive && 'bg-verde-100')}>
                                            <Icono className="size-5" strokeWidth={2.4} aria-hidden />
                                        </span>
                                        {texto}
                                    </>
                                )}
                            </NavLink>
                        </li>
                    ))}
                </ul>
            </nav>
        </div>
    );
}
