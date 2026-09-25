import { descartarReportesVencidosService, limpiarArchivosHuerfanosService } from '../services/evidencia.services.js';

// Tarea periódica de privacidad: descarta los reportes que nadie revisó en 72 horas (con su foto)
// y borra del disco los archivos sin registro. Corre dentro de la API para no depender de otro servicio.
// Es segura aunque corran varias instancias a la vez: cada paso vuelve a filtrar por estado y por ruta.
const INTERVALO_MS = 15 * 60 * 1000;
let enCurso = false;

export const ejecutarTareaPrivacidad = async () => {
    if (enCurso) return null;
    enCurso = true;
    try {
        const { descartados } = await descartarReportesVencidosService();
        const archivos = await limpiarArchivosHuerfanosService();
        if (descartados > 0 || archivos > 0) {
            console.log(`Privacidad: ${descartados} reportes vencidos descartados, ${archivos} archivos sin registro borrados`);
        }
        return { descartados, archivos };
    } finally {
        enCurso = false;
    }
};

export const iniciarTareasProgramadas = () => {
    const correr = () => ejecutarTareaPrivacidad().catch((error: Error) => console.error('Tarea de privacidad:', error.message));
    // La primera corrida espera un minuto para no competir con el arranque.
    setTimeout(correr, 60_000).unref();
    setInterval(correr, INTERVALO_MS).unref();
};
