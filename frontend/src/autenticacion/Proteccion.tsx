import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router';
import { ClipboardList, WifiOff } from 'lucide-react';
import { CargaPagina } from '@/componentes/compartidos/CargaPagina';
import { Boton } from '@/componentes/ui/Boton';
import type { Permiso } from '@/tipos/panel';
import { useSesionPanel } from './SesionPanel';

// Protección de todas las pantallas del panel: sin sesión se va al ingreso y se vuelve después.
export const ProtegerPanel = ({ children }: { children: ReactNode }) => {
    const { estado, reintentar } = useSesionPanel();
    const ubicacion = useLocation();

    if (estado === 'verificando') return <CargaPagina />;
    if (estado === 'sin-conexion') {
        return (
            <div className="grid min-h-dvh place-items-center bg-crema px-6 text-center">
                <div>
                    <WifiOff className="mx-auto size-10 text-gris-texto" aria-hidden />
                    <p className="mt-4 text-lg font-black">No pudimos conectarnos con el servidor</p>
                    <p className="mt-1 text-sm text-tinta-suave">Revisá la conexión e intentá de nuevo.</p>
                    <Boton className="mt-6" onClick={reintentar}>Reintentar</Boton>
                </div>
            </div>
        );
    }
    if (estado === 'anonima') return <Navigate to="/panel/ingresar" replace state={{ volver: ubicacion.pathname + ubicacion.search }} />;
    return children;
};

// Pantalla para cuando se entra por enlace a una sección que el rol no tiene.
export const SinAcceso = () => (
    <div className="grid place-items-center py-24 text-center">
        <div>
            <ClipboardList className="mx-auto size-10 text-gris-texto" aria-hidden />
            <p className="mt-4 text-lg font-black">Esta sección no está disponible para tu rol</p>
            <p className="mt-1 text-sm text-tinta-suave">Si la necesitás, pedíselo a la administración del sistema.</p>
        </div>
    </div>
);

export const RequierePermiso = ({ permiso, children }: { permiso: Permiso; children: ReactNode }) => {
    const { puede } = useSesionPanel();
    return puede(permiso) ? children : <SinAcceso />;
};
