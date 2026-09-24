import os

os.environ.setdefault("URL_BASE_DATOS", "postgresql://prueba:prueba@localhost:5432/prueba")
os.environ.setdefault("CLAVE_SERVICIO_INTERNO", "clave-servicio-interno-de-pruebas-0123456789")

from fastapi.testclient import TestClient  # noqa: E402

from app.routes.mapa_calor_routes import mapa_calor_router  # noqa: E402
from datetime import datetime, timezone  # noqa: E402

from app.services.mapa_calor_services import FactoresRiesgo, calcular_indice_riesgo, redondear_a_ventana  # noqa: E402
from fastapi import FastAPI  # noqa: E402


def factores(**cambios) -> FactoresRiesgo:
    base = dict(reportes_validados=0, reportes_pendientes=0, lluvia_mm=0.0, nivel_riesgo_base="CRITICO", estado_manzana="AMARILLO")
    base.update(cambios)
    return FactoresRiesgo(**base)


def test_sin_evidencia_ni_lluvia_el_riesgo_es_cero():
    assert calcular_indice_riesgo(factores()) == 0.0


def test_el_indice_satura_en_uno():
    assert calcular_indice_riesgo(factores(reportes_validados=50, reportes_pendientes=50, lluvia_mm=500)) == 1.0


def test_una_manzana_roja_nunca_baja_de_la_mitad():
    assert calcular_indice_riesgo(factores(estado_manzana="ROJO")) == 0.5


def test_el_riesgo_de_la_localidad_pondera_el_indice():
    critico = calcular_indice_riesgo(factores(reportes_validados=5))
    moderado = calcular_indice_riesgo(factores(reportes_validados=5, nivel_riesgo_base="MODERADO_ALTO"))
    assert critico > moderado


def test_la_lluvia_reciente_aumenta_el_riesgo():
    assert calcular_indice_riesgo(factores(lluvia_mm=25)) > calcular_indice_riesgo(factores())


def test_el_mapa_exige_la_clave_de_servicio():
    app = FastAPI()
    app.include_router(mapa_calor_router)
    cliente = TestClient(app)
    assert cliente.get("/mapa-calor").status_code == 401
    assert cliente.get("/mapa-calor", headers={"x-clave-servicio": "incorrecta"}).status_code == 401


def test_el_fin_del_rango_se_redondea_hacia_arriba_para_incluir_reportes_recientes():
    fecha = datetime(2026, 9, 24, 23, 13, 3, tzinfo=timezone.utc)
    assert redondear_a_ventana(fecha) == datetime(2026, 9, 24, 23, 10)
    assert redondear_a_ventana(fecha, hacia_arriba=True) == datetime(2026, 9, 24, 23, 15)


def test_las_fechas_se_convierten_a_utc_sin_zona():
    fecha = datetime.fromisoformat("2026-09-24T20:13:03-03:00")
    assert redondear_a_ventana(fecha, hacia_arriba=True) == datetime(2026, 9, 24, 23, 15)
