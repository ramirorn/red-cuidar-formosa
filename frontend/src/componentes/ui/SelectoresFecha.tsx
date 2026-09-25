import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type ButtonHTMLAttributes, type KeyboardEvent, type ReactNode } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { CalendarDays, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';
import {
    aTexto,
    DIAS_SEMANA,
    desdeTexto,
    dosDigitos,
    fechaCorta,
    fechaLarga,
    hoy,
    nombreMes,
    partirFechaHora,
    semanasDelMes,
    sumarDias,
    sumarMeses,
    type Dia,
} from '@/lib/fechas';
import { cn } from '@/lib/utils';

// Selectores de fecha y hora propios: se ven igual en todos los navegadores, están en español,
// la semana empieza el lunes y se manejan con teclado (flechas, Re Pág/Av Pág, Inicio/Fin).

interface PropiedadesAccesibles {
    id?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    'aria-label'?: string;
}

const CLASES_DISPARADOR = cn(
    'flex h-11 w-full items-center gap-2.5 rounded-xl border border-gris-borde bg-white px-3.5 text-left text-sm text-tinta',
    'transition hover:border-verde-300 focus:border-verde-500 focus:outline-none focus-visible:ring-3 focus-visible:ring-verde-100',
    'data-[state=open]:border-verde-500 data-[state=open]:ring-3 data-[state=open]:ring-verde-100',
    'disabled:cursor-not-allowed disabled:bg-gris-superficie disabled:text-gris-texto aria-invalid:border-rojo-500',
);

const CLASES_PANEL = 'z-[1100] rounded-panel border border-gris-borde bg-white p-4 shadow-elevada outline-none data-[state=open]:animate-aparecer';

// ---------------------------------------------------------------------------
// Calendario
// ---------------------------------------------------------------------------

interface PropiedadesCalendario {
    valor: string;
    alElegir: (fecha: string) => void;
    min?: string | undefined;
    max?: string | undefined;
    pie?: ReactNode;
}

export const Calendario = ({ valor, alElegir, min, max, pie }: PropiedadesCalendario) => {
    const elegido = desdeTexto(valor);
    const deHoy = hoy();
    const [enfocado, setEnfocado] = useState<Dia>(elegido ?? deHoy);
    const [visible, setVisible] = useState({ anio: enfocado.anio, mes: enfocado.mes });
    const grilla = useRef<HTMLDivElement>(null);
    const debeEnfocar = useRef(false);
    const idTitulo = useId();

    const fueraDeRango = (dia: Dia) => {
        const texto = aTexto(dia);
        return Boolean((min && texto < min) || (max && texto > max));
    };

    const semanas = useMemo(() => semanasDelMes(visible.anio, visible.mes), [visible]);

    // El foco sigue al día activo cuando se navega con el teclado (roving tabindex).
    useLayoutEffect(() => {
        if (!debeEnfocar.current) return;
        debeEnfocar.current = false;
        grilla.current?.querySelector<HTMLButtonElement>(`[data-fecha="${aTexto(enfocado)}"]`)?.focus();
    }, [enfocado, visible]);

    const mover = (destino: Dia) => {
        debeEnfocar.current = true;
        setEnfocado(destino);
        if (destino.mes !== visible.mes || destino.anio !== visible.anio) setVisible({ anio: destino.anio, mes: destino.mes });
    };

    const cambiarMes = (cantidad: number) => {
        const destino = sumarMeses({ ...visible, dia: 1 }, cantidad);
        setVisible({ anio: destino.anio, mes: destino.mes });
        setEnfocado(sumarMeses(enfocado, cantidad));
    };

    const alPresionar = (evento: KeyboardEvent<HTMLDivElement>) => {
        const acciones: Record<string, () => Dia> = {
            ArrowLeft: () => sumarDias(enfocado, -1),
            ArrowRight: () => sumarDias(enfocado, 1),
            ArrowUp: () => sumarDias(enfocado, -7),
            ArrowDown: () => sumarDias(enfocado, 7),
            Home: () => sumarDias(enfocado, -((new Date(enfocado.anio, enfocado.mes, enfocado.dia).getDay() + 6) % 7)),
            End: () => sumarDias(enfocado, 6 - ((new Date(enfocado.anio, enfocado.mes, enfocado.dia).getDay() + 6) % 7)),
            PageUp: () => sumarMeses(enfocado, evento.shiftKey ? -12 : -1),
            PageDown: () => sumarMeses(enfocado, evento.shiftKey ? 12 : 1),
        };
        const accion = acciones[evento.key];
        if (!accion) return;
        evento.preventDefault();
        mover(accion());
    };

    const mesAnteriorBloqueado = Boolean(min && aTexto(sumarDias({ ...visible, dia: 1 }, -1)) < min);
    const mesSiguienteBloqueado = Boolean(max && aTexto(sumarMeses({ ...visible, dia: 1 }, 1)) > max);

    return (
        <div className="w-[18.5rem] select-none">
            <div className="mb-3 flex items-center justify-between">
                <button type="button" onClick={() => cambiarMes(-1)} disabled={mesAnteriorBloqueado} aria-label="Mes anterior"
                    className="grid size-9 place-items-center rounded-full hover:bg-bruma disabled:opacity-30">
                    <ChevronLeft className="size-5" aria-hidden />
                </button>
                <p id={idTitulo} aria-live="polite" className="font-black">{nombreMes(visible.anio, visible.mes)}</p>
                <button type="button" onClick={() => cambiarMes(1)} disabled={mesSiguienteBloqueado} aria-label="Mes siguiente"
                    className="grid size-9 place-items-center rounded-full hover:bg-bruma disabled:opacity-30">
                    <ChevronRight className="size-5" aria-hidden />
                </button>
            </div>

            <div ref={grilla} role="grid" aria-labelledby={idTitulo} onKeyDown={alPresionar}>
                <div role="row" className="mb-1 grid grid-cols-7">
                    {DIAS_SEMANA.map(({ corto, largo }) => (
                        <span key={largo} role="columnheader" aria-label={largo} className="grid h-8 place-items-center text-xs font-extrabold text-gris-texto">{corto}</span>
                    ))}
                </div>
                {semanas.map((semana) => (
                    <div key={aTexto(semana[0]!)} role="row" className="grid grid-cols-7">
                        {semana.map((dia) => {
                            const texto = aTexto(dia);
                            const esOtroMes = dia.mes !== visible.mes;
                            const esElegido = texto === valor;
                            const esHoy = texto === aTexto(deHoy);
                            const bloqueado = fueraDeRango(dia);
                            const activo = texto === aTexto(enfocado);
                            return (
                                <span key={texto} role="gridcell" aria-selected={esElegido} className="grid place-items-center p-0.5">
                                    <button
                                        type="button"
                                        data-fecha={texto}
                                        tabIndex={activo ? 0 : -1}
                                        disabled={bloqueado}
                                        aria-label={`${fechaLarga(dia)}${esHoy ? ', hoy' : ''}`}
                                        aria-current={esHoy ? 'date' : undefined}
                                        onClick={() => alElegir(texto)}
                                        onFocus={() => { if (!activo) setEnfocado(dia); }}
                                        className={cn(
                                            'relative grid size-9 place-items-center rounded-full text-sm font-bold tabular-nums transition',
                                            esOtroMes ? 'text-gris-texto/60' : 'text-tinta',
                                            !esElegido && !bloqueado && 'hover:bg-bruma',
                                            esHoy && !esElegido && 'ring-2 ring-verde-300 ring-inset',
                                            esElegido && 'bg-verde-600 font-black text-white shadow-suave',
                                            bloqueado && 'cursor-not-allowed text-gris-borde line-through',
                                        )}
                                    >
                                        {dia.dia}
                                    </button>
                                </span>
                            );
                        })}
                    </div>
                ))}
            </div>
            {pie && <div className="mt-3 flex items-center justify-between gap-2 border-t border-gris-borde pt-3">{pie}</div>}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Selector de fecha
// ---------------------------------------------------------------------------

interface PropiedadesSelectorFecha extends PropiedadesAccesibles {
    valor: string;
    alCambiar: (fecha: string) => void;
    min?: string | undefined;
    max?: string | undefined;
    textoVacio?: string;
    // Permite dejar el campo vacío (filtros): muestra "Borrar".
    opcional?: boolean;
    disabled?: boolean;
    className?: string;
}

const BotonPie = ({ children, ...resto }: ButtonHTMLAttributes<HTMLButtonElement>) => (
    <button type="button" className="rounded-full px-3 py-1.5 text-sm font-extrabold text-verde-700 hover:bg-bruma disabled:opacity-40" {...resto}>{children}</button>
);

export const SelectorFecha = ({ valor, alCambiar, min, max, textoVacio = 'Elegí una fecha', opcional = false, disabled, className, ...accesibles }: PropiedadesSelectorFecha) => {
    const [abierto, setAbierto] = useState(false);
    const panel = useRef<HTMLDivElement>(null);
    const elegido = desdeTexto(valor);
    const textoHoy = aTexto(hoy());
    const hoyPermitido = !(min && textoHoy < min) && !(max && textoHoy > max);

    const elegir = (fecha: string) => {
        alCambiar(fecha);
        setAbierto(false);
    };

    return (
        <Popover.Root open={abierto} onOpenChange={setAbierto}>
            <div className={cn('relative', className)}>
                <Popover.Trigger asChild disabled={disabled}>
                    <button type="button" className={cn(CLASES_DISPARADOR, opcional && elegido && 'pr-10')} {...accesibles}>
                        <CalendarDays className="size-[1.1rem] shrink-0 text-verde-700" aria-hidden />
                        <span className={cn('flex-1 truncate', !elegido && 'text-gris-texto')}>{elegido ? fechaCorta(elegido) : textoVacio}</span>
                    </button>
                </Popover.Trigger>
                {opcional && elegido && !disabled && (
                    <button type="button" onClick={() => alCambiar('')} aria-label="Quitar la fecha"
                        className="absolute inset-y-0 right-1.5 my-auto grid size-8 place-items-center rounded-full text-gris-texto hover:bg-gris-superficie hover:text-tinta">
                        <X className="size-4" aria-hidden />
                    </button>
                )}
            </div>
            <Popover.Portal>
                <Popover.Content ref={panel} align="start" sideOffset={6} collisionPadding={12} className={CLASES_PANEL}
                    onOpenAutoFocus={(evento) => {
                        // Al abrir, el foco va al día elegido (o a hoy) y no al primer botón.
                        evento.preventDefault();
                        const destino = valor || textoHoy;
                        requestAnimationFrame(() => panel.current?.querySelector<HTMLButtonElement>(`[data-fecha="${destino}"]`)?.focus());
                    }}>
                    <Calendario valor={valor} alElegir={elegir} min={min} max={max}
                        pie={(
                            <>
                                <BotonPie onClick={() => elegir(textoHoy)} disabled={!hoyPermitido}>Hoy</BotonPie>
                                {opcional && <BotonPie onClick={() => elegir('')} disabled={!valor}>Borrar</BotonPie>}
                            </>
                        )} />
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};

// ---------------------------------------------------------------------------
// Selector de hora
// ---------------------------------------------------------------------------

interface PropiedadesSelectorHora extends PropiedadesAccesibles {
    valor: string; // "HH:MM"
    alCambiar: (hora: string) => void;
    // Hora máxima permitida (por ejemplo, "ahora" si la fecha elegida es hoy).
    max?: string | undefined;
    pasoMinutos?: number;
    disabled?: boolean;
    className?: string;
}

const Columna = ({ etiqueta, opciones, elegida, deshabilitada, alElegir }: {
    etiqueta: string;
    opciones: number[];
    elegida: number | null;
    deshabilitada: (valor: number) => boolean;
    alElegir: (valor: number) => void;
}) => {
    const lista = useRef<HTMLDivElement>(null);

    // Al abrir, la opción elegida queda centrada en la columna.
    useEffect(() => {
        const opcion = lista.current?.querySelector<HTMLElement>('[aria-selected="true"]');
        if (opcion && lista.current) lista.current.scrollTop = opcion.offsetTop - lista.current.clientHeight / 2 + opcion.clientHeight / 2;
    }, []);

    const alPresionar = (evento: KeyboardEvent<HTMLDivElement>) => {
        const habilitadas = opciones.filter((valor) => !deshabilitada(valor));
        const indice = habilitadas.indexOf(elegida ?? -1);
        const siguiente = { ArrowDown: indice + 1, ArrowUp: indice - 1, Home: 0, End: habilitadas.length - 1 }[evento.key];
        if (siguiente === undefined) return;
        evento.preventDefault();
        const valor = habilitadas[Math.max(0, Math.min(habilitadas.length - 1, siguiente))];
        if (valor === undefined) return;
        alElegir(valor);
        requestAnimationFrame(() => lista.current?.querySelector<HTMLElement>(`[data-valor="${valor}"]`)?.scrollIntoView({ block: 'nearest' }));
    };

    return (
        <div className="flex flex-col">
            <p className="mb-1 text-center text-xs font-extrabold tracking-wide text-gris-texto uppercase">{etiqueta}</p>
            <div ref={lista} role="listbox" aria-label={etiqueta} tabIndex={0} onKeyDown={alPresionar}
                className="h-56 w-20 overflow-y-auto overscroll-contain rounded-2xl bg-gris-superficie/60 p-1 focus:outline-none focus-visible:ring-3 focus-visible:ring-verde-100">
                {opciones.map((valor) => {
                    const esElegida = valor === elegida;
                    const bloqueada = deshabilitada(valor);
                    return (
                        <div key={valor} role="option" data-valor={valor} aria-selected={esElegida} aria-disabled={bloqueada}
                            onClick={() => !bloqueada && alElegir(valor)}
                            className={cn(
                                'my-0.5 cursor-pointer rounded-xl py-2 text-center text-base font-bold tabular-nums transition',
                                esElegida ? 'bg-verde-600 font-black text-white shadow-suave' : 'hover:bg-white',
                                bloqueada && 'cursor-not-allowed text-gris-borde hover:bg-transparent',
                            )}>
                            {dosDigitos(valor)}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export const SelectorHora = ({ valor, alCambiar, max, pasoMinutos = 5, disabled, className, ...accesibles }: PropiedadesSelectorHora) => {
    const [abierto, setAbierto] = useState(false);
    const [hora, minuto] = /^\d{2}:\d{2}$/.test(valor) ? valor.split(':').map(Number) as [number, number] : [null, null];
    const [horaMax, minutoMax] = max ? max.split(':').map(Number) as [number, number] : [24, 0];

    const horas = Array.from({ length: 24 }, (_, indice) => indice);
    // Minutos en saltos (más fácil en el celular), sin perder el minuto exacto que ya tenga el valor.
    const minutos = [...new Set([...Array.from({ length: 60 / pasoMinutos }, (_, indice) => indice * pasoMinutos), ...(minuto !== null ? [minuto] : [])])].sort((a, b) => a - b);

    const armar = (h: number, m: number) => {
        // Si la hora elegida es la máxima, los minutos no pueden pasarse del máximo.
        const minutoFinal = h === horaMax && m > minutoMax ? minutoMax : m;
        alCambiar(`${dosDigitos(h)}:${dosDigitos(minutoFinal)}`);
    };

    return (
        <Popover.Root open={abierto} onOpenChange={setAbierto}>
            <Popover.Trigger asChild disabled={disabled}>
                <button type="button" className={cn(CLASES_DISPARADOR, className)} {...accesibles}>
                    <Clock className="size-[1.1rem] shrink-0 text-verde-700" aria-hidden />
                    <span className={cn('flex-1 tabular-nums', hora === null && 'text-gris-texto')}>{hora !== null ? `${dosDigitos(hora)}:${dosDigitos(minuto ?? 0)} h` : 'Elegí la hora'}</span>
                </button>
            </Popover.Trigger>
            <Popover.Portal>
                <Popover.Content align="start" sideOffset={6} collisionPadding={12} className={CLASES_PANEL}>
                    <div className="flex gap-3">
                        <Columna etiqueta="Hora" opciones={horas} elegida={hora} deshabilitada={(h) => h > horaMax} alElegir={(h) => armar(h, minuto ?? 0)} />
                        <Columna etiqueta="Minutos" opciones={minutos} elegida={minuto}
                            deshabilitada={(m) => (hora ?? 0) === horaMax && m > minutoMax} alElegir={(m) => armar(hora ?? 0, m)} />
                    </div>
                    <div className="mt-3 flex justify-between gap-2 border-t border-gris-borde pt-3">
                        <BotonPie onClick={() => { const ahora = new Date(); armar(ahora.getHours(), ahora.getMinutes()); setAbierto(false); }}>Ahora</BotonPie>
                        <BotonPie onClick={() => setAbierto(false)}>Listo</BotonPie>
                    </div>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};

// ---------------------------------------------------------------------------
// Selector de fecha y hora
// ---------------------------------------------------------------------------

interface PropiedadesSelectorFechaHora extends PropiedadesAccesibles {
    valor: string; // "AAAA-MM-DDTHH:MM", hora local
    alCambiar: (valor: string) => void;
    max?: string | undefined; // mismo formato
    className?: string;
}

export const SelectorFechaHora = ({ valor, alCambiar, max, className, id, ...accesibles }: PropiedadesSelectorFechaHora) => {
    const { fecha, hora } = partirFechaHora(valor);
    const limite = max ? partirFechaHora(max) : null;
    const horaMaxima = limite && fecha === limite.fecha ? limite.hora : undefined;

    const cambiarFecha = (nuevaFecha: string) => {
        // Si al cambiar de día la hora queda en el futuro, se lleva al máximo permitido.
        const nuevaHora = limite && nuevaFecha === limite.fecha && hora > limite.hora ? limite.hora : hora;
        alCambiar(`${nuevaFecha}T${nuevaHora || '00:00'}`);
    };

    return (
        <div className={cn('grid grid-cols-[1fr_8.5rem] gap-2', className)} role="group">
            <SelectorFecha {...(id ? { id } : {})} {...accesibles} valor={fecha} alCambiar={cambiarFecha} max={limite?.fecha} />
            <SelectorHora {...accesibles} aria-label="Hora" valor={hora} max={horaMaxima} alCambiar={(nuevaHora) => alCambiar(`${fecha}T${nuevaHora}`)} />
        </div>
    );
};
