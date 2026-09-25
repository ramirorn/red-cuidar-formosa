import { useCallback, useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { vecinoApi } from '@/api/vecino.api';
import { abrirBase, type MensajeGuardado } from '@/sinConexion/bd';
import { errorAmigable } from '@/lib/errores';

const MENSAJES_DE_CONTEXTO = 10;

// La conversación se guarda solo en el dispositivo; el servidor no la almacena.
export const useChat = () => {
    const [mensajes, setMensajes] = useState<MensajeGuardado[]>([]);

    const recargar = useCallback(async () => setMensajes(await (await abrirBase()).getAll('chat')), []);
    useEffect(() => { void recargar(); }, [recargar]);

    const agregar = async (mensaje: MensajeGuardado) => {
        await (await abrirBase()).add('chat', mensaje);
        await recargar();
    };

    const envio = useMutation({
        mutationFn: async (texto: string) => {
            const historial = mensajes.slice(-MENSAJES_DE_CONTEXTO).map(({ rol, contenido, firma }) => ({ rol, contenido, ...(firma ? { firma } : {}) }));
            await agregar({ rol: 'usuario', contenido: texto, fecha: new Date().toISOString() });
            const respuesta = await vecinoApi.enviarMensaje(texto, historial);
            await agregar({ rol: 'asistente', contenido: respuesta.respuesta, firma: respuesta.firma, nivelTriaje: respuesta.nivelTriaje, fecha: new Date().toISOString() });
            return respuesta;
        },
    });

    const borrarConversacion = async () => {
        await (await abrirBase()).clear('chat');
        await recargar();
    };

    return {
        mensajes,
        enviar: envio.mutate,
        escribiendo: envio.isPending,
        error: envio.error ? errorAmigable(envio.error, 'El asistente no está disponible ahora. Si te sentís mal, andá a la guardia.') : null,
        borrarConversacion,
    };
};
