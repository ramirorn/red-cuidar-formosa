import { Brush, Bug, Camera, Droplets, RotateCcw, SprayCan, Trash2 } from 'lucide-react';
import { BotonEnlace } from '@/componentes/ui/Boton';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { Manuscrita } from '@/componentes/ui/Tipografia';
import { useActividadAlEntrar } from '@/hooks/useProgreso';
import { cn } from '@/lib/utils';

const CONSEJOS = [
    { Icono: Trash2, titulo: 'Desechá', texto: 'Tirá lo que no usás: neumáticos, latas, botellas y todo lo que pueda juntar agua.' },
    { Icono: RotateCcw, titulo: 'Dá vuelta', texto: 'Poné boca abajo baldes, palanganas y macetas que no estés usando.' },
    { Icono: Droplets, titulo: 'Tapá', texto: 'Sellá tanques, aljibes y bidones. Una tapa mal cerrada alcanza para que entre el mosquito.' },
    { Icono: Brush, titulo: 'Cepillá', texto: 'Cambiar el agua no alcanza: los huevos quedan pegados a las paredes. Cepillá floreros, bebederos y tanques una vez por semana.', destacado: true },
    { Icono: SprayCan, titulo: 'BTI', texto: 'Para el agua que no se puede vaciar existe el BTI, un larvicida biológico inocuo para personas y animales. Pedilo en tu centro de salud.' },
];

const MOSQUITOS = [
    { nombre: 'Aedes aegypti', riesgo: 'Crítico', clases: 'bg-rojo-500 text-white', texto: 'Dengue, zika y chikungunya. Pica de día y cría en agua limpia de las casas.' },
    { nombre: 'Aedes albopictus', riesgo: 'Alto', clases: 'bg-amber-400 text-tinta', texto: 'El "mosquito tigre". De día y al atardecer, en recipientes y zonas rurales.' },
    { nombre: 'Culex', riesgo: 'Moderado', clases: 'bg-gris-borde text-tinta', texto: 'Nocturno y ruidoso. Cría en zanjas y pozos con materia orgánica.' },
];

export default function Consejos() {
    useActividadAlEntrar('CONSEJOS');
    return (
        <div className="space-y-6 px-4 py-6">
            <div>
                <h1 className="text-2xl font-black">Consejos</h1>
                <Manuscrita className="text-2xl text-verde-600">Cinco gestos que cortan el ciclo</Manuscrita>
            </div>

            <ol className="space-y-3">
                {CONSEJOS.map(({ Icono, titulo, texto, destacado }) => (
                    <li key={titulo}>
                        <Tarjeta className={cn('flex gap-4 p-5', destacado && 'border-2 border-rojo-500')}>
                            <span className={cn('grid size-12 shrink-0 place-items-center rounded-2xl text-white', destacado ? 'bg-rojo-500' : 'bg-verde-600')}>
                                <Icono className="size-6" aria-hidden />
                            </span>
                            <div>
                                <h2 className="flex flex-wrap items-center gap-2 text-lg font-black">
                                    {titulo}
                                    {destacado && <span className="rounded-full bg-rojo-50 px-2 py-0.5 text-xs font-extrabold text-rojo-700">El más importante</span>}
                                </h2>
                                <p className="mt-1 text-sm leading-relaxed text-tinta-suave">{texto}</p>
                            </div>
                        </Tarjeta>
                    </li>
                ))}
            </ol>

            <section aria-labelledby="titulo-mosquito">
                <h2 id="titulo-mosquito" className="flex items-center gap-2 text-xl font-black"><Bug className="size-6 text-verde-600" aria-hidden />Conocé al mosquito</h2>
                <ul className="mt-3 space-y-3">
                    {MOSQUITOS.map((mosquito) => (
                        <li key={mosquito.nombre}>
                            <Tarjeta className="p-4">
                                <div className="flex items-center justify-between gap-3">
                                    <p className="font-black italic">{mosquito.nombre}</p>
                                    <span className={cn('rounded-full px-2.5 py-0.5 text-xs font-extrabold', mosquito.clases)}>Riesgo {mosquito.riesgo.toLowerCase()}</span>
                                </div>
                                <p className="mt-1 text-sm text-tinta-suave">{mosquito.texto}</p>
                            </Tarjeta>
                        </li>
                    ))}
                </ul>
            </section>

            <BotonEnlace to="/app/escanear?nuevo=1" tamano="grande" anchoCompleto icono={<Camera className="size-5" aria-hidden />}>Escanear mi patio ahora</BotonEnlace>
        </div>
    );
}
