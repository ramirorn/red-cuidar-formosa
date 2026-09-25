import { useEffect } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { CloudUpload, House, ListChecks, Map, MessageCircleHeart, Wifi, WifiOff } from 'lucide-react';
import { useColaReportes } from '@/hooks/useColaReportes';
import { useEnLinea } from '@/hooks/useEnLinea';
import { cn } from '@/lib/utils';

const NAVEGACION = [
    { a: '/app', texto: 'Inicio', Icono: House, fin: true },
    { a: '/app/mapa', texto: 'Mapa', Icono: Map },
    { a: '/app/reportes', texto: 'Reportes', Icono: ListChecks },
    { a: '/app/chat', texto: 'Chat', Icono: MessageCircleHeart },
];

const IndicadorConexion = () => {
    const enLinea = useEnLinea();
    const { pendientes, sincronizar } = useColaReportes();

    // Al abrir la app y al volver la señal, se envían los reportes que quedaron en el dispositivo.
    useEffect(() => {
        if (enLinea && pendientes > 0) void sincronizar({ silencioso: true });
    }, [enLinea, pendientes, sincronizar]);

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
export default function DisposicionVecino() {
    return (
        <div className="flex min-h-dvh flex-col bg-crema">
                <header className="sticky top-0 z-30 border-b border-gris-borde/70 bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
                    <div className="mx-auto flex h-14 max-w-2xl items-center justify-between px-4">
                        <Link to="/app" aria-label="Red-Cuidar Formosa, inicio">
                            <img src="/marca/logo-horizontal.webp" alt="Red-Cuidar Formosa" width="529" height="234" className="h-10 w-auto" />
                        </Link>
                        <IndicadorConexion />
                    </div>
                </header>

                <main className="mx-auto w-full max-w-2xl flex-1 pb-28">
                    <Outlet />
                </main>

                <nav aria-label="Secciones de la app" className="fixed inset-x-0 bottom-0 z-30 border-t border-gris-borde bg-white pb-[env(safe-area-inset-bottom)]">
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
