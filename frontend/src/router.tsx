import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { CargaPagina } from '@/componentes/compartidos/CargaPagina';
import { ErrorRuta } from '@/componentes/compartidos/ErrorRuta';

// Cada área se descarga por separado: el vecino nunca baja el código del panel institucional.
const InicioPublico = lazy(() => import('@/paginas/publico/InicioPublico'));
const EnConstruccion = lazy(() => import('@/paginas/publico/EnConstruccion'));
const NoEncontrada = lazy(() => import('@/paginas/publico/NoEncontrada'));

const RaizVecino = lazy(() => import('@/paginas/vecino/RaizVecino'));
const DisposicionVecino = lazy(() => import('@/paginas/vecino/DisposicionVecino'));
const InicioVecino = lazy(() => import('@/paginas/vecino/InicioVecino'));
const Escaner = lazy(() => import('@/paginas/vecino/Escaner'));
const Reportar = lazy(() => import('@/paginas/vecino/Reportar'));
const Enviado = lazy(() => import('@/paginas/vecino/Enviado'));
const Limpieza = lazy(() => import('@/paginas/vecino/Limpieza'));
const MisReportes = lazy(() => import('@/paginas/vecino/MisReportes'));
const MapaBarrio = lazy(() => import('@/paginas/vecino/MapaBarrio'));
const Chat = lazy(() => import('@/paginas/vecino/Chat'));
const Alertas = lazy(() => import('@/paginas/vecino/Alertas'));
const Consejos = lazy(() => import('@/paginas/vecino/Consejos'));

const conCarga = (elemento: ReactNode) => <Suspense fallback={<CargaPagina />}>{elemento}</Suspense>;

export const router = createBrowserRouter([
    { path: '/', element: conCarga(<InicioPublico />), errorElement: <ErrorRuta /> },
    {
        path: '/app',
        element: conCarga(<RaizVecino />),
        errorElement: <ErrorRuta />,
        children: [
            { path: 'escanear', element: conCarga(<Escaner />) },
            {
                element: conCarga(<DisposicionVecino />),
                errorElement: <ErrorRuta />,
                children: [
                    { index: true, element: conCarga(<InicioVecino />) },
                    { path: 'reportar', element: conCarga(<Reportar />) },
                    { path: 'enviado', element: conCarga(<Enviado />) },
                    { path: 'limpieza', element: conCarga(<Limpieza />) },
                    { path: 'reportes', element: conCarga(<MisReportes />) },
                    { path: 'mapa', element: conCarga(<MapaBarrio />) },
                    { path: 'chat', element: conCarga(<Chat />) },
                    { path: 'alertas', element: conCarga(<Alertas />) },
                    { path: 'consejos', element: conCarga(<Consejos />) },
                ],
            },
        ],
    },
    { path: '/panel/*', element: conCarga(<EnConstruccion titulo="Panel institucional" />) },
    { path: '*', element: conCarga(<NoEncontrada />) },
]);
