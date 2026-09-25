import { useState } from 'react';
import { ScrollText } from 'lucide-react';
import { Filtro, Selector } from '@/componentes/panel/Campos';
import { EncabezadoPagina } from '@/componentes/panel/Encabezado';
import { CargarMas, EsqueletoFilas, ErrorCarga, EstadoVacio } from '@/componentes/panel/Estados';
import { BarraFiltros, SelectorPeriodo, usePeriodo } from '@/componentes/panel/Filtros';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { useAuditoria } from '@/hooks/usePanel';
import { ACCIONES_AUDITORIA, nombreCompleto, ROLES } from '@/lib/etiquetasPanel';
import { formatearFecha } from '@/lib/formato';

// Filtros usados en una exportación o alta de usuario, en texto legible.
const describirFiltros = (filtros: Record<string, unknown> | null) => {
    if (!filtros) return null;
    return Object.entries(filtros)
        .filter(([, valor]) => valor !== null && valor !== undefined)
        .map(([clave, valor]) => {
            const texto = typeof valor === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(valor) ? new Date(valor).toLocaleDateString('es-AR') : String(valor);
            return `${clave}: ${texto}`;
        })
        .join(' · ');
};

export default function Auditoria() {
    const { dias, setDias, rango } = usePeriodo(7);
    const [accion, setAccion] = useState<string | undefined>();
    const { data, error, isLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useAuditoria({ ...rango, accion });
    const registros = data?.pages.flatMap((pagina) => pagina.datos) ?? [];

    return (
        <div className="space-y-6">
            <EncabezadoPagina rotulo="Control" titulo="Auditoría de accesos"
                descripcion="Quién vio fotos de vecinos, exportó datos o cambió permisos. El registro no se puede editar ni borrar desde el panel." />

            <BarraFiltros>
                <SelectorPeriodo dias={dias} alCambiar={setDias} />
                <Filtro etiqueta="Acción">
                    {(id) => (
                        <Selector id={id} value={accion ?? ''} onChange={(evento) => setAccion(evento.target.value || undefined)}>
                            <option value="">Todas</option>
                            {Object.entries(ACCIONES_AUDITORIA).map(([valor, texto]) => <option key={valor} value={valor}>{texto}</option>)}
                        </Selector>
                    )}
                </Filtro>
            </BarraFiltros>

            {error && <ErrorCarga error={error} alReintentar={() => void refetch()} />}

            <Tarjeta className="overflow-hidden">
                {isLoading && <EsqueletoFilas />}
                {!isLoading && registros.length === 0 && !error && <EstadoVacio className="m-4 border-0" icono={<ScrollText className="size-6" aria-hidden />} titulo="Sin registros en este período" />}
                {registros.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[48rem] text-left text-sm">
                            <thead className="border-b border-gris-borde bg-gris-superficie/70 text-xs font-extrabold tracking-wide text-gris-texto uppercase">
                                <tr>
                                    <th scope="col" className="px-5 py-3">Cuándo</th>
                                    <th scope="col" className="px-3 py-3">Quién</th>
                                    <th scope="col" className="px-3 py-3">Qué hizo</th>
                                    <th scope="col" className="px-3 py-3">Detalle</th>
                                    <th scope="col" className="px-3 py-3">IP</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gris-borde">
                                {registros.map((registro) => (
                                    <tr key={registro.id} className="align-top">
                                        <td className="px-5 py-3 whitespace-nowrap">{formatearFecha(registro.createdAt)}</td>
                                        <td className="px-3 py-3">
                                            <p className="font-bold">{nombreCompleto(registro.usuario)}</p>
                                            <p className="text-xs text-gris-texto">{ROLES[registro.usuario.rol].etiqueta}</p>
                                        </td>
                                        <td className="px-3 py-3 font-bold">{ACCIONES_AUDITORIA[registro.accion] ?? registro.accion}</td>
                                        <td className="px-3 py-3 text-xs text-tinta-suave">
                                            {registro.recurso && <p className="font-mono">{registro.recurso}</p>}
                                            {describirFiltros(registro.filtros) && <p>{describirFiltros(registro.filtros)}</p>}
                                        </td>
                                        <td className="px-3 py-3 font-mono text-xs text-gris-texto">{registro.ip ?? '—'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <CargarMas hayMas={Boolean(hasNextPage)} cargando={isFetchingNextPage} alCargar={() => void fetchNextPage()} />
            </Tarjeta>
        </div>
    );
}
