import { useMemo, useState, type ReactNode } from 'react';
import { useUsuarioPanel } from '@/autenticacion/SesionPanel';
import { useLocalidadesPanel } from '@/hooks/usePanel';
import type { RangoFechas } from '@/tipos/panel';
import { Filtro, Selector } from './Campos';

export const PERIODOS = [
    { dias: 7, etiqueta: 'Últimos 7 días' },
    { dias: 30, etiqueta: 'Últimos 30 días' },
    { dias: 90, etiqueta: 'Últimos 90 días' },
    { dias: 365, etiqueta: 'Último año' },
] as const;

// El rango se fija al elegir el período (no en cada render): si "hasta" cambiara siempre,
// la clave de la consulta también cambiaría y se volvería a pedir sin parar.
export const usePeriodo = (diasIniciales = 30) => {
    const [dias, setDias] = useState<number>(diasIniciales);
    const rango = useMemo<RangoFechas>(() => {
        const hasta = new Date();
        hasta.setSeconds(59, 999);
        return { desde: new Date(hasta.getTime() - dias * 86_400_000).toISOString(), hasta: hasta.toISOString() };
    }, [dias]);
    return { dias, setDias, rango };
};

export const SelectorPeriodo = ({ dias, alCambiar }: { dias: number; alCambiar: (dias: number) => void }) => (
    <Filtro etiqueta="Período">
        {(id) => (
            <Selector id={id} value={dias} onChange={(evento) => alCambiar(Number(evento.target.value))}>
                {PERIODOS.map(({ dias: valor, etiqueta }) => <option key={valor} value={valor}>{etiqueta}</option>)}
            </Selector>
        )}
    </Filtro>
);

// Solo los roles provinciales eligen localidad; los locales ven siempre la suya (lo impone el backend).
export const SelectorLocalidad = ({ valor, alCambiar, todas = 'Toda la provincia' }: { valor: number | undefined; alCambiar: (id: number | undefined) => void; todas?: string }) => {
    const { esProvincial, usuario } = useUsuarioPanel();
    const { data: localidades = [] } = useLocalidadesPanel();

    if (!esProvincial) {
        return (
            <Filtro etiqueta="Localidad">
                {(id) => <Selector id={id} disabled value=""><option value="">{usuario.localidad?.nombre ?? 'Tu localidad'}</option></Selector>}
            </Filtro>
        );
    }

    return (
        <Filtro etiqueta="Localidad">
            {(id) => (
                <Selector id={id} value={valor ?? ''} onChange={(evento) => alCambiar(evento.target.value ? Number(evento.target.value) : undefined)}>
                    <option value="">{todas}</option>
                    {localidades.map((localidad) => <option key={localidad.id} value={localidad.id}>{localidad.nombre}</option>)}
                </Selector>
            )}
        </Filtro>
    );
};

export const BarraFiltros = ({ children }: { children: ReactNode }) => (
    <div className="flex flex-wrap items-end gap-3 rounded-tarjeta border border-gris-borde bg-white p-4 shadow-suave">{children}</div>
);
