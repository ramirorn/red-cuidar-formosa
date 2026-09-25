import { Link } from 'react-router';
import { MapPin, Phone, WifiOff } from 'lucide-react';
import { Manuscrita } from '@/componentes/ui/Tipografia';

const COLUMNAS = [
    {
        titulo: 'Explorá',
        enlaces: [
            { a: '/#como-funciona', texto: 'Cómo funciona' },
            { a: '/#consejos', texto: 'Consejos' },
            { a: '/#mapa', texto: 'Mapa del barrio' },
            { a: '/#mosquitos', texto: 'Conocé al mosquito' },
        ],
    },
    {
        titulo: 'La app',
        enlaces: [
            { a: '/app', texto: 'Escanear mi patio' },
            { a: '/app/reportes', texto: 'Mis reportes' },
            { a: '/app/chat', texto: 'Hablar con IA Mosquito' },
            { a: '/app/alertas', texto: 'Alertas de lluvia' },
        ],
    },
];

export const PiePublico = () => (
    <footer className="bg-verde-950 text-white">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-14 md:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr_auto]">
            <div>
                <Link to="/" aria-label="Red-Cuidar Formosa, ir al inicio" className="inline-block"><img src="/marca/logo-blanco.png" alt="Red-Cuidar Formosa" width="529" height="234" loading="lazy" className="h-16 w-auto" /></Link>
                <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/75">
                    Una red de vecinos y equipos de salud que detecta criaderos de mosquitos y los elimina, manzana por manzana.
                </p>
            </div>

            {COLUMNAS.map((columna) => (
                <div key={columna.titulo}>
                    <h3 className="text-xs font-extrabold tracking-[0.18em] text-verde-300 uppercase">{columna.titulo}</h3>
                    <ul className="mt-4 space-y-2.5 text-sm">
                        {columna.enlaces.map((enlace) => (
                            <li key={enlace.a}>
                                {enlace.a.startsWith('/#')
                                    ? <a href={enlace.a} className="text-white/80 hover:text-white">{enlace.texto}</a>
                                    : <Link to={enlace.a} className="text-white/80 hover:text-white">{enlace.texto}</Link>}
                            </li>
                        ))}
                    </ul>
                </div>
            ))}

            <div>
                <h3 className="text-xs font-extrabold tracking-[0.18em] text-verde-300 uppercase">Ante una urgencia</h3>
                <ul className="mt-4 space-y-3 text-sm text-white/80">
                    <li className="flex items-center gap-3"><Phone className="size-4 text-rojo-300" aria-hidden />Emergencias: <a href="tel:107" className="font-extrabold text-white">107</a></li>
                    <li className="flex items-center gap-3"><MapPin className="size-4 text-verde-300" aria-hidden />Provincia de Formosa, Argentina</li>
                    <li className="flex items-center gap-3"><WifiOff className="size-4 text-verde-300" aria-hidden />Tus reportes se envían al volver la señal</li>
                </ul>
            </div>

            <div className="hidden place-items-center lg:grid">
                <div className="grid size-36 place-items-center rounded-full border-2 border-dashed border-verde-300/60 text-center">
                    <Manuscrita className="rotate-[-8deg] text-2xl leading-tight text-white">Cuidar<br />es cosa<br />de todos</Manuscrita>
                </div>
            </div>
        </div>

        <div className="border-t border-white/10">
            <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-5 text-xs text-white/60 sm:flex-row">
                <p>© {new Date().getFullYear()} Red-Cuidar Formosa. Plataforma de salud pública.</p>
                <div className="flex gap-6">
                    <Link to="/panel" className="hover:text-white">Acceso institucional</Link>
                    <a href="/#privacidad" className="hover:text-white">Privacidad</a>
                </div>
            </div>
        </div>
    </footer>
);
