from datetime import datetime

from fastapi import APIRouter, Depends, Query, Response

from app.controllers.mapa_calor_controllers import obtener_mapa_calor
from app.middlewares.servicio_interno import verificar_servicio_interno

mapa_calor_router = APIRouter(dependencies=[Depends(verificar_servicio_interno)])


@mapa_calor_router.get("/mapa-calor")
async def mapa_calor(
    response: Response,
    desde: datetime | None = Query(default=None),
    hasta: datetime | None = Query(default=None),
    localidad_id: int | None = Query(default=None, ge=1),
) -> dict:
    return await obtener_mapa_calor(response, desde, hasta, localidad_id)
