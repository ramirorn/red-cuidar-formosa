import { Router } from "express";
import { obtenerClavePublicaPush } from "../controllers/notificacion.controllers.js";
import { eliminarSuscripcion, guardarSuscripcion } from "../controllers/suscripcion.controllers.js";
import { verificarSesionAnonima } from "../middlewares/autenticacion.middleware.js";
import { validarCampos } from "../middlewares/validator.js";
import { validarEliminarSuscripcion, validarGuardarSuscripcion } from "../validators/suscripcion.validators.js";

const suscripcionRouter = Router();

// Pública: se registra antes del middleware de sesión para que no la alcance.
suscripcionRouter.get("/clave-publica", obtenerClavePublicaPush);

suscripcionRouter.use(verificarSesionAnonima);

suscripcionRouter.post("/", validarGuardarSuscripcion, validarCampos, guardarSuscripcion);
suscripcionRouter.delete("/", validarEliminarSuscripcion, validarCampos, eliminarSuscripcion);

export default suscripcionRouter;
