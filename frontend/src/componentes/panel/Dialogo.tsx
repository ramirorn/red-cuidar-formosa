import type { ReactNode } from 'react';
import * as Radix from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Propiedades {
    abierto: boolean;
    alCambiar: (abierto: boolean) => void;
    titulo: ReactNode;
    descripcion?: ReactNode;
    children: ReactNode;
    className?: string;
}

// Diálogo accesible (foco atrapado, Escape, aria) sobre Radix. En celular se abre como hoja inferior.
export const Dialogo = ({ abierto, alCambiar, titulo, descripcion, children, className }: Propiedades) => (
    <Radix.Root open={abierto} onOpenChange={alCambiar}>
        <Radix.Portal>
            <Radix.Overlay className="fixed inset-0 z-[1000] bg-tinta/45 backdrop-blur-[2px] data-[state=open]:animate-aparecer" />
            <Radix.Content
                className={cn(
                    'fixed inset-x-0 bottom-0 z-[1001] max-h-[92dvh] overflow-y-auto rounded-t-panel bg-white p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] shadow-elevada',
                    'sm:inset-x-auto sm:top-1/2 sm:bottom-auto sm:left-1/2 sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-panel',
                    className,
                )}
                {...(descripcion ? {} : { 'aria-describedby': undefined })}
            >
                <div className="mb-5 flex items-start justify-between gap-4">
                    <div>
                        <Radix.Title className="text-xl font-black">{titulo}</Radix.Title>
                        {descripcion && <Radix.Description className="mt-1 text-sm text-tinta-suave">{descripcion}</Radix.Description>}
                    </div>
                    <Radix.Close aria-label="Cerrar" className="grid size-9 shrink-0 place-items-center rounded-full hover:bg-gris-superficie">
                        <X className="size-5" aria-hidden />
                    </Radix.Close>
                </div>
                {children}
            </Radix.Content>
        </Radix.Portal>
    </Radix.Root>
);
