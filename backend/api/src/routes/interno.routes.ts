import { Router } from "express";
import { recalcularEstados } from "../controllers/manzana.controllers.js";
import { enviarAlertaLluvia } from "../controllers/notificacion.controllers.js";
import { verificarServicioInterno } from "../middlewares/servicioInterno.middleware.js";
import { validarCampos } from "../middlewares/validator.js";
import { validarRecalcularEstados } from "../validators/manzana.validators.js";
import { validarAlertaLluvia } from "../validators/notificacion.validators.js";

// Rutas para otros servicios del ecosistema (n8n). No las usa ningún navegador.
const internoRouter = Router();

internoRouter.use(verificarServicioInterno);

internoRouter.post("/manzanas/recalcular", validarRecalcularEstados, validarCampos, recalcularEstados);
internoRouter.post("/notificaciones/lluvia", validarAlertaLluvia, validarCampos, enviarAlertaLluvia);

export default internoRouter;
