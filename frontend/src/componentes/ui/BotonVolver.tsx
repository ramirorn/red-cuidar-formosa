import { useNavigate } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import { useVolver } from '@/hooks/useVolver';
import { cn } from '@/lib/utils';

interface Propiedades {
    respaldo: string;
    texto?: string;
    // "directo": siempre va al respaldo (por ejemplo, después de enviar un formulario no se vuelve a él).
    directo?: boolean;
    className?: string;
}

export const BotonVolver = ({ respaldo, texto = 'Volver', directo = false, className }: Propiedades) => {
    const volver = useVolver(respaldo);
    const navegar = useNavigate();
    return (
        <a
            href={respaldo}
            onClick={(evento) => {
                // Clic con modificadores (nueva pestaña) queda como enlace normal.
                if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.button !== 0) return;
                evento.preventDefault();
                if (directo) navegar(respaldo); else volver();
            }}
            className={cn('inline-flex items-center gap-1.5 rounded-full py-1.5 pr-3 text-sm font-extrabold text-verde-700 hover:underline', className)}
        >
            <ArrowLeft className="size-4" aria-hidden />{texto}
        </a>
    );
};
