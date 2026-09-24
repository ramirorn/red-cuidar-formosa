import hmac

from fastapi import Header, HTTPException, status

from app.config.entorno import obtener_entorno


async def verificar_servicio_interno(x_clave_servicio: str | None = Header(default=None)) -> None:
    """Solo la API Node (u otro servicio interno) puede consultar el motor.
    La comparación es en tiempo constante para no filtrar la clave."""
    clave = obtener_entorno().CLAVE_SERVICIO_INTERNO
    if not x_clave_servicio or not hmac.compare_digest(x_clave_servicio.encode(), clave.encode()):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Acceso denegado. Servicio no autorizado.")
