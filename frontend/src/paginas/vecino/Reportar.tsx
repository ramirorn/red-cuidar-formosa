import { useEffect, useMemo, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Camera, Crop, Crosshair, LoaderCircle, MapPin, PackageOpen, Plus, Send, ShieldCheck, Sparkles, Trash2, TriangleAlert } from 'lucide-react';
import { MapaMiManzana } from '@/componentes/mapa/MapaMiManzana';
import { Boton, BotonEnlace } from '@/componentes/ui/Boton';
import { ChipEstado } from '@/componentes/ui/ChipEstado';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { EditorRecorte } from '@/componentes/vecino/EditorRecorte';
import { NOMBRES_CLASE } from '@/deteccion/clases';
import { useMiManzana } from '@/hooks/useVecino';
import { useColaReportes } from '@/hooks/useColaReportes';
import { estaEnFormosa, obtenerUbicacion, type Ubicacion } from '@/lib/geo';
import { deteccionesEnRecorte, recortarImagen } from '@/lib/recorte';
import { cn } from '@/lib/utils';
import { encolarReporte, pedirSincronizacionEnSegundoPlano } from '@/sinConexion/cola';
import type { ClaseObjeto, Deteccion, TipoReporte } from '@/tipos';
import { MAXIMO_FOTOS, useBorrador, type FotoBorrador } from './borrador';

const TIPOS: { tipo: TipoReporte; titulo: string; texto: string; Icono: typeof Camera }[] = [
    { tipo: 'CRIADERO', titulo: 'Criadero', texto: 'Recipiente con agua', Icono: TriangleAlert },
    { tipo: 'MICROBASURAL', titulo: 'Microbasural', texto: 'Acumulación de basura', Icono: PackageOpen },
    { tipo: 'LIMPIEZA', titulo: 'Limpieza', texto: 'Ya lo eliminé', Icono: Sparkles },
];

const LARGO_DESCRIPCION = 500;

// Vista previa de lo que realmente se envía: solo el recorte. Si falta marcarlo, se pide.
const FotoRecortada = ({ foto, alAjustar, alQuitar }: { foto: FotoBorrador; alAjustar: () => void; alQuitar: () => void }) => {
    const recorte = foto.recorte;
    return (
        <figure className="flex w-44 shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-gris-borde bg-white">
            <div className="relative grid h-40 place-items-center bg-tinta">
                {recorte ? (
                    <div
                        role="img"
                        aria-label="Parte de la foto que se envía"
                        className="max-h-full max-w-full"
                        style={{
                            aspectRatio: `${foto.ancho * recorte.ancho} / ${foto.alto * recorte.alto}`,
                            height: foto.ancho * recorte.ancho >= foto.alto * recorte.alto ? 'auto' : '100%',
                            width: foto.ancho * recorte.ancho >= foto.alto * recorte.alto ? '100%' : 'auto',
                            backgroundImage: `url(${foto.url})`,
                            backgroundSize: `${100 / recorte.ancho}% ${100 / recorte.alto}%`,
                            backgroundPosition: `${recorte.ancho < 1 ? (recorte.x / (1 - recorte.ancho)) * 100 : 0}% ${recorte.alto < 1 ? (recorte.y / (1 - recorte.alto)) * 100 : 0}%`,
                        }}
                    />
                ) : (
                    <>
                        <img src={foto.url} alt="" className="absolute inset-0 size-full object-cover opacity-40" />
                        <span className="relative px-3 text-center text-xs font-black text-white">Marcá dónde está el recipiente</span>
                    </>
                )}
                <button type="button" onClick={alQuitar} aria-label="Quitar esta foto" className="absolute top-2 right-2 grid size-8 place-items-center rounded-full bg-white/90 text-rojo-600 shadow-suave">
                    <Trash2 className="size-4" aria-hidden />
                </button>
            </div>
            <button type="button" onClick={alAjustar}
                className={cn('flex items-center justify-center gap-1.5 py-2.5 text-xs font-extrabold', recorte ? 'text-verde-700 hover:bg-bruma' : 'bg-rojo-50 text-rojo-700')}>
                <Crop className="size-4" aria-hidden />{recorte ? 'Ajustar recorte' : 'Marcar recipiente'}
            </button>
        </figure>
    );
};

// Resumen de lo que detectó la IA en todas las fotos: la mayor confianza por clase.
const resumirDetecciones = (fotos: FotoBorrador[]) => {
    const porClase = new Map<ClaseObjeto, number>();
    fotos.flatMap((foto) => foto.detecciones).forEach((deteccion) => {
        porClase.set(deteccion.clase, Math.max(porClase.get(deteccion.clase) ?? 0, deteccion.confianza));
    });
    return [...porClase.entries()].sort((a, b) => b[1] - a[1]);
};

export default function Reportar() {
    const navegar = useNavigate();
    const borrador = useBorrador();
    const { sincronizar } = useColaReportes();
    const [ubicacion, setUbicacion] = useState<Ubicacion | null>(null);
    const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null);
    const [buscandoUbicacion, setBuscandoUbicacion] = useState(false);
    const [descripcion, setDescripcion] = useState('');
    const [enviando, setEnviando] = useState(false);
    // Tras enviar, el borrador se vacía: no hay que redirigir al escáner en ese momento.
    const [enviado, setEnviado] = useState(false);
    const [editando, setEditando] = useState<string | null>(null);
    const { manzana, coleccion, fuera, isFetching: buscandoManzana, error: errorManzana } = useMiManzana(ubicacion);

    const detectadas = useMemo(() => resumirDetecciones(borrador.fotos), [borrador.fotos]);
    const tipo: TipoReporte | null = borrador.tipo ?? (detectadas.length > 0 ? 'CRIADERO' : null);
    const esCierre = Boolean(borrador.idClienteResuelto);

    const ubicar = async () => {
        setBuscandoUbicacion(true);
        setErrorUbicacion(null);
        try {
            const nueva = await obtenerUbicacion();
            if (!estaEnFormosa(nueva.latitud, nueva.longitud)) {
                setErrorUbicacion('Tu ubicación está fuera de la provincia de Formosa. Los reportes solo se aceptan dentro de la provincia.');
            }
            setUbicacion(nueva);
        } catch (error) {
            setErrorUbicacion((error as Error).message);
        } finally {
            setBuscandoUbicacion(false);
        }
    };

    useEffect(() => { void ubicar(); }, []);

    if (borrador.fotos.length === 0 && !enviado) return <Navigate to="/app/escanear?nuevo=1" replace />;

    const faltaRecorte = borrador.fotos.some((foto) => foto.recorte === null);
    const puedeEnviar = tipo !== null && manzana !== null && !faltaRecorte && !enviando;
    const fotoEditada = borrador.fotos.find((foto) => foto.id === editando) ?? null;

    const enviar = async () => {
        if (!puedeEnviar || !manzana || !tipo) return;
        setEnviando(true);
        // Solo sale del celular el recorte de cada foto; las detecciones pasan a coordenadas del recorte.
        const recortes = await Promise.all(borrador.fotos.map(async (foto) => ({
            blob: await recortarImagen(foto.blob, foto.recorte!),
            detecciones: deteccionesEnRecorte(foto.detecciones, foto.recorte!),
        })));
        const todas: Deteccion[] = recortes.flatMap((recorte) => recorte.detecciones).slice(0, 50);
        const mayor = Math.max(0, ...todas.map((deteccion) => deteccion.confianza));
        // La confianza solo ordena la revisión: en una limpieza, "sin recipientes" es lo esperable.
        const confianzaIa = tipo === 'LIMPIEZA' ? (todas.length === 0 ? 0.9 : Math.max(0, 1 - mayor)) : (todas.length > 0 ? mayor : undefined);
        const idCliente = crypto.randomUUID();

        await encolarReporte({
            idCliente,
            tipo,
            manzanaId: manzana.id,
            manzanaCodigo: manzana.properties.codigo,
            capturadoEn: borrador.fotos[0]?.capturadaEn ?? new Date().toISOString(),
            ...(confianzaIa !== undefined ? { confianzaIa } : {}),
            ...(descripcion.trim() ? { descripcion: descripcion.trim() } : {}),
            ...(borrador.idClienteResuelto ? { idClienteResuelto: borrador.idClienteResuelto } : {}),
            detecciones: todas,
            fotos: recortes.map((recorte) => recorte.blob),
        });

        await pedirSincronizacionEnSegundoPlano();
        const resultado = await sincronizar({ silencioso: true });
        const estado = resultado.enviados > 0 ? 'enviado' : resultado.errores > 0 ? 'error' : 'en-cola';
        setEnviado(true);
        navegar(`/app/enviado?estado=${estado}&tipo=${tipo}`, { replace: true });
        borrador.descartar();
    };

    return (
        <div className="space-y-5 px-4 py-6">
            <div>
                <h1 className="text-2xl font-black">{esCierre ? 'Contanos cómo quedó' : 'Revisá tu reporte'}</h1>
                <p className="mt-1 text-sm text-tinta-suave">Todo reporte lo revisa una persona del equipo de salud.</p>
            </div>

            <section aria-label="Fotos">
                <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
                    {borrador.fotos.map((foto) => (
                        <FotoRecortada key={foto.id} foto={foto} alAjustar={() => setEditando(foto.id)} alQuitar={() => borrador.quitarFoto(foto.id)} />
                    ))}
                    {borrador.fotos.length < MAXIMO_FOTOS && (
                        <BotonEnlace to="/app/escanear" state={{ volverAlReporte: true }} variante="contorno" className="h-auto w-32 shrink-0 flex-col self-stretch rounded-2xl border-dashed py-6" icono={<Plus aria-hidden />}>
                            Agregar foto
                        </BotonEnlace>
                    )}
                </div>
                <p className="mt-1 flex items-start gap-2 text-xs text-gris-texto">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-verde-600" aria-hidden />
                    Solo se envía la parte marcada, sin datos ocultos de la foto. La ve una persona del equipo de salud y se borra después de revisarla.
                </p>
            </section>

            <section aria-labelledby="titulo-tipo">
                <h2 id="titulo-tipo" className="mb-2 font-extrabold">¿Qué encontraste?</h2>
                <div role="radiogroup" aria-labelledby="titulo-tipo" className="grid grid-cols-3 gap-2">
                    {TIPOS.map(({ tipo: opcion, titulo, texto, Icono }) => {
                        const elegido = tipo === opcion;
                        const bloqueado = esCierre && opcion !== 'LIMPIEZA';
                        return (
                            <button
                                key={opcion}
                                type="button"
                                role="radio"
                                aria-checked={elegido}
                                disabled={bloqueado}
                                onClick={() => borrador.elegirTipo(opcion)}
                                className={cn(
                                    'flex flex-col items-center gap-1 rounded-2xl border-2 bg-white p-3 text-center transition disabled:opacity-40',
                                    elegido ? (opcion === 'LIMPIEZA' ? 'border-verde-600 bg-verde-50' : 'border-rojo-500 bg-rojo-50') : 'border-gris-borde',
                                )}
                            >
                                <Icono className={cn('size-6', opcion === 'LIMPIEZA' ? 'text-verde-600' : 'text-rojo-500')} aria-hidden />
                                <span className="text-sm font-black">{titulo}</span>
                                <span className="text-[0.7rem] leading-tight text-gris-texto">{texto}</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {detectadas.length > 0 && (
                <section aria-labelledby="titulo-detecciones">
                    <h2 id="titulo-detecciones" className="mb-2 font-extrabold">La IA detectó</h2>
                    <ul className="flex flex-wrap gap-2">
                        {detectadas.map(([clase, confianza]) => (
                            <li key={clase} className="rounded-full bg-rojo-50 px-3 py-1.5 text-sm font-bold text-rojo-700 ring-1 ring-rojo-200">
                                {NOMBRES_CLASE[clase]} · {Math.round(confianza * 100)}%
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <Tarjeta className="overflow-hidden">
                <div className="h-40 bg-gris-superficie">
                    {ubicacion && (
                        <MapaMiManzana
                            coleccion={coleccion}
                            ubicacion={[ubicacion.latitud, ubicacion.longitud]}
                            seleccionadaId={manzana?.id ?? null}
                            className="size-full"
                        />
                    )}
                </div>
                <div className="flex items-start justify-between gap-3 p-4">
                    <div className="text-sm">
                        <p className="flex items-center gap-2 font-extrabold"><MapPin className="size-4 text-rojo-500" aria-hidden />
                            {buscandoUbicacion || buscandoManzana ? 'Buscando tu manzana…' : manzana ? `Manzana ${manzana.properties.codigo}` : 'Sin manzana'}
                        </p>
                        <p className="mt-1 text-gris-texto">Solo se envía el número de manzana: tu ubicación exacta no sale del celular.</p>
                        {manzana && <ChipEstado estado={manzana.properties.estado} tamano="chico" className="mt-2" />}
                        {errorUbicacion && <p role="alert" className="mt-2 font-bold text-rojo-600">{errorUbicacion}</p>}
                        {fuera && !errorUbicacion && (
                            <p role="alert" className="mt-2 font-bold text-rojo-600">Tu ubicación no está dentro de una manzana registrada. Por ahora no se pueden recibir reportes desde acá.</p>
                        )}
                        {errorManzana && !manzana && (
                            <p role="alert" className="mt-2 font-bold text-rojo-600">No pudimos descargar el mapa de tu localidad. Conectate a internet una vez y tocá Actualizar.</p>
                        )}
                    </div>
                    <Boton variante="contorno" tamano="chico" onClick={ubicar} disabled={buscandoUbicacion} icono={<Crosshair className="size-4" aria-hidden />}>
                        Actualizar
                    </Boton>
                </div>
            </Tarjeta>

            <div>
                <label htmlFor="descripcion" className="font-extrabold">Contanos algo más <span className="font-semibold text-gris-texto">(opcional)</span></label>
                <textarea
                    id="descripcion"
                    value={descripcion}
                    maxLength={LARGO_DESCRIPCION}
                    onChange={(evento) => setDescripcion(evento.target.value)}
                    rows={3}
                    placeholder="Por ejemplo: está en el fondo, al lado del tanque."
                    className="mt-2 w-full rounded-2xl border border-gris-borde bg-white p-3 text-base focus:border-verde-500 focus:outline-none"
                />
                <p className="text-right text-xs text-gris-texto">{descripcion.length}/{LARGO_DESCRIPCION}</p>
            </div>

            <Boton tamano="grande" anchoCompleto onClick={enviar} disabled={!puedeEnviar} icono={enviando ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : <Send className="size-5" aria-hidden />}>
                {enviando ? 'Enviando…' : 'Enviar reporte'}
            </Boton>
            {tipo === null && <p className="text-center text-sm font-bold text-rojo-600">Elegí qué encontraste para poder enviar.</p>}
            {faltaRecorte && <p className="text-center text-sm font-bold text-rojo-600">Marcá el recipiente en cada foto para poder enviar.</p>}
            <Boton variante="fantasma" anchoCompleto onClick={() => { borrador.descartar(); navegar('/app'); }}>Descartar</Boton>

            {fotoEditada && (
                <EditorRecorte
                    abierto
                    alCerrar={() => setEditando(null)}
                    alGuardar={(recorte) => { borrador.ajustarRecorte(fotoEditada.id, recorte); setEditando(null); }}
                    url={fotoEditada.url}
                    ancho={fotoEditada.ancho}
                    alto={fotoEditada.alto}
                    detecciones={fotoEditada.detecciones}
                    recorte={fotoEditada.recorte}
                />
            )}
        </div>
    );
}
