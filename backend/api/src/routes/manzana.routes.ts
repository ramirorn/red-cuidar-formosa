import { Router } from "express";
import { listarManzanas } from "../controllers/manzana.controllers.js";
import { validarCampos } from "../middlewares/validator.js";
import { validarListarManzanas } from "../validators/manzana.validators.js";

const manzanaRouter = Router();

manzanaRouter.get("/", validarListarManzanas, validarCampos, listarManzanas);

export default manzanaRouter;
