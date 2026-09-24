from fastapi import APIRouter, Depends, Query

from app.controllers.prediccion_controllers import obtener_predicciones, recalcular_predicciones
from app.middlewares.servicio_interno import verificar_servicio_interno

prediccion_router = APIRouter(prefix="/predicciones", dependencies=[Depends(verificar_servicio_interno)])


@prediccion_router.post("/recalcular")
async def recalcular() -> dict:
    return await recalcular_predicciones()


@prediccion_router.get("")
async def listar(localidad_id: int | None = Query(default=None, ge=1)) -> dict:
    return await obtener_predicciones(localidad_id)
