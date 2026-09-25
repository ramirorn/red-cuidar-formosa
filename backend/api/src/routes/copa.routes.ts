import { Router } from "express";
import { obtenerDesafiosZona, obtenerPodio, obtenerSituacionZona, pedirPremio } from "../controllers/copa.controllers.js";
import { verificarSesionAnonima } from "../middlewares/autenticacion.middleware.js";
import { limitePremio } from "../middlewares/limiteTasa.middleware.js";
import { validarCampos } from "../middlewares/validator.js";
import { validarDesafiosZona, validarPedirPremio, validarPodio, validarSituacionZona } from "../validators/copa.validators.js";

// Copa Red-Cuidar para la PWA: el podio, la situación y los desafíos de una zona son públicos (datos agregados);
// pedir el premio exige una sesión anónima y se limita como el envío de reportes.
const copaRouter = Router();

copaRouter.get("/", validarPodio, validarCampos, obtenerPodio);
copaRouter.get("/zonas/:id/desafios", validarDesafiosZona, validarCampos, obtenerDesafiosZona);
copaRouter.get("/zonas/:id", validarSituacionZona, validarCampos, obtenerSituacionZona);
copaRouter.post("/premio", verificarSesionAnonima, limitePremio, validarPedirPremio, validarCampos, pedirPremio);

export default copaRouter;
