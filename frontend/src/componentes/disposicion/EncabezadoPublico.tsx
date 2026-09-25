import { useState } from 'react';
import { Link, NavLink } from 'react-router';
import { Menu, Phone, ShieldCheck, WifiOff, X } from 'lucide-react';
import { BotonEnlace } from '@/componentes/ui/Boton';
import { cn } from '@/lib/utils';

const ENLACES = [
    { a: '/#como-funciona', texto: 'Cómo funciona' },
    { a: '/#consejos', texto: 'Consejos' },
    { a: '/#mapa', texto: 'Mapa del barrio' },
    { a: '/#mosquitos', texto: 'Conocé al mosquito' },
];

// Barra informativa superior + navegación, como en la referencia.
export const EncabezadoPublico = () => {
    const [menuAbierto, setMenuAbierto] = useState(false);

    return (
        <header className="sticky top-0 z-40">
            <div className="hidden bg-verde-950 text-white/85 md:block">
                <div className="mx-auto flex h-9 max-w-7xl items-center justify-between px-6 text-xs font-semibold">
                    <p className="flex items-center gap-2"><ShieldCheck className="size-4 text-verde-300" aria-hidden />Juntos contra el dengue en toda la provincia</p>
                    <div className="flex items-center gap-6">
                        <p className="flex items-center gap-2"><WifiOff className="size-4 text-verde-300" aria-hidden />Funciona sin internet</p>
                        <p className="flex items-center gap-2"><Phone className="size-4 text-rojo-300" aria-hidden />Emergencias: <strong className="text-white">107</strong></p>
                    </div>
                </div>
            </div>

            <nav aria-label="Principal" className="border-b border-gris-borde/70 bg-white/95 backdrop-blur">
                <div className="mx-auto flex h-18 max-w-7xl items-center justify-between gap-6 px-4 sm:px-6">
                    <Link to="/" aria-label="Red-Cuidar Formosa, inicio" className="shrink-0">
                        <img src="/marca/logo-horizontal.webp" alt="Red-Cuidar Formosa" width="529" height="234" className="h-14 w-auto" />
                    </Link>

                    <ul className="hidden items-center gap-8 lg:flex">
                        {ENLACES.map((enlace) => (
                            <li key={enlace.a}>
                                <a href={enlace.a} className="relative py-2 text-[0.95rem] font-bold text-tinta hover:text-verde-600">
                                    {enlace.texto}
                                </a>
                            </li>
                        ))}
                    </ul>

                    <div className="flex items-center gap-2">
                        <NavLink to="/panel" className="hidden text-sm font-bold text-gris-texto hover:text-tinta md:block">
                            Acceso institucional
                        </NavLink>
                        <BotonEnlace to="/app/escanear?nuevo=1" variante="acento" tamano="chico" className="hidden sm:inline-flex">
                            Escanear mi patio
                        </BotonEnlace>
                        <button
                            type="button"
                            className="grid size-11 place-items-center rounded-full hover:bg-gris-superficie lg:hidden"
                            aria-expanded={menuAbierto}
                            aria-controls="menu-movil"
                            aria-label={menuAbierto ? 'Cerrar menú' : 'Abrir menú'}
                            onClick={() => setMenuAbierto((abierto) => !abierto)}
                        >
                            {menuAbierto ? <X aria-hidden /> : <Menu aria-hidden />}
                        </button>
                    </div>
                </div>

                <div id="menu-movil" className={cn('border-t border-gris-borde bg-white lg:hidden', !menuAbierto && 'hidden')}>
                    <ul className="mx-auto flex max-w-7xl flex-col px-4 py-3">
                        {ENLACES.map((enlace) => (
                            <li key={enlace.a}>
                                <a href={enlace.a} onClick={() => setMenuAbierto(false)} className="block rounded-xl px-3 py-3 font-bold hover:bg-gris-superficie">
                                    {enlace.texto}
                                </a>
                            </li>
                        ))}
                        <li><Link to="/panel" className="block rounded-xl px-3 py-3 font-bold text-gris-texto hover:bg-gris-superficie">Acceso institucional</Link></li>
                        <li className="pt-2"><BotonEnlace to="/app" variante="acento" anchoCompleto>Escanear mi patio</BotonEnlace></li>
                    </ul>
                </div>
            </nav>
        </header>
    );
};
