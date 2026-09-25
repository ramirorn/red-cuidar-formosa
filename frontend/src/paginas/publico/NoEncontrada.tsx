import { ArrowLeft } from 'lucide-react';
import { BotonEnlace } from '@/componentes/ui/Boton';
import { Manuscrita } from '@/componentes/ui/Tipografia';

export default function NoEncontrada() {
    return (
        <main className="grid min-h-dvh place-items-center bg-crema px-6 text-center">
            <div>
                <p className="text-7xl font-black text-verde-600">404</p>
                <Manuscrita className="mt-2 block text-3xl text-rojo-500">Esta página se fue volando</Manuscrita>
                <BotonEnlace to="/" className="mt-8" icono={<ArrowLeft className="size-4" aria-hidden />}>Volver al inicio</BotonEnlace>
            </div>
        </main>
    );
}
