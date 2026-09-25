import { Router } from "express";
import sesionRouter from "./sesion.routes.js";
import reporteRouter from "./reporte.routes.js";
import manzanaRouter from "./manzana.routes.js";
import localidadRouter from "./localidad.routes.js";
import suscripcionRouter from "./suscripcion.routes.js";
import chatRouter from "./chat.routes.js";
import authRouter from "./auth.routes.js";
import institucionalRouter from "./institucional.routes.js";
import internoRouter from "./interno.routes.js";

// Se exporta para que la prueba de contrato verifique que cada ruta esté documentada en OpenAPI.
export const MONTAJES: { prefijo: string; router: Router }[] = [
    // API de Recepción de Evidencia y Sincronización (ciudadanía anónima)
    { prefijo: "/sesiones", router: sesionRouter },
    { prefijo: "/reportes", router: reporteRouter },
    { prefijo: "/manzanas", router: manzanaRouter },
    { prefijo: "/localidades", router: localidadRouter },
    { prefijo: "/suscripciones-push", router: suscripcionRouter },
    { prefijo: "/chat", router: chatRouter },

    // API Core del Dashboard Institucional
    { prefijo: "/auth", router: authRouter },
    { prefijo: "/institucional", router: institucionalRouter },

    // Servicios internos
    { prefijo: "/interno", router: internoRouter },
];

const router = Router();

for (const { prefijo, router: subrouter } of MONTAJES) {
    router.use(prefijo, subrouter);
}

export default router;
