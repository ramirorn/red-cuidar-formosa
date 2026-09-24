import { Router } from "express";
import { cerrarSesion, loginUser, refrescarToken } from "../controllers/auth.controllers.js";
import { limiteLogin } from "../middlewares/limiteTasa.middleware.js";
import { validarCampos } from "../middlewares/validator.js";
import { validarLogin } from "../validators/auth.validators.js";

const authRouter = Router();

authRouter.post("/login", limiteLogin, validarLogin, validarCampos, loginUser);
authRouter.post("/refrescar", limiteLogin, refrescarToken);
authRouter.post("/cerrar-sesion", cerrarSesion);

export default authRouter;
