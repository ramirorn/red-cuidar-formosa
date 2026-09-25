import type { ReactNode } from 'react';
import { BotonVolver } from '@/componentes/ui/BotonVolver';
import { Rotulo } from '@/componentes/ui/Tipografia';
import { cn } from '@/lib/utils';

interface Propiedades {
    rotulo?: string;
    titulo: ReactNode;
    descripcion?: ReactNode;
    acciones?: ReactNode;
    volverA?: string;
    className?: string;
}

// Encabezado de cada pantalla del panel: título, contexto breve y acciones principales a la derecha.
export const EncabezadoPagina = ({ rotulo, titulo, descripcion, acciones, volverA, className }: Propiedades) => (
    <header className={cn('flex flex-wrap items-end justify-between gap-4', className)}>
        <div className="min-w-0">
            {/* Vuelve a la pantalla anterior (con sus filtros); si se entró por enlace, a "volverA". */}
            {volverA && <BotonVolver respaldo={volverA} className="mb-2 -ml-1" />}
            {rotulo && <Rotulo className="mb-1.5">{rotulo}</Rotulo>}
            <h1 className="text-2xl leading-tight font-black tracking-tight sm:text-3xl">{titulo}</h1>
            {descripcion && <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-tinta-suave">{descripcion}</p>}
        </div>
        {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </header>
);
