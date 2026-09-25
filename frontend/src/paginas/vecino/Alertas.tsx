import { useEffect, useState } from 'react';
import { BellOff, BellRing, CloudRain, LoaderCircle } from 'lucide-react';
import { Boton, BotonEnlace } from '@/componentes/ui/Boton';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { Manuscrita } from '@/componentes/ui/Tipografia';
import { usePush } from '@/hooks/usePush';
import { useLocalidades } from '@/hooks/useVecino';
import { hace } from '@/lib/formato';
import { abrirBase, type AlertaRecibida } from '@/sinConexion/bd';

export default function Alertas() {
    const { estado, localidadId, error, activar, desactivar } = usePush();
    const { data: localidades = [] } = useLocalidades();
    const [elegida, setElegida] = useState<number | ''>('');
    const [procesando, setProcesando] = useState(false);
    const [historial, setHistorial] = useState<AlertaRecibida[]>([]);

    useEffect(() => { if (localidadId) setElegida(localidadId); }, [localidadId]);
    useEffect(() => { void abrirBase().then((bd) => bd.getAll('alertas')).then((alertas) => setHistorial(alertas.reverse())); }, []);

    const conProceso = (accion: () => Promise<unknown>) => async () => {
        setProcesando(true);
        try { await accion(); } finally { setProcesando(false); }
    };

    return (
        <div className="space-y-5 px-4 py-6">
            <div>
                <h1 className="text-2xl font-black">Alertas de lluvia</h1>
                <p className="mt-1 text-sm text-tinta-suave">Después de cada lluvia fuerte te avisamos para que revises el patio.</p>
            </div>

            <Tarjeta className="p-5">
                {estado === 'cargando' && <p className="text-sm text-gris-texto">Revisando…</p>}
                {estado === 'no-soportado' && <p className="text-sm text-tinta-suave">Tu navegador no admite notificaciones. Probá con Chrome o instalá la app en tu celular.</p>}
                {estado === 'denegado' && <p className="text-sm text-rojo-700">Bloqueaste las notificaciones. Podés habilitarlas desde la configuración del navegador.</p>}
                {(estado === 'inactivo' || estado === 'activo') && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            {estado === 'activo' ? <BellRing className="size-7 text-verde-600" aria-hidden /> : <BellOff className="size-7 text-gris-texto" aria-hidden />}
                            <p className="font-extrabold">{estado === 'activo' ? 'Alertas activadas' : 'Alertas desactivadas'}</p>
                        </div>
                        <div>
                            <label htmlFor="localidad" className="text-sm font-extrabold">Tu localidad</label>
                            <select id="localidad" value={elegida} onChange={(evento) => setElegida(Number(evento.target.value) || '')}
                                className="mt-1 h-12 w-full rounded-2xl border border-gris-borde bg-white px-3 font-semibold focus:border-verde-500 focus:outline-none">
                                <option value="">Elegí tu localidad</option>
                                {localidades.map((localidad) => <option key={localidad.id} value={localidad.id}>{localidad.nombre}</option>)}
                            </select>
                        </div>
                        {estado === 'inactivo' || elegida !== localidadId ? (
                            <Boton anchoCompleto disabled={!elegida || procesando} onClick={conProceso(() => activar(Number(elegida)))}
                                icono={procesando ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : <BellRing className="size-4" aria-hidden />}>
                                {estado === 'activo' ? 'Cambiar localidad' : 'Avisarme después de cada lluvia'}
                            </Boton>
                        ) : (
                            <Boton variante="contorno" anchoCompleto disabled={procesando} onClick={conProceso(desactivar)}>Desactivar alertas</Boton>
                        )}
                        {error && <p role="alert" className="text-sm font-bold text-rojo-700">{error}</p>}
                    </div>
                )}
            </Tarjeta>

            <Tarjeta className="flex items-start gap-3 bg-verde-600 p-4 text-white">
                <img src="/marca/icono-192.png" alt="" width="40" height="40" className="size-10 rounded-xl bg-white" />
                <div>
                    <p className="text-sm font-black">Llovió en Formosa Capital</p>
                    <p className="text-sm text-white/85">Se registraron 23 mm. Vaciá, cepillá y tapá los recipientes con agua, y enviá una foto para mantener tu manzana en verde.</p>
                    <p className="mt-1 text-xs text-white/70">Así se ve la alerta en tu celular</p>
                </div>
            </Tarjeta>

            <section aria-labelledby="titulo-historial">
                <h2 id="titulo-historial" className="font-extrabold">Alertas recibidas</h2>
                {historial.length === 0 ? (
                    <Manuscrita className="mt-2 block text-2xl text-gris-texto">Todavía no llegó ninguna alerta</Manuscrita>
                ) : (
                    <ul className="mt-3 space-y-2">
                        {historial.map((alerta) => (
                            <li key={alerta.id}>
                                <Tarjeta className="flex items-center gap-3 p-4">
                                    <CloudRain className="size-6 shrink-0 text-verde-600" aria-hidden />
                                    <div className="flex-1">
                                        <p className="font-black">{alerta.titulo}</p>
                                        <p className="text-xs text-gris-texto">{hace(alerta.fecha)}</p>
                                    </div>
                                    <BotonEnlace to="/app/limpieza" tamano="chico" variante="contorno">Ya limpié</BotonEnlace>
                                </Tarjeta>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </div>
    );
}
