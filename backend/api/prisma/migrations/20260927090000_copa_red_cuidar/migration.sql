-- Copa Red-Cuidar: ranking mensual de zonas (barrios, o partes de barrios grandes) por localidad,
-- con premio anónimo por código QR que canjean Coordinación y Administración.

-- AlterTable
ALTER TABLE "manzana" ADD COLUMN     "zonaId" INTEGER;

-- AlterTable
ALTER TABLE "reporte" ADD COLUMN     "premioReclamadoEn" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "zonaCompetencia" (
    "id" SERIAL NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "barrio" VARCHAR(120) NOT NULL,
    "nombre" VARCHAR(160) NOT NULL,
    "geom" geometry(MultiPolygon, 4326) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "zonaCompetencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "canjePremio" (
    "id" SERIAL NOT NULL,
    "codigo" VARCHAR(20) NOT NULL,
    "edicion" CHAR(7) NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "zonaId" INTEGER NOT NULL,
    "emitidoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "venceEn" TIMESTAMP(3) NOT NULL,
    "canjeadoEn" TIMESTAMP(3),
    "canjeadoPorId" INTEGER,

    CONSTRAINT "canjePremio_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "zonaCompetencia_geom_idx" ON "zonaCompetencia" USING GIST ("geom");

-- CreateIndex
CREATE UNIQUE INDEX "zonaCompetencia_localidadId_nombre_key" ON "zonaCompetencia"("localidadId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "canjePremio_codigo_key" ON "canjePremio"("codigo");

-- CreateIndex
CREATE INDEX "canjePremio_edicion_localidadId_idx" ON "canjePremio"("edicion", "localidadId");

-- CreateIndex
CREATE INDEX "manzana_zonaId_idx" ON "manzana"("zonaId");

-- AddForeignKey
ALTER TABLE "manzana" ADD CONSTRAINT "manzana_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonaCompetencia"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "zonaCompetencia" ADD CONSTRAINT "zonaCompetencia_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canjePremio" ADD CONSTRAINT "canjePremio_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canjePremio" ADD CONSTRAINT "canjePremio_zonaId_fkey" FOREIGN KEY ("zonaId") REFERENCES "zonaCompetencia"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "canjePremio" ADD CONSTRAINT "canjePremio_canjeadoPorId_fkey" FOREIGN KEY ("canjeadoPorId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

