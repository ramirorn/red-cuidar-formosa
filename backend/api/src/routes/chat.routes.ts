import { Router } from "express";
import { enviarMensajeChat } from "../controllers/chat.controllers.js";
import { verificarSesionAnonima } from "../middlewares/autenticacion.middleware.js";
import { limiteChat } from "../middlewares/limiteTasa.middleware.js";
import { validarCampos } from "../middlewares/validator.js";
import { validarMensajeChat } from "../validators/chat.validators.js";

const chatRouter = Router();

chatRouter.use(verificarSesionAnonima);

chatRouter.post("/mensajes", limiteChat, validarMensajeChat, validarCampos, enviarMensajeChat);

export default chatRouter;
