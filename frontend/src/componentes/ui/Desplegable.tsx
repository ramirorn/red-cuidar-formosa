import type { ReactNode } from 'react';
import * as Radix from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';

// Desplegable propio (sobre Radix Select): mismo aspecto en todos los navegadores, búsqueda por
// tipeo, teclado completo y lector de pantalla. Reemplaza al <select> nativo en toda la app.

export interface OpcionDesplegable {
    valor: string;
    etiqueta: string;
    descripcion?: string;
    icono?: ReactNode;
}

interface Propiedades {
    valor: string;
    alCambiar: (valor: string) => void;
    opciones: OpcionDesplegable[];
    textoVacio?: string;
    id?: string;
    disabled?: boolean;
    className?: string;
    tamano?: 'medio' | 'grande';
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
    'aria-label'?: string;
}

// Radix reserva "" para "sin valor": las opciones vacías ("Todos") usan este marcador internamente.
const VACIO = '__vacio__';
const aInterno = (valor: string) => (valor === '' ? VACIO : valor);
const aExterno = (valor: string) => (valor === VACIO ? '' : valor);

export const Desplegable = ({ valor, alCambiar, opciones, textoVacio = 'Elegí una opción', id, disabled, className, tamano = 'medio', ...accesibles }: Propiedades) => {
    const hayOpcionVacia = opciones.some((opcion) => opcion.valor === '');
    const elegida = opciones.find((opcion) => opcion.valor === valor);
    // Si el valor es "" y no hay opción vacía, se muestra el texto de ayuda (campo sin completar).
    const valorInterno = valor === '' && !hayOpcionVacia ? '' : aInterno(valor);

    return (
        <Radix.Root value={valorInterno} onValueChange={(nuevo) => alCambiar(aExterno(nuevo))} disabled={disabled}>
            <Radix.Trigger
                id={id}
                {...accesibles}
                className={cn(
                    'group flex w-full items-center justify-between gap-2 rounded-xl border border-gris-borde bg-white px-3.5 text-left text-sm text-tinta',
                    tamano === 'grande' ? 'h-12 text-base' : 'h-11',
                    'transition hover:border-verde-300 focus:border-verde-500 focus:outline-none focus-visible:ring-3 focus-visible:ring-verde-100',
                    'data-[state=open]:border-verde-500 data-[state=open]:ring-3 data-[state=open]:ring-verde-100',
                    'disabled:cursor-not-allowed disabled:bg-gris-superficie disabled:text-gris-texto disabled:hover:border-gris-borde',
                    'aria-invalid:border-rojo-500 data-[placeholder]:text-gris-texto',
                    className,
                )}
            >
                <span className="flex min-w-0 items-center gap-2 truncate">
                    {elegida?.icono}
                    <Radix.Value placeholder={textoVacio}>{elegida?.etiqueta}</Radix.Value>
                </span>
                <Radix.Icon asChild>
                    <ChevronDown className="size-4 shrink-0 text-gris-texto transition group-data-[state=open]:rotate-180" aria-hidden />
                </Radix.Icon>
            </Radix.Trigger>

            <Radix.Portal>
                <Radix.Content
                    position="popper"
                    sideOffset={6}
                    collisionPadding={12}
                    className={cn(
                        'z-[1100] max-h-[min(22rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden',
                        'rounded-2xl border border-gris-borde bg-white shadow-elevada data-[state=open]:animate-aparecer',
                    )}
                >
                    <Radix.ScrollUpButton className="flex h-7 items-center justify-center text-gris-texto"><ChevronUp className="size-4" aria-hidden /></Radix.ScrollUpButton>
                    <Radix.Viewport className="p-1.5">
                        {opciones.map((opcion) => (
                            <Radix.Item
                                key={opcion.valor || VACIO}
                                value={aInterno(opcion.valor)}
                                className={cn(
                                    'relative flex cursor-pointer items-center gap-2.5 rounded-xl py-2.5 pr-9 pl-3 text-sm font-bold text-tinta outline-none select-none',
                                    'data-[highlighted]:bg-bruma data-[state=checked]:text-verde-800 data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40',
                                )}
                            >
                                {opcion.icono}
                                <span className="min-w-0">
                                    <Radix.ItemText>{opcion.etiqueta}</Radix.ItemText>
                                    {opcion.descripcion && <span className="block text-xs font-semibold text-gris-texto">{opcion.descripcion}</span>}
                                </span>
                                <Radix.ItemIndicator className="absolute right-3">
                                    <Check className="size-4 text-verde-700" strokeWidth={3} aria-hidden />
                                </Radix.ItemIndicator>
                            </Radix.Item>
                        ))}
                    </Radix.Viewport>
                    <Radix.ScrollDownButton className="flex h-7 items-center justify-center text-gris-texto"><ChevronDown className="size-4" aria-hidden /></Radix.ScrollDownButton>
                </Radix.Content>
            </Radix.Portal>
        </Radix.Root>
    );
};
