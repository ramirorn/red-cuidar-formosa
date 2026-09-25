import { useMemo, useState } from 'react';
import { Medal, Siren, Ticket, Trophy } from 'lucide-react';
import { useUsuarioPanel } from '@/autenticacion/SesionPanel';
import { Filtro } from '@/componentes/panel/Campos';
import { EncabezadoPagina } from '@/componentes/panel/Encabezado';
import { EsqueletoFilas, ErrorCarga, EstadoVacio } from '@/componentes/panel/Estados';
import { BarraFiltros, SelectorLocalidad } from '@/componentes/panel/Filtros';
import { BotonEnlace } from '@/componentes/ui/Boton';
import { Desplegable } from '@/componentes/ui/Desplegable';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { useLocalidadesPanel, useRankingCopa } from '@/hooks/usePanel';
import { formatearFecha, mesAnterior, mesArgentino, nombreDeMes } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { EstadoEdicion } from '@/tipos';

const ESTADOS: Record<EstadoEdicion, { texto: string; clases: string }> = {
    'en-curso': { texto: 'En curso', clases: 'bg-bruma text-verde-800 ring-verde-200' },
    provisoria: { texto: 'Resultado provisorio', clases: 'bg-amber-50 text-amber-800 ring-amber-200' },
    definitiva: { texto: 'Resultado definitivo', clases: 'bg-verde-50 text-verde-700 ring-verde-200' },
};

// Cuántas zonas del fondo se marcan como críticas en el panel (nunca en la app del vecino).
const ZONAS_CRITICAS = 3;

const ultimosMeses = (cantidad: number) => {
    const meses = [mesArgentino()];
    while (meses.length < cantidad) meses.push(mesAnterior(meses[meses.length - 1]!));
    return meses;
};

const numero = (valor: number) => valor.toLocaleString('es-AR', { maximumFractionDigits: 2 });

export default function CopaPanel() {
    const { usuario, esProvincial, puede } = useUsuarioPanel();
    const { data: localidades = [] } = useLocalidadesPanel();
    const meses = useMemo(() => ultimosMeses(6), []);
    const [mes, setMes] = useState(meses[0]!);
    const [elegida, setElegida] = useState<number | undefined>();
    // Los roles provinciales eligen localidad (la Copa se juega dentro de cada una); por defecto, la capital.
    const localidadId = esProvincial ? elegida ?? localidades.find((localidad) => localidad.nombre === 'Formosa Capital')?.id : usuario.localidadId ?? undefined;
    const { data, error, isLoading, refetch } = useRankingCopa(localidadId, mes, localidadId !== undefined);
    const zonas = data?.zonas ?? [];
    const conPuntos = zonas.filter((zona) => zona.puntos > 0).length;

    return (
        <div className="space-y-6">
            <EncabezadoPagina
                rotulo="Participación vecinal"
                titulo="Copa Red-Cuidar"
                descripcion="Ranking mensual de zonas por localidad. Los vecinos ven solo el podio y la situación de su zona; las zonas críticas se ven únicamente acá."
                acciones={puede('premios:canjear') && <BotonEnlace to="/panel/canjes" icono={<Ticket className="size-5" aria-hidden />}>Canjear premio</BotonEnlace>}
            />

            <BarraFiltros>
                <Filtro etiqueta="Edición">
                    {(id) => (
                        <Desplegable id={id} valor={mes} alCambiar={setMes}
                            opciones={meses.map((valor) => ({ valor, etiqueta: nombreDeMes(valor).replace(/^./, (letra) => letra.toUpperCase()) }))} />
                    )}
                </Filtro>
                {esProvincial ? <SelectorLocalidad valor={localidadId} alCambiar={setElegida} todas="Elegí una localidad" /> : <SelectorLocalidad valor={undefined} alCambiar={() => undefined} />}
                {data && (
                    <span className={cn('ml-auto self-center rounded-full px-3 py-1.5 text-xs font-extrabold ring-1 ring-inset', ESTADOS[data.edicion.estado].clases)}>
                        {ESTADOS[data.edicion.estado].texto}
                    </span>
                )}
            </BarraFiltros>

            {data?.edicion.estado === 'provisoria' && (
                <p className="rounded-tarjeta bg-amber-50 p-4 text-sm text-amber-900">
                    Los reportes de los últimos días todavía se están revisando. El resultado queda definitivo el {formatearFecha(data.edicion.definitivaDesde)} y recién ahí los vecinos pueden pedir su premio.
                </p>
            )}

            {error && <ErrorCarga error={error} alReintentar={() => void refetch()} />}

            <Tarjeta className="overflow-hidden">
                {isLoading && <EsqueletoFilas />}
                {!isLoading && zonas.length === 0 && !error && (
                    <EstadoVacio className="m-4 border-0" icono={<Trophy className="size-6" aria-hidden />} titulo="Esta localidad todavía no tiene zonas cargadas"
                        descripcion="Las zonas (barrios o partes de barrios grandes) se cargan con el comando importar-zonas." />
                )}
                {zonas.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[56rem] text-left text-sm">
                            <thead className="border-b border-gris-borde bg-gris-superficie/70 text-xs font-extrabold tracking-wide text-gris-texto uppercase">
                                <tr>
                                    <th scope="col" className="px-5 py-3">Puesto</th>
                                    <th scope="col" className="px-3 py-3">Zona</th>
                                    <th scope="col" className="px-3 py-3 text-right">Pts/manzana</th>
                                    <th scope="col" className="px-3 py-3 text-right">Puntos</th>
                                    <th scope="col" className="px-3 py-3 text-right">Limpiezas</th>
                                    <th scope="col" className="px-3 py-3 text-right">Semanas verdes</th>
                                    <th scope="col" className="px-3 py-3 text-right">Criaderos</th>
                                    <th scope="col" className="px-3 py-3 text-right">Premios</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gris-borde">
                                {zonas.map((zona) => {
                                    const critica = zona.posicion > zonas.length - ZONAS_CRITICAS && !zona.premiada && zonas.length > ZONAS_CRITICAS + 3;
                                    return (
                                        <tr key={zona.id} className={cn(zona.premiada && 'bg-verde-50/70', critica && 'bg-rojo-50/60')}>
                                            <td className="px-5 py-3">
                                                <span className={cn('inline-flex items-center gap-1.5 font-black', zona.premiada && 'text-verde-700', critica && 'text-rojo-700')}>
                                                    {zona.premiada ? (zona.posicion === 1 ? <Trophy className="size-4" aria-hidden /> : <Medal className="size-4" aria-hidden />) : critica ? <Siren className="size-4" aria-hidden /> : null}
                                                    {zona.posicion}º
                                                </span>
                                            </td>
                                            <td className="px-3 py-3">
                                                <p className="font-extrabold">{zona.nombre}</p>
                                                <p className="text-xs text-gris-texto">{zona.barrio !== zona.nombre ? `Barrio ${zona.barrio} · ` : ''}{zona.manzanas} manzanas{critica ? ' · Zona crítica' : ''}</p>
                                            </td>
                                            <td className="px-3 py-3 text-right font-black tabular-nums">{numero(zona.puntosPorManzana)}</td>
                                            <td className="px-3 py-3 text-right tabular-nums">{zona.puntos}</td>
                                            <td className="px-3 py-3 text-right tabular-nums">{zona.limpiezas}</td>
                                            <td className="px-3 py-3 text-right tabular-nums">{zona.semanasVerdes}</td>
                                            <td className="px-3 py-3 text-right tabular-nums">{zona.criaderos}</td>
                                            <td className="px-3 py-3 text-right text-xs tabular-nums">
                                                {zona.premiada ? `${zona.premios.canjeados} de ${zona.premios.emitidos} entregados` : '—'}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </Tarjeta>

            {data && (
                <p className="text-xs leading-relaxed text-gris-texto">
                    {conPuntos} de {zonas.length} zonas sumaron puntos. Puntos: limpieza validada {data.puntos.LIMPIEZA}, semana en verde {data.puntos.SEMANA_VERDE}, criadero validado {data.puntos.CRIADERO}.
                    Se ordena por puntos por manzana; en empate gana la zona que llegó primero. Las zonas críticas son prioridad para BTI y fumigación: no son un premio para el vecino.
                </p>
            )}
        </div>
    );
}
