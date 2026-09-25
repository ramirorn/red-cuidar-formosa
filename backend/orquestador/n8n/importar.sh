#!/bin/sh
# Importa credenciales y flujos en n8n y publica los flujos.
# Uso: docker compose exec n8n sh /orquestador/importar.sh
# Las credenciales se arman con las variables de entorno del contenedor: no hay secretos en el repositorio.
set -eu

ARCHIVO=$(mktemp)
trap 'rm -f "$ARCHIVO"' EXIT

node -e '
const credenciales = [
  {
    id: "rcfPostgresN8n01",
    name: "PostgreSQL Red Cuidar (rol_n8n)",
    type: "postgres",
    data: {
      host: process.env.DB_POSTGRESDB_HOST,
      port: Number(process.env.DB_POSTGRESDB_PORT),
      database: "red_cuidar",
      user: process.env.DB_POSTGRESDB_USER,
      password: process.env.DB_POSTGRESDB_PASSWORD,
      ssl: "disable",
    },
  },
  {
    id: "rcfClaveServici1",
    name: "Clave de servicio interno",
    type: "httpHeaderAuth",
    data: { name: "x-clave-servicio", value: process.env.CLAVE_SERVICIO_INTERNO },
  },
  {
    id: "rcfOllamaLocal01",
    name: "Ollama local",
    type: "ollamaApi",
    data: { baseUrl: process.env.URL_OLLAMA },
  },
];
require("fs").writeFileSync(process.argv[1], JSON.stringify(credenciales));
' "$ARCHIVO"

n8n import:credentials --input="$ARCHIVO"
n8n import:workflow --separate --input=/flujos

for ID in rcfClimaAlertas1 rcfMantenimient1 rcfChatMosquito1 rcfChatBotTriaje; do
  n8n publish:workflow --id="$ID"
done

echo "Listo. Reiniciá n8n para activar los flujos publicados: docker compose restart n8n"
