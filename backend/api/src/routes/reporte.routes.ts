import { Router } from "express";
import { crearReporte, listarMisReportes } from "../controllers/reporte.controllers.js";
import { verificarSesionAnonima } from "../middlewares/autenticacion.middleware.js";
import { limiteReportes } from "../middlewares/limiteTasa.middleware.js";
import { subirImagenes } from "../middlewares/subidaImagen.middleware.js";
import { validarCampos } from "../middlewares/validator.js";
import { validarCrearReporte, validarListarMisReportes } from "../validators/reporte.validators.js";

const reporteRouter = Router();

reporteRouter.use(verificarSesionAnonima);

// La sesión se verifica antes de leer el multipart: nadie sin sesión consume memoria con archivos.
reporteRouter.post("/", limiteReportes, subirImagenes, validarCrearReporte, validarCampos, crearReporte);
reporteRouter.get("/mios", validarListarMisReportes, validarCampos, listarMisReportes);

export default reporteRouter;
