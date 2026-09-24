# Red Cuidar Formosa — Backend

Plataforma de prevención epidemiológica del dengue: los vecinos reportan criaderos desde una PWA
anónima y el personal de salud los gestiona desde un dashboard institucional.

## Servicios

| Carpeta | Servicio | Tecnología | Expuesto |
|---|---|---|---|
| `api/` | API de Recepción de Evidencia + API Core del Dashboard Institucional | Node 22, Express 5, Prisma 5, TypeScript | `:3000` |
| `motor-predictivo/` | Mapa de calor e índice de riesgo | Python 3.12, FastAPI, asyncpg | No (red interna) |
| `orquestador/` | Alertas por clima, chat con LLM, tareas programadas | n8n + Ollama (`nemotron-3-nano:4b`) | `127.0.0.1:5678` |
| `db/` | Base de datos compartida | PostgreSQL 17 + PostGIS 3.5 | No (red interna) |
| — | Caché del mapa de calor | Redis 7 | No (red interna) |

## Puesta en marcha (desarrollo)

```bash
cd backend
cp .env.example .env            # completar claves y secretos
docker compose up --build -d
docker compose exec api npm run semilla   # localidades, primer administrador y grilla de ejemplo
```

- Ollama corre por defecto en la computadora anfitriona (`ollama pull nemotron-3-nano:4b`).
  Para correrlo dentro de Docker: `docker compose --profile ollama-contenedor up -d` y
  `URL_OLLAMA=http://ollama:11434` en `.env`.
- El código de `api/src` y `motor-predictivo/app` se monta en los contenedores con recarga en caliente.
- La base no publica puertos: `docker compose exec db psql -U postgres -d red_cuidar`.

Pruebas:

```bash
cd api && npm test                                  # Vitest + Supertest
cd motor-predictivo && pip install -r requirements-dev.txt && pytest pruebas
```

## Convenciones de código

Siguen la plantilla VaquitaApp (rama `develop`):

- Capas `routes → controllers → services`, más `middlewares`, `validators`, `config` y `utils`.
- Archivos `<entidad>.<capa>.ts`, funciones flecha exportadas, servicios con sufijo `Service`.
- Respuestas `{ status: 'success', data, pagination? }` y `{ status: 'error', message, errors? }`.
- Los servicios lanzan `ErrorHttp(estado, mensaje)` y los controladores responden con `responderError`.
- Entradas validadas con express-validator; los controladores solo leen `matchedData` (nunca `req.body` crudo).

## Base de datos

El esquema está en `api/prisma/schema.prisma`. Las columnas PostGIS se declaran `Unsupported`,
se leen y escriben con `$queryRaw` parametrizado y tienen índices GIST.

- **Territorio:** `localidad`, `manzana` (polígono, centroide y estado de color), `historialEstadoManzana`.
- **Ciudadanía:** `sesionAnonima`, `reporte`, `deteccionIa`, `evidencia`, `suscripcionPush`, `triajeChat`.
- **Personal institucional:** `usuario`, `tokenRefresco`, `auditoriaAcceso`.
- **Campo:** `intervencion` (BTI, fumigación, descacharrado, inspección), `rutaBrigada`, `paradaRuta`.
- **Clima y predicción:** `registroMeteorologico`, `prediccionRiesgo`.

Cada servicio se conecta con su propio rol (privilegio mínimo, ver `db/init` y la migración `permisos_roles_servicios`):

| Rol | Acceso |
|---|---|
| `rol_api` | Dueño del esquema; ejecuta migraciones. |
| `rol_motor` | Solo lectura sobre territorio, reportes, intervenciones y clima; escribe `prediccionRiesgo`. Sin acceso a usuarios. |
| `rol_n8n` | Su base `n8n`; en `red_cuidar`, carga clima y triajes, lee suscripciones y borra sesiones inactivas. |

### Color de las manzanas

| Estado | Regla |
|---|---|
| ROJO | Hay un criadero o microbasural validado y sin resolver. |
| VERDE | Limpieza validada, o BTI/descacharrado, en los últimos 7 días, sin ≥ 10 mm de lluvia posterior y sin reportes pendientes. |
| AMARILLO | Hubo actividad, pero la limpieza venció, llovió después o hay reportes pendientes. |
| SIN_DATOS | La manzana nunca tuvo reportes ni intervenciones. |

Un reporte se valida solo si la IA del dispositivo informa una confianza ≥ 0,6; si no, queda PENDIENTE para revisión.
n8n dispara `POST /api/interno/manzanas/recalcular` después de cada lluvia y una vez por día.

## Control de acceso (RBAC)

Cada ruta institucional pasa por `verificarToken → requierePermiso(permiso) → validación → controlador`.
Además, cada servicio aplica un **alcance territorial**: los roles locales solo ven su localidad.
Si alguien pide un recurso de otra localidad, recibe 404, así no puede confirmar que ese recurso existe.

| Permiso | ADMINISTRADOR | EPIDEMIOLOGO | COORDINADOR_BRIGADA | BRIGADISTA | AUDITOR |
|---|:-:|:-:|:-:|:-:|:-:|
| Leer reportes | ✔ | ✔ | ✔ | ✔ | ✔ |
| Validar / rechazar / resolver reportes | ✔ | ✔ | ✔ | | |
| Ver fotos de evidencia | ✔ | ✔ | ✔ | ✔ | |
| Registrar intervenciones | ✔ | | ✔ | ✔ | |
| Leer intervenciones | ✔ | ✔ | ✔ | ✔ | ✔ |
| Métricas epidemiológicas | ✔ | ✔ | ✔ | | ✔ |
| Mapa de calor | ✔ | ✔ | ✔ | ✔ | ✔ |
| Exportar CSV | ✔ (coordenadas exactas) | ✔ (≈ 110 m) | ✔ (≈ 110 m) | | |
| Ver rutas de brigada | ✔ | ✔ | ✔ | ✔ (solo las asignadas) | ✔ |
| Generar rutas | ✔ | | ✔ | | |
| Ejecutar rutas (iniciar, marcar paradas) | ✔ | | ✔ | ✔ (no puede cancelar) | |
| Gestionar usuarios | ✔ | | | | |
| Leer auditoría | ✔ | | | | ✔ |
| **Alcance** | Provincia | Provincia | Su localidad | Su localidad | Provincia |

- **ADMINISTRADOR:** gestión de cuentas y acceso total.
- **EPIDEMIOLOGO:** análisis provincial y validación técnica de reportes; no opera en el campo.
- **COORDINADOR_BRIGADA:** conduce el operativo de su localidad; valida reportes, registra intervenciones y exporta sus datos.
- **BRIGADISTA:** trabaja en el campo; ve reportes y fotos de su localidad y registra lo que hizo.
- **AUDITOR:** control externo de solo lectura; ve métricas y auditoría, pero no las fotos de los domicilios.

Rol, localidad y estado activo se leen de la base en cada petición: una baja o un cambio de rol
tiene efecto inmediato, aunque el token de acceso todavía no haya vencido.

## Endpoints

El contrato completo está en [`api/openapi.yaml`](api/openapi.yaml) (OpenAPI 3.1). En desarrollo se publica en
`GET /api/documentacion/openapi.yaml` y se valida con `npx @redocly/cli lint api/openapi.yaml`.
La prueba `contrato.test.ts` falla si el contrato documenta una ruta que la API no tiene.

**Ruteo de brigadas:** una ruta toma primero las manzanas en ROJO y después las AMARILLAS más recientes,
sin repetir las que ya están en otra ruta activa del mismo día. Las paradas se ordenan por vecino más
cercano desde el punto de partida. Una intervención registrada con `paradaRutaId` marca la parada como visitada.

### Ciudadanía (anónima)

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/sesiones` | Crea una sesión anónima y devuelve su token. |
| POST | `/api/reportes` | Multipart: `imagenes` (1 a 3 JPEG/PNG/WebP, ≤ 5 MB), `idCliente` (UUID de la PWA), `tipo`, `latitud`, `longitud`, `capturadoEn`, `confianzaIa?`, `precisionGpsM?`, `descripcion?`, `detecciones?` (JSON), `reporteResueltoId?`. Es idempotente por `idCliente`: responde 201 si lo crea y 200 si ya existía. |
| GET | `/api/reportes/mios` | Reportes de la sesión, para conciliar la cola de Background Sync. |
| GET | `/api/manzanas?longitudMinima&latitudMinima&longitudMaxima&latitudMaxima` | GeoJSON público del mapa comunitario (recuadro ≤ 0,1°). |
| POST / DELETE | `/api/suscripciones-push` | Alta y baja de la suscripción Web Push. |

### Dashboard institucional

| Método | Ruta | Permiso |
|---|---|---|
| POST | `/api/auth/login` · `/api/auth/refrescar` · `/api/auth/cerrar-sesion` | — |
| GET | `/api/institucional/reportes` · `/reportes/:id` | `reportes:leer` |
| PATCH | `/api/institucional/reportes/:id/estado` | `reportes:validar` |
| GET | `/api/institucional/evidencias/:id/imagen` | `evidencias:ver` |
| POST / GET | `/api/institucional/intervenciones` | `intervenciones:registrar` / `intervenciones:leer` |
| GET | `/api/institucional/metricas` | `metricas:leer` |
| GET | `/api/institucional/mapa-calor` | `mapa_calor:leer` |
| GET | `/api/institucional/exportaciones/reportes` · `/exportaciones/intervenciones` | `exportaciones:descargar` |
| POST / GET / PATCH | `/api/institucional/usuarios` | `usuarios:gestionar` |
| POST / GET | `/api/institucional/rutas` · GET `/rutas/:id` | `rutas:gestionar` / `rutas:leer` |
| PATCH | `/api/institucional/rutas/:id/estado` · `/rutas/:id/paradas/:paradaId/visitada` | `rutas:ejecutar` |
| GET | `/api/institucional/auditoria` | `auditoria:leer` |

Los listados usan paginación por cursor (`limite` ≤ 200, `cursor` opaco) y los rangos de fecha tienen un máximo de 366 días.

### Interno (n8n)

| Método | Ruta | Autenticación |
|---|---|---|
| POST | `/api/interno/manzanas/recalcular` | Cabecera `x-clave-servicio` |

## Seguridad aplicada

- **Imágenes:** límite de tamaño y cantidad; se verifica la firma binaria real (no la extensión); se re-codifican
  con sharp, con un límite de píxeles para frenar bombas de descompresión; se eliminan los metadatos EXIF (incluido el GPS).
  El nombre de cada archivo lo genera el servidor, no se puede reutilizar una foto (hash SHA-256 único)
  y las fotos solo se sirven autenticadas.
- **Autenticación:** tokens distintos (secreto y audiencia propios) para la ciudadanía y para el personal.
  JWT solo HS256 con emisor verificado. El token de refresco es opaco, va en una cookie httpOnly y SameSite=Strict,
  rota en cada uso y, si se reutiliza, se revocan todas las sesiones del usuario.
  El login compara contra un hash de relleno cuando el email no existe, para no revelar qué emails están registrados.
- **Autorización:** permiso por ruta, alcance territorial en los servicios y auditoría de exportaciones y gestión de usuarios.
- **Datos:** consultas siempre parametrizadas y cursores validados. Las exportaciones CSV neutralizan fórmulas de
  planillas de cálculo y nunca incluyen el id de sesión ciudadana.
- **Rendimiento:** agregaciones en SQL, relaciones cargadas en lote (sin N+1), índices GIST y compuestos,
  exportaciones por lotes con paginación keyset y control de contrapresión.
- **Infraestructura:** red interna sin salida a internet para la base, Redis y el motor; contenedores sin root;
  un rol de base de datos por servicio; límites de tasa (los reportes, por sesión, por el CGNAT de las redes móviles).
