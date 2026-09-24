from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Entorno(BaseSettings):
    """Variables de entorno del motor. Si falta una obligatoria, el servicio no arranca."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    URL_BASE_DATOS: str
    URL_REDIS: str = ""
    CLAVE_SERVICIO_INTERNO: str = Field(min_length=32)
    TTL_CACHE_SEGUNDOS: int = 300


@lru_cache
def obtener_entorno() -> Entorno:
    return Entorno()
