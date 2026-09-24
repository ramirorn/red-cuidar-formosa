import { Router } from "express";
import sesionRouter from "./sesion.routes.js";
import reporteRouter from "./reporte.routes.js";
import manzanaRouter from "./manzana.routes.js";
import suscripcionRouter from "./suscripcion.routes.js";
import authRouter from "./auth.routes.js";
import institucionalRouter from "./institucional.routes.js";
import internoRouter from "./interno.routes.js";

const router = Router();

// API de Recepción de Evidencia y Sincronización (ciudadanía anónima)
router.use("/sesiones", sesionRouter);
router.use("/reportes", reporteRouter);
router.use("/manzanas", manzanaRouter);
router.use("/suscripciones-push", suscripcionRouter);

// API Core del Dashboard Institucional
router.use("/auth", authRouter);
router.use("/institucional", institucionalRouter);

// Servicios internos
router.use("/interno", internoRouter);

export default router;
