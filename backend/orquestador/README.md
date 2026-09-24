# Orquestador de Conversaciones y Alertas (n8n + Ollama)

## Puesta en marcha

```bash
docker compose up -d
docker compose exec n8n sh /orquestador/importar.sh   # credenciales + flujos + publicación
docker compose restart n8n                            # activa los flujos publicados
```

`importar.sh` arma las credenciales con las variables de entorno del contenedor (usuario `rol_n8n` y
`CLAVE_SERVICIO_INTERNO`), así que el repositorio no contiene secretos. Es idempotente: se puede volver a
correr después de modificar un flujo.

Para ejecutar un flujo a mano (la CLI necesita otro puerto porque n8n ya está corriendo):

```bash
docker compose exec -e N8N_RUNNERS_BROKER_PORT=5690 n8n n8n execute --id=rcfClimaAlertas1
```

Si se edita un flujo desde la interfaz (http://localhost:5678), hay que exportarlo y reemplazar el archivo de `n8n/flujos/`.

## Variables disponibles en los flujos (`$env`)

| Variable | Uso |
|---|---|
| `URL_API` | API Node dentro de la red de Docker (`http://api:3000/api`). |
| `URL_API_CLIMA` | Open-Meteo (`https://api.open-meteo.com`, sin clave). |
| `URL_OLLAMA` / `MODELO_OLLAMA` | LLM local (`nemotron-3-nano:4b`), por defecto en la computadora anfitriona. |

## Flujos

### `clima-alertas.json`: Clima y alertas post-lluvia (cada hora, al minuto 5)

1. Lee las localidades y su punto de referencia (`rol_n8n` tiene solo lectura sobre `localidad`).
2. Consulta Open-Meteo: 2 días hacia atrás y 3 de pronóstico, con 3 reintentos.
3. Guarda todas las horas en **una sola consulta** (`jsonb_array_elements` + `ON CONFLICT`). Las horas pasadas
   quedan como observación y las futuras, como pronóstico.
4. Toma las localidades con **≥ 10 mm observados en las últimas 24 h** y, para cada una:
   - `POST /api/interno/manzanas/recalcular`: las manzanas limpiadas antes de la lluvia pasan a AMARILLO.
   - `POST /api/interno/notificaciones/lluvia`: Web Push "vaciá, cepillá y tapá". La API limita a una alerta
     cada 12 h por localidad, así que las corridas horarias no repiten la alerta.

### `mantenimiento-diario.json`: Mantenimiento diario (03:10)

1. Recalcula todas las manzanas: vence las limpiezas de más de 7 días.
2. Borra las sesiones anónimas con más de 30 días sin actividad. Sus suscripciones y triajes se borran en
   cascada; sus reportes se conservan sin vínculo con la sesión.

### `chat-mosquito.json`: Chat "IA Mosquito" (webhook)

La PWA nunca llama a n8n directamente. `POST /api/chat/mensajes` autentica la sesión, limita la tasa y
reenvía el mensaje al webhook `chat-mosquito`, protegido con la cabecera `x-clave-servicio` (sin ella responde 403).

1. Arma la conversación: instrucciones del sistema, hasta 10 mensajes de historial y el mensaje nuevo.
2. Llama a Ollama (`/api/chat`) exigiendo la salida en formato JSON `{ respuesta, nivelTriaje }`.
3. Valida la salida. Si el modelo no respeta el formato o no responde, devuelve un mensaje de respaldo con
   los signos de alarma. Ante URGENTE agrega la derivación a la guardia o al 107.
4. Guarda **solo el nivel de triaje** en `triajeChat`. El texto de la conversación no se guarda.
