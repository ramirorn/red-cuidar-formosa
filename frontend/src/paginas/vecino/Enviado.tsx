import { useSearchParams } from 'react-router';
import { CircleAlert, CloudOff, House, ListChecks, PartyPopper } from 'lucide-react';
import { BotonEnlace } from '@/componentes/ui/Boton';
import { Manuscrita } from '@/componentes/ui/Tipografia';
import { Mancha } from '@/componentes/ilustraciones/Garabatos';

const MENSAJES = {
    enviado: {
        Icono: PartyPopper,
        titulo: '¡Gracias! Recibimos tu reporte',
        texto: 'El equipo de salud lo va a revisar. Mientras tanto, tu manzana queda en amarillo ("revisar").',
        color: 'text-verde-600',
    },
    'en-cola': {
        Icono: CloudOff,
        titulo: 'Guardado en tu celular',
        texto: 'No hay señal ahora. Lo enviamos solos cuando vuelva la conexión; no hace falta que hagas nada.',
        color: 'text-gris-texto',
    },
    error: {
        Icono: CircleAlert,
        titulo: 'No pudimos enviarlo',
        texto: 'El reporte tiene un problema (por ejemplo, una foto repetida). Revisalo en "Mis reportes".',
        color: 'text-rojo-600',
    },
} as const;

export default function Enviado() {
    const [parametros] = useSearchParams();
    const estado = (parametros.get('estado') ?? 'enviado') as keyof typeof MENSAJES;
    const { Icono, titulo, texto, color } = MENSAJES[estado] ?? MENSAJES.enviado;
    const esLimpieza = parametros.get('tipo') === 'LIMPIEZA';

    return (
        <div className="relative overflow-hidden px-6 py-14 text-center">
            <Mancha className="absolute -top-16 left-1/2 w-96 -translate-x-1/2 text-verde-50" />
            <div className="relative">
                <span className="mx-auto grid size-24 place-items-center rounded-full bg-white shadow-elevada">
                    <Icono className={`size-12 ${color}`} aria-hidden />
                </span>
                <h1 className="mt-6 text-2xl font-black">{titulo}</h1>
                <p className="mx-auto mt-3 max-w-sm leading-relaxed text-tinta-suave">{texto}</p>
                {estado === 'enviado' && (
                    <Manuscrita className="mt-4 block text-2xl text-verde-600">
                        {esLimpieza ? '¡Cuando lo confirmen, tu manzana se pinta de verde!' : '¡Cada patio cuenta!'}
                    </Manuscrita>
                )}
                <div className="mx-auto mt-8 flex max-w-xs flex-col gap-3">
                    <BotonEnlace to="/app/reportes" icono={<ListChecks className="size-4" aria-hidden />}>Ver mis reportes</BotonEnlace>
                    <BotonEnlace to="/app" variante="contorno" icono={<House className="size-4" aria-hidden />}>Volver al inicio</BotonEnlace>
                </div>
            </div>
        </div>
    );
}
