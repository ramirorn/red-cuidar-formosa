import { Outlet } from 'react-router';
import { ProveedorSesionPanel } from '@/autenticacion/SesionPanel';

export default function RaizPanel() {
    return (
        <ProveedorSesionPanel>
            <Outlet />
        </ProveedorSesionPanel>
    );
}
