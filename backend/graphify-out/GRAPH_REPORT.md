# Graph Report - backend  (2026-09-25)

## Corpus Check
- Corpus is ~41,741 words - fits in a single context window. You may not need a graph.

## Summary
- 749 nodes · 1813 edges · 55 communities (35 shown, 20 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 55 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Community 0
- Community 1
- Community 2
- Community 3
- Community 4
- Community 5
- Community 6
- Community 7
- Community 8
- Community 9
- Community 10
- Community 11
- Community 12
- Community 13
- Community 14
- Community 15
- Community 16
- Community 17
- Community 18
- Community 19
- Community 20
- Community 21
- Community 22
- Community 23
- Community 24
- Community 25
- Community 26
- Community 27
- Community 28
- Community 29
- Community 30
- Community 31
- Community 32
- Community 33
- Community 34
- Community 35
- Community 37
- Community 38
- Community 39

## God Nodes (most connected - your core abstractions)
1. `ErrorHttp` - 56 edges
2. `responderError()` - 51 edges
3. `express` - 34 edges
4. `express-validator` - 26 edges
5. `prisma` - 22 edges
6. `alcanceLocalidad()` - 22 edges
7. `@prisma/client` - 20 edges
8. `compilerOptions` - 18 edges
9. `resolverRango()` - 16 edges
10. `calcular_indice_riesgo()` - 16 edges

## Surprising Connections (you probably didn't know these)
- `intervencion_paradaRutaId_idx` --indexes--> `"intervencion"`  [EXTRACTED]
  api/prisma/migrations/20260925150000_indices_y_permisos_por_columna/migration.sql → api/prisma/migrations/20260924120000_esquema_inicial/migration.sql
- `intervencion_realizadaEn_id_idx` --indexes--> `"intervencion"`  [EXTRACTED]
  api/prisma/migrations/20260925150000_indices_y_permisos_por_columna/migration.sql → api/prisma/migrations/20260924120000_esquema_inicial/migration.sql
- `paradaRuta_manzanaId_idx` --indexes--> `"paradaRuta"`  [EXTRACTED]
  api/prisma/migrations/20260925150000_indices_y_permisos_por_columna/migration.sql → api/prisma/migrations/20260924120000_esquema_inicial/migration.sql
- `prediccionRiesgo_calculadoEn_idx` --indexes--> `"prediccionRiesgo"`  [EXTRACTED]
  api/prisma/migrations/20260925150000_indices_y_permisos_por_columna/migration.sql → api/prisma/migrations/20260924120000_esquema_inicial/migration.sql
- `prediccionRiesgo_vigenteHasta_idx` --indexes--> `"prediccionRiesgo"`  [EXTRACTED]
  api/prisma/migrations/20260925150000_indices_y_permisos_por_columna/migration.sql → api/prisma/migrations/20260924120000_esquema_inicial/migration.sql

## Import Cycles
- None detected.

## Communities (55 total, 20 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.06
Nodes (66): BaseSettings, exception_handler, FastAPI, JSONResponse, abrir_pool(), cerrar_pool(), obtener_pool(), cerrar_cache() (+58 more)

### Community 1 - "Community 1"
Cohesion: 0.07
Nodes (60): listarAuditoria(), obtenerImagenEvidencia(), listarIntervenciones(), obtenerMapaCalor(), obtenerMetricas(), obtenerPredicciones(), cambiarEstadoReporte(), crearReporte() (+52 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (57): "auditoriaAcceso", auditoriaAcceso_accion_createdAt_idx, auditoriaAcceso_usuarioId_createdAt_idx, "deteccionIa", deteccionIa_reporteId_idx, "evidencia", evidencia_reporteId_idx, evidencia_rutaAlmacenamiento_key (+49 more)

### Community 3 - "Community 3"
Cohesion: 0.08
Nodes (39): enviarMensajeChat(), enviarAlertaLluvia(), obtenerClavePublicaPush(), eliminarSuscripcion(), guardarSuscripcion(), conLugarParaProcesar, directorioBase(), eliminarImagenesService() (+31 more)

### Community 4 - "Community 4"
Cohesion: 0.10
Nodes (30): app, CamposReporte, ClienteConEventos, contarConsultas(), crearSesion(), crearTerritorio(), crearUsuario(), enviarReporte() (+22 more)

### Community 5 - "Community 5"
Cohesion: 0.15
Nodes (21): esProduccion, requerida(), secreto(), cerrarSesion(), contextoCliente(), leerCookieRefresco(), loginUser(), obtenerUsuarioActual() (+13 more)

### Community 6 - "Community 6"
Cohesion: 0.13
Nodes (21): crearAdministrador(), crearGrillaEjemplo(), crearLocalidades(), LOCALIDADES, main(), prisma, esRolProvincial(), COSTO_BCRYPT (+13 more)

### Community 7 - "Community 7"
Cohesion: 0.09
Nodes (22): author, description, keywords, license, main, name, type, version (+14 more)

### Community 8 - "Community 8"
Cohesion: 0.10
Nodes (20): Backend Architect Agent Personality, Performance-Conscious Design, API Contract Governance, Data Evolution & Migration Safety, Observability by Design, 📋 Your Architecture Deliverables, System Architecture Design, System Architecture Specification (+12 more)

### Community 9 - "Community 9"
Cohesion: 0.19
Nodes (17): PERMISOS, cambiarEstadoRutaService(), cargarRutaAutorizada(), DatosNuevaRuta, esBrigadista(), esTransicionRutaValida(), FiltrosRutas, generarRutaService() (+9 more)

### Community 10 - "Community 10"
Cohesion: 0.18
Nodes (16): CLAVE_VERSION_MAPA_CALOR, ClienteRedis, obtenerRedis(), consultarMotor(), FiltrosMapaCalor, invalidarCacheMapaCalorService(), obtenerMapaCalorService(), obtenerPrediccionesService() (+8 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (19): compilerOptions, exactOptionalPropertyTypes, isolatedModules, lib, module, moduleDetection, noFallthroughCasesInSwitch, noImplicitReturns (+11 more)

### Community 12 - "Community 12"
Cohesion: 0.18
Nodes (15): listarManzanas(), recalcularEstados(), AMPLITUD_MAXIMA_GRADOS, calcularEstadoManzana(), ClienteBd, ContextoCambioEstado, DatosEstadoManzana, DIAS_VIGENCIA_LIMPIEZA (+7 more)

### Community 13 - "Community 13"
Cohesion: 0.18
Nodes (11): resumen(), verificarServicioInterno(), authRouter, MONTAJES, institucionalRouter, internoRouter, manzanaRouter, sesionRouter (+3 more)

### Community 14 - "Community 14"
Cohesion: 0.12
Nodes (16): dependencies, bcryptjs, cookie-parser, cors, dotenv, express, express-rate-limit, express-validator (+8 more)

### Community 15 - "Community 15"
Cohesion: 0.13
Nodes (15): devDependencies, prisma, supertest, tsx, @types/cookie-parser, @types/cors, @types/express, @types/jsonwebtoken (+7 more)

### Community 16 - "Community 16"
Cohesion: 0.19
Nodes (12): UsuarioAutenticado, cambiarEstadoReporteService(), DatosReporte, DeteccionEntrada, esTransicionValida(), FilaExportacionReporte, FiltrosReportes, ORDEN_REPORTES (+4 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (14): Red Cuidar Formosa — Backend, Ciudadanía (anónima), Dashboard institucional, Interno (n8n), Seguridad aplicada, Pendiente (revisión de seguridad), Servicios, Puesta en marcha (desarrollo) (+6 more)

### Community 18 - "Community 18"
Cohesion: 0.19
Nodes (12): exportarCsv(), lineas(), exportarIntervenciones, exportarReportes, Generador, COLUMNAS_EXPORTACION_INTERVENCIONES, generarExportacionIntervencionesService(), COLUMNAS_EXPORTACION_REPORTES (+4 more)

### Community 19 - "Community 19"
Cohesion: 0.22
Nodes (10): limiteLoginPorCuenta, limiteLoginPorIp, limiteRefresco, porCuenta(), porIp(), porSesion(), porTokenDeRefresco(), respuesta (+2 more)

### Community 20 - "Community 20"
Cohesion: 0.22
Nodes (10): Permiso, PERMISOS_POR_ROL, ROLES_COORDENADAS_EXACTAS, ROLES_PROVINCIALES, ROLES_UBICACION_EXACTA_EN_DETALLE, tienePermiso(), TODOS, requierePermiso() (+2 more)

### Community 21 - "Community 21"
Cohesion: 0.18
Nodes (11): limiteReportes, CANTIDAD_MAXIMA_IMAGENES, cargador, MENSAJES, MIMES_PERMITIDOS, subirImagenes(), TAMANO_MAXIMO_IMAGEN, reporteRouter (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.17
Nodes (12): scripts, build, dev, generar-cliente, generar-vapid, importar-manzanas, migrar, semilla (+4 more)

### Community 23 - "Community 23"
Cohesion: 0.36
Nodes (7): entorno, prisma, AUDIENCIA_CIUDADANIA, EMISOR_TOKEN, FiltrosAuditoria, jsonwebtoken, @prisma/client

### Community 24 - "Community 24"
Cohesion: 0.31
Nodes (9): registrarIntervencion(), DatosIntervencion, FilaExportacionIntervencion, FiltrosIntervenciones, listarIntervencionesService(), registrarIntervencionService(), TIPOS_QUE_RESUELVEN, recalcularEstadoManzanaService() (+1 more)

### Community 25 - "Community 25"
Cohesion: 0.18
Nodes (9): contrato, ejemplos, Metodo, METODOS, opciones, operaciones, tokenInstitucional, tokenSesion (+1 more)

### Community 26 - "Community 26"
Cohesion: 0.18
Nodes (10): Code Reviewer Agent, 💬 Communication Style, 🧠 Your Identity & Memory, 🎯 Your Core Mission, 🔧 Critical Rules, 📋 Review Checklist, 🔴 Blockers (Must Fix), 🟡 Suggestions (Should Fix) (+2 more)

### Community 27 - "Community 27"
Cohesion: 0.31
Nodes (7): suscripcionRouter, esEndpointPushPermitido(), HOSTS_PUSH_EXACTOS, SUFIJOS_PUSH, validarEliminarSuscripcion, validarEndpoint, validarGuardarSuscripcion

### Community 28 - "Community 28"
Cohesion: 0.25
Nodes (7): Orquestador de Conversaciones y Alertas (n8n + Ollama), Puesta en marcha, Variables disponibles en los flujos (`$env`), Flujos, `clima-alertas.json`: Clima y alertas post-lluvia (cada hora, al minuto 5), `mantenimiento-diario.json`: Mantenimiento diario (03:10), `chat-mosquito.json`: Chat "IA Mosquito" (webhook)

### Community 29 - "Community 29"
Cohesion: 0.43
Nodes (4): listarLocalidades(), localidadRouter, listarLocalidadesService, LocalidadPublica

### Community 30 - "Community 30"
Cohesion: 0.38
Nodes (4): limiteChat, validarCampos(), chatRouter, validarMensajeChat

### Community 31 - "Community 31"
Cohesion: 0.33
Nodes (5): limiteGeneral, router, cookie-parser, cors, helmet

### Community 32 - "Community 32"
Cohesion: 0.53
Nodes (4): crearSesion(), limiteCreacionSesiones, crearSesionService(), express

### Community 34 - "Community 34"
Cohesion: 0.67
Nodes (4): extraerToken(), rechazar(), verificarSesionAnonima(), verificarToken()

### Community 35 - "Community 35"
Cohesion: 0.50
Nodes (3): exclude, extends, ./tsconfig.json

## Knowledge Gaps
- **204 isolated node(s):** `name`, `version`, `description`, `main`, `dev` (+199 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 258 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `@prisma/client` connect `Community 23` to `Community 33`, `Community 1`, `Community 3`, `Community 4`, `Community 6`, `Community 7`, `Community 9`, `Community 10`, `Community 12`, `Community 16`, `Community 20`, `Community 24`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `express` connect `Community 32` to `Community 1`, `Community 3`, `Community 5`, `Community 7`, `Community 12`, `Community 13`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 23`, `Community 24`, `Community 27`, `Community 29`, `Community 30`, `Community 31`?**
  _High betweenness centrality (0.056) - this node is a cross-community bridge._
- **Why does `ErrorHttp` connect `Community 3` to `Community 1`, `Community 5`, `Community 6`, `Community 9`, `Community 10`, `Community 12`, `Community 16`, `Community 20`, `Community 24`?**
  _High betweenness centrality (0.032) - this node is a cross-community bridge._
- **What connects `name`, `version`, `description` to the rest of the system?**
  _204 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.05740740740740741 - nodes in this community are weakly interconnected._
- **Should `Community 1` be split into smaller, more focused modules?**
  _Cohesion score 0.07387387387387387 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.06836158192090395 - nodes in this community are weakly interconnected._