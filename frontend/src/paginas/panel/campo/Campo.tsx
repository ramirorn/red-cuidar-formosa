import { Link } from 'react-router';
import { CalendarDays, ChevronRight, Footprints, Route } from 'lucide-react';
import { useSesionPanel } from '@/autenticacion/SesionPanel';
import { ChipRuta } from '@/componentes/panel/Chips';
import { Cargando, ErrorCarga, EstadoVacio } from '@/componentes/panel/Estados';
import { Boton } from '@/componentes/ui/Boton';
import { Manuscrita } from '@/componentes/ui/Tipografia';
import { useRutas } from '@/hooks/usePanel';
import { nombreCompleto } from '@/lib/etiquetasPanel';
import { formatearDia, hoyIso } from '@/lib/formato';
import type { RutaListado } from '@/tipos/panel';
import { DisposicionCampo } from './DisposicionCampo';

const TarjetaRuta = ({ ruta }: { ruta: RutaListado }) => {
    const porcentaje = ruta.paradasTotales ? Math.round((ruta.paradasVisitadas / ruta.paradasTotales) * 100) : 0;
    return (
        <Link to={`/panel/campo/${ruta.id}`} className="block rounded-tarjeta border border-gris-borde bg-white p-5 shadow-suave active:scale-[0.99]">
            <div className="flex items-start justify-between gap-3">
                <div>
                    <p className="text-lg font-black">Ruta #{ruta.id}</p>
                    <p className="text-sm text-tinta-suave">{ruta.paradasTotales} manzanas · armó {nombreCompleto(ruta.coordinador)}</p>
                </div>
                <ChipRuta estado={ruta.estado} />
            </div>
            <div className="mt-4 flex items-center gap-3">
                <span className="h-3 flex-1 overflow-hidden rounded-full bg-gris-superficie" aria-hidden>
                    <span className="block h-full rounded-full bg-verde-600" style={{ width: `${porcentaje}%` }} />
                </span>
                <span className="text-sm font-black tabular-nums">{ruta.paradasVisitadas}/{ruta.paradasTotales}</span>
                <ChevronRight className="size-5 text-gris-texto" aria-hidden />
            </div>
        </Link>
    );
};

export default function Campo() {
    const { usuario } = useSesionPanel();
    const hoy = hoyIso();
    const { data, error, isLoading, refetch } = useRutas({ fecha: hoy });
    const rutas = (data?.pages.flatMap((pagina) => pagina.datos) ?? []).filter(({ estado }) => estado === 'PLANIFICADA' || estado === 'EN_CURSO');
    const terminadas = (data?.pages.flatMap((pagina) => pagina.datos) ?? []).filter(({ estado }) => estado === 'FINALIZADA');

    return (
        <DisposicionCampo>
            <div className="space-y-5 px-4 py-6">
                <div>
                    <p className="flex items-center gap-2 text-sm font-bold text-gris-texto first-letter:uppercase"><CalendarDays className="size-4" aria-hidden />{formatearDia(`${hoy}T00:00:00Z`)}</p>
                    <h1 className="mt-1 text-2xl font-black">¡Buen día, {usuario?.nombre}!</h1>
                    <Manuscrita className="text-2xl text-verde-600">Estas son tus rutas de hoy</Manuscrita>
                </div>

                {isLoading && <Cargando texto="Buscando tus rutas…" />}
                {error && <ErrorCarga error={error} alReintentar={() => void refetch()} />}
                {!isLoading && !error && rutas.length === 0 && (
                    <EstadoVacio icono={<Route className="size-6" aria-hidden />} titulo="No tenés rutas para hoy"
                        descripcion="Cuando la coordinación te asigne una, aparece acá." accion={<Boton variante="contorno" tamano="chico" onClick={() => void refetch()}>Actualizar</Boton>} />
                )}
                <div className="space-y-3">{rutas.map((ruta) => <TarjetaRuta key={ruta.id} ruta={ruta} />)}</div>

                {terminadas.length > 0 && (
                    <section>
                        <h2 className="mb-2 text-sm font-extrabold text-gris-texto">Terminadas hoy</h2>
                        <div className="space-y-3 opacity-80">{terminadas.map((ruta) => <TarjetaRuta key={ruta.id} ruta={ruta} />)}</div>
                    </section>
                )}

                <p className="flex items-start gap-2 rounded-2xl bg-bruma p-4 text-sm text-verde-900">
                    <Footprints className="mt-0.5 size-4 shrink-0" aria-hidden />
                    En cada parada registrá lo que hiciste: la manzana cambia de color en el mapa de los vecinos.
                </p>
            </div>
        </DisposicionCampo>
    );
}
