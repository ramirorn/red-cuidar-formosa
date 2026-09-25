import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

const CLASES_CONTROL = cn(
    'w-full rounded-xl border border-gris-borde bg-white px-3.5 text-sm text-tinta',
    'transition placeholder:text-gris-texto focus:border-verde-500 focus:outline-none focus:ring-3 focus:ring-verde-100',
    'disabled:bg-gris-superficie disabled:text-gris-texto aria-invalid:border-rojo-500 aria-invalid:ring-rojo-100',
);

interface PropiedadesCampo {
    etiqueta: ReactNode;
    ayuda?: ReactNode;
    error?: string | undefined;
    className?: string;
    children: (props: { id: string; 'aria-invalid'?: boolean; 'aria-describedby'?: string }) => ReactNode;
}

// Etiqueta + control + ayuda/error, con los atributos de accesibilidad conectados.
export const Campo = ({ etiqueta, ayuda, error, className, children }: PropiedadesCampo) => {
    const id = useId();
    const idDescripcion = `${id}-descripcion`;
    return (
        <div className={cn('space-y-1.5', className)}>
            <label htmlFor={id} className="block text-sm font-extrabold text-tinta">{etiqueta}</label>
            {children({ id, ...(error ? { 'aria-invalid': true } : {}), ...(error || ayuda ? { 'aria-describedby': idDescripcion } : {}) })}
            {(error || ayuda) && (
                <p id={idDescripcion} className={cn('text-xs', error ? 'font-bold text-rojo-600' : 'text-gris-texto')} role={error ? 'alert' : undefined}>
                    {error ?? ayuda}
                </p>
            )}
        </div>
    );
};

export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(({ className, ...resto }, ref) => (
    <input ref={ref} className={cn(CLASES_CONTROL, 'h-11', className)} {...resto} />
));
Entrada.displayName = 'Entrada';

export const AreaTexto = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(({ className, ...resto }, ref) => (
    <textarea ref={ref} className={cn(CLASES_CONTROL, 'min-h-24 py-3 leading-relaxed', className)} {...resto} />
));
AreaTexto.displayName = 'AreaTexto';

// Filtro compacto para barras de filtros (etiqueta visible pequeña encima).
export const Filtro = ({ etiqueta, children, className }: { etiqueta: string; children: (id: string) => ReactNode; className?: string }) => {
    const id = useId();
    return (
        <div className={cn('flex min-w-36 flex-col gap-1', className)}>
            <label htmlFor={id} className="text-xs font-extrabold tracking-wide text-gris-texto uppercase">{etiqueta}</label>
            {children(id)}
        </div>
    );
};
