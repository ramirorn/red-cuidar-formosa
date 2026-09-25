import { useEffect, useRef, useState, type PointerEvent } from 'react';
import * as Radix from '@radix-ui/react-dialog';
import { Check, Crop, ShieldCheck, X } from 'lucide-react';
import { Boton } from '@/componentes/ui/Boton';
import { tamanoMinimo } from '@/lib/recorte';
import type { CajaDelimitadora, Deteccion } from '@/tipos';

interface Propiedades {
    abierto: boolean;
    alCerrar: () => void;
    alGuardar: (recorte: CajaDelimitadora) => void;
    url: string;
    ancho: number;
    alto: number;
    detecciones: Deteccion[];
    recorte: CajaDelimitadora | null;
}

type Arrastre = { modo: 'dibujar'; x: number; y: number } | { modo: 'mover'; dx: number; dy: number } | null;

const acotar = (valor: number, minimo = 0, maximo = 1) => Math.min(maximo, Math.max(minimo, valor));

// El vecino marca con el dedo dónde está el recipiente: solo ese pedazo sale del celular.
// Tocar fuera del recuadro dibuja uno nuevo; tocar dentro lo mueve.
export const EditorRecorte = ({ abierto, alCerrar, alGuardar, url, ancho, alto, detecciones, recorte }: Propiedades) => {
    const lienzo = useRef<HTMLDivElement>(null);
    const [caja, setCaja] = useState<CajaDelimitadora | null>(recorte);
    const [arrastre, setArrastre] = useState<Arrastre>(null);
    const minimo = tamanoMinimo(ancho, alto);

    useEffect(() => { if (abierto) setCaja(recorte); }, [abierto, recorte]);

    const punto = (evento: PointerEvent) => {
        const rect = lienzo.current!.getBoundingClientRect();
        return { x: acotar((evento.clientX - rect.left) / rect.width), y: acotar((evento.clientY - rect.top) / rect.height) };
    };

    const alPresionar = (evento: PointerEvent<HTMLDivElement>) => {
        evento.currentTarget.setPointerCapture(evento.pointerId);
        const { x, y } = punto(evento);
        const dentro = caja && x >= caja.x && x <= caja.x + caja.ancho && y >= caja.y && y <= caja.y + caja.alto;
        if (dentro && caja) setArrastre({ modo: 'mover', dx: x - caja.x, dy: y - caja.y });
        else {
            setArrastre({ modo: 'dibujar', x, y });
            setCaja({ x, y, ancho: 0, alto: 0 });
        }
    };

    const alMover = (evento: PointerEvent<HTMLDivElement>) => {
        if (!arrastre) return;
        const { x, y } = punto(evento);
        if (arrastre.modo === 'dibujar') {
            setCaja({ x: Math.min(x, arrastre.x), y: Math.min(y, arrastre.y), ancho: Math.abs(x - arrastre.x), alto: Math.abs(y - arrastre.y) });
        } else if (caja) {
            setCaja({ ...caja, x: acotar(x - arrastre.dx, 0, 1 - caja.ancho), y: acotar(y - arrastre.dy, 0, 1 - caja.alto) });
        }
    };

    // Un recuadro demasiado chico se agranda alrededor de su centro hasta el mínimo que acepta el servidor.
    const alSoltar = () => {
        setArrastre(null);
        setCaja((actual) => {
            if (!actual) return actual;
            const nuevoAncho = Math.max(actual.ancho, minimo.ancho);
            const nuevoAlto = Math.max(actual.alto, minimo.alto);
            const centroX = actual.x + actual.ancho / 2;
            const centroY = actual.y + actual.alto / 2;
            return {
                x: acotar(centroX - nuevoAncho / 2, 0, 1 - nuevoAncho),
                y: acotar(centroY - nuevoAlto / 2, 0, 1 - nuevoAlto),
                ancho: nuevoAncho,
                alto: nuevoAlto,
            };
        });
    };

    const relacion = ancho / alto;

    return (
        <Radix.Root open={abierto} onOpenChange={(valor) => !valor && alCerrar()}>
            <Radix.Portal>
                <Radix.Overlay className="fixed inset-0 z-[1000] bg-tinta" />
                <Radix.Content className="fixed inset-0 z-[1001] flex flex-col bg-tinta text-white outline-none" aria-describedby={undefined}>
                    <div className="flex items-center justify-between gap-3 p-4 pt-[max(1rem,env(safe-area-inset-top))]">
                        <Radix.Title className="flex items-center gap-2 text-lg font-black"><Crop className="size-5" aria-hidden />Marcá el recipiente</Radix.Title>
                        <Radix.Close aria-label="Cancelar" className="grid size-11 place-items-center rounded-full bg-white/10"><X aria-hidden /></Radix.Close>
                    </div>
                    <p className="px-4 text-sm text-white/80">Arrastrá el dedo sobre el recipiente. Solo esa parte de la foto se envía; el resto del patio queda en tu celular.</p>

                    <div className="flex flex-1 items-center justify-center overflow-hidden p-4">
                        <div
                            ref={lienzo}
                            className="relative touch-none overflow-hidden rounded-xl select-none"
                            style={{ aspectRatio: `${ancho} / ${alto}`, width: `min(100%, calc(62dvh * ${relacion}))` }}
                            onPointerDown={alPresionar}
                            onPointerMove={alMover}
                            onPointerUp={alSoltar}
                            onPointerCancel={alSoltar}
                            role="application"
                            aria-label="Foto: arrastrá para marcar el recipiente"
                        >
                            <img src={url} alt="" className="pointer-events-none size-full object-cover" draggable={false} />
                            <svg className="pointer-events-none absolute inset-0 size-full" viewBox="0 0 1 1" preserveAspectRatio="none" aria-hidden>
                                {detecciones.map((deteccion, indice) => (
                                    <rect key={indice} x={deteccion.cajaDelimitadora.x} y={deteccion.cajaDelimitadora.y} width={deteccion.cajaDelimitadora.ancho} height={deteccion.cajaDelimitadora.alto}
                                        fill="none" stroke="#e11b22" strokeWidth={2} strokeDasharray="4 3" vectorEffect="non-scaling-stroke" />
                                ))}
                            </svg>
                            {caja && caja.ancho > 0 && (
                                <div className="pointer-events-none absolute rounded-lg border-2 border-white shadow-[0_0_0_9999px_rgb(0_0_0/0.6)]"
                                    style={{ left: `${caja.x * 100}%`, top: `${caja.y * 100}%`, width: `${caja.ancho * 100}%`, height: `${caja.alto * 100}%` }}>
                                    {(['-top-1.5 -left-1.5', '-top-1.5 -right-1.5', '-bottom-1.5 -left-1.5', '-bottom-1.5 -right-1.5'] as const).map((posicion) => (
                                        <span key={posicion} className={`absolute size-3 rounded-full bg-white ${posicion}`} />
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-3 p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                        <p className="flex items-center justify-center gap-2 text-xs text-white/70"><ShieldCheck className="size-4" aria-hidden />Lo que queda oscuro no se envía.</p>
                        <Boton tamano="grande" anchoCompleto disabled={!caja || caja.ancho === 0} onClick={() => caja && alGuardar(caja)} icono={<Check className="size-5" aria-hidden />}>
                            Usar este recorte
                        </Boton>
                    </div>
                </Radix.Content>
            </Radix.Portal>
        </Radix.Root>
    );
};
