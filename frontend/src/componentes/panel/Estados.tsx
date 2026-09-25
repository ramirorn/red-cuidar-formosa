import type { ReactNode } from 'react';
import { CircleAlert, Inbox, LoaderCircle, RotateCw } from 'lucide-react';
import { Boton } from '@/componentes/ui/Boton';
import { errorAmigable } from '@/lib/errores';
import { cn } from '@/lib/utils';

export const EstadoVacio = ({ titulo, descripcion, icono, accion, className }: { titulo: string; descripcion?: ReactNode; icono?: ReactNode; accion?: ReactNode; className?: string }) => (
    <div className={cn('flex flex-col items-center rounded-tarjeta border border-dashed border-gris-borde bg-white px-6 py-12 text-center', className)}>
        <span className="grid size-14 place-items-center rounded-full bg-bruma text-verde-700">{icono ?? <Inbox className="size-6" aria-hidden />}</span>
        <p className="mt-4 font-black">{titulo}</p>
        {descripcion && <p className="mt-1 max-w-sm text-sm text-tinta-suave">{descripcion}</p>}
        {accion && <div className="mt-5">{accion}</div>}
    </div>
);

export const ErrorCarga = ({ error, porDefecto = 'No pudimos cargar la información.', alReintentar, className }: { error: unknown; porDefecto?: string; alReintentar?: () => void; className?: string }) => (
    <div role="alert" className={cn('flex flex-wrap items-center gap-3 rounded-tarjeta border border-rojo-200 bg-rojo-50 p-4 text-sm text-rojo-700', className)}>
        <CircleAlert className="size-5 shrink-0" aria-hidden />
        <p className="flex-1 font-bold">{errorAmigable(error, porDefecto)}</p>
        {alReintentar && (
            <Boton variante="contorno" tamano="chico" onClick={alReintentar} icono={<RotateCw className="size-4" aria-hidden />}>Reintentar</Boton>
        )}
    </div>
);

export const Cargando = ({ texto = 'Cargando…', className }: { texto?: string; className?: string }) => (
    <div role="status" className={cn('flex items-center justify-center gap-2 py-12 text-sm font-bold text-gris-texto', className)}>
        <LoaderCircle className="size-5 animate-spin" aria-hidden />{texto}
    </div>
);

// Filas grises mientras llega una tabla, para que la página no salte al cargar.
export const EsqueletoFilas = ({ filas = 6 }: { filas?: number }) => (
    <div role="status" aria-label="Cargando" className="divide-y divide-gris-borde">
        {Array.from({ length: filas }, (_, indice) => (
            <div key={indice} className="flex items-center gap-4 px-5 py-4">
                <span className="h-4 w-24 animate-pulse rounded-full bg-gris-superficie" />
                <span className="h-4 flex-1 animate-pulse rounded-full bg-gris-superficie" />
                <span className="h-6 w-20 animate-pulse rounded-full bg-gris-superficie" />
            </div>
        ))}
    </div>
);

export const CargarMas = ({ hayMas, cargando, alCargar }: { hayMas: boolean; cargando: boolean; alCargar: () => void }) => (
    hayMas ? (
        <div className="flex justify-center p-4">
            <Boton variante="contorno" tamano="chico" onClick={alCargar} disabled={cargando}
                icono={cargando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : undefined}>
                {cargando ? 'Cargando…' : 'Cargar más'}
            </Boton>
        </div>
    ) : null
);
