import { Router } from "express";
import { listarLocalidades } from "../controllers/localidad.controllers.js";

const localidadRouter = Router();

localidadRouter.get("/", listarLocalidades);

export default localidadRouter;
