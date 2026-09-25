import { ArrowLeft, Hammer } from 'lucide-react';
import { BotonEnlace } from '@/componentes/ui/Boton';
import { Manuscrita } from '@/componentes/ui/Tipografia';

// Provisoria: se reemplaza en las próximas entregas (PWA del vecino y panel institucional).
export default function EnConstruccion({ titulo }: { titulo: string }) {
    return (
        <main className="grid min-h-dvh place-items-center bg-crema px-6 text-center">
            <div>
                <Hammer className="mx-auto size-12 text-verde-600" aria-hidden />
                <h1 className="mt-4 text-3xl font-black">{titulo}</h1>
                <Manuscrita className="mt-2 block text-3xl text-rojo-500">¡Muy pronto!</Manuscrita>
                <BotonEnlace to="/" variante="contorno" className="mt-8" icono={<ArrowLeft className="size-4" aria-hidden />}>
                    Volver al inicio
                </BotonEnlace>
            </div>
        </main>
    );
}
