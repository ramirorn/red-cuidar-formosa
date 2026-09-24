import json
import logging
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from app.config.bd import obtener_pool
from app.config.cache import CLAVE_VERSION_MAPA_CALOR, obtener_cache
from app.config.entorno import obtener_entorno

logger = logging.getLogger(__name__)

# Peso del riesgo histórico de cada localidad (documento del proyecto).
MULTIPLICADOR_RIESGO_BASE = {
    "CRITICO": 1.0,
    "ALTO": 0.85,
    "MODERADO_ALTO": 0.7,
    "MODERADO": 0.55,
}

TOPE_REPORTES = 5
TOPE_LLUVIA_MM = 50.0
DIAS_LLUVIA = 7
# Ventana de redondeo de fechas: consultas dentro de los mismos 5 minutos comparten caché.
VENTANA_CACHE = timedelta(minutes=5)


@dataclass(frozen=True)
class FactoresRiesgo:
    reportes_validados: int
    reportes_pendientes: int
    lluvia_mm: float
    nivel_riesgo_base: str
    estado_manzana: str


def calcular_indice_riesgo(factores: FactoresRiesgo) -> float:
    """Índice de 0 a 1 que combina evidencia ciudadana, lluvia reciente y riesgo histórico.

    - 50 %: criaderos validados (satura en 5).
    - 20 %: reportes pendientes de revisión (satura en 5).
    - 30 %: lluvia acumulada en los últimos 7 días (satura en 50 mm).
    Una manzana en ROJO nunca baja de 0.5. El total se pondera por el riesgo de la localidad.
    """
    evidencia = 0.5 * min(factores.reportes_validados, TOPE_REPORTES) / TOPE_REPORTES
    pendientes = 0.2 * min(factores.reportes_pendientes, TOPE_REPORTES) / TOPE_REPORTES
    clima = 0.3 * min(max(factores.lluvia_mm, 0.0), TOPE_LLUVIA_MM) / TOPE_LLUVIA_MM

    indice = evidencia + pendientes + clima
    if factores.estado_manzana == "ROJO":
        indice = max(indice, 0.5)

    multiplicador = MULTIPLICADOR_RIESGO_BASE.get(factores.nivel_riesgo_base, 0.55)
    return round(min(indice * multiplicador, 1.0), 3)


def _redondear(fecha: datetime) -> datetime:
    """Pasa a UTC sin zona (así se guardan las fechas) y redondea hacia abajo a la ventana de caché."""
    utc = fecha.astimezone(timezone.utc).replace(tzinfo=None)
    segundos = int(VENTANA_CACHE.total_seconds())
    return datetime.fromtimestamp((int(utc.timestamp()) // segundos) * segundos)


# Una sola consulta agregada para todas las manzanas del área (sin consultas N+1).
# Aprovecha los índices (manzanaId, capturadoEn) de reporte y (localidadId, estado) de manzana.
CONSULTA_MAPA_CALOR = """
    WITH lluvia AS (
        SELECT "localidadId", SUM("precipitacionMm") AS mm
        FROM "registroMeteorologico"
        WHERE "esPronostico" = false
          AND "observadoEn" > $2::timestamp - make_interval(days => $4::int)
          AND "observadoEn" <= $2::timestamp
        GROUP BY "localidadId"
    ),
    reportes AS (
        SELECT r."manzanaId",
               COUNT(*) FILTER (WHERE r."estado" = 'VALIDADO') AS validados,
               COUNT(*) FILTER (WHERE r."estado" = 'PENDIENTE') AS pendientes
        FROM "reporte" r
        WHERE r."manzanaId" IS NOT NULL
          AND r."tipo" IN ('CRIADERO', 'MICROBASURAL')
          AND r."createdAt" BETWEEN $1::timestamp AND $2::timestamp
        GROUP BY r."manzanaId"
    )
    SELECT m."id", m."codigo", m."estado"::text AS estado, m."localidadId",
           l."nivelRiesgoBase"::text AS nivel_riesgo_base,
           ST_X(m."centroide") AS longitud, ST_Y(m."centroide") AS latitud,
           COALESCE(rp.validados, 0) AS validados,
           COALESCE(rp.pendientes, 0) AS pendientes,
           COALESCE(ll.mm, 0)::float8 AS lluvia_mm
    FROM "manzana" m
    JOIN "localidad" l ON l."id" = m."localidadId"
    LEFT JOIN reportes rp ON rp."manzanaId" = m."id"
    LEFT JOIN lluvia ll ON ll."localidadId" = m."localidadId"
    WHERE (rp."manzanaId" IS NOT NULL OR m."estado" IN ('ROJO', 'AMARILLO'))
      AND ($3::int IS NULL OR m."localidadId" = $3::int)
"""


async def _leer_cache(clave_base: str) -> tuple[str | None, str | None]:
    """Devuelve (clave completa, contenido en caché). Si Redis falla, se sigue sin caché."""
    cache = obtener_cache()
    if cache is None:
        return None, None
    try:
        version = await cache.get(CLAVE_VERSION_MAPA_CALOR) or "0"
        clave = f"mapa_calor:v{version}:{clave_base}"
        return clave, await cache.get(clave)
    except Exception as error:  # noqa: BLE001 - la caché nunca debe tumbar el servicio
        logger.warning("Caché no disponible: %s", error)
        return None, None


async def _guardar_cache(clave: str | None, contenido: str) -> None:
    cache = obtener_cache()
    if cache is None or clave is None:
        return
    try:
        await cache.set(clave, contenido, ex=obtener_entorno().TTL_CACHE_SEGUNDOS)
    except Exception as error:  # noqa: BLE001
        logger.warning("No se pudo guardar en caché: %s", error)


async def obtener_mapa_calor_service(desde: datetime, hasta: datetime, localidad_id: int | None) -> tuple[dict, bool]:
    desde_utc, hasta_utc = _redondear(desde), _redondear(hasta)
    clave_base = f"{localidad_id or 'provincia'}:{desde_utc.isoformat()}:{hasta_utc.isoformat()}"

    clave, en_cache = await _leer_cache(clave_base)
    if en_cache is not None:
        return json.loads(en_cache), True

    filas = await obtener_pool().fetch(CONSULTA_MAPA_CALOR, desde_utc, hasta_utc, localidad_id, DIAS_LLUVIA)

    features = []
    for fila in filas:
        indice = calcular_indice_riesgo(FactoresRiesgo(
            reportes_validados=fila["validados"],
            reportes_pendientes=fila["pendientes"],
            lluvia_mm=fila["lluvia_mm"],
            nivel_riesgo_base=fila["nivel_riesgo_base"],
            estado_manzana=fila["estado"],
        ))
        features.append({
            "type": "Feature",
            "geometry": {"type": "Point", "coordinates": [round(fila["longitud"], 6), round(fila["latitud"], 6)]},
            "properties": {
                "manzanaId": fila["id"],
                "codigo": fila["codigo"],
                "localidadId": fila["localidadId"],
                "estado": fila["estado"],
                "indiceRiesgo": indice,
                "reportesValidados": fila["validados"],
                "reportesPendientes": fila["pendientes"],
                "lluvia7dMm": round(fila["lluvia_mm"], 1),
            },
        })

    mapa = {
        "type": "FeatureCollection",
        "features": features,
        "metadatos": {
            "desde": desde_utc.isoformat() + "Z",
            "hasta": hasta_utc.isoformat() + "Z",
            "localidadId": localidad_id,
            "generadoEn": datetime.now(timezone.utc).isoformat(),
        },
    }

    await _guardar_cache(clave, json.dumps(mapa))
    return mapa, False
