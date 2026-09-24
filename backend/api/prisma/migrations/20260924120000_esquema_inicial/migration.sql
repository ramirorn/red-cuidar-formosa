-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "NivelRiesgo" AS ENUM ('CRITICO', 'ALTO', 'MODERADO_ALTO', 'MODERADO');

-- CreateEnum
CREATE TYPE "EstadoManzana" AS ENUM ('SIN_DATOS', 'VERDE', 'AMARILLO', 'ROJO');

-- CreateEnum
CREATE TYPE "TipoReporte" AS ENUM ('CRIADERO', 'MICROBASURAL', 'LIMPIEZA');

-- CreateEnum
CREATE TYPE "OrigenReporte" AS ENUM ('PWA', 'CHAT');

-- CreateEnum
CREATE TYPE "EstadoReporte" AS ENUM ('PENDIENTE', 'VALIDADO', 'RECHAZADO', 'RESUELTO');

-- CreateEnum
CREATE TYPE "ClaseObjeto" AS ENUM ('NEUMATICO', 'BOTELLA', 'BALDE', 'MACETA', 'TANQUE', 'BEBEDERO', 'FLORERO', 'OTRO');

-- CreateEnum
CREATE TYPE "MomentoEvidencia" AS ENUM ('ANTES', 'DESPUES');

-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMINISTRADOR', 'EPIDEMIOLOGO', 'COORDINADOR_BRIGADA', 'BRIGADISTA', 'AUDITOR');

-- CreateEnum
CREATE TYPE "TipoIntervencion" AS ENUM ('APLICACION_BTI', 'FUMIGACION', 'DESCACHARRADO', 'INSPECCION');

-- CreateEnum
CREATE TYPE "EstadoRuta" AS ENUM ('PLANIFICADA', 'EN_CURSO', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "NivelTriaje" AS ENUM ('SIN_RIESGO', 'LEVE', 'MODERADO', 'URGENTE');

-- CreateTable
CREATE TABLE "localidad" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "nivelRiesgoBase" "NivelRiesgo" NOT NULL,
    "geom" geometry(MultiPolygon, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "localidad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "manzana" (
    "id" SERIAL NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "geom" geometry(Polygon, 4326) NOT NULL,
    "centroide" geometry(Point, 4326) NOT NULL,
    "estado" "EstadoManzana" NOT NULL DEFAULT 'SIN_DATOS',
    "estadoActualizadoEn" TIMESTAMP(3),
    "ultimoReporteEn" TIMESTAMP(3),
    "ultimaLimpiezaEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manzana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historialEstadoManzana" (
    "id" SERIAL NOT NULL,
    "manzanaId" INTEGER NOT NULL,
    "estadoAnterior" "EstadoManzana" NOT NULL,
    "estadoNuevo" "EstadoManzana" NOT NULL,
    "motivo" VARCHAR(200) NOT NULL,
    "reporteId" UUID,
    "intervencionId" UUID,
    "usuarioId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historialEstadoManzana_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sesionAnonima" (
    "id" UUID NOT NULL,
    "ultimaActividadEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesionAnonima_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reporte" (
    "id" UUID NOT NULL,
    "idCliente" UUID NOT NULL,
    "sesionId" UUID,
    "manzanaId" INTEGER,
    "tipo" "TipoReporte" NOT NULL,
    "origen" "OrigenReporte" NOT NULL DEFAULT 'PWA',
    "estado" "EstadoReporte" NOT NULL DEFAULT 'PENDIENTE',
    "ubicacion" geography(Point, 4326) NOT NULL,
    "precisionGpsM" DOUBLE PRECISION,
    "confianzaIa" DOUBLE PRECISION,
    "descripcion" VARCHAR(500),
    "reporteResueltoId" UUID,
    "capturadoEn" TIMESTAMP(3) NOT NULL,
    "validadoPorId" INTEGER,
    "validadoEn" TIMESTAMP(3),
    "motivoRechazo" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deteccionIa" (
    "id" SERIAL NOT NULL,
    "reporteId" UUID NOT NULL,
    "clase" "ClaseObjeto" NOT NULL,
    "confianza" DOUBLE PRECISION NOT NULL,
    "cajaDelimitadora" JSONB NOT NULL,

    CONSTRAINT "deteccionIa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidencia" (
    "id" UUID NOT NULL,
    "reporteId" UUID NOT NULL,
    "rutaAlmacenamiento" TEXT NOT NULL,
    "mime" VARCHAR(50) NOT NULL,
    "tamanoBytes" INTEGER NOT NULL,
    "sha256" CHAR(64) NOT NULL,
    "ancho" INTEGER NOT NULL,
    "alto" INTEGER NOT NULL,
    "momento" "MomentoEvidencia" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suscripcionPush" (
    "id" SERIAL NOT NULL,
    "sesionId" UUID NOT NULL,
    "endpoint" VARCHAR(1000) NOT NULL,
    "p256dh" VARCHAR(200) NOT NULL,
    "auth" VARCHAR(100) NOT NULL,
    "localidadId" INTEGER,
    "manzanaId" INTEGER,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suscripcionPush_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "triajeChat" (
    "id" SERIAL NOT NULL,
    "sesionId" UUID NOT NULL,
    "nivel" "NivelTriaje" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "triajeChat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "rol" "Rol" NOT NULL,
    "localidadId" INTEGER,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAccesoEn" TIMESTAMP(3),
    "eliminadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokenRefresco" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "hashToken" CHAR(64) NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "revocadoEn" TIMESTAMP(3),
    "ip" VARCHAR(64),
    "userAgent" VARCHAR(300),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokenRefresco_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoriaAcceso" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "accion" VARCHAR(60) NOT NULL,
    "recurso" VARCHAR(200) NOT NULL,
    "filtros" JSONB,
    "ip" VARCHAR(64),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoriaAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "intervencion" (
    "id" UUID NOT NULL,
    "tipo" "TipoIntervencion" NOT NULL,
    "manzanaId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "reporteId" UUID,
    "paradaRutaId" INTEGER,
    "realizadaEn" TIMESTAMP(3) NOT NULL,
    "ubicacion" geography(Point, 4326),
    "cantidadProducto" DOUBLE PRECISION,
    "unidadProducto" VARCHAR(20),
    "tipoCuerpoAgua" VARCHAR(100),
    "observaciones" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "intervencion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rutaBrigada" (
    "id" SERIAL NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "coordinadorId" INTEGER NOT NULL,
    "brigadistaId" INTEGER,
    "fecha" DATE NOT NULL,
    "estado" "EstadoRuta" NOT NULL DEFAULT 'PLANIFICADA',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rutaBrigada_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paradaRuta" (
    "id" SERIAL NOT NULL,
    "rutaId" INTEGER NOT NULL,
    "manzanaId" INTEGER NOT NULL,
    "orden" INTEGER NOT NULL,
    "visitadaEn" TIMESTAMP(3),

    CONSTRAINT "paradaRuta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "registroMeteorologico" (
    "id" SERIAL NOT NULL,
    "localidadId" INTEGER NOT NULL,
    "observadoEn" TIMESTAMP(3) NOT NULL,
    "precipitacionMm" DOUBLE PRECISION NOT NULL,
    "temperaturaC" DOUBLE PRECISION,
    "humedadRelativa" DOUBLE PRECISION,
    "esPronostico" BOOLEAN NOT NULL DEFAULT false,
    "fuente" VARCHAR(50) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "registroMeteorologico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prediccionRiesgo" (
    "id" SERIAL NOT NULL,
    "manzanaId" INTEGER NOT NULL,
    "indiceRiesgo" DOUBLE PRECISION NOT NULL,
    "calculadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenteHasta" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prediccionRiesgo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "localidad_nombre_key" ON "localidad"("nombre");

-- CreateIndex
CREATE INDEX "localidad_geom_idx" ON "localidad" USING GIST ("geom");

-- CreateIndex
CREATE INDEX "manzana_localidadId_estado_idx" ON "manzana"("localidadId", "estado");

-- CreateIndex
CREATE INDEX "manzana_geom_idx" ON "manzana" USING GIST ("geom");

-- CreateIndex
CREATE INDEX "manzana_centroide_idx" ON "manzana" USING GIST ("centroide");

-- CreateIndex
CREATE UNIQUE INDEX "manzana_localidadId_codigo_key" ON "manzana"("localidadId", "codigo");

-- CreateIndex
CREATE INDEX "historialEstadoManzana_manzanaId_createdAt_idx" ON "historialEstadoManzana"("manzanaId", "createdAt");

-- CreateIndex
CREATE INDEX "sesionAnonima_ultimaActividadEn_idx" ON "sesionAnonima"("ultimaActividadEn");

-- CreateIndex
CREATE INDEX "reporte_manzanaId_capturadoEn_idx" ON "reporte"("manzanaId", "capturadoEn");

-- CreateIndex
CREATE INDEX "reporte_estado_createdAt_idx" ON "reporte"("estado", "createdAt");

-- CreateIndex
CREATE INDEX "reporte_createdAt_id_idx" ON "reporte"("createdAt", "id");

-- CreateIndex
CREATE INDEX "reporte_ubicacion_idx" ON "reporte" USING GIST ("ubicacion");

-- CreateIndex
CREATE UNIQUE INDEX "reporte_sesionId_idCliente_key" ON "reporte"("sesionId", "idCliente");

-- CreateIndex
CREATE INDEX "deteccionIa_reporteId_idx" ON "deteccionIa"("reporteId");

-- CreateIndex
CREATE UNIQUE INDEX "evidencia_rutaAlmacenamiento_key" ON "evidencia"("rutaAlmacenamiento");

-- CreateIndex
CREATE UNIQUE INDEX "evidencia_sha256_key" ON "evidencia"("sha256");

-- CreateIndex
CREATE INDEX "evidencia_reporteId_idx" ON "evidencia"("reporteId");

-- CreateIndex
CREATE UNIQUE INDEX "suscripcionPush_endpoint_key" ON "suscripcionPush"("endpoint");

-- CreateIndex
CREATE INDEX "suscripcionPush_localidadId_activa_idx" ON "suscripcionPush"("localidadId", "activa");

-- CreateIndex
CREATE INDEX "triajeChat_createdAt_idx" ON "triajeChat"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE INDEX "usuario_rol_localidadId_idx" ON "usuario"("rol", "localidadId");

-- CreateIndex
CREATE UNIQUE INDEX "tokenRefresco_hashToken_key" ON "tokenRefresco"("hashToken");

-- CreateIndex
CREATE INDEX "tokenRefresco_usuarioId_idx" ON "tokenRefresco"("usuarioId");

-- CreateIndex
CREATE INDEX "auditoriaAcceso_usuarioId_createdAt_idx" ON "auditoriaAcceso"("usuarioId", "createdAt");

-- CreateIndex
CREATE INDEX "auditoriaAcceso_accion_createdAt_idx" ON "auditoriaAcceso"("accion", "createdAt");

-- CreateIndex
CREATE INDEX "intervencion_manzanaId_realizadaEn_idx" ON "intervencion"("manzanaId", "realizadaEn");

-- CreateIndex
CREATE INDEX "intervencion_tipo_realizadaEn_idx" ON "intervencion"("tipo", "realizadaEn");

-- CreateIndex
CREATE INDEX "intervencion_ubicacion_idx" ON "intervencion" USING GIST ("ubicacion");

-- CreateIndex
CREATE INDEX "rutaBrigada_localidadId_fecha_idx" ON "rutaBrigada"("localidadId", "fecha");

-- CreateIndex
CREATE UNIQUE INDEX "paradaRuta_rutaId_orden_key" ON "paradaRuta"("rutaId", "orden");

-- CreateIndex
CREATE UNIQUE INDEX "registroMeteorologico_localidadId_observadoEn_esPronostico__key" ON "registroMeteorologico"("localidadId", "observadoEn", "esPronostico", "fuente");

-- CreateIndex
CREATE INDEX "prediccionRiesgo_manzanaId_calculadoEn_idx" ON "prediccionRiesgo"("manzanaId", "calculadoEn");

-- AddForeignKey
ALTER TABLE "manzana" ADD CONSTRAINT "manzana_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historialEstadoManzana" ADD CONSTRAINT "historialEstadoManzana_manzanaId_fkey" FOREIGN KEY ("manzanaId") REFERENCES "manzana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte" ADD CONSTRAINT "reporte_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesionAnonima"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte" ADD CONSTRAINT "reporte_manzanaId_fkey" FOREIGN KEY ("manzanaId") REFERENCES "manzana"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte" ADD CONSTRAINT "reporte_reporteResueltoId_fkey" FOREIGN KEY ("reporteResueltoId") REFERENCES "reporte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reporte" ADD CONSTRAINT "reporte_validadoPorId_fkey" FOREIGN KEY ("validadoPorId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "deteccionIa" ADD CONSTRAINT "deteccionIa_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "reporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidencia" ADD CONSTRAINT "evidencia_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "reporte"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripcionPush" ADD CONSTRAINT "suscripcionPush_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesionAnonima"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripcionPush" ADD CONSTRAINT "suscripcionPush_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suscripcionPush" ADD CONSTRAINT "suscripcionPush_manzanaId_fkey" FOREIGN KEY ("manzanaId") REFERENCES "manzana"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "triajeChat" ADD CONSTRAINT "triajeChat_sesionId_fkey" FOREIGN KEY ("sesionId") REFERENCES "sesionAnonima"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usuario" ADD CONSTRAINT "usuario_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidad"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tokenRefresco" ADD CONSTRAINT "tokenRefresco_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoriaAcceso" ADD CONSTRAINT "auditoriaAcceso_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_manzanaId_fkey" FOREIGN KEY ("manzanaId") REFERENCES "manzana"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_reporteId_fkey" FOREIGN KEY ("reporteId") REFERENCES "reporte"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "intervencion" ADD CONSTRAINT "intervencion_paradaRutaId_fkey" FOREIGN KEY ("paradaRutaId") REFERENCES "paradaRuta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutaBrigada" ADD CONSTRAINT "rutaBrigada_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutaBrigada" ADD CONSTRAINT "rutaBrigada_coordinadorId_fkey" FOREIGN KEY ("coordinadorId") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rutaBrigada" ADD CONSTRAINT "rutaBrigada_brigadistaId_fkey" FOREIGN KEY ("brigadistaId") REFERENCES "usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paradaRuta" ADD CONSTRAINT "paradaRuta_rutaId_fkey" FOREIGN KEY ("rutaId") REFERENCES "rutaBrigada"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "paradaRuta" ADD CONSTRAINT "paradaRuta_manzanaId_fkey" FOREIGN KEY ("manzanaId") REFERENCES "manzana"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "registroMeteorologico" ADD CONSTRAINT "registroMeteorologico_localidadId_fkey" FOREIGN KEY ("localidadId") REFERENCES "localidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prediccionRiesgo" ADD CONSTRAINT "prediccionRiesgo_manzanaId_fkey" FOREIGN KEY ("manzanaId") REFERENCES "manzana"("id") ON DELETE CASCADE ON UPDATE CASCADE;

