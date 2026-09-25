import { ArrowRight, Brush, Droplets, PackageOpen, RotateCcw, Trash2, TriangleAlert } from 'lucide-react';
import { BotonEnlace } from '@/componentes/ui/Boton';
import { ChipEstadoReporte } from '@/componentes/ui/ChipEstadoReporte';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { Manuscrita } from '@/componentes/ui/Tipografia';
import { useMisReportes } from '@/hooks/useVecino';
import { formatearFecha } from '@/lib/formato';

const PASOS = [
    { Icono: Trash2, texto: 'Desechá lo que no usás' },
    { Icono: RotateCcw, texto: 'Dá vuelta baldes y macetas' },
    { Icono: Droplets, texto: 'Tapá tanques y bidones' },
    { Icono: Brush, texto: 'Cepillá las paredes: los huevos quedan pegados' },
];

export default function Limpieza() {
    const { data, isLoading } = useMisReportes();
    const abiertos = (data ?? [])
        .filter((reporte) => reporte.tipo !== 'LIMPIEZA' && (reporte.estado === 'PENDIENTE' || reporte.estado === 'VALIDADO'));

    return (
        <div className="space-y-6 px-4 py-6">
            <div>
                <h1 className="text-2xl font-black">¡Buenísimo!</h1>
                <Manuscrita className="text-3xl text-verde-600">Mostranos cómo quedó</Manuscrita>
            </div>

            <Tarjeta className="p-4">
                <h2 className="font-extrabold">Antes de sacar la foto</h2>
                <ol className="mt-3 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                    {PASOS.map(({ Icono, texto }, indice) => (
                        <li key={texto} className="flex items-start gap-2 rounded-2xl bg-verde-50 p-3 text-sm font-bold text-verde-800">
                            <Icono className="size-5 shrink-0" aria-hidden />
                            <span><span className="sr-only">Paso {indice + 1}: </span>{texto}</span>
                        </li>
                    ))}
                </ol>
            </Tarjeta>

            <section aria-labelledby="titulo-abiertos">
                <h2 id="titulo-abiertos" className="font-extrabold">¿Qué criadero eliminaste?</h2>
                <p className="text-sm text-tinta-suave">Elegí uno de tus reportes, o reportá una limpieza en otro lugar.</p>
                {isLoading && <p className="mt-3 text-sm text-gris-texto">Cargando tus reportes…</p>}
                <ul className="mt-3 space-y-2">
                    {abiertos.map((reporte) => (
                        <li key={reporte.idCliente}>
                            <BotonEnlace
                                to={`/app/escanear?tipo=LIMPIEZA&resuelve=${reporte.idCliente}`}
                                variante="blanco"
                                className="h-auto w-full justify-between rounded-2xl border border-gris-borde px-4 py-3 text-tinta"
                                iconoFinal={<ArrowRight className="size-4 text-verde-600" aria-hidden />}
                            >
                                <span className="flex items-center gap-3 text-left">
                                    {reporte.tipo === 'CRIADERO' ? <TriangleAlert className="size-6 text-rojo-500" aria-hidden /> : <PackageOpen className="size-6 text-rojo-500" aria-hidden />}
                                    <span>
                                        <span className="block font-black">{reporte.tipo === 'CRIADERO' ? 'Criadero' : 'Microbasural'} · {reporte.manzanaCodigo}</span>
                                        <span className="block text-xs font-semibold text-gris-texto">{formatearFecha(reporte.creadoEn)}</span>
                                    </span>
                                </span>
                                <ChipEstadoReporte estado={reporte.estado} />
                            </BotonEnlace>
                        </li>
                    ))}
                </ul>
                <BotonEnlace to="/app/escanear?tipo=LIMPIEZA" variante="contorno" anchoCompleto className="mt-3">Limpié otro lugar</BotonEnlace>
            </section>
        </div>
    );
}
