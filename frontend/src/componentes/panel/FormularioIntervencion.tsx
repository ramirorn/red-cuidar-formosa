import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Bug, ClipboardCheck, LoaderCircle, SprayCan, Trash2 } from 'lucide-react';
import { Boton } from '@/componentes/ui/Boton';
import { SelectorFechaHora } from '@/componentes/ui/SelectoresFecha';
import { useRegistrarIntervencion } from '@/hooks/usePanel';
import { errorAmigable } from '@/lib/errores';
import { ahoraLocal } from '@/lib/fechas';
import { TIPOS_INTERVENCION, UNIDADES } from '@/lib/etiquetasPanel';
import { cn } from '@/lib/utils';
import type { TipoIntervencion, UnidadProducto } from '@/tipos/panel';
import { AreaTexto, Campo, Entrada, Selector } from './Campos';

const ICONOS: Record<TipoIntervencion, typeof Bug> = {
    APLICACION_BTI: Bug,
    FUMIGACION: SprayCan,
    DESCACHARRADO: Trash2,
    INSPECCION: ClipboardCheck,
};

const DESCRIPCIONES: Record<TipoIntervencion, string> = {
    APLICACION_BTI: 'Larvicida biológico en agua estancada',
    FUMIGACION: 'Control de mosquitos adultos',
    DESCACHARRADO: 'Retiro de recipientes y residuos',
    INSPECCION: 'Revisión sin tratamiento',
};

const TIPOS = Object.keys(TIPOS_INTERVENCION) as TipoIntervencion[];
const UNIDADES_LISTA = Object.keys(UNIDADES) as UnidadProducto[];

const esquema = z.object({
    tipo: z.enum(TIPOS as [TipoIntervencion, ...TipoIntervencion[]], { error: 'Elegí qué se hizo' }),
    realizadaEn: z.string().min(1, 'Indicá cuándo se hizo').refine((valor) => new Date(valor).getTime() <= Date.now() + 5 * 60_000, 'No puede ser una fecha futura'),
    cantidadProducto: z.string().optional(),
    unidadProducto: z.enum(UNIDADES_LISTA as [UnidadProducto, ...UnidadProducto[]]).optional(),
    tipoCuerpoAgua: z.string().max(100, 'Máximo 100 caracteres').optional(),
    observaciones: z.string().max(500, 'Máximo 500 caracteres').optional(),
}).superRefine((datos, contexto) => {
    // El backend exige cantidad y unidad para el BTI (trazabilidad del producto aplicado).
    if (datos.tipo !== 'APLICACION_BTI') return;
    const cantidad = Number(datos.cantidadProducto?.replace(',', '.'));
    if (!datos.cantidadProducto || !Number.isFinite(cantidad) || cantidad <= 0) {
        contexto.addIssue({ code: 'custom', path: ['cantidadProducto'], message: 'Indicá la cantidad aplicada' });
    }
    if (!datos.unidadProducto) contexto.addIssue({ code: 'custom', path: ['unidadProducto'], message: 'Elegí la unidad' });
});

type Datos = z.infer<typeof esquema>;

interface Propiedades {
    manzana: { id: number; codigo: string };
    reporteId?: string;
    paradaRutaId?: number;
    ubicacion?: { latitud: number; longitud: number } | null;
    tipoInicial?: TipoIntervencion;
    alTerminar: () => void;
}

export const FormularioIntervencion = ({ manzana, reporteId, paradaRutaId, ubicacion, tipoInicial, alTerminar }: Propiedades) => {
    const registrar = useRegistrarIntervencion();
    const { register, handleSubmit, control, formState: { errors, isSubmitting } } = useForm<Datos>({
        resolver: zodResolver(esquema),
        defaultValues: { realizadaEn: ahoraLocal(), unidadProducto: 'g', ...(tipoInicial ? { tipo: tipoInicial } : {}) },
    });
    const tipo = useWatch({ control, name: 'tipo' });

    const enviar = async (datos: Datos) => {
        try {
            await registrar.mutateAsync({
                tipo: datos.tipo,
                manzanaId: manzana.id,
                realizadaEn: new Date(datos.realizadaEn).toISOString(),
                ...(ubicacion ? { latitud: ubicacion.latitud, longitud: ubicacion.longitud } : {}),
                ...(datos.tipo === 'APLICACION_BTI' ? {
                    cantidadProducto: Number(datos.cantidadProducto?.replace(',', '.')),
                    ...(datos.unidadProducto ? { unidadProducto: datos.unidadProducto } : {}),
                    ...(datos.tipoCuerpoAgua?.trim() ? { tipoCuerpoAgua: datos.tipoCuerpoAgua.trim() } : {}),
                } : {}),
                ...(datos.observaciones?.trim() ? { observaciones: datos.observaciones.trim() } : {}),
                ...(reporteId ? { reporteId } : {}),
                ...(paradaRutaId ? { paradaRutaId } : {}),
            });
            toast.success(`${TIPOS_INTERVENCION[datos.tipo]} registrada en ${manzana.codigo}`);
            alTerminar();
        } catch (causa) {
            toast.error(errorAmigable(causa, 'No pudimos registrar la intervención. Intentá de nuevo.'));
        }
    };

    return (
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-5">
            <fieldset>
                <legend className="mb-2 text-sm font-extrabold">¿Qué se hizo en la manzana {manzana.codigo}?</legend>
                <div className="grid grid-cols-2 gap-2">
                    {TIPOS.map((valor) => {
                        const Icono = ICONOS[valor];
                        return (
                            <label key={valor} className={cn(
                                'flex cursor-pointer flex-col gap-1 rounded-2xl border-2 p-3 transition',
                                tipo === valor ? 'border-verde-600 bg-verde-50' : 'border-gris-borde hover:border-verde-300',
                            )}>
                                <input type="radio" value={valor} {...register('tipo')} className="sr-only" />
                                <Icono className={cn('size-5', tipo === valor ? 'text-verde-700' : 'text-gris-texto')} aria-hidden />
                                <span className="text-sm font-extrabold">{TIPOS_INTERVENCION[valor]}</span>
                                <span className="text-xs leading-snug text-gris-texto">{DESCRIPCIONES[valor]}</span>
                            </label>
                        );
                    })}
                </div>
                {errors.tipo && <p role="alert" className="mt-2 text-xs font-bold text-rojo-600">{errors.tipo.message}</p>}
            </fieldset>

            {tipo === 'APLICACION_BTI' && (
                <div className="grid grid-cols-[1fr_9rem] gap-3 rounded-2xl bg-bruma p-4">
                    <Campo etiqueta="Cantidad aplicada" error={errors.cantidadProducto?.message}>
                        {(props) => <Entrada {...props} {...register('cantidadProducto')} inputMode="decimal" placeholder="Ej.: 20" />}
                    </Campo>
                    <Campo etiqueta="Unidad" error={errors.unidadProducto?.message}>
                        {(props) => (
                            <Selector {...props} {...register('unidadProducto')}>
                                {UNIDADES_LISTA.map((unidad) => <option key={unidad} value={unidad}>{UNIDADES[unidad]}</option>)}
                            </Selector>
                        )}
                    </Campo>
                    <Campo etiqueta="Cuerpo de agua (opcional)" error={errors.tipoCuerpoAgua?.message} className="col-span-2">
                        {(props) => <Entrada {...props} {...register('tipoCuerpoAgua')} placeholder="Ej.: tanque sin tapa, zanja, cubierta" />}
                    </Campo>
                </div>
            )}

            <Campo etiqueta="Fecha y hora" error={errors.realizadaEn?.message}>
                {(props) => (
                    <Controller control={control} name="realizadaEn" render={({ field }) => (
                        <SelectorFechaHora {...props} valor={field.value} alCambiar={field.onChange} max={ahoraLocal()} />
                    )} />
                )}
            </Campo>
            <Campo etiqueta="Observaciones (opcional)" error={errors.observaciones?.message}>
                {(props) => <AreaTexto {...props} {...register('observaciones')} maxLength={500} placeholder="Lo que conviene que sepa el equipo" />}
            </Campo>

            {reporteId && <p className="rounded-xl bg-gris-superficie p-3 text-xs text-tinta-suave">Si es BTI, fumigación o descacharrado, el reporte queda como resuelto.</p>}

            <Boton type="submit" anchoCompleto disabled={isSubmitting} icono={isSubmitting ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : undefined}>
                {isSubmitting ? 'Registrando…' : 'Registrar intervención'}
            </Boton>
        </form>
    );
};
