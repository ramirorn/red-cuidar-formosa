-- Privacidad por diseño.
-- 1. El reporte ya no guarda ubicación exacta, precisión del GPS ni la sesión que lo envió:
--    solo la manzana. Los reportes fuera de manzanas no se admiten.
-- 2. Las fotos se borran al decidir el reporte o a las 72 horas; queda el hash contra la reutilización.
-- 3. Se descartan el GPS y las fotos recolectados hasta ahora (datos de prueba).

-- Fotos anteriores: se eliminan los registros; los archivos los limpia el mantenimiento (archivos sin registro).
DELETE FROM "evidencia";

-- Reportes sin manzana: ya no se admiten.
DELETE FROM "reporte" WHERE "manzanaId" IS NULL;

ALTER TABLE "reporte" DROP CONSTRAINT IF EXISTS "reporte_sesionId_fkey";
DROP INDEX IF EXISTS "reporte_sesionId_idCliente_key";
DROP INDEX IF EXISTS "reporte_ubicacion_idx";
ALTER TABLE "reporte" DROP COLUMN "sesionId",
                      DROP COLUMN "ubicacion",
                      DROP COLUMN "precisionGpsM";

ALTER TABLE "reporte" DROP CONSTRAINT IF EXISTS "reporte_manzanaId_fkey";
ALTER TABLE "reporte" ALTER COLUMN "manzanaId" SET NOT NULL;
ALTER TABLE "reporte" ADD CONSTRAINT "reporte_manzanaId_fkey"
    FOREIGN KEY ("manzanaId") REFERENCES "manzana"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "reporte_idCliente_key" ON "reporte"("idCliente");

ALTER TABLE "evidencia" ALTER COLUMN "rutaAlmacenamiento" DROP NOT NULL,
                        ADD COLUMN "borradaEn" TIMESTAMP(3);
