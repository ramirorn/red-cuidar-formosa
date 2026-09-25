import { Router } from "express";
import { listarLocalidades, listarManzanasDeLocalidad } from "../controllers/localidad.controllers.js";
import { validarCampos } from "../middlewares/validator.js";
import { validarIdEntero } from "../validators/comun.validators.js";

const localidadRouter = Router();

localidadRouter.get("/", listarLocalidades);
localidadRouter.get("/:id/manzanas", validarIdEntero, validarCampos, listarManzanasDeLocalidad);

export default localidadRouter;
