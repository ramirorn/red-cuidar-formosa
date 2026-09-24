#!/bin/bash
# Se ejecuta una sola vez, cuando el volumen de datos de PostgreSQL está vacío.
# Crea un rol por servicio (privilegio mínimo), la base de n8n y la extensión PostGIS.
# Los permisos sobre cada tabla se otorgan en las migraciones de Prisma.
set -euo pipefail

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname "$POSTGRES_DB" \
  -v base="$POSTGRES_DB" \
  -v clave_api="$DB_API_PASSWORD" \
  -v clave_motor="$DB_MOTOR_PASSWORD" \
  -v clave_n8n="$DB_N8N_PASSWORD" <<-'EOSQL'
	-- Dueño del esquema: ejecuta las migraciones y atiende la API Node.
	CREATE ROLE rol_api LOGIN PASSWORD :'clave_api';
	-- Motor predictivo: solo lectura, salvo sus predicciones.
	CREATE ROLE rol_motor LOGIN PASSWORD :'clave_motor';
	-- Orquestador n8n: su propia base y acceso acotado a clima, triaje y suscripciones.
	CREATE ROLE rol_n8n LOGIN PASSWORD :'clave_n8n';

	CREATE EXTENSION IF NOT EXISTS postgis;
	ALTER DATABASE :"base" SET timezone TO 'UTC';

	ALTER DATABASE :"base" OWNER TO rol_api;
	ALTER SCHEMA public OWNER TO rol_api;
	REVOKE ALL ON DATABASE :"base" FROM PUBLIC;
	GRANT CONNECT ON DATABASE :"base" TO rol_api, rol_motor, rol_n8n;
	REVOKE CREATE ON SCHEMA public FROM PUBLIC;
	GRANT USAGE ON SCHEMA public TO rol_motor, rol_n8n;

	CREATE DATABASE n8n OWNER rol_n8n;
	REVOKE ALL ON DATABASE n8n FROM PUBLIC;
EOSQL
