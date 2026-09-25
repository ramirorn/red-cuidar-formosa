import { Phone } from 'lucide-react';
import { cn } from '@/lib/utils';

// Enlace de llamada al 107 (emergencias médicas). En el celular abre el marcador; en la computadora,
// la app de llamadas que tenga configurada (Enlace Móvil de Windows, FaceTime, Skype, etc.).
export const ENLACE_107 = 'tel:107';

export const BotonLlamar107 = ({ compacto = false, className }: { compacto?: boolean; className?: string }) => (
    <a href={ENLACE_107} title="Llamar al 107 (emergencias médicas)"
        className={cn(
            'inline-flex items-center justify-center gap-2 font-extrabold text-white transition active:scale-[0.98]',
            compacto ? 'h-10 rounded-full bg-rojo-500 px-3.5 text-sm hover:bg-rojo-600' : 'w-full rounded-2xl bg-rojo-500 px-4 py-3.5 shadow-suave hover:bg-rojo-600',
            className,
        )}>
        <Phone className={compacto ? 'size-4' : 'size-5'} aria-hidden />
        {compacto ? '107' : 'Llamar al 107'}
    </a>
);
