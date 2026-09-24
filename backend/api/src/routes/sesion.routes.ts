import { Router } from "express";
import { crearSesion } from "../controllers/sesion.controllers.js";
import { limiteCreacionSesiones } from "../middlewares/limiteTasa.middleware.js";

const sesionRouter = Router();

sesionRouter.post("/", limiteCreacionSesiones, crearSesion);

export default sesionRouter;
