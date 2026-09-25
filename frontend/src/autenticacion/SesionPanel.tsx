import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { panelApi } from '@/api/panel.api';
import { ROLES_PROVINCIALES } from '@/lib/etiquetasPanel';
import { queryClient } from '@/lib/queryClient';
import type { Permiso, UsuarioActual } from '@/tipos/panel';
import { alExpirarSesion, guardarToken, refrescarToken } from './tokenPanel';

type EstadoSesion = 'verificando' | 'anonima' | 'activa' | 'sin-conexion';

interface ContextoSesion {
    estado: EstadoSesion;
    usuario: UsuarioActual | null;
    expirada: boolean;
    iniciarSesion: (email: string, password: string) => Promise<void>;
    cerrarSesion: () => Promise<void>;
    reintentar: () => void;
    puede: (permiso: Permiso) => boolean;
}

const Contexto = createContext<ContextoSesion | null>(null);

// Mantiene la sesión del personal institucional. Al abrir el panel intenta recuperar la sesión con la
// cookie de refresco; así una recarga de página no obliga a ingresar de nuevo.
export const ProveedorSesionPanel = ({ children }: { children: ReactNode }) => {
    const [estado, setEstado] = useState<EstadoSesion>('verificando');
    const [usuario, setUsuario] = useState<UsuarioActual | null>(null);
    const [expirada, setExpirada] = useState(false);
    const [intento, setIntento] = useState(0);

    useEffect(() => {
        let cancelado = false;
        (async () => {
            try {
                const token = await refrescarToken();
                if (!token) {
                    if (!cancelado) setEstado('anonima');
                    return;
                }
                const actual = await panelApi.usuarioActual();
                if (!cancelado) {
                    setUsuario(actual);
                    setEstado('activa');
                }
            } catch {
                if (!cancelado) setEstado('sin-conexion');
            }
        })();
        return () => { cancelado = true; };
    }, [intento]);

    // Si el servidor da la sesión por terminada (cuenta desactivada, cambio de rol, refresco vencido),
    // se vuelve al ingreso sin mezclar datos en caché con el próximo usuario.
    useEffect(() => alExpirarSesion(() => {
        queryClient.clear();
        setUsuario(null);
        setExpirada(true);
        setEstado('anonima');
    }), []);

    const iniciarSesion = useCallback(async (email: string, password: string) => {
        await panelApi.iniciarSesion(email, password);
        const actual = await panelApi.usuarioActual();
        queryClient.clear();
        setUsuario(actual);
        setExpirada(false);
        setEstado('activa');
    }, []);

    const cerrarSesion = useCallback(async () => {
        await panelApi.cerrarSesion();
        guardarToken(null);
        queryClient.clear();
        setUsuario(null);
        setEstado('anonima');
    }, []);

    const reintentar = useCallback(() => {
        setEstado('verificando');
        setIntento((valor) => valor + 1);
    }, []);

    const valor = useMemo<ContextoSesion>(() => ({
        estado,
        usuario,
        expirada,
        iniciarSesion,
        cerrarSesion,
        reintentar,
        puede: (permiso) => usuario?.permisos.includes(permiso) ?? false,
    }), [estado, usuario, expirada, iniciarSesion, cerrarSesion, reintentar]);

    return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
};

export const useSesionPanel = () => {
    const contexto = useContext(Contexto);
    if (!contexto) throw new Error('useSesionPanel debe usarse dentro de ProveedorSesionPanel');
    return contexto;
};

// Usuario garantizado: solo para pantallas que ya están detrás de la protección de sesión.
export const useUsuarioPanel = () => {
    const { usuario, puede } = useSesionPanel();
    if (!usuario) throw new Error('No hay una sesión activa');
    return { usuario, puede, esProvincial: ROLES_PROVINCIALES.includes(usuario.rol) };
};
