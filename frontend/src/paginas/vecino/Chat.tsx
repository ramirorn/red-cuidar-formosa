import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Phone, SendHorizontal, Trash2, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useChat } from '@/hooks/useChat';
import { useEnLinea } from '@/hooks/useEnLinea';
import type { NivelTriaje } from '@/tipos';

const LARGO_MAXIMO = 1000;
const SUGERENCIAS = ['Tengo fiebre y me duele el cuerpo', '¿Cómo limpio un tanque de agua?', '¿Qué es el BTI?', '¿Dónde pone huevos el mosquito?'];

const TRIAJE: Record<NivelTriaje, { texto: string; clases: string }> = {
    SIN_RIESGO: { texto: 'Sin riesgo', clases: 'bg-gris-superficie text-gris-texto' },
    LEVE: { texto: 'Leve', clases: 'bg-verde-50 text-verde-700' },
    MODERADO: { texto: 'Moderado · consultá en tu centro de salud', clases: 'bg-amber-50 text-amber-800' },
    URGENTE: { texto: 'Urgente', clases: 'bg-rojo-500 text-white' },
};

export default function Chat() {
    const { mensajes, enviar, escribiendo, error, borrarConversacion } = useChat();
    const enLinea = useEnLinea();
    const [texto, setTexto] = useState('');
    const lista = useRef<HTMLDivElement>(null);

    // Se desplaza solo la lista de mensajes (no toda la página) hasta el último.
    useEffect(() => {
        lista.current?.scrollTo({ top: lista.current.scrollHeight, behavior: 'smooth' });
    }, [mensajes.length, escribiendo]);

    const mandar = (contenido: string) => {
        const limpio = contenido.trim();
        if (!limpio || escribiendo) return;
        enviar(limpio);
        setTexto('');
    };

    const alEnviar = (evento: FormEvent) => {
        evento.preventDefault();
        mandar(texto);
    };

    return (
        <div className="flex h-[calc(100dvh-8.5rem)] flex-col">
            <div className="flex items-center gap-3 border-b border-gris-borde bg-white px-4 py-3">
                <img src="/marca/icono-192.png" alt="" width="44" height="44" className="size-11 rounded-2xl border border-gris-borde" />
                <div className="flex-1">
                    <h1 className="font-black">IA Mosquito</h1>
                    <p className="text-xs text-gris-texto">Te oriento sobre dengue y criaderos</p>
                </div>
                {mensajes.length > 0 && (
                    <button type="button" onClick={borrarConversacion} aria-label="Borrar la conversación" className="grid size-10 place-items-center rounded-full text-gris-texto hover:bg-gris-superficie">
                        <Trash2 className="size-4" aria-hidden />
                    </button>
                )}
            </div>

            <p className="flex items-center gap-2 bg-gris-superficie px-4 py-2 text-xs font-bold text-tinta-suave">
                <TriangleAlert className="size-4 shrink-0 text-amber-600" aria-hidden />
                <span>No reemplaza la consulta médica. Ante una urgencia, llamá al <a href="tel:107" className="text-rojo-600 underline">107</a>.</span>
            </p>

            <div ref={lista} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
                {mensajes.length === 0 && (
                    <div className="py-6 text-center">
                        <p className="font-manuscrita text-3xl font-bold text-verde-600">¡Hola! ¿En qué te ayudo?</p>
                        <p className="mt-2 text-sm text-tinta-suave">La conversación se guarda solo en tu celular.</p>
                    </div>
                )}

                {mensajes.map((mensaje) => {
                    const propio = mensaje.rol === 'usuario';
                    const triaje = mensaje.nivelTriaje ? TRIAJE[mensaje.nivelTriaje] : null;
                    return (
                        <div key={mensaje.id} className={cn('flex flex-col', propio ? 'items-end' : 'items-start')}>
                            {triaje && <span className={cn('mb-1 rounded-full px-2.5 py-0.5 text-xs font-extrabold', triaje.clases)}>{triaje.texto}</span>}
                            <p className={cn(
                                'max-w-[85%] rounded-3xl px-4 py-3 text-[0.95rem] leading-relaxed whitespace-pre-wrap',
                                propio ? 'rounded-br-md bg-verde-600 text-white' : 'rounded-bl-md border border-tinta/80 bg-white',
                            )}>
                                {mensaje.contenido}
                            </p>
                            {mensaje.nivelTriaje === 'URGENTE' && (
                                <a href="tel:107" className="mt-2 flex items-center gap-3 rounded-2xl bg-rojo-500 px-4 py-3 font-extrabold text-white shadow-suave">
                                    <Phone className="size-5" aria-hidden />Llamar al 107
                                </a>
                            )}
                        </div>
                    );
                })}

                {escribiendo && (
                    <div className="flex items-center gap-2 text-sm text-gris-texto" role="status">
                        <span className="flex gap-1 rounded-3xl rounded-bl-md border border-gris-borde bg-white px-4 py-3">
                            {[0, 1, 2].map((punto) => <span key={punto} className="size-2 animate-bounce rounded-full bg-gris-texto" style={{ animationDelay: `${punto * 150}ms` }} />)}
                        </span>
                        IA Mosquito está escribiendo… puede tardar unos segundos
                    </div>
                )}
                {error && <p role="alert" className="rounded-2xl bg-rojo-50 p-3 text-sm font-bold text-rojo-700">{error}</p>}
            </div>

            {mensajes.length === 0 && (
                <div className="-mb-1 flex gap-2 overflow-x-auto px-4 pb-2">
                    {SUGERENCIAS.map((sugerencia) => (
                        <button key={sugerencia} type="button" onClick={() => mandar(sugerencia)} disabled={!enLinea}
                            className="shrink-0 rounded-full border border-verde-300 bg-white px-3 py-2 text-sm font-bold text-verde-800 disabled:opacity-50">
                            {sugerencia}
                        </button>
                    ))}
                </div>
            )}

            <form onSubmit={alEnviar} className="flex items-end gap-2 border-t border-gris-borde bg-white p-3">
                <label htmlFor="mensaje" className="sr-only">Escribí tu mensaje</label>
                <div className="flex-1">
                    <textarea
                        id="mensaje"
                        rows={1}
                        value={texto}
                        maxLength={LARGO_MAXIMO}
                        onChange={(evento) => setTexto(evento.target.value)}
                        onKeyDown={(evento) => { if (evento.key === 'Enter' && !evento.shiftKey) { evento.preventDefault(); mandar(texto); } }}
                        placeholder={enLinea ? 'Escribí tu consulta…' : 'Necesitás conexión para chatear'}
                        disabled={!enLinea}
                        className="max-h-32 min-h-12 w-full resize-none rounded-3xl border border-gris-borde bg-gris-superficie px-4 py-3 focus:border-verde-500 focus:outline-none"
                    />
                    {texto.length > LARGO_MAXIMO - 100 && <p className="px-3 text-right text-xs text-gris-texto">{texto.length}/{LARGO_MAXIMO}</p>}
                </div>
                <button type="submit" disabled={!texto.trim() || escribiendo || !enLinea} aria-label="Enviar mensaje"
                    className="grid size-12 shrink-0 place-items-center rounded-full bg-verde-600 text-white disabled:opacity-40">
                    <SendHorizontal className="size-5" aria-hidden />
                </button>
            </form>
        </div>
    );
}
