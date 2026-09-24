-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "TipoNotificacion" AS ENUM ('ALERTA_LLUVIA');

-- AlterTable
ALTER TABLE "localidad" ADD COLUMN     "centroide" geometry(Point, 4326);

-- CreateTable
CREATE TABLE "notificacionEnviada" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoNotificacion" NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "titulo" VARCHAR(120) NOT NULL,
    "precipitacionMm" DOUBLE PRECISION,
    "enviadas" INTEGER NOT NULL DEFAULT 0,
    "fallidas" INTEGER NOT NULL DEFAULT 0,
    "bajas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificacionEnviada_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notificacionEnviada_localidadId_tipo_createdAt_idx" ON "notificacionEnviada"("localidadId", "tipo", "createdAt");

-- AddForeignKey
ALTER TABLE "notificacionEnviada" ADD CONSTRAINT "notificacionEnviada_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

