import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { CargaPagina } from '@/componentes/compartidos/CargaPagina';

// Cada área se descarga por separado: el vecino nunca baja el código del panel institucional.
const InicioPublico = lazy(() => import('@/paginas/publico/InicioPublico'));
const EnConstruccion = lazy(() => import('@/paginas/publico/EnConstruccion'));
const NoEncontrada = lazy(() => import('@/paginas/publico/NoEncontrada'));

const conCarga = (elemento: ReactNode) => <Suspense fallback={<CargaPagina />}>{elemento}</Suspense>;

export const router = createBrowserRouter([
    { path: '/', element: conCarga(<InicioPublico />) },
    { path: '/app/*', element: conCarga(<EnConstruccion titulo="App del vecino" />) },
    { path: '/panel/*', element: conCarga(<EnConstruccion titulo="Panel institucional" />) },
    { path: '*', element: conCarga(<NoEncontrada />) },
]);
