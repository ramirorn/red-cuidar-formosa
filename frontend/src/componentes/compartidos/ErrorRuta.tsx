import { isRouteErrorResponse, useRouteError } from 'react-router';
import { RefreshCw, WifiOff } from 'lucide-react';
import { Boton, BotonEnlace } from '@/componentes/ui/Boton';
import { Manuscrita } from '@/componentes/ui/Tipografia';

// Pantalla amable cuando una sección no pudo abrirse (típico: sin señal y sin esa pantalla guardada).
export const ErrorRuta = () => {
    const error = useRouteError();
    const sinConexion = !navigator.onLine || (error instanceof Error && /fetch|import|chunk/i.test(error.message));
    if (import.meta.env.DEV) console.error(error);

    return (
        <main className="grid min-h-dvh place-items-center bg-crema px-6 text-center">
            <div className="max-w-sm">
                <WifiOff className="mx-auto size-12 text-verde-600" aria-hidden />
                <h1 className="mt-4 text-2xl font-black">
                    {sinConexion ? 'No pudimos abrir esta pantalla sin conexión' : isRouteErrorResponse(error) && error.status === 404 ? 'Página no encontrada' : 'Algo salió mal'}
                </h1>
                <Manuscrita className="mt-2 block text-2xl text-rojo-500">
                    {sinConexion ? 'Tus reportes guardados no se pierden' : 'Probá de nuevo en un momento'}
                </Manuscrita>
                <div className="mt-8 flex flex-col gap-3">
                    <Boton onClick={() => window.location.reload()} icono={<RefreshCw className="size-4" aria-hidden />}>Reintentar</Boton>
                    <BotonEnlace to="/app" variante="contorno">Ir al inicio</BotonEnlace>
                </div>
            </div>
        </main>
    );
};
