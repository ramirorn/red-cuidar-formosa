import prisma from '../config/prisma.js';
import type { UsuarioAutenticado } from '../middlewares/autenticacion.middleware.js';
import { verificarAlcance } from '../utils/alcance.js';
import { ErrorHttp } from '../utils/errorHttp.js';
import { rutaAbsolutaEvidencia } from './almacenamiento.services.js';

// Las fotos nunca se sirven como archivos estáticos públicos: cada descarga pasa por
// autenticación, permiso y alcance territorial del reporte al que pertenecen.
export const obtenerArchivoEvidenciaService = async (usuario: UsuarioAutenticado, id: string) => {
    const evidencia = await prisma.evidencia.findUnique({
        where: { id },
        select: {
            rutaAlmacenamiento: true,
            mime: true,
            reporte: { select: { manzana: { select: { localidadId: true } } } },
        },
    });

    if (!evidencia) throw new ErrorHttp(404, 'Recurso no encontrado');
    verificarAlcance(usuario, evidencia.reporte.manzana?.localidadId);

    return { ruta: rutaAbsolutaEvidencia(evidencia.rutaAlmacenamiento), mime: evidencia.mime };
};
