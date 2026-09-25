import { lazy } from 'react';
import { Navigate } from 'react-router';
import { MENU } from './DisposicionPanel';
import { SinAcceso } from '@/autenticacion/Proteccion';
import { useSesionPanel } from '@/autenticacion/SesionPanel';

const Resumen = lazy(() => import('./Resumen'));

// La portada depende del rol: quien no ve métricas (brigadista) arranca en su primera sección.
export default function InicioPanel() {
    const { puede } = useSesionPanel();
    if (puede('metricas:leer')) return <Resumen />;
    if (puede('rutas:ejecutar')) return <Navigate to="/panel/campo" replace />;
    const primera = MENU.find(({ permiso }) => puede(permiso));
    return primera ? <Navigate to={primera.a} replace /> : <SinAcceso />;
}
