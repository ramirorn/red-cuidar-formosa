-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateIndex
CREATE INDEX "intervencion_realizadaEn_id_idx" ON "intervencion"("realizadaEn", "id");

-- CreateIndex
CREATE INDEX "intervencion_paradaRutaId_idx" ON "intervencion"("paradaRutaId");

-- CreateIndex
CREATE INDEX "paradaRuta_manzanaId_idx" ON "paradaRuta"("manzanaId");

-- CreateIndex
CREATE INDEX "prediccionRiesgo_vigenteHasta_idx" ON "prediccionRiesgo"("vigenteHasta");

-- CreateIndex
CREATE INDEX "prediccionRiesgo_calculadoEn_idx" ON "prediccionRiesgo"("calculadoEn");


-- Privilegio mínimo por columna para el motor predictivo: solo lo que usan sus consultas.
-- No accede a la sesión ciudadana, la descripción, las fotos ni los datos del personal.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'rol_motor') THEN
        REVOKE SELECT ON "reporte", "intervencion" FROM rol_motor;
        GRANT SELECT ("id", "manzanaId", "tipo", "estado", "createdAt") ON "reporte" TO rol_motor;
    END IF;
END
$$;
