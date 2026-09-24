#!/bin/sh
# Solo se usa con el perfil "ollama-contenedor": levanta Ollama y descarga el modelo si falta.
set -e

ollama serve &
PID=$!

until ollama list >/dev/null 2>&1; do
  sleep 1
done

ollama pull "${MODELO_OLLAMA:-nemotron-3-nano:4b}"

wait $PID
