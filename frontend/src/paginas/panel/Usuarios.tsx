import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import * as Interruptor from '@radix-ui/react-switch';
import { Copy, KeyRound, LoaderCircle, Pencil, Plus, UserRound } from 'lucide-react';
import { useUsuarioPanel } from '@/autenticacion/SesionPanel';
import { Campo, Entrada, Filtro } from '@/componentes/panel/Campos';
import { Desplegable } from '@/componentes/ui/Desplegable';
import { Dialogo } from '@/componentes/panel/Dialogo';
import { EncabezadoPagina } from '@/componentes/panel/Encabezado';
import { CargarMas, EsqueletoFilas, ErrorCarga, EstadoVacio } from '@/componentes/panel/Estados';
import { BarraFiltros, SelectorLocalidad } from '@/componentes/panel/Filtros';
import { Boton } from '@/componentes/ui/Boton';
import { Tarjeta } from '@/componentes/ui/Tarjeta';
import { useActualizarUsuario, useCrearUsuario, useLocalidadesPanel, useUsuarios } from '@/hooks/usePanel';
import { errorAmigable } from '@/lib/errores';
import { ROLES, ROLES_PROVINCIALES } from '@/lib/etiquetasPanel';
import { hace } from '@/lib/formato';
import { cn } from '@/lib/utils';
import type { Rol, UsuarioInstitucional } from '@/tipos/panel';

const LISTA_ROLES = Object.keys(ROLES) as Rol[];
const esProvincial = (rol: Rol) => ROLES_PROVINCIALES.includes(rol);

// Contraseña aleatoria que cumple la política del backend (12+ caracteres, mayúscula, minúscula y número).
const generarClave = () => {
    const grupos = ['ABCDEFGHJKLMNPQRSTUVWXYZ', 'abcdefghijkmnopqrstuvwxyz', '23456789'];
    const todos = grupos.join('');
    const azar = (tope: number) => crypto.getRandomValues(new Uint32Array(1))[0]! % tope;
    const caracteres = [...grupos.map((grupo) => grupo[azar(grupo.length)]!), ...Array.from({ length: 13 }, () => todos[azar(todos.length)]!)];
    for (let i = caracteres.length - 1; i > 0; i--) {
        const j = azar(i + 1);
        [caracteres[i], caracteres[j]] = [caracteres[j]!, caracteres[i]!];
    }
    return caracteres.join('');
};

const esquemaNuevo = z.object({
    nombre: z.string().trim().min(2, 'Mínimo 2 letras').max(80),
    apellido: z.string().trim().min(2, 'Mínimo 2 letras').max(80),
    email: z.email('Email inválido'),
    password: z.string()
        .min(12, 'Mínimo 12 caracteres').max(128, 'Máximo 128 caracteres')
        .regex(/[A-Z]/, 'Tiene que tener una mayúscula').regex(/[a-z]/, 'Tiene que tener una minúscula').regex(/\d/, 'Tiene que tener un número'),
    rol: z.enum(LISTA_ROLES as [Rol, ...Rol[]]),
    localidadId: z.string().optional(),
}).refine((datos) => esProvincial(datos.rol) || Boolean(datos.localidadId), { path: ['localidadId'], message: 'Este rol trabaja en una localidad: elegila' });

type DatosNuevo = z.infer<typeof esquemaNuevo>;

interface PropiedadesCampoLocalidad {
    rol: Rol;
    valor: string;
    alCambiar: (valor: string) => void;
    id?: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
}

const SelectorLocalidadCampo = ({ rol, valor, alCambiar, ...accesibles }: PropiedadesCampoLocalidad) => {
    const { data: localidades = [] } = useLocalidadesPanel();
    return (
        <Desplegable {...accesibles} disabled={esProvincial(rol)} valor={esProvincial(rol) ? '' : valor} alCambiar={alCambiar}
            textoVacio={esProvincial(rol) ? 'Toda la provincia' : 'Elegí una localidad'}
            opciones={localidades.map((localidad) => ({ valor: String(localidad.id), etiqueta: localidad.nombre }))} />
    );
};

const OPCIONES_ROL = LISTA_ROLES.map((valor) => ({ valor, etiqueta: ROLES[valor].etiqueta, descripcion: ROLES[valor].descripcion }));

const CrearUsuario = ({ alTerminar }: { alTerminar: () => void }) => {
    const crear = useCrearUsuario();
    const [creada, setCreada] = useState<{ email: string; password: string } | null>(null);
    const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<DatosNuevo>({
        resolver: zodResolver(esquemaNuevo),
        defaultValues: { rol: 'BRIGADISTA', password: generarClave() },
    });
    const rol = useWatch({ control, name: 'rol' });

    const enviar = async (datos: DatosNuevo) => {
        try {
            await crear.mutateAsync({
                nombre: datos.nombre.trim(),
                apellido: datos.apellido.trim(),
                email: datos.email.toLowerCase(),
                password: datos.password,
                rol: datos.rol,
                ...(!esProvincial(datos.rol) && datos.localidadId ? { localidadId: Number(datos.localidadId) } : {}),
            });
            setCreada({ email: datos.email.toLowerCase(), password: datos.password });
        } catch (causa) {
            toast.error(errorAmigable(causa, 'No pudimos crear el usuario.'));
        }
    };

    if (creada) {
        return (
            <div className="space-y-4">
                <p className="text-sm text-tinta-suave">Pasale estos datos por un medio seguro. La contraseña no se vuelve a mostrar.</p>
                <div className="space-y-2 rounded-2xl bg-gris-superficie p-4 font-mono text-sm">
                    <p>{creada.email}</p>
                    <p className="font-bold">{creada.password}</p>
                </div>
                <Boton variante="contorno" anchoCompleto icono={<Copy className="size-4" aria-hidden />}
                    onClick={() => void navigator.clipboard.writeText(`${creada.email}\n${creada.password}`).then(() => toast.success('Copiado'))}>
                    Copiar datos
                </Boton>
                <Boton anchoCompleto onClick={alTerminar}>Listo</Boton>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit(enviar)} noValidate className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <Campo etiqueta="Nombre" error={errors.nombre?.message}>{(props) => <Entrada {...props} {...register('nombre')} autoComplete="off" />}</Campo>
                <Campo etiqueta="Apellido" error={errors.apellido?.message}>{(props) => <Entrada {...props} {...register('apellido')} autoComplete="off" />}</Campo>
            </div>
            <Campo etiqueta="Email" error={errors.email?.message}>{(props) => <Entrada {...props} {...register('email')} type="email" autoComplete="off" />}</Campo>
            <Campo etiqueta="Rol" ayuda={ROLES[rol].descripcion} error={errors.rol?.message}>
                {(props) => (
                    <Controller control={control} name="rol" render={({ field }) => (
                        <Desplegable {...props} valor={field.value} opciones={OPCIONES_ROL}
                            alCambiar={(valor) => { field.onChange(valor); if (esProvincial(valor as Rol)) setValue('localidadId', ''); }} />
                    )} />
                )}
            </Campo>
            <Campo etiqueta="Localidad" error={errors.localidadId?.message}>
                {(props) => (
                    <Controller control={control} name="localidadId" render={({ field }) => (
                        <SelectorLocalidadCampo {...props} rol={rol} valor={field.value ?? ''} alCambiar={field.onChange} />
                    )} />
                )}
            </Campo>
            <Campo etiqueta="Contraseña inicial" error={errors.password?.message} ayuda="Generada al azar. Podés cambiarla.">
                {(props) => (
                    <div className="flex gap-2">
                        <Entrada {...props} {...register('password')} className="font-mono" autoComplete="new-password" />
                        <Boton variante="contorno" tamano="chico" className="h-11" aria-label="Generar otra contraseña" onClick={() => setValue('password', generarClave(), { shouldValidate: true })}>
                            <KeyRound className="size-4" aria-hidden />
                        </Boton>
                    </div>
                )}
            </Campo>
            <Boton type="submit" anchoCompleto disabled={isSubmitting} icono={isSubmitting ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : undefined}>
                {isSubmitting ? 'Creando…' : 'Crear usuario'}
            </Boton>
        </form>
    );
};

const EditarUsuario = ({ usuario, alTerminar }: { usuario: UsuarioInstitucional; alTerminar: () => void }) => {
    const { usuario: yo } = useUsuarioPanel();
    const actualizar = useActualizarUsuario();
    const [rol, setRol] = useState<Rol>(usuario.rol);
    const [localidadId, setLocalidadId] = useState(usuario.localidadId ? String(usuario.localidadId) : '');
    const esYo = yo.id === usuario.id;
    const faltaLocalidad = !esProvincial(rol) && !localidadId;

    const guardar = async () => {
        try {
            await actualizar.mutateAsync({ id: usuario.id, cambios: { rol, localidadId: esProvincial(rol) ? null : Number(localidadId) } });
            toast.success('Usuario actualizado');
            alTerminar();
        } catch (causa) {
            toast.error(errorAmigable(causa, 'No pudimos guardar los cambios.'));
        }
    };

    return (
        <form onSubmit={(evento) => { evento.preventDefault(); void guardar(); }} className="space-y-4">
            <Campo etiqueta="Rol" ayuda={ROLES[rol].descripcion}>
                {(props) => (
                    <Desplegable {...props} valor={rol} disabled={esYo} opciones={OPCIONES_ROL}
                        alCambiar={(valor) => { const nuevo = valor as Rol; setRol(nuevo); if (esProvincial(nuevo)) setLocalidadId(''); }} />
                )}
            </Campo>
            <Campo etiqueta="Localidad" error={faltaLocalidad ? 'Este rol trabaja en una localidad: elegila' : undefined}>
                {(props) => <SelectorLocalidadCampo {...props} rol={rol} valor={localidadId} alCambiar={setLocalidadId} />}
            </Campo>
            <p className="rounded-xl bg-amber-50 p-3 text-xs font-bold text-amber-800">
                {esYo ? 'No podés cambiar tu propio rol.' : 'Al cambiar el rol o la localidad se cierran sus sesiones abiertas.'}
            </p>
            <Boton type="submit" anchoCompleto disabled={esYo || faltaLocalidad || actualizar.isPending}>Guardar cambios</Boton>
        </form>
    );
};

export default function Usuarios() {
    const { usuario: yo } = useUsuarioPanel();
    const { data: localidades = [] } = useLocalidadesPanel();
    const [rol, setRol] = useState<Rol | undefined>();
    const [localidadId, setLocalidadId] = useState<number | undefined>();
    const [creando, setCreando] = useState(false);
    const [editando, setEditando] = useState<UsuarioInstitucional | null>(null);
    const { data, error, isLoading, refetch, hasNextPage, fetchNextPage, isFetchingNextPage } = useUsuarios({ rol, localidadId });
    const actualizar = useActualizarUsuario();
    const usuarios = data?.pages.flatMap((pagina) => pagina.datos) ?? [];
    const nombreLocalidad = (id: number | null) => (id === null ? 'Toda la provincia' : localidades.find((localidad) => localidad.id === id)?.nombre ?? `Localidad ${id}`);

    const alternarActivo = async (usuario: UsuarioInstitucional) => {
        try {
            await actualizar.mutateAsync({ id: usuario.id, cambios: { activo: !usuario.activo } });
            toast.success(usuario.activo ? `${usuario.nombre} ya no puede ingresar` : `${usuario.nombre} puede volver a ingresar`);
        } catch (causa) {
            toast.error(errorAmigable(causa, 'No pudimos cambiar el acceso.'));
        }
    };

    return (
        <div className="space-y-6">
            <EncabezadoPagina rotulo="Administración" titulo="Usuarios" descripcion="Personal con acceso al panel. Cada rol ve y hace solo lo que su tarea necesita."
                acciones={<Boton onClick={() => setCreando(true)} icono={<Plus className="size-5" aria-hidden />}>Nuevo usuario</Boton>} />

            <BarraFiltros>
                <Filtro etiqueta="Rol">
                    {(id) => (
                        <Desplegable id={id} valor={rol ?? ''} alCambiar={(valor) => setRol((valor || undefined) as Rol | undefined)}
                            opciones={[{ valor: '', etiqueta: 'Todos' }, ...LISTA_ROLES.map((valor) => ({ valor, etiqueta: ROLES[valor].etiqueta }))]} />
                    )}
                </Filtro>
                <SelectorLocalidad valor={localidadId} alCambiar={setLocalidadId} todas="Todas" />
            </BarraFiltros>

            {error && <ErrorCarga error={error} alReintentar={() => void refetch()} />}

            <Tarjeta className="overflow-hidden">
                {isLoading && <EsqueletoFilas />}
                {!isLoading && usuarios.length === 0 && !error && <EstadoVacio className="m-4 border-0" icono={<UserRound className="size-6" aria-hidden />} titulo="No hay usuarios con estos filtros" />}
                {usuarios.length > 0 && (
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[48rem] text-left text-sm">
                            <thead className="border-b border-gris-borde bg-gris-superficie/70 text-xs font-extrabold tracking-wide text-gris-texto uppercase">
                                <tr>
                                    <th scope="col" className="px-5 py-3">Persona</th>
                                    <th scope="col" className="px-3 py-3">Rol</th>
                                    <th scope="col" className="px-3 py-3">Localidad</th>
                                    <th scope="col" className="px-3 py-3">Último ingreso</th>
                                    <th scope="col" className="px-3 py-3">Acceso</th>
                                    <th scope="col" className="px-3 py-3"><span className="sr-only">Editar</span></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gris-borde">
                                {usuarios.map((usuario) => (
                                    <tr key={usuario.id} className={cn(!usuario.activo && 'text-gris-texto')}>
                                        <td className="px-5 py-3.5">
                                            <p className="font-extrabold">{usuario.nombre} {usuario.apellido}{usuario.id === yo.id && <span className="ml-2 rounded-full bg-verde-50 px-2 py-0.5 text-xs text-verde-700">Vos</span>}</p>
                                            <p className="text-xs text-gris-texto">{usuario.email}</p>
                                        </td>
                                        <td className="px-3 py-3.5 font-bold">{ROLES[usuario.rol].etiqueta}</td>
                                        <td className="px-3 py-3.5">{nombreLocalidad(usuario.localidadId)}</td>
                                        <td className="px-3 py-3.5">{usuario.ultimoAccesoEn ? hace(usuario.ultimoAccesoEn) : 'Nunca'}</td>
                                        <td className="px-3 py-3.5">
                                            <label className="flex items-center gap-2">
                                                <Interruptor.Root checked={usuario.activo} disabled={usuario.id === yo.id || actualizar.isPending}
                                                    onCheckedChange={() => void alternarActivo(usuario)}
                                                    aria-label={`${usuario.activo ? 'Quitar' : 'Dar'} acceso a ${usuario.nombre} ${usuario.apellido}`}
                                                    className="relative h-6 w-11 shrink-0 rounded-full bg-gris-borde transition data-[state=checked]:bg-verde-600 disabled:opacity-50">
                                                    <Interruptor.Thumb className="block size-5 translate-x-0.5 rounded-full bg-white shadow transition data-[state=checked]:translate-x-[1.375rem]" />
                                                </Interruptor.Root>
                                                <span className="text-xs font-bold">{usuario.activo ? 'Activo' : 'Sin acceso'}</span>
                                            </label>
                                        </td>
                                        <td className="px-3 py-3.5 text-right">
                                            <button type="button" onClick={() => setEditando(usuario)} aria-label={`Editar a ${usuario.nombre} ${usuario.apellido}`}
                                                className="inline-grid size-9 place-items-center rounded-full hover:bg-gris-superficie">
                                                <Pencil className="size-4" aria-hidden />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                <CargarMas hayMas={Boolean(hasNextPage)} cargando={isFetchingNextPage} alCargar={() => void fetchNextPage()} />
            </Tarjeta>

            <Dialogo abierto={creando} alCambiar={setCreando} titulo="Nuevo usuario">
                {creando && <CrearUsuario alTerminar={() => setCreando(false)} />}
            </Dialogo>
            <Dialogo abierto={editando !== null} alCambiar={(abierto) => !abierto && setEditando(null)} titulo={editando ? `${editando.nombre} ${editando.apellido}` : ''} descripcion={editando?.email}>
                {editando && <EditarUsuario key={editando.id} usuario={editando} alTerminar={() => setEditando(null)} />}
            </Dialogo>
        </div>
    );
}
