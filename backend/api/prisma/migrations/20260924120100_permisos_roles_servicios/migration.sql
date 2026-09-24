-- Principio de privilegio mínimo para los servicios que comparten la base.
-- Los roles se crean en backend/db/init; si no existen (por ejemplo, en una
-- base de pruebas) se omite el otorgamiento.

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_motor') THEN
        -- Motor predictivo: lectura de datos territoriales y epidemiológicos, sin datos personales.
        GRANT SELECT ON "localidad", "manzana", "reporte", "intervencion", "registroMeteorologico", "prediccionRiesgo" TO rol_motor;
        GRANT INSERT, UPDATE, DELETE ON "prediccionRiesgo" TO rol_motor;
        GRANT USAGE, SELECT ON SEQUENCE "prediccionRiesgo_id_seq" TO rol_motor;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_n8n') THEN
        -- Orquestador: carga clima, registra triajes, lee suscripciones y limpia sesiones inactivas.
        GRANT SELECT ON "localidad" TO rol_n8n;
        GRANT SELECT, INSERT, UPDATE ON "registroMeteorologico" TO rol_n8n;
        GRANT USAGE, SELECT ON SEQUENCE "registroMeteorologico_id_seq" TO rol_n8n;
        GRANT SELECT, INSERT ON "triajeChat" TO rol_n8n;
        GRANT USAGE, SELECT ON SEQUENCE "triajeChat_id_seq" TO rol_n8n;
        GRANT SELECT, UPDATE ("activa") ON "suscripcionPush" TO rol_n8n;
        GRANT SELECT, DELETE ON "sesionAnonima" TO rol_n8n;
    END IF;
END
$$;
