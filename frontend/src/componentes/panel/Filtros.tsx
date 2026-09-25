import { useMemo, useState, type ReactNode } from 'react';
import { useUsuarioPanel } from '@/autenticacion/SesionPanel';
import { useLocalidadesPanel } from '@/hooks/usePanel';
import type { RangoFechas } from '@/tipos/panel';
import { Desplegable } from '@/componentes/ui/Desplegable';
import { Filtro } from './Campos';

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
            <Desplegable id={id} valor={String(dias)} alCambiar={(valor) => alCambiar(Number(valor))}
                opciones={PERIODOS.map(({ dias: valor, etiqueta }) => ({ valor: String(valor), etiqueta }))} />
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
                {(id) => <Desplegable id={id} disabled valor="" alCambiar={() => undefined} opciones={[{ valor: '', etiqueta: usuario.localidad?.nombre ?? 'Tu localidad' }]} />}
            </Filtro>
        );
    }

    return (
        <Filtro etiqueta="Localidad">
            {(id) => (
                <Desplegable id={id} valor={valor ? String(valor) : ''} alCambiar={(nuevo) => alCambiar(nuevo ? Number(nuevo) : undefined)}
                    opciones={[{ valor: '', etiqueta: todas }, ...localidades.map((localidad) => ({ valor: String(localidad.id), etiqueta: localidad.nombre }))]} />
            )}
        </Filtro>
    );
};

export const BarraFiltros = ({ children }: { children: ReactNode }) => (
    <div className="flex flex-wrap items-end gap-3 rounded-tarjeta border border-gris-borde bg-white p-4 shadow-suave">{children}</div>
);
