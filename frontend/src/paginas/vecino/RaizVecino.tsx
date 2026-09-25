import { Outlet } from 'react-router';
import { ProveedorBorrador } from './borrador';

// Raíz del área del vecino: el borrador del reporte se comparte entre el escáner y el resto de las pantallas.
export default function RaizVecino() {
    return (
        <ProveedorBorrador>
            <Outlet />
        </ProveedorBorrador>
    );
}
