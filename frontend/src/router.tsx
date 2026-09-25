import { lazy, Suspense, type ReactNode } from 'react';
import { createBrowserRouter } from 'react-router';
import { CargaPagina } from '@/componentes/compartidos/CargaPagina';
import { ErrorRuta } from '@/componentes/compartidos/ErrorRuta';
import { RequierePermiso } from '@/autenticacion/Proteccion';

// Cada área se descarga por separado: el vecino nunca baja el código del panel institucional.
const InicioPublico = lazy(() => import('@/paginas/publico/InicioPublico'));
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

const RaizPanel = lazy(() => import('@/paginas/panel/RaizPanel'));
const Ingresar = lazy(() => import('@/paginas/panel/Ingresar'));
const DisposicionPanel = lazy(() => import('@/paginas/panel/DisposicionPanel'));
const InicioPanel = lazy(() => import('@/paginas/panel/InicioPanel'));
const MapaRiesgo = lazy(() => import('@/paginas/panel/MapaRiesgo'));
const BandejaReportes = lazy(() => import('@/paginas/panel/BandejaReportes'));
const DetalleReporte = lazy(() => import('@/paginas/panel/DetalleReporte'));
const Rutas = lazy(() => import('@/paginas/panel/Rutas'));
const DetalleRuta = lazy(() => import('@/paginas/panel/DetalleRuta'));
const Intervenciones = lazy(() => import('@/paginas/panel/Intervenciones'));
const Exportaciones = lazy(() => import('@/paginas/panel/Exportaciones'));
const Usuarios = lazy(() => import('@/paginas/panel/Usuarios'));
const Auditoria = lazy(() => import('@/paginas/panel/Auditoria'));
const Campo = lazy(() => import('@/paginas/panel/campo/Campo'));
const CampoRuta = lazy(() => import('@/paginas/panel/campo/CampoRuta'));

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
    {
        path: '/panel',
        element: conCarga(<RaizPanel />),
        errorElement: <ErrorRuta />,
        children: [
            { path: 'ingresar', element: conCarga(<Ingresar />) },
            { path: 'campo', element: conCarga(<Campo />) },
            { path: 'campo/:id', element: conCarga(<CampoRuta />) },
            {
                element: conCarga(<DisposicionPanel />),
                errorElement: <ErrorRuta />,
                children: [
                    { index: true, element: conCarga(<InicioPanel />) },
                    { path: 'mapa', element: conCarga(<RequierePermiso permiso="mapa_calor:leer"><MapaRiesgo /></RequierePermiso>) },
                    { path: 'reportes', element: conCarga(<RequierePermiso permiso="reportes:leer"><BandejaReportes /></RequierePermiso>) },
                    { path: 'reportes/:id', element: conCarga(<RequierePermiso permiso="reportes:leer"><DetalleReporte /></RequierePermiso>) },
                    { path: 'rutas', element: conCarga(<RequierePermiso permiso="rutas:leer"><Rutas /></RequierePermiso>) },
                    { path: 'rutas/:id', element: conCarga(<RequierePermiso permiso="rutas:leer"><DetalleRuta /></RequierePermiso>) },
                    { path: 'intervenciones', element: conCarga(<RequierePermiso permiso="intervenciones:leer"><Intervenciones /></RequierePermiso>) },
                    { path: 'exportaciones', element: conCarga(<RequierePermiso permiso="exportaciones:descargar"><Exportaciones /></RequierePermiso>) },
                    { path: 'usuarios', element: conCarga(<RequierePermiso permiso="usuarios:gestionar"><Usuarios /></RequierePermiso>) },
                    { path: 'auditoria', element: conCarga(<RequierePermiso permiso="auditoria:leer"><Auditoria /></RequierePermiso>) },
                    { path: '*', element: conCarga(<NoEncontrada />) },
                ],
            },
        ],
    },
    { path: '*', element: conCarga(<NoEncontrada />) },
]);
