import type { ReactNode } from 'react';
import {
    ArrowRight,
    BellRing,
    Bug,
    Camera,
    CloudUpload,
    Droplets,
    MapPin,
    MessageCircleHeart,
    PaintBucket,
    Play,
    ShieldCheck,
    Sparkles,
    SprayCan,
    Trash2,
    UserRoundX,
} from 'lucide-react';
import { EncabezadoPublico } from '@/componentes/disposicion/EncabezadoPublico';
import { PiePublico } from '@/componentes/disposicion/PiePublico';
import { BotonEnlace } from '@/componentes/ui/Boton';
import { ChipEstado, ESTADOS_MANZANA, type EstadoManzana } from '@/componentes/ui/ChipEstado';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { Manuscrita, Rotulo, TituloSeccion } from '@/componentes/ui/Tipografia';
import { Corazon, Destellos, FlechaCurva, Gotas, Mancha, Puntos, RayosAlerta, Subrayado } from '@/componentes/ilustraciones/Garabatos';
import { MaquetaEscaner } from '@/componentes/ilustraciones/MaquetaEscaner';
import { MapaIlustrado } from '@/componentes/ilustraciones/MapaIlustrado';
import { cn } from '@/lib/utils';

const Contenedor = ({ className, children }: { className?: string; children: ReactNode }) => (
    <div className={cn('mx-auto max-w-7xl px-4 sm:px-6', className)}>{children}</div>
);

// ---------------------------------------------------------------------------
// Portada
// ---------------------------------------------------------------------------

const Portada = () => (
    <section className="relative overflow-hidden bg-gradient-to-br from-verde-50 via-white to-bruma">
        <Contenedor className="grid items-center gap-12 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
            <div className="animate-aparecer">
                <Rotulo>Prevención del dengue en Formosa</Rotulo>
                <h1 className="mt-4 text-[2.6rem] leading-[1.05] font-black tracking-tight text-tinta sm:text-6xl">
                    Cuidemos Formosa
                    <br />
                    <span className="text-verde-600">del dengue,</span>
                    <br />
                    <span className="relative inline-block">
                        <Manuscrita className="text-[3.1rem] text-rojo-500 sm:text-7xl">manzana por manzana</Manuscrita>
                        <Destellos className="absolute -top-5 -right-12 hidden size-11 text-rojo-400 sm:block" />
                    </span>
                </h1>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-tinta-suave">
                    Tu celular detecta los recipientes que juntan agua en tu patio. Reportás en segundos, el equipo de
                    salud lo confirma y tu cuadra se pinta de verde.
                </p>
                <div className="mt-8 flex flex-wrap items-center gap-3">
                    <BotonEnlace to="/app" tamano="grande" icono={<Camera className="size-5" aria-hidden />}>
                        Escanear mi patio
                    </BotonEnlace>
                    <a
                        href="#como-funciona"
                        className="inline-flex h-14 items-center gap-3 rounded-full bg-white pr-6 pl-2 font-extrabold text-tinta shadow-suave transition hover:-translate-y-px"
                    >
                        <span className="grid size-10 place-items-center rounded-full border-2 border-tinta">
                            <Play className="size-4 fill-tinta" aria-hidden />
                        </span>
                        Cómo funciona
                    </a>
                </div>
                <div className="mt-8 flex items-center gap-3 text-tinta-suave">
                    <FlechaCurva className="h-9 w-16 -scale-y-100 text-tinta" />
                    <Manuscrita className="text-2xl">¡Pintemos el barrio de verde!</Manuscrita>
                </div>
            </div>

            <div className="relative mx-auto w-full max-w-md lg:max-w-none">
                <Mancha className="absolute top-4 left-1/2 w-[118%] -translate-x-1/2 text-verde-500" />
                <Mancha forma={2} className="absolute -top-6 right-0 w-40 text-verde-200" />
                <Puntos className="absolute bottom-16 -left-2 size-20 text-verde-600/70" />
                <RayosAlerta className="absolute top-2 left-10 w-16 text-tinta" />

                <MaquetaEscaner className="relative mx-auto h-[500px] w-auto animate-flotar sm:h-[540px]" />

                <Tarjeta className="absolute top-20 -right-1 w-40 rotate-2 p-4 sm:right-0">
                    <UserRoundX className="size-6 text-verde-600" aria-hidden />
                    <p className="mt-2 text-2xl font-black">100%</p>
                    <p className="text-sm leading-snug text-tinta-suave">anónimo. Sin registro ni teléfono.</p>
                </Tarjeta>
                <div className="absolute top-2 right-44 hidden size-12 -rotate-12 place-items-center rounded-2xl bg-rojo-500 text-white shadow-elevada sm:grid">
                    <Corazon className="size-6" />
                </div>
                <Tarjeta className="absolute bottom-10 -left-1 flex -rotate-2 items-center gap-3 px-4 py-3 sm:left-0">
                    <ChipEstado estado="VERDE" tamano="chico" />
                    <span className="text-sm font-bold">Manzana EJ-0404</span>
                </Tarjeta>
            </div>
        </Contenedor>
    </section>
);

// ---------------------------------------------------------------------------
// Cómo funciona (como "trabajos recientes" de la referencia)
// ---------------------------------------------------------------------------

const PASOS = [
    {
        Icono: Camera,
        titulo: 'Escaneá tu patio',
        texto: 'La cámara marca en rojo baldes, neumáticos, macetas y botellas con agua.',
        fondo: 'bg-verde-50 text-verde-600',
    },
    {
        Icono: CloudUpload,
        titulo: 'Enviá el reporte',
        texto: 'Con la foto y la ubicación. Si no hay señal, se envía solo cuando vuelve.',
        fondo: 'bg-rojo-50 text-rojo-500',
    },
    {
        Icono: PaintBucket,
        titulo: 'Pintá tu manzana',
        texto: 'Cuando el equipo de salud confirma la limpieza, tu cuadra pasa a verde.',
        fondo: 'bg-amber-50 text-amber-600',
    },
];

const ComoFunciona = () => (
    <section id="como-funciona" className="scroll-mt-28 bg-crema py-20">
        <Contenedor className="grid gap-12 lg:grid-cols-[0.8fr_2fr] lg:items-center">
            <div>
                <TituloSeccion rotulo="Cómo funciona" titulo="Tres pasos." acento="Un barrio más sano." />
                <Subrayado className="mt-2 w-28 text-verde-500" />
                <p className="mt-5 max-w-xs leading-relaxed text-tinta-suave">
                    Sin descargar nada pesado: es una web liviana que se instala en el celular y funciona sin internet.
                </p>
                <p id="privacidad" className="mt-5 flex max-w-xs gap-3 rounded-2xl bg-white p-4 text-sm leading-relaxed text-tinta-suave shadow-suave">
                    <ShieldCheck className="size-5 shrink-0 text-verde-600" aria-hidden />
                    No pedimos tu nombre ni tu teléfono, y las fotos se guardan sin los datos de ubicación del celular.
                </p>
                <BotonEnlace to="/app" variante="contorno" tamano="chico" className="mt-6" iconoFinal={<ArrowRight className="size-4" aria-hidden />}>
                    Probar ahora
                </BotonEnlace>
            </div>

            <ol className="grid gap-6 sm:grid-cols-3">
                {PASOS.map(({ Icono, titulo, texto, fondo }, indice) => (
                    <li key={titulo}>
                        <Tarjeta className="group flex h-full flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-elevada">
                            <div className={cn('relative grid h-44 place-items-center', fondo)}>
                                <span className="absolute top-3 left-4 font-manuscrita text-4xl font-bold opacity-60">{indice + 1}</span>
                                <Icono className="size-20" strokeWidth={1.6} aria-hidden />
                            </div>
                            <div className="flex flex-1 items-end justify-between gap-3 p-5">
                                <div>
                                    <h3 className="text-lg font-black">{titulo}</h3>
                                    <p className="mt-1 text-sm leading-relaxed text-tinta-suave">{texto}</p>
                                </div>
                            </div>
                        </Tarjeta>
                    </li>
                ))}
            </ol>
        </Contenedor>
    </section>
);

// ---------------------------------------------------------------------------
// Consejos (como los "paquetes" de la referencia, con el central destacado)
// ---------------------------------------------------------------------------

const CONSEJOS = [
    {
        Icono: Trash2,
        paso: 'Gestos 1 y 2',
        titulo: 'Desechá y da vuelta',
        bajada: 'Lo que no usás, afuera. Lo que usás, boca abajo.',
        items: ['Neumáticos, latas y botellas', 'Baldes y palanganas', 'Bebederos de mascotas: agua limpia a diario', 'Revisá después de cada lluvia'],
    },
    {
        Icono: Sparkles,
        paso: 'Gesto 3',
        titulo: 'Cepillá las paredes',
        bajada: 'Cambiar el agua no alcanza: los huevos quedan pegados.',
        items: ['Floreros, bebederos y tanques', 'Cepillo y agua con detergente', 'Una vez por semana', 'Los huevos resisten meses en seco'],
        destacado: true,
    },
    {
        Icono: SprayCan,
        paso: 'Gesto 4',
        titulo: 'Tapá o usá BTI',
        bajada: 'Para el agua que no se puede vaciar.',
        items: ['Tanques y aljibes bien sellados', 'BTI: larvicida biológico', 'Inocuo para personas y animales', 'Pedilo en tu centro de salud'],
    },
];

const Consejos = () => (
    <section id="consejos" className="scroll-mt-28 bg-bruma py-20">
        <Contenedor className="grid gap-12 lg:grid-cols-[0.8fr_2fr] lg:items-center">
            <div className="relative">
                <TituloSeccion
                    rotulo="Consejos"
                    titulo="Cuidá tu patio."
                    acento="En 4 gestos."
                    descripcion="La fumigación ya no alcanza: los mosquitos se volvieron resistentes. Lo que funciona es eliminar huevos y larvas."
                />
                <FlechaCurva className="mt-6 hidden h-12 w-24 text-tinta lg:block" />
            </div>

            <div className="grid gap-6 pt-4 md:grid-cols-3">
                {CONSEJOS.map(({ Icono, paso, titulo, bajada, items, destacado }) => (
                    <div key={titulo} className={cn('relative', destacado && 'md:-mt-4')}>
                        {destacado && (
                            <p className="absolute -top-9 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-t-2xl bg-rojo-500 px-5 py-2 text-xs font-extrabold tracking-widest whitespace-nowrap text-white uppercase">
                                <Sparkles className="size-3.5" aria-hidden />El más importante
                            </p>
                        )}
                        <Tarjeta className={cn('flex h-full flex-col p-6', destacado && 'border-2 border-rojo-500 shadow-elevada')}>
                            <div className="flex items-center justify-between">
                                <Rotulo tono={destacado ? 'rojo' : 'verde'}>{paso}</Rotulo>
                                <span className={cn('grid size-10 place-items-center rounded-full text-white', destacado ? 'bg-rojo-500' : 'bg-verde-600')}>
                                    <Icono className="size-5" aria-hidden />
                                </span>
                            </div>
                            <h3 className="mt-4 text-2xl leading-tight font-black">{titulo}</h3>
                            <p className="mt-1 text-sm text-tinta-suave">{bajada}</p>
                            <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                                {items.map((item) => (
                                    <li key={item} className="flex gap-2">
                                        <span aria-hidden className="font-black text-verde-600">✓</span>
                                        {item}
                                    </li>
                                ))}
                            </ul>
                            <BotonEnlace
                                to="/app/consejos"
                                variante={destacado ? 'acento' : 'contorno'}
                                tamano="chico"
                                anchoCompleto
                                className="mt-6"
                            >
                                Ver cómo hacerlo
                            </BotonEnlace>
                        </Tarjeta>
                    </div>
                ))}
            </div>
        </Contenedor>
    </section>
);

// ---------------------------------------------------------------------------
// Localidades (como la tira de marcas de la referencia)
// ---------------------------------------------------------------------------

const LOCALIDADES = ['Formosa Capital', 'Clorinda', 'Pirané', 'El Colorado', 'Laguna Blanca', 'Las Lomitas', 'Palo Santo', 'Estanislao del Campo'];

const TiraLocalidades = () => (
    <section aria-label="Localidades" className="border-y border-gris-borde bg-white py-8">
        <Contenedor>
            <ul className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 xl:justify-between">
                {LOCALIDADES.map((localidad) => (
                    <li key={localidad} className="flex items-center gap-2 font-extrabold whitespace-nowrap text-tinta/70 sm:text-lg">
                        <MapPin className="size-5 text-verde-500" aria-hidden />
                        {localidad}
                    </li>
                ))}
            </ul>
        </Contenedor>
    </section>
);

// ---------------------------------------------------------------------------
// Mapa del barrio
// ---------------------------------------------------------------------------

const ORDEN_ESTADOS: EstadoManzana[] = ['VERDE', 'AMARILLO', 'ROJO', 'SIN_DATOS'];

const MapaDelBarrio = () => (
    <section id="mapa" className="scroll-mt-28 py-20">
        <Contenedor className="grid items-center gap-12 lg:grid-cols-2">
            <div className="relative">
                <Mancha forma={3} className="absolute -top-10 -left-10 w-64 text-verde-50" />
                <Tarjeta className="relative p-5">
                    <MapaIlustrado className="w-full" />
                    <p className="mt-4 flex items-center gap-2 text-sm font-bold text-tinta-suave">
                        <MapPin className="size-4 text-rojo-500" aria-hidden />Así se ve tu barrio en la app
                    </p>
                </Tarjeta>
            </div>
            <div>
                <TituloSeccion
                    rotulo="Mapa del barrio"
                    titulo="Tu barrio."
                    acento="Tu mapa."
                    descripcion="Cada manzana tiene un color. Cuando todos los vecinos limpian, la cuadra se pinta de verde y el equipo de salud puede concentrarse donde más hace falta."
                />
                <ul className="mt-8 grid gap-3 sm:grid-cols-2">
                    {ORDEN_ESTADOS.map((estado) => (
                        <li key={estado} className="rounded-2xl border border-gris-borde p-4">
                            <ChipEstado estado={estado} tamano="chico" />
                            <p className="mt-2 text-sm leading-relaxed text-tinta-suave">{ESTADOS_MANZANA[estado].descripcion}</p>
                        </li>
                    ))}
                </ul>
                <BotonEnlace to="/app/mapa" className="mt-8" iconoFinal={<ArrowRight className="size-4" aria-hidden />}>
                    Ver el mapa en vivo
                </BotonEnlace>
            </div>
        </Contenedor>
    </section>
);

// ---------------------------------------------------------------------------
// Conocé al mosquito (en el lugar de los testimonios de la referencia)
// ---------------------------------------------------------------------------

const MOSQUITOS = [
    {
        nombre: 'Aedes aegypti',
        riesgo: 'Riesgo crítico',
        clases: 'bg-rojo-50 text-rojo-700',
        texto: 'Transmite dengue, zika y chikungunya. Pica de día, es silencioso y cría en agua limpia dentro de las casas.',
    },
    {
        nombre: 'Aedes albopictus',
        riesgo: 'Riesgo alto',
        clases: 'bg-amber-50 text-amber-800',
        texto: 'El "mosquito tigre". Activo de día y al atardecer, cría tanto en recipientes como en zonas rurales.',
    },
    {
        nombre: 'Culex',
        riesgo: 'Riesgo moderado',
        clases: 'bg-gris-superficie text-tinta-suave',
        texto: 'Nocturno y ruidoso. Cría en zanjas y pozos con mucha materia orgánica.',
    },
];

const ConoceAlMosquito = () => (
    <section id="mosquitos" className="scroll-mt-28 bg-crema py-20">
        <Contenedor className="grid gap-12 lg:grid-cols-[0.8fr_2fr] lg:items-center">
            <div>
                <div className="flex items-end gap-3">
                    <TituloSeccion rotulo="Conocé al mosquito" titulo="Conocé al" acento="enemigo." />
                    <RayosAlerta className="mb-4 w-12 text-rojo-500" />
                </div>
                <p className="mt-4 max-w-xs leading-relaxed text-tinta-suave">
                    La hembra reparte sus huevos en muchos recipientes. Por eso cada patio cuenta.
                </p>
                <BotonEnlace to="/app/chat" variante="contorno" tamano="chico" className="mt-6" icono={<MessageCircleHeart className="size-4" aria-hidden />}>
                    Preguntale a IA Mosquito
                </BotonEnlace>
            </div>

            <ul className="grid gap-6 md:grid-cols-3">
                {MOSQUITOS.map((mosquito) => (
                    <li key={mosquito.nombre}>
                        <Tarjeta className="flex h-full flex-col p-6">
                            <Bug className="size-9 text-verde-600" strokeWidth={2.2} aria-hidden />
                            <p className="mt-4 flex-1 leading-relaxed text-tinta-suave">{mosquito.texto}</p>
                            <div className="mt-6 flex items-center justify-between gap-3 border-t border-gris-borde pt-4">
                                <p className="font-black italic whitespace-nowrap">{mosquito.nombre}</p>
                                <span className={cn('rounded-full px-3 py-1 text-xs font-extrabold whitespace-nowrap', mosquito.clases)}>{mosquito.riesgo}</span>
                            </div>
                        </Tarjeta>
                    </li>
                ))}
            </ul>
        </Contenedor>
    </section>
);

// ---------------------------------------------------------------------------
// Llamado final (como la banda "Have a project in mind?" de la referencia)
// ---------------------------------------------------------------------------

const LlamadoFinal = () => (
    <section className="relative overflow-hidden bg-verde-600 py-16 text-white">
        <Gotas className="absolute top-6 right-8 w-24 text-white/20" />
        <Puntos className="absolute bottom-6 left-1/3 size-24 text-white/10" />
        <Contenedor className="grid items-center gap-10 lg:grid-cols-[auto_1fr]">
            <div className="relative mx-auto w-64">
                <div className="rotate-[-6deg] rounded-3xl bg-white p-5 text-tinta shadow-elevada">
                    <div className="flex items-center gap-3">
                        <img src="/marca/icono-192.png" alt="" width="40" height="40" className="size-10 rounded-xl" />
                        <div>
                            <p className="text-sm font-black">Llovió en Formosa Capital</p>
                            <p className="text-xs text-gris-texto">Red-Cuidar · ahora</p>
                        </div>
                    </div>
                    <Manuscrita className="mt-3 block text-2xl leading-tight text-verde-700">¡Vaciá, cepillá y tapá los recipientes!</Manuscrita>
                </div>
                <Droplets className="absolute -right-4 -bottom-4 size-12 rotate-12 text-white" aria-hidden />
            </div>

            <div>
                <h2 className="text-3xl font-black tracking-tight uppercase sm:text-4xl">¿Llovió en tu barrio?</h2>
                <p className="mt-3 max-w-xl text-lg text-white/85">
                    Después de cada lluvia te avisamos para que revises el patio. Activá las alertas y sumá tu manzana al mapa.
                </p>
                <div className="mt-7 flex flex-wrap gap-3">
                    <BotonEnlace to="/app/alertas" variante="blanco" icono={<BellRing className="size-4" aria-hidden />}>
                        Activar alertas
                    </BotonEnlace>
                    <BotonEnlace to="/app" variante="acento" icono={<Camera className="size-4" aria-hidden />}>
                        Escanear mi patio
                    </BotonEnlace>
                </div>
            </div>
        </Contenedor>
    </section>
);

export default function InicioPublico() {
    return (
        <>
            <EncabezadoPublico />
            <main>
                <Portada />
                <ComoFunciona />
                <Consejos />
                <TiraLocalidades />
                <MapaDelBarrio />
                <ConoceAlMosquito />
                <LlamadoFinal />
            </main>
            <PiePublico />
        </>
    );
}
