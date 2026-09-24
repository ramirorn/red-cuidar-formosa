import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.config.bd import abrir_pool, cerrar_pool, obtener_pool
from app.config.cache import cerrar_cache
from app.routes.mapa_calor_routes import mapa_calor_router
from app.routes.prediccion_routes import prediccion_router

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def ciclo_de_vida(_app: FastAPI):
    await abrir_pool()
    yield
    await cerrar_cache()
    await cerrar_pool()


# Servicio interno: sin documentación pública expuesta.
app = FastAPI(title="Motor Predictivo Red Cuidar Formosa", lifespan=ciclo_de_vida, docs_url=None, redoc_url=None, openapi_url=None)


# Mismo formato de error que la API Node: { status: 'error', message }.
@app.exception_handler(StarletteHTTPException)
async def manejar_error_http(_request: Request, error: StarletteHTTPException) -> JSONResponse:
    return JSONResponse(status_code=error.status_code, content={"status": "error", "message": str(error.detail)})


@app.exception_handler(RequestValidationError)
async def manejar_error_validacion(_request: Request, error: RequestValidationError) -> JSONResponse:
    errores = [{"campo": ".".join(str(parte) for parte in e["loc"][1:]), "mensaje": e["msg"]} for e in error.errors()]
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"status": "error", "message": "Los datos enviados no son válidos", "errors": errores},
    )


@app.get("/salud")
async def salud() -> JSONResponse:
    try:
        await obtener_pool().fetchval("SELECT 1")
        return JSONResponse({"status": "success", "data": {"estado": "ok"}})
    except Exception:  # noqa: BLE001
        return JSONResponse(status_code=503, content={"status": "error", "message": "Base de datos no disponible"})


app.include_router(mapa_calor_router)
app.include_router(prediccion_router)
