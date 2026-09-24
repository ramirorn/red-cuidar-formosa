import os

os.environ.setdefault("URL_BASE_DATOS", "postgresql://prueba:prueba@localhost:5432/prueba")
os.environ.setdefault("CLAVE_SERVICIO_INTERNO", "clave-servicio-interno-de-pruebas-0123456789")

from fastapi import FastAPI  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.routes.prediccion_routes import prediccion_router  # noqa: E402
from app.services.mapa_calor_services import FactoresRiesgo, calcular_indice_riesgo  # noqa: E402
from app.services.prediccion_services import calcular_indice_predicho  # noqa: E402

BASE = FactoresRiesgo(reportes_validados=2, reportes_pendientes=1, lluvia_mm=5.0, nivel_riesgo_base="CRITICO", estado_manzana="AMARILLO")


def test_sin_lluvia_pronosticada_coincide_con_el_indice_actual():
    assert calcular_indice_predicho(BASE, 0.0) == calcular_indice_riesgo(BASE)


def test_la_lluvia_pronosticada_aumenta_el_riesgo():
    assert calcular_indice_predicho(BASE, 30.0) > calcular_indice_riesgo(BASE)


def test_un_pronostico_negativo_no_reduce_el_riesgo():
    assert calcular_indice_predicho(BASE, -10.0) == calcular_indice_riesgo(BASE)


def test_la_prediccion_nunca_supera_uno():
    assert calcular_indice_predicho(BASE, 10_000.0) <= 1.0


def test_las_predicciones_exigen_la_clave_de_servicio():
    app = FastAPI()
    app.include_router(prediccion_router)
    cliente = TestClient(app)
    assert cliente.post("/predicciones/recalcular").status_code == 401
    assert cliente.get("/predicciones").status_code == 401
