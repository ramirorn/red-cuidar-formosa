import { Router } from "express";
import { consultarMisReportes, crearReporte } from "../controllers/reporte.controllers.js";
import { verificarSesionAnonima } from "../middlewares/autenticacion.middleware.js";
import { limiteReportes } from "../middlewares/limiteTasa.middleware.js";
import { subirImagenes } from "../middlewares/subidaImagen.middleware.js";
import { validarCampos } from "../middlewares/validator.js";
import { validarConsultarMisReportes, validarCrearReporte } from "../validators/reporte.validators.js";

const reporteRouter = Router();

reporteRouter.use(verificarSesionAnonima);

// La sesión se verifica antes de leer el multipart: nadie sin sesión consume memoria con archivos.
reporteRouter.post("/", limiteReportes, subirImagenes, validarCrearReporte, validarCampos, crearReporte);
// POST y no GET: los idCliente funcionan como llave de cada reporte y no deben quedar en URLs ni registros.
reporteRouter.post("/consulta", validarConsultarMisReportes, validarCampos, consultarMisReportes);

export default reporteRouter;
