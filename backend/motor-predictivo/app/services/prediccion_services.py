from dataclasses import replace
from datetime import datetime, timedelta, timezone

from app.config.bd import obtener_pool
from app.services.mapa_calor_services import CONSULTA_MAPA_CALOR, DIAS_LLUVIA, FactoresRiesgo, calcular_indice_riesgo

HORIZONTE_HORAS = 72
VIGENCIA_HORAS = 24
DIAS_EVIDENCIA = 30
DIAS_RETENCION = 30

# Lluvia pronosticada por localidad para las próximas 72 horas.
CONSULTA_PRONOSTICO = """
    SELECT "localidadId", SUM("precipitacionMm")::float8 AS mm
    FROM "registroMeteorologico"
    WHERE "esPronostico" = true
      AND "observadoEn" > $1::timestamp
      AND "observadoEn" <= $1::timestamp + make_interval(hours => $2::int)
    GROUP BY "localidadId"
"""

# Última predicción vigente de cada manzana (usa el índice (manzanaId, calculadoEn)).
CONSULTA_PREDICCIONES = """
    SELECT DISTINCT ON (p."manzanaId")
           p."manzanaId", p."indiceRiesgo", p."calculadoEn", p."vigenteHasta",
           m."codigo", m."estado"::text AS estado, m."localidadId",
           ST_X(m."centroide") AS longitud, ST_Y(m."centroide") AS latitud
    FROM "prediccionRiesgo" p
    JOIN "manzana" m ON m."id" = p."manzanaId"
    WHERE p."vigenteHasta" > $1::timestamp
      AND ($2::int IS NULL OR m."localidadId" = $2::int)
    ORDER BY p."manzanaId", p."calculadoEn" DESC
"""


def calcular_indice_predicho(factores: FactoresRiesgo, lluvia_pronosticada_mm: float) -> float:
    """Riesgo esperado para las próximas 72 horas.

    La lluvia pronosticada vuelve a llenar los recipientes, así que se suma a la observada de los
    últimos 7 días. El resto de los factores (evidencia ciudadana, estado de la manzana y riesgo
    de la localidad) se mantiene igual que en el índice actual.
    """
    lluvia_total = factores.lluvia_mm + max(lluvia_pronosticada_mm, 0.0)
    return calcular_indice_riesgo(replace(factores, lluvia_mm=lluvia_total))


def _ahora_utc() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


async def recalcular_predicciones_service() -> dict:
    ahora = _ahora_utc()
    pool = obtener_pool()

    async with pool.acquire() as conexion:
        # Mismas manzanas y factores que el mapa de calor, con evidencia de los últimos 30 días.
        filas = await conexion.fetch(CONSULTA_MAPA_CALOR, ahora - timedelta(days=DIAS_EVIDENCIA), ahora, None, DIAS_LLUVIA)
        pronostico = {fila["localidadId"]: fila["mm"] for fila in await conexion.fetch(CONSULTA_PRONOSTICO, ahora, HORIZONTE_HORAS)}

        manzanas, indices = [], []
        for fila in filas:
            factores = FactoresRiesgo(
                reportes_validados=fila["validados"],
                reportes_pendientes=fila["pendientes"],
                lluvia_mm=fila["lluvia_mm"],
                nivel_riesgo_base=fila["nivel_riesgo_base"],
                estado_manzana=fila["estado"],
            )
            manzanas.append(fila["id"])
            indices.append(calcular_indice_predicho(factores, pronostico.get(fila["localidadId"], 0.0)))

        vigente_hasta = ahora + timedelta(hours=VIGENCIA_HORAS)

        # El pool es de solo lectura por defecto: esta transacción se habilita explícitamente para
        # escribir y el rol de la base solo lo permite sobre prediccionRiesgo.
        async with conexion.transaction():
            await conexion.execute("SET TRANSACTION READ WRITE")
            if manzanas:
                await conexion.execute(
                    """
                    INSERT INTO "prediccionRiesgo" ("manzanaId", "indiceRiesgo", "calculadoEn", "vigenteHasta")
                    SELECT unnest($1::int[]), unnest($2::float8[]), $3::timestamp, $4::timestamp
                    """,
                    manzanas, indices, ahora, vigente_hasta,
                )
            resultado = await conexion.execute(
                'DELETE FROM "prediccionRiesgo" WHERE "calculadoEn" < $1::timestamp',
                ahora - timedelta(days=DIAS_RETENCION),
            )

    return {
        "calculadas": len(manzanas),
        "eliminadas": int(resultado.split()[-1]),
        "horizonteHoras": HORIZONTE_HORAS,
        "vigenteHasta": vigente_hasta.isoformat() + "Z",
    }


async def obtener_predicciones_service(localidad_id: int | None) -> dict:
    filas = await obtener_pool().fetch(CONSULTA_PREDICCIONES, _ahora_utc(), localidad_id)

    return {
        "type": "FeatureCollection",
        "features": [
            {
                "type": "Feature",
                "geometry": {"type": "Point", "coordinates": [round(fila["longitud"], 6), round(fila["latitud"], 6)]},
                "properties": {
                    "manzanaId": fila["manzanaId"],
                    "codigo": fila["codigo"],
                    "localidadId": fila["localidadId"],
                    "estado": fila["estado"],
                    "indiceRiesgoPredicho": fila["indiceRiesgo"],
                    "calculadoEn": fila["calculadoEn"].isoformat() + "Z",
                    "vigenteHasta": fila["vigenteHasta"].isoformat() + "Z",
                },
            }
            for fila in filas
        ],
        "metadatos": {"horizonteHoras": HORIZONTE_HORAS, "localidadId": localidad_id},
    }
