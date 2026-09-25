import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import * as Radix from '@radix-ui/react-dialog';
import { Footprints, LogOut, Menu, X } from 'lucide-react';
import { useSesionPanel } from '@/autenticacion/SesionPanel';
import { ProtegerPanel } from '@/autenticacion/Proteccion';
import { ROLES } from '@/lib/etiquetasPanel';
import { cn } from '@/lib/utils';
import { MENU } from '@/componentes/panel/menu';

const Navegacion = ({ alElegir }: { alElegir?: () => void }) => {
    const { puede } = useSesionPanel();
    return (
        <nav aria-label="Secciones del panel" className="flex-1 overflow-y-auto px-3">
            <ul className="space-y-1">
                {MENU.filter(({ permiso }) => puede(permiso)).map(({ a, texto, Icono, fin }) => (
                    <li key={a}>
                        <NavLink
                            to={a}
                            end={fin}
                            onClick={alElegir}
                            className={({ isActive }) => cn(
                                'flex items-center gap-3 rounded-full px-4 py-2.5 text-sm font-extrabold transition',
                                isActive ? 'bg-verde-600 text-white shadow-suave' : 'text-tinta-suave hover:bg-bruma hover:text-tinta',
                            )}
                        >
                            <Icono className="size-[1.15rem]" strokeWidth={2.3} aria-hidden />{texto}
                        </NavLink>
                    </li>
                ))}
            </ul>
            {puede('rutas:ejecutar') && (
                <Link to="/panel/campo" onClick={alElegir}
                    className="mt-6 flex items-center gap-3 rounded-tarjeta border-2 border-dashed border-verde-300 bg-verde-50 px-4 py-3 text-sm font-extrabold text-verde-800 hover:bg-verde-100">
                    <Footprints className="size-5" aria-hidden />
                    <span>Vista de campo<span className="block text-xs font-bold text-verde-700/80">Para usar en el celular</span></span>
                </Link>
            )}
        </nav>
    );
};

const TarjetaUsuario = () => {
    const { usuario, cerrarSesion } = useSesionPanel();
    if (!usuario) return null;
    const iniciales = `${usuario.nombre[0] ?? ''}${usuario.apellido[0] ?? ''}`.toUpperCase();
    return (
        <div className="m-3 rounded-tarjeta bg-gris-superficie p-3">
            <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-verde-600 text-sm font-black text-white" aria-hidden>{iniciales}</span>
                <div className="min-w-0">
                    <p className="truncate text-sm font-black">{usuario.nombre} {usuario.apellido}</p>
                    <p className="truncate text-xs text-gris-texto">{ROLES[usuario.rol].etiqueta} · {usuario.localidad?.nombre ?? 'Toda la provincia'}</p>
                </div>
            </div>
            <button type="button" onClick={() => void cerrarSesion()}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-full py-2 text-sm font-extrabold text-tinta-suave hover:bg-white hover:text-rojo-600">
                <LogOut className="size-4" aria-hidden />Cerrar sesión
            </button>
        </div>
    );
};

// El logo lleva a la página principal del sitio (la sesión del panel sigue abierta); el inicio del panel es "Resumen".
const Logo = () => (
    <Link to="/" aria-label="Red-Cuidar Formosa, ir a la página principal" className="flex items-center gap-2">
        <img src="/marca/logo-horizontal.webp" alt="Red-Cuidar Formosa" width="529" height="234" className="h-11 w-auto" />
    </Link>
);

export default function DisposicionPanel() {
    const [menuAbierto, setMenuAbierto] = useState(false);

    return (
        <ProtegerPanel>
            <div className="min-h-dvh bg-crema lg:grid lg:grid-cols-[17rem_1fr]">
                <aside className="sticky top-0 hidden h-dvh flex-col border-r border-gris-borde bg-white lg:flex">
                    <div className="px-6 pt-6 pb-8"><Logo /></div>
                    <Navegacion />
                    <TarjetaUsuario />
                </aside>

                <header className="sticky top-0 z-[500] flex h-16 items-center justify-between border-b border-gris-borde bg-white/95 px-4 backdrop-blur lg:hidden">
                    <Logo />
                    <Radix.Root open={menuAbierto} onOpenChange={setMenuAbierto}>
                        <Radix.Trigger aria-label="Abrir menú" className="grid size-11 place-items-center rounded-full hover:bg-gris-superficie">
                            <Menu aria-hidden />
                        </Radix.Trigger>
                        <Radix.Portal>
                            <Radix.Overlay className="fixed inset-0 z-[1000] bg-tinta/40" />
                            <Radix.Content aria-describedby={undefined} className="fixed inset-y-0 left-0 z-[1001] flex w-72 max-w-[85vw] flex-col bg-white shadow-elevada">
                                <div className="flex items-center justify-between px-5 pt-5 pb-6">
                                    <Radix.Title className="sr-only">Menú del panel</Radix.Title>
                                    <Logo />
                                    <Radix.Close aria-label="Cerrar menú" className="grid size-10 place-items-center rounded-full hover:bg-gris-superficie"><X aria-hidden /></Radix.Close>
                                </div>
                                <Navegacion alElegir={() => setMenuAbierto(false)} />
                                <TarjetaUsuario />
                            </Radix.Content>
                        </Radix.Portal>
                    </Radix.Root>
                </header>

                <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-8">
                    <div className="mx-auto max-w-7xl">
                        <Outlet />
                    </div>
                </main>
            </div>
        </ProtegerPanel>
    );
}
