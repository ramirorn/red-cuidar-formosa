import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, Navigate, useLocation, useNavigate } from 'react-router';
import { ArrowLeft, Eye, EyeOff, LoaderCircle, LockKeyhole, ShieldCheck } from 'lucide-react';
import { isAxiosError } from 'axios';
import { useSesionPanel } from '@/autenticacion/SesionPanel';
import { Campo, Entrada } from '@/componentes/panel/Campos';
import { CargaPagina } from '@/componentes/compartidos/CargaPagina';
import { Boton } from '@/componentes/ui/Boton';
import { Manuscrita, Rotulo } from '@/componentes/ui/Tipografia';
import { MapaIlustrado } from '@/componentes/ilustraciones/MapaIlustrado';
import { Subrayado } from '@/componentes/ilustraciones/Garabatos';
import { errorAmigable } from '@/lib/errores';

const esquema = z.object({
    email: z.email('Ingresá un email válido'),
    password: z.string().min(1, 'Ingresá tu contraseña').max(128),
});

type Datos = z.infer<typeof esquema>;

// Solo se vuelve a rutas internas del panel: evita redirecciones abiertas con ?volver=https://...
const destinoSeguro = (volver: unknown) =>
    typeof volver === 'string' && volver.startsWith('/panel') && !volver.startsWith('//') ? volver : '/panel';

export default function Ingresar() {
    const { estado, expirada, iniciarSesion } = useSesionPanel();
    const navegar = useNavigate();
    const ubicacion = useLocation();
    const [verClave, setVerClave] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Datos>({ resolver: zodResolver(esquema) });

    const destino = destinoSeguro((ubicacion.state as { volver?: string } | null)?.volver);

    if (estado === 'verificando') return <CargaPagina />;
    if (estado === 'activa') return <Navigate to={destino} replace />;

    const enviar = async ({ email, password }: Datos) => {
        setError(null);
        try {
            await iniciarSesion(email, password);
            navegar(destino, { replace: true });
        } catch (causa) {
            setError(isAxiosError(causa) && causa.response?.status === 401
                ? 'El email o la contraseña no son correctos.'
                : errorAmigable(causa, 'No pudimos iniciar la sesión. Intentá de nuevo.'));
        }
    };

    return (
        <div className="grid min-h-dvh bg-crema lg:grid-cols-[1.05fr_1fr]">
            <section className="relative hidden overflow-hidden bg-verde-700 p-12 text-white lg:flex lg:flex-col lg:justify-between">
                <img src="/marca/logo-blanco.png" alt="Red-Cuidar Formosa" width="529" height="234" className="h-14 w-auto self-start" />
                <div className="relative z-10 max-w-md">
                    <Rotulo tono="blanco">Panel institucional</Rotulo>
                    <h1 className="mt-3 text-4xl leading-tight font-black">
                        Lo que el barrio ve,<br /><Manuscrita className="text-5xl text-verde-200">llega a tu mesa.</Manuscrita>
                    </h1>
                    <p className="mt-4 leading-relaxed text-white/80">
                        Validá los reportes de los vecinos, mirá dónde crece el riesgo y organizá el trabajo de las brigadas.
                    </p>
                </div>
                <MapaIlustrado className="absolute -right-24 -bottom-20 w-[34rem] opacity-25" />
                <p className="relative z-10 flex items-center gap-2 text-sm text-white/75">
                    <ShieldCheck className="size-4" aria-hidden />Cada acceso a datos sensibles queda registrado.
                </p>
            </section>

            <main className="flex items-center justify-center px-5 py-12">
                <div className="w-full max-w-sm">
                    <img src="/marca/logo-horizontal.webp" alt="Red-Cuidar Formosa" width="529" height="234" className="mb-10 h-12 w-auto lg:hidden" />
                    <span className="grid size-12 place-items-center rounded-2xl bg-verde-100 text-verde-700"><LockKeyhole className="size-6" aria-hidden /></span>
                    <h2 className="mt-5 text-3xl font-black">Ingresar</h2>
                    <Subrayado className="w-20 text-verde-500" />
                    <p className="mt-2 text-sm text-tinta-suave">Acceso exclusivo para personal de salud y brigadas.</p>

                    {expirada && !error && (
                        <p role="status" className="mt-6 rounded-xl bg-amber-50 p-3 text-sm font-bold text-amber-800">Tu sesión terminó. Volvé a ingresar para continuar.</p>
                    )}
                    {estado === 'sin-conexion' && !error && (
                        <p role="status" className="mt-6 rounded-xl bg-gris-superficie p-3 text-sm font-bold text-tinta-suave">No pudimos comprobar tu sesión. Revisá la conexión.</p>
                    )}
                    {error && <p role="alert" className="mt-6 rounded-xl bg-rojo-50 p-3 text-sm font-bold text-rojo-700">{error}</p>}

                    <form onSubmit={handleSubmit(enviar)} noValidate className="mt-6 space-y-4">
                        <Campo etiqueta="Email" error={errors.email?.message}>
                            {(props) => <Entrada {...props} {...register('email')} type="email" autoComplete="username" inputMode="email" autoFocus />}
                        </Campo>
                        <Campo etiqueta="Contraseña" error={errors.password?.message}>
                            {(props) => (
                                <div className="relative">
                                    <Entrada {...props} {...register('password')} type={verClave ? 'text' : 'password'} autoComplete="current-password" className="pr-12" />
                                    <button type="button" onClick={() => setVerClave(!verClave)} aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                                        className="absolute inset-y-0 right-0 grid w-11 place-items-center text-gris-texto hover:text-tinta">
                                        {verClave ? <EyeOff className="size-5" aria-hidden /> : <Eye className="size-5" aria-hidden />}
                                    </button>
                                </div>
                            )}
                        </Campo>
                        <Boton type="submit" anchoCompleto disabled={isSubmitting} icono={isSubmitting ? <LoaderCircle className="size-5 animate-spin" aria-hidden /> : undefined}>
                            {isSubmitting ? 'Ingresando…' : 'Ingresar'}
                        </Boton>
                    </form>
                    <p className="mt-8 text-center text-xs text-gris-texto">¿No tenés cuenta? Pedísela a la administración del sistema.</p>
                    <p className="mt-3 text-center">
                        <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-extrabold text-verde-700 hover:underline">
                            <ArrowLeft className="size-4" aria-hidden />Volver al sitio de Red-Cuidar
                        </Link>
                    </p>
                </div>
            </main>
        </div>
    );
}
