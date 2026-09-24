import { Router } from "express";
import { eliminarSuscripcion, guardarSuscripcion } from "../controllers/suscripcion.controllers.js";
import { verificarSesionAnonima } from "../middlewares/autenticacion.middleware.js";
import { validarCampos } from "../middlewares/validator.js";
import { validarEliminarSuscripcion, validarGuardarSuscripcion } from "../validators/suscripcion.validators.js";

const suscripcionRouter = Router();

suscripcionRouter.use(verificarSesionAnonima);

suscripcionRouter.post("/", validarGuardarSuscripcion, validarCampos, guardarSuscripcion);
suscripcionRouter.delete("/", validarEliminarSuscripcion, validarCampos, eliminarSuscripcion);

export default suscripcionRouter;
