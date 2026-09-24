import logging

from redis.asyncio import Redis

from app.config.entorno import obtener_entorno

logger = logging.getLogger(__name__)

# La API Node incrementa esta clave cuando cambia el estado de alguna manzana.
CLAVE_VERSION_MAPA_CALOR = "mapa_calor:version"

_cliente: Redis | None = None


def obtener_cache() -> Redis | None:
    """Devuelve el cliente de Redis, o None si no está configurado (el motor funciona sin caché)."""
    global _cliente
    url = obtener_entorno().URL_REDIS
    if not url:
        return None
    if _cliente is None:
        _cliente = Redis.from_url(url, socket_timeout=1, socket_connect_timeout=1, decode_responses=True)
    return _cliente


async def cerrar_cache() -> None:
    if _cliente is not None:
        await _cliente.aclose()
