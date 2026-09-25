import { useCallback } from 'react';
import { useNavigate } from 'react-router';

// "Volver" como lo espera la persona: a la pantalla anterior (con sus filtros y scroll) si vino
// navegando dentro de la app; si entró directo por un enlace, a una pantalla de respaldo sensata
// en lugar de salir de la app. React Router guarda en history.state el índice de la entrada.
export const hayPantallaAnterior = () => {
    const estado = window.history.state as { idx?: number } | null;
    return typeof estado?.idx === 'number' && estado.idx > 0;
};

export const useVolver = (respaldo: string) => {
    const navegar = useNavigate();
    return useCallback(() => {
        if (hayPantallaAnterior()) navegar(-1);
        else navegar(respaldo, { replace: true });
    }, [navegar, respaldo]);
};
