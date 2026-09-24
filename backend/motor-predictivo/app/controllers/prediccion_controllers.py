from app.services.prediccion_services import obtener_predicciones_service, recalcular_predicciones_service


async def recalcular_predicciones() -> dict:
    return {"status": "success", "data": await recalcular_predicciones_service()}


async def obtener_predicciones(localidad_id: int | None) -> dict:
    return await obtener_predicciones_service(localidad_id)
