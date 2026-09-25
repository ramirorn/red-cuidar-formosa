import {
    FileDown,
    Inbox,
    LayoutDashboard,
    Map,
    Route,
    ScrollText,
    Syringe,
    Ticket,
    Trophy,
    Users,
} from 'lucide-react';
import type { Permiso } from '@/tipos/panel';

interface ItemMenu {
    a: string;
    texto: string;
    Icono: typeof Map;
    permiso: Permiso;
    fin?: boolean;
}

// El menú muestra solo lo que el rol puede usar; el backend igual verifica cada petición.
export const MENU: ItemMenu[] = [
    { a: '/panel', texto: 'Resumen', Icono: LayoutDashboard, permiso: 'metricas:leer', fin: true },
    { a: '/panel/mapa', texto: 'Mapa de riesgo', Icono: Map, permiso: 'mapa_calor:leer' },
    { a: '/panel/reportes', texto: 'Reportes', Icono: Inbox, permiso: 'reportes:leer' },
    { a: '/panel/rutas', texto: 'Rutas de brigada', Icono: Route, permiso: 'rutas:leer' },
    { a: '/panel/intervenciones', texto: 'Intervenciones', Icono: Syringe, permiso: 'intervenciones:leer' },
    { a: '/panel/copa', texto: 'Copa Red-Cuidar', Icono: Trophy, permiso: 'metricas:leer' },
    { a: '/panel/canjes', texto: 'Canje de premios', Icono: Ticket, permiso: 'premios:canjear' },
    { a: '/panel/exportaciones', texto: 'Exportaciones', Icono: FileDown, permiso: 'exportaciones:descargar' },
    { a: '/panel/usuarios', texto: 'Usuarios', Icono: Users, permiso: 'usuarios:gestionar' },
    { a: '/panel/auditoria', texto: 'Auditoría', Icono: ScrollText, permiso: 'auditoria:leer' },
];

