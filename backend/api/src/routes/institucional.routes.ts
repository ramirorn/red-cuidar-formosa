import { Router } from "express";
import { PERMISOS } from "../config/permisos.js";
import { listarAuditoria } from "../controllers/auditoria.controllers.js";
import { obtenerImagenEvidencia } from "../controllers/evidencia.controllers.js";
import { exportarIntervenciones, exportarReportes } from "../controllers/exportacion.controllers.js";
import { listarIntervenciones, registrarIntervencion } from "../controllers/intervencion.controllers.js";
import { obtenerMapaCalor, obtenerMetricas, obtenerPredicciones } from "../controllers/metrica.controllers.js";
import { cambiarEstadoReporte, listarReportes, obtenerReporte } from "../controllers/reporte.controllers.js";
import { cambiarEstadoRuta, generarRuta, listarRutas, marcarParadaVisitada, obtenerRuta } from "../controllers/ruta.controllers.js";
import { actualizarUsuario, crearUsuario, listarUsuarios } from "../controllers/usuario.controllers.js";
import { verificarToken } from "../middlewares/autenticacion.middleware.js";
import { requierePermiso } from "../middlewares/autorizacion.middleware.js";
import { validarCampos } from "../middlewares/validator.js";
import { validarListarAuditoria } from "../validators/auditoria.validators.js";
import { validarIdUuid } from "../validators/comun.validators.js";
import { validarListarIntervenciones, validarRegistrarIntervencion } from "../validators/intervencion.validators.js";
import { validarConsultaAgregada, validarConsultaPredicciones } from "../validators/metrica.validators.js";
import {
    validarCambiarEstadoReporte,
    validarListarReportes,
    validarObtenerReporte,
} from "../validators/reporte.validators.js";
import {
    validarCambiarEstadoRuta,
    validarGenerarRuta,
    validarListarRutas,
    validarMarcarParada,
    validarObtenerRuta,
} from "../validators/ruta.validators.js";
import { validarActualizarUsuario, validarCrearUsuario, validarListarUsuarios } from "../validators/usuario.validators.js";

// API Core del Dashboard Institucional.
// Orden fijo en cada ruta: autenticación -> permiso del rol -> validación -> controlador.
// El alcance territorial se aplica después, dentro de cada servicio.
const institucionalRouter = Router();

institucionalRouter.use(verificarToken);

// Reportes ciudadanos
institucionalRouter.get("/reportes", requierePermiso(PERMISOS.REPORTES_LEER), validarListarReportes, validarCampos, listarReportes);
institucionalRouter.get("/reportes/:id", requierePermiso(PERMISOS.REPORTES_LEER), validarObtenerReporte, validarCampos, obtenerReporte);
institucionalRouter.patch("/reportes/:id/estado", requierePermiso(PERMISOS.REPORTES_VALIDAR), validarCambiarEstadoReporte, validarCampos, cambiarEstadoReporte);

// Evidencia fotográfica
institucionalRouter.get("/evidencias/:id/imagen", requierePermiso(PERMISOS.EVIDENCIAS_VER), validarIdUuid, validarCampos, obtenerImagenEvidencia);

// Intervenciones de campo (BTI, fumigación, descacharrado, inspección)
institucionalRouter.post("/intervenciones", requierePermiso(PERMISOS.INTERVENCIONES_REGISTRAR), validarRegistrarIntervencion, validarCampos, registrarIntervencion);
institucionalRouter.get("/intervenciones", requierePermiso(PERMISOS.INTERVENCIONES_LEER), validarListarIntervenciones, validarCampos, listarIntervenciones);

// Rutas de brigada
institucionalRouter.post("/rutas", requierePermiso(PERMISOS.RUTAS_GESTIONAR), validarGenerarRuta, validarCampos, generarRuta);
institucionalRouter.get("/rutas", requierePermiso(PERMISOS.RUTAS_LEER), validarListarRutas, validarCampos, listarRutas);
institucionalRouter.get("/rutas/:id", requierePermiso(PERMISOS.RUTAS_LEER), validarObtenerRuta, validarCampos, obtenerRuta);
institucionalRouter.patch("/rutas/:id/estado", requierePermiso(PERMISOS.RUTAS_EJECUTAR), validarCambiarEstadoRuta, validarCampos, cambiarEstadoRuta);
institucionalRouter.patch("/rutas/:id/paradas/:paradaId/visitada", requierePermiso(PERMISOS.RUTAS_EJECUTAR), validarMarcarParada, validarCampos, marcarParadaVisitada);

// Métricas epidemiológicas y mapa de calor
institucionalRouter.get("/metricas", requierePermiso(PERMISOS.METRICAS_LEER), validarConsultaAgregada, validarCampos, obtenerMetricas);
institucionalRouter.get("/mapa-calor", requierePermiso(PERMISOS.MAPA_CALOR_LEER), validarConsultaAgregada, validarCampos, obtenerMapaCalor);
institucionalRouter.get("/predicciones", requierePermiso(PERMISOS.MAPA_CALOR_LEER), validarConsultaPredicciones, validarCampos, obtenerPredicciones);

// Exportaciones CSV (auditadas)
institucionalRouter.get("/exportaciones/reportes", requierePermiso(PERMISOS.EXPORTACIONES_DESCARGAR), validarConsultaAgregada, validarCampos, exportarReportes);
institucionalRouter.get("/exportaciones/intervenciones", requierePermiso(PERMISOS.EXPORTACIONES_DESCARGAR), validarConsultaAgregada, validarCampos, exportarIntervenciones);

// Gestión de usuarios institucionales
institucionalRouter.post("/usuarios", requierePermiso(PERMISOS.USUARIOS_GESTIONAR), validarCrearUsuario, validarCampos, crearUsuario);
institucionalRouter.get("/usuarios", requierePermiso(PERMISOS.USUARIOS_GESTIONAR), validarListarUsuarios, validarCampos, listarUsuarios);
institucionalRouter.patch("/usuarios/:id", requierePermiso(PERMISOS.USUARIOS_GESTIONAR), validarActualizarUsuario, validarCampos, actualizarUsuario);

// Auditoría de accesos a datos sensibles
institucionalRouter.get("/auditoria", requierePermiso(PERMISOS.AUDITORIA_LEER), validarListarAuditoria, validarCampos, listarAuditoria);

export default institucionalRouter;
