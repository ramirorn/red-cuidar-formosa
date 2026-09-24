from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Response, status

from app.services.mapa_calor_services import obtener_mapa_calor_service

DIAS_RANGO_MAXIMO = 366


async def obtener_mapa_calor(response: Response, desde: datetime | None, hasta: datetime | None, localidad_id: int | None) -> dict:
    fin = hasta or datetime.now(timezone.utc)
    inicio = desde or fin - timedelta(days=30)

    # Las fechas sin zona horaria se interpretan como UTC.
    fin = fin if fin.tzinfo else fin.replace(tzinfo=timezone.utc)
    inicio = inicio if inicio.tzinfo else inicio.replace(tzinfo=timezone.utc)

    if inicio > fin:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, 'La fecha "desde" debe ser anterior a "hasta"')
    if fin - inicio > timedelta(days=DIAS_RANGO_MAXIMO):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"El rango de fechas no puede superar {DIAS_RANGO_MAXIMO} días")

    mapa, desde_cache = await obtener_mapa_calor_service(inicio, fin, localidad_id)
    response.headers["X-Cache"] = "HIT" if desde_cache else "MISS"
    return mapa
