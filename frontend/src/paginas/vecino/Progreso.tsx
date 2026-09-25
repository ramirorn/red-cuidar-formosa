import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Camera, CheckCircle2, Flame, Lock, ShieldCheck, ShieldHalf, Users } from 'lucide-react';
import { BarraProgreso } from '@/componentes/vecino/Progreso';
import { BotonEnlace } from '@/componentes/ui/Boton';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { Manuscrita, Rotulo } from '@/componentes/ui/Tipografia';
import { Subrayado } from '@/componentes/ilustraciones/Garabatos';
import { useDesafiosDeZona, useInsigniasGanadas, useProgreso } from '@/hooks/useProgreso';
import { formatearFecha } from '@/lib/formato';
import type { Ubicacion } from '@/lib/geo';
import { cn } from '@/lib/utils';
import { semanasActivas } from '@/progreso/actividad';
import type { Desafio } from '@/progreso/desafios';
import { INSIGNIAS } from '@/progreso/insignias';
import { diasParaCerrar, semanaAnterior, semanaDe } from '@/progreso/semanas';
import { leerAjuste } from '@/sinConexion/bd';

const SEMANAS_A_MOSTRAR = 8;

const FilaDesafio = ({ desafio }: { desafio: Pick<Desafio, 'titulo' | 'meta' | 'progreso' | 'cumplido'> }) => (
    <li>
        <div className="flex items-start justify-between gap-3 text-sm">
            <span className={cn('font-bold', desafio.cumplido && 'text-verde-700')}>
                {desafio.cumplido && <CheckCircle2 className="mr-1 inline size-4 align-[-3px]" aria-hidden />}{desafio.titulo}
            </span>
            <span className="shrink-0 font-black tabular-nums">{desafio.progreso}/{desafio.meta}</span>
        </div>
        <BarraProgreso className="mt-1.5" progreso={desafio.progreso} meta={desafio.meta} />
    </li>
);

export default function Progreso() {
    const { racha, desafios, actividad, cargando } = useProgreso();
    const { data: ganadas = {} } = useInsigniasGanadas();
    const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
    const { data: deZona } = useDesafiosDeZona(ubicacion);

    useEffect(() => { void leerAjuste<Ubicacion>('ultimaUbicacion').then((guardada) => guardada && setUbicacion(guardada)); }, []);

    // Últimas 8 semanas, de la más vieja a la actual.
    const activas = semanasActivas(actividad);
    const ultimas: string[] = [];
    for (let semana = semanaDe(new Date()); ultimas.length < SEMANAS_A_MOSTRAR; semana = semanaAnterior(semana)) ultimas.unshift(semana);
    const actual = ultimas.at(-1);
    const dias = diasParaCerrar();

    if (cargando) return <div className="m-4 h-64 animate-pulse rounded-tarjeta bg-white" />;

    return (
        <div className="space-y-5 px-4 py-6">
            <div>
                <h1 className="text-2xl font-black">Mi progreso</h1>
                <Manuscrita className="block text-2xl text-verde-600">Cada semana cuenta</Manuscrita>
                <Subrayado className="w-24 text-verde-500" />
            </div>

            <Tarjeta className={cn('p-5', racha.estaSemanaHecha && 'border-amber-200 bg-gradient-to-br from-amber-50 to-white')}>
                <div className="flex items-center gap-4">
                    <span className={cn('grid size-16 shrink-0 place-items-center rounded-2xl', racha.estaSemanaHecha ? 'bg-amber-400 text-white' : 'bg-gris-superficie text-gris-texto')}>
                        <Flame className="size-9" aria-hidden />
                    </span>
                    <div>
                        <p className="text-3xl leading-none font-black">{racha.semanas} <span className="text-lg">{racha.semanas === 1 ? 'semana' : 'semanas'}</span></p>
                        <p className="mt-1 text-sm text-tinta-suave">revisando el patio sin cortar</p>
                    </div>
                </div>

                <ol className="mt-5 flex justify-between gap-0.5" aria-label="Últimas semanas">
                    {ultimas.map((semana) => {
                        const hecha = activas.has(semana);
                        const comodin = racha.comodinesUsados.includes(semana);
                        const esActual = semana === actual;
                        return (
                            <li key={semana} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`Semana del ${formatearFecha(`${semana}T12:00:00Z`)}`}>
                                <span className={cn('grid size-7 place-items-center rounded-full min-[360px]:size-8',
                                    hecha ? 'bg-amber-400 text-white' : comodin ? 'bg-bruma text-verde-700' : 'bg-gris-superficie text-gris-borde',
                                    esActual && !hecha && 'ring-2 ring-amber-300 ring-offset-1')}>
                                    {hecha ? <Flame className="size-4" aria-hidden /> : comodin ? <ShieldHalf className="size-4" aria-hidden /> : <span className="size-1.5 rounded-full bg-current" />}
                                </span>
                                <span className="text-[0.65rem] text-gris-texto">{esActual ? 'Esta' : semana.slice(8, 10) + '/' + semana.slice(5, 7)}</span>
                                <span className="sr-only">{hecha ? 'revisada' : comodin ? 'comodín' : 'sin revisar'}</span>
                            </li>
                        );
                    })}
                </ol>

                <p className="mt-4 text-sm font-bold">
                    {racha.estaSemanaHecha
                        ? '¡Esta semana ya revisaste tu patio!'
                        : dias === 0 ? 'Hoy es el último día para revisar el patio esta semana.' : `Te quedan ${dias} ${dias === 1 ? 'día' : 'días'} para revisar el patio esta semana.`}
                </p>
                {!racha.estaSemanaHecha && racha.semanas > 0 && (
                    <p className="mt-1 flex items-start gap-1.5 text-xs text-tinta-suave">
                        <ShieldHalf className="mt-0.5 size-3.5 shrink-0 text-verde-600" aria-hidden />
                        {racha.comodinDisponible
                            ? 'Si esta semana no podés, usás el comodín del mes y la racha no se corta.'
                            : 'Ya usaste el comodín: si no revisás esta semana, la racha vuelve a cero.'}
                    </p>
                )}
                {!racha.estaSemanaHecha && (
                    <BotonEnlace to="/app/escanear?nuevo=1" anchoCompleto className="mt-4" icono={<Camera className="size-4" aria-hidden />}>Revisar mi patio ahora</BotonEnlace>
                )}
            </Tarjeta>

            <Tarjeta className="p-5">
                <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-black">Tus desafíos de la semana</h2>
                    <span className="text-xs text-gris-texto">{desafios.filter((desafio) => desafio.cumplido).length} de {desafios.length}</span>
                </div>
                <ul className="mt-4 space-y-4">{desafios.map((desafio) => <FilaDesafio key={desafio.clave} desafio={desafio} />)}</ul>
            </Tarjeta>

            <Tarjeta className="p-5">
                <h2 className="flex items-center gap-2 font-black"><Users className="size-5 text-verde-600" aria-hidden />Desafíos de tu zona</h2>
                {deZona ? (
                    <>
                        <p className="mt-0.5 text-sm text-tinta-suave">{deZona.zona.nombre}: entre todos los vecinos.</p>
                        <ul className="mt-4 space-y-4">{deZona.desafios.map((desafio) => <FilaDesafio key={desafio.clave} desafio={desafio} />)}</ul>
                        <Link to="/app/copa" className="mt-4 inline-block text-sm font-extrabold text-verde-700 underline-offset-2 hover:underline">Ver cómo va tu zona en la Copa</Link>
                    </>
                ) : (
                    <p className="mt-2 text-sm text-tinta-suave">
                        Para ver los desafíos de tu zona, abrí la <Link to="/app/copa" className="font-extrabold text-verde-700 underline">Copa</Link> y tocá "Ver mi zona".
                    </p>
                )}
            </Tarjeta>

            <section aria-labelledby="titulo-insignias">
                <Rotulo id="titulo-insignias">Insignias</Rotulo>
                <ul className="mt-3 grid grid-cols-1 gap-3 min-[360px]:grid-cols-2">
                    {INSIGNIAS.map(({ clave, nombre, como, Icono }) => {
                        const fecha = ganadas[clave];
                        return (
                            <li key={clave} className={cn('flex items-start gap-3 rounded-tarjeta border p-3.5', fecha ? 'border-verde-200 bg-white shadow-suave' : 'border-dashed border-gris-borde bg-gris-superficie/50')}>
                                <span className={cn('grid size-11 shrink-0 place-items-center rounded-2xl', fecha ? 'bg-verde-600 text-white' : 'bg-white text-gris-borde')}>
                                    {fecha ? <Icono className="size-6" aria-hidden /> : <Lock className="size-5" aria-hidden />}
                                </span>
                                <span className="min-w-0 text-sm">
                                    <span className={cn('block leading-tight font-black', !fecha && 'text-gris-texto')}>{nombre}</span>
                                    <span className="mt-0.5 block text-xs text-tinta-suave">{fecha ? `Ganada el ${formatearFecha(fecha)}` : como}</span>
                                </span>
                            </li>
                        );
                    })}
                </ul>
            </section>

            <p className="flex items-start gap-2 text-xs leading-relaxed text-gris-texto">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-verde-600" aria-hidden />
                Tu racha, tus desafíos y tus insignias se guardan solo en este celular: nadie más los ve y no hace falta registrarse.
            </p>
        </div>
    );
}
