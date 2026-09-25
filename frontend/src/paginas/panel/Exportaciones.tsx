import { useState } from 'react';
import { toast } from 'sonner';
import { FileSpreadsheet, LoaderCircle, ShieldAlert, Syringe } from 'lucide-react';
import { panelApi } from '@/api/panel.api';
import { useUsuarioPanel } from '@/autenticacion/SesionPanel';
import { EncabezadoPagina } from '@/componentes/panel/Encabezado';
import { BarraFiltros, SelectorLocalidad, SelectorPeriodo, usePeriodo } from '@/componentes/panel/Filtros';
import { Boton } from '@/componentes/ui/Boton';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { errorAmigable } from '@/lib/errores';
import { hoyIso } from '@/lib/formato';

type TipoExportacion = 'reportes' | 'intervenciones';

const EXPORTACIONES: { tipo: TipoExportacion; titulo: string; descripcion: string; Icono: typeof Syringe }[] = [
    { tipo: 'reportes', titulo: 'Reportes de vecinos', descripcion: 'Tipo, estado, manzana, fechas, confianza de la IA y ubicación.', Icono: FileSpreadsheet },
    { tipo: 'intervenciones', titulo: 'Intervenciones', descripcion: 'Tipo, manzana, fecha, producto aplicado y quién la registró.', Icono: Syringe },
];

const descargar = (blob: Blob, nombre: string) => {
    const url = URL.createObjectURL(blob);
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = nombre;
    document.body.append(enlace);
    enlace.click();
    enlace.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
};

export default function Exportaciones() {
    const { usuario } = useUsuarioPanel();
    const { dias, setDias, rango } = usePeriodo(30);
    const [localidadId, setLocalidadId] = useState<number | undefined>();
    const [descargando, setDescargando] = useState<TipoExportacion | null>(null);

    const exportar = async (tipo: TipoExportacion) => {
        setDescargando(tipo);
        try {
            const blob = await panelApi.exportar(tipo, { ...rango, localidadId });
            descargar(blob, `red-cuidar-${tipo}-${hoyIso()}.csv`);
            toast.success('Descarga lista');
        } catch (causa) {
            toast.error(errorAmigable(causa, 'No pudimos generar el archivo.'));
        } finally {
            setDescargando(null);
        }
    };

    return (
        <div className="space-y-6">
            <EncabezadoPagina rotulo="Datos abiertos al equipo" titulo="Exportaciones" descripcion="Archivos CSV para planillas de cálculo o sistemas de vigilancia epidemiológica." />

            <BarraFiltros>
                <SelectorPeriodo dias={dias} alCambiar={setDias} />
                <SelectorLocalidad valor={localidadId} alCambiar={setLocalidadId} />
            </BarraFiltros>

            <div className="grid gap-4 md:grid-cols-2">
                {EXPORTACIONES.map(({ tipo, titulo, descripcion, Icono }) => (
                    <Tarjeta key={tipo} className="flex flex-col p-6">
                        <span className="grid size-12 place-items-center rounded-2xl bg-verde-50 text-verde-700"><Icono className="size-6" aria-hidden /></span>
                        <h2 className="mt-4 text-lg font-black">{titulo}</h2>
                        <p className="mt-1 flex-1 text-sm text-tinta-suave">{descripcion}</p>
                        <Boton className="mt-5 self-start" onClick={() => void exportar(tipo)} disabled={descargando !== null}
                            icono={descargando === tipo ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : undefined}>
                            {descargando === tipo ? 'Generando…' : 'Descargar CSV'}
                        </Boton>
                    </Tarjeta>
                ))}
            </div>

            <p className="flex items-start gap-3 rounded-tarjeta border border-amber-200 bg-amber-50 p-4 text-sm leading-relaxed text-amber-900">
                <ShieldAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
                <span>
                    Cada descarga queda registrada en la auditoría con tu usuario y los filtros elegidos.
                    {usuario.rol === 'ADMINISTRADOR'
                        ? ' Tu rol recibe las coordenadas exactas: son casas de vecinos, guardá el archivo con cuidado.'
                        : ' Las coordenadas vienen redondeadas (≈ 110 m) para proteger la privacidad de los vecinos.'}
                    {' '}Nunca se exportan datos de las sesiones de los vecinos.
                </span>
            </p>
        </div>
    );
}
