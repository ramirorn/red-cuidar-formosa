import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { LogOut, WifiOff } from 'lucide-react';
import { ProtegerPanel, RequierePermiso } from '@/autenticacion/Proteccion';
import { useSesionPanel } from '@/autenticacion/SesionPanel';
import { useEnLinea } from '@/hooks/useEnLinea';

const Barra = ({ volverA }: { volverA?: string }) => {
    const { usuario, cerrarSesion, puede } = useSesionPanel();
    const enLinea = useEnLinea();
    return (
        <>
            <header className="sticky top-0 z-[500] border-b border-gris-borde bg-white/95 pt-[env(safe-area-inset-top)] backdrop-blur">
                <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-3 px-4">
                    <Link to={volverA ?? (puede('metricas:leer') ? '/panel' : '/panel/campo')} aria-label="Volver">
                        <img src="/marca/logo-horizontal.webp" alt="Red-Cuidar Formosa" width="529" height="234" className="h-9 w-auto" />
                    </Link>
                    <div className="flex items-center gap-2">
                        <span className="max-w-32 truncate text-xs font-bold text-gris-texto">{usuario?.nombre}</span>
                        <button type="button" onClick={() => void cerrarSesion()} aria-label="Cerrar sesión" className="grid size-10 place-items-center rounded-full hover:bg-gris-superficie">
                            <LogOut className="size-5" aria-hidden />
                        </button>
                    </div>
                </div>
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
export const DisposicionCampo = ({ children, volverA }: { children: ReactNode; volverA?: string }) => (
    <ProtegerPanel>
        <div className="min-h-dvh bg-crema">
            <Barra {...(volverA ? { volverA } : {})} />
            <RequierePermiso permiso="rutas:ejecutar">
                <main className="mx-auto max-w-2xl">{children}</main>
            </RequierePermiso>
        </div>
    </ProtegerPanel>
);
