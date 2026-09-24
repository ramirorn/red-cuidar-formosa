# Orquestador de Conversaciones y Alertas (n8n + Ollama)

Los flujos exportados desde n8n se versionan en `n8n/flujos/*.json` y se importan con:

```bash
docker compose exec n8n n8n import:workflow --separate --input=/flujos
```

## Variables disponibles en los flujos (`$env`)

| Variable | Uso |
|---|---|
| `URL_API` | Base de la API Node dentro de la red de Docker (`http://api:3000/api`). |
| `CLAVE_SERVICIO_INTERNO` | Cabecera `x-clave-servicio` para las rutas `/api/interno/*`. |
| `URL_OLLAMA` / `MODELO_OLLAMA` | LLM local (`nemotron-3-nano:4b`), por defecto en la computadora anfitriona. |

La credencial de PostgreSQL de n8n debe usar el usuario `rol_n8n`. Ese rol solo puede escribir
`registroMeteorologico` y `triajeChat`, leer `suscripcionPush` y `localidad`, y borrar `sesionAnonima`.

## Flujos previstos

1. **Clima (cada hora):** consulta Open-Meteo por localidad, inserta en `registroMeteorologico` y, si en
   las últimas 24 h llovió 10 mm o más, llama a `POST {URL_API}/interno/manzanas/recalcular` y envía el
   Web Push de "vaciá los recipientes" a las suscripciones de esa localidad.
2. **Mantenimiento diario:** recalcula todas las manzanas (vencimiento de limpiezas de 7 días) y borra las
   sesiones anónimas con más de 30 días sin actividad. Sus suscripciones y triajes se borran en cascada;
   sus reportes se conservan sin vínculo con la sesión.
3. **Chat "IA Mosquito":** un webhook recibe el mensaje de la PWA, lo envía a Ollama con el prompt de triaje
   y guarda solo el nivel resultante en `triajeChat`. Los mensajes no se persisten en la base de la plataforma.
