import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { LayoutGrid, LogOut, WifiOff } from 'lucide-react';
import { ProtegerPanel, RequierePermiso } from '@/autenticacion/Proteccion';
import { useSesionPanel } from '@/autenticacion/SesionPanel';
import { useEnLinea } from '@/hooks/useEnLinea';
import { MENU } from '@/componentes/panel/menu';
import { BotonVolver } from '@/componentes/ui/BotonVolver';

const Barra = ({ volverA, textoVolver }: { volverA?: string; textoVolver?: string }) => {
    const { usuario, cerrarSesion, puede } = useSesionPanel();
    const enLinea = useEnLinea();
    // Las demás secciones que el rol puede usar (el brigadista también ve mapa, reportes y rutas).
    const secciones = MENU.filter(({ permiso }) => puede(permiso));
    const alPanel = secciones.find(({ a }) => a !== '/panel') ?? secciones[0];
    return (
        <>
            <header className="sticky top-0 z-[500] border-b border-gris-borde bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
                <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
                    {/* El logo lleva al inicio del panel (al brigadista, su vista de campo). */}
                    <Link to="/panel" aria-label="Red-Cuidar Formosa, ir al inicio">
                        <img src="/marca/logo-horizontal.webp" alt="Red-Cuidar Formosa" width="529" height="234" className="h-9 w-auto" />
                    </Link>
                    <div className="flex items-center gap-1">
                        {alPanel && (
                            <Link to={puede('metricas:leer') ? '/panel' : alPanel.a}
                                className="flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-extrabold text-tinta-suave hover:bg-gris-superficie">
                                <LayoutGrid className="size-4" aria-hidden />Panel
                            </Link>
                        )}
                        <span className="sr-only">Sesión de {usuario?.nombre}</span>
                        <button type="button" onClick={() => void cerrarSesion()} aria-label="Cerrar sesión" className="grid size-10 place-items-center rounded-full hover:bg-gris-superficie">
                            <LogOut className="size-5" aria-hidden />
                        </button>
                    </div>
                </div>
                {volverA && (
                    <div className="mx-auto max-w-2xl px-3 pb-1.5">
                        <BotonVolver respaldo={volverA} texto={textoVolver ?? 'Volver'} />
                    </div>
                )}
            </header>
            {!enLinea && (
                <p role="status" className="flex items-center justify-center gap-2 bg-tinta px-4 py-2 text-center text-xs font-bold text-white">
                    <WifiOff className="size-4" aria-hidden />Sin señal: esperá a tener conexión para registrar
                </p>
            )}
        </>
    );
};

// Vista pensada para el celular del brigadista: botones grandes, una tarea por pantalla.
export const DisposicionCampo = ({ children, volverA, textoVolver }: { children: ReactNode; volverA?: string; textoVolver?: string }) => (
    <ProtegerPanel>
        <div className="min-h-dvh bg-crema">
            <Barra {...(volverA ? { volverA } : {})} {...(textoVolver ? { textoVolver } : {})} />
            <RequierePermiso permiso="rutas:ejecutar">
                <main className="mx-auto max-w-2xl">{children}</main>
            </RequierePermiso>
        </div>
    </ProtegerPanel>
);
