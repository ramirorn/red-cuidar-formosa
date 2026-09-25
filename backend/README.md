# Red Cuidar Formosa — Backend

Plataforma de prevención epidemiológica del dengue: los vecinos reportan criaderos desde una PWA
anónima y el personal de salud los gestiona desde un dashboard institucional.

## Servicios

| Carpeta | Servicio | Tecnología | Expuesto |
|---|---|---|---|
| `../frontend/` | PWA del vecino (`/app`) y panel institucional (`/panel`) | React 19, Vite, Tailwind 4 | `:5173` |
| `api/` | API de Recepción de Evidencia + API Core del Dashboard Institucional | Node 22, Express 5, Prisma 5, TypeScript | `:3000` |
| `motor-predictivo/` | Mapa de calor, índice de riesgo y predicción a 72 h | Python 3.12, FastAPI, asyncpg | No (red interna) |
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

- Flujos de n8n: `docker compose exec n8n sh /orquestador/importar.sh && docker compose restart n8n`
  (ver `orquestador/README.md`).
- Web Push: generar las claves con `cd api && npm run generar-vapid` y cargarlas en `.env`.
- Ollama corre por defecto en la computadora anfitriona (`ollama pull nemotron-3-nano:4b`).
  Para correrlo dentro de Docker: `docker compose --profile ollama-contenedor up -d` y
  `URL_OLLAMA=http://ollama:11434` en `.env`.
- El código de `api/src` y `motor-predictivo/app` se monta en los contenedores con recarga en caliente.
- Frontend en `http://localhost:5173`: PWA del vecino en `/app` y panel institucional en `/panel`.
  Vite reenvía `/api` a la API, así el navegador ve un solo origen (necesario para la cookie de refresco).
  En Docker Desktop (Mac/Windows), si la recarga en caliente no detecta cambios: `VIGILAR_CON_SONDEO=1` en `.env`.
- Sin Docker: `cd api && npm install && npm run migrar && npm run semilla && npm run dev`.
  Usar siempre los scripts (`npm run migrar`, `npm run generar-cliente`) y no `npx prisma`: si Prisma no
  está instalado, npx descarga la última versión (7), que no es compatible con este esquema.
- Las claves de la base (`POSTGRES_PASSWORD`, `DB_*_PASSWORD`) se aplican solo al crear el volumen. Si se cambian
  después, o si el primer arranque falló, hay que recrearlo: `docker compose down -v && docker compose up -d`
  (borra los datos). Usar claves con letras, números, `-` o `_`: van dentro de la URL de conexión.
- La base no publica puertos: `docker compose exec db psql -U postgres -d red_cuidar`.

Pruebas:

```bash
cd api && npm test                                  # Vitest + Supertest (unitarias, sin base)
cd api && npm run test:integracion                  # contra PostgreSQL + PostGIS reales
cd motor-predictivo && pip install -r requirements-dev.txt && pytest pruebas
```

Las pruebas de integración usan una base exclusiva cuyo nombre debe contener `pruebas` (por defecto
`red_cuidar_pruebas`; se cambia con `DATABASE_URL_PRUEBAS`), porque la vacían en cada archivo. Cubren PostGIS,
concurrencia (reintentos y validaciones simultáneas), alcance territorial, rotación de tokens, exportación por
lotes y cantidad de consultas SQL (detección de N+1).

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

Todo reporte ciudadano entra PENDIENTE (la manzana pasa a AMARILLO, "revisar") y **solo lo valida una persona**
con permiso `reportes:validar`. La confianza de la IA la informa el dispositivo, así que únicamente ordena la bandeja
de revisión (`orden=prioridad`). Una limpieza que indica `reporteResueltoId` cierra ese criadero recién cuando se valida.
n8n dispara `POST /api/interno/manzanas/recalcular` después de cada lluvia y una vez por día.

### Índice de riesgo y predicción (motor predictivo)

- **Índice actual (0 a 1):** 50 % criaderos validados (satura en 5), 20 % reportes pendientes (satura en 5)
  y 30 % lluvia observada en los últimos 7 días (satura en 50 mm). Una manzana en ROJO nunca baja de 0,5.
  El total se pondera por el riesgo histórico de la localidad (1 para CRITICO, 0,85 para ALTO, 0,7 para MODERADO_ALTO).
- **Predicción a 72 h:** el mismo índice sumando la lluvia pronosticada, porque vuelve a llenar los recipientes.
  Se recalcula cada hora cuando n8n actualiza el clima, dura 24 h y se conservan 30 días de historial.

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

La ubicación de un reporte (casi siempre la casa de un vecino) es exacta solo para ADMINISTRADOR,
COORDINADOR_BRIGADA y BRIGADISTA, que tienen que ir al lugar; EPIDEMIOLOGO y AUDITOR la ven redondeada (≈ 110 m).
Cada vista de una foto de evidencia queda registrada en la auditoría (`VER_EVIDENCIA`).

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
| GET | `/api/auth/yo` (usuario actual, localidad y permisos para armar el menú) | Sesión |
| GET | `/api/institucional/reportes` · `/reportes/:id` | `reportes:leer` |
| PATCH | `/api/institucional/reportes/:id/estado` | `reportes:validar` |
| GET | `/api/institucional/evidencias/:id/imagen` | `evidencias:ver` |
| POST / GET | `/api/institucional/intervenciones` | `intervenciones:registrar` / `intervenciones:leer` |
| GET | `/api/institucional/metricas` | `metricas:leer` |
| GET | `/api/institucional/mapa-calor` · `/api/institucional/predicciones` | `mapa_calor:leer` |
| GET | `/api/institucional/exportaciones/reportes` · `/exportaciones/intervenciones` | `exportaciones:descargar` |
| POST / GET / PATCH | `/api/institucional/usuarios` | `usuarios:gestionar` |
| POST / GET | `/api/institucional/rutas` · GET `/rutas/:id` | `rutas:gestionar` / `rutas:leer` |
| GET | `/api/institucional/brigadistas` (para asignar rutas) | `rutas:gestionar` |
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

## Pendiente (revisión de seguridad)

Hallazgos de la revisión independiente que quedan para una próxima etapa:

- **Separar roles de base:** hoy `rol_api` es dueño del esquema y también atiende la API. Conviene un
  `rol_migrador` que corra las migraciones y un `rol_api` con permisos de lectura y escritura únicamente.
- **Creación masiva de sesiones:** el límite por IP es holgado por el CGNAT. Para frenar abusos sin bloquear
  vecinos hace falta un desafío liviano (prueba de trabajo o captcha) en `POST /api/sesiones`.
- **Fotos casi idénticas:** el control de reutilización compara el hash exacto del archivo. Un hash perceptual
  detectaría la misma foto recortada o re-guardada (hoy lo mitiga la validación humana).
- **Refresco en dos pestañas a la vez:** puede disparar la revocación por reutilización. Una ventana de gracia
  de unos segundos lo evitaría.
- **Producción:** fijar versiones de imágenes (`n8n`, `ollama`), un compose de producción con TLS, `NODE_ENV=production`,
  `CONFIAR_PROXY` según el proxy, y las rutas `/api/interno/*` fuera del puerto público.
