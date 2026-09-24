import asyncpg

from app.config.entorno import obtener_entorno

_pool: asyncpg.Pool | None = None


async def abrir_pool() -> None:
    global _pool
    _pool = await asyncpg.create_pool(
        obtener_entorno().URL_BASE_DATOS,
        min_size=1,
        max_size=10,
        command_timeout=5,
        # El motor solo lee: cualquier escritura accidental falla en la propia base.
        server_settings={"default_transaction_read_only": "on", "timezone": "UTC"},
    )


async def cerrar_pool() -> None:
    if _pool is not None:
        await _pool.close()


def obtener_pool() -> asyncpg.Pool:
    if _pool is None:
        raise RuntimeError("El pool de base de datos no está inicializado")
    return _pool
