import { Router } from "express";
import { cerrarSesion, loginUser, refrescarToken } from "../controllers/auth.controllers.js";
import { limiteLoginPorCuenta, limiteLoginPorIp, limiteRefresco } from "../middlewares/limiteTasa.middleware.js";
import { validarCampos } from "../middlewares/validator.js";
import { validarLogin } from "../validators/auth.validators.js";

const authRouter = Router();

authRouter.post("/login", limiteLoginPorIp, limiteLoginPorCuenta, validarLogin, validarCampos, loginUser);
authRouter.post("/refrescar", limiteRefresco, refrescarToken);
authRouter.post("/cerrar-sesion", cerrarSesion);

export default authRouter;
