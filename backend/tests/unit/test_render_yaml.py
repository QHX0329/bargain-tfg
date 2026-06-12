"""Tests unitarios para verificar la estructura de render.yaml (NFR-02).

Comprueba que render.yaml es YAML válido y declara los servicios y bases
de datos necesarios para el despliegue en Render staging.
"""

from pathlib import Path

import pytest
import yaml

# render.yaml está en la raíz del repositorio:
# backend/tests/unit/test_render_yaml.py  →  ../../..  →  repo root
RENDER_YAML_PATH = Path(__file__).resolve().parents[3] / "render.yaml"


@pytest.fixture(scope="module")
def render_config():
    """Carga render.yaml una sola vez para todos los tests del módulo."""
    with RENDER_YAML_PATH.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh)


def test_render_yaml_is_valid_yaml():
    """render.yaml existe y se puede parsear como YAML válido."""
    assert RENDER_YAML_PATH.exists(), f"render.yaml no encontrado en {RENDER_YAML_PATH}"
    with RENDER_YAML_PATH.open("r", encoding="utf-8") as fh:
        config = yaml.safe_load(fh)
    assert config is not None, "render.yaml está vacío o no produce ningún documento"
    assert isinstance(config, dict), "render.yaml debe ser un mapeo YAML en el nivel raíz"


def test_render_yaml_has_minimum_services(render_config):
    """La sección services contiene al menos 4 entradas."""
    services = render_config.get("services", [])
    assert isinstance(services, list), "services debe ser una lista"
    assert len(services) >= 4, (
        f"Se esperaban al menos 4 servicios, se encontraron {len(services)}: "
        f"{[s.get('name') for s in services]}"
    )


def test_render_yaml_has_web_service(render_config):
    """Existe al menos un servicio con type: web (Django API)."""
    services = render_config.get("services", [])
    web_services = [s for s in services if s.get("type") == "web"]
    assert len(web_services) >= 1, "No se encontró ningún servicio con type: web en render.yaml"


def test_render_yaml_has_worker_service(render_config):
    """Existe al menos un servicio con type: worker (Celery)."""
    services = render_config.get("services", [])
    worker_services = [s for s in services if s.get("type") == "worker"]
    assert len(worker_services) >= 1, (
        "No se encontró ningún servicio con type: worker en render.yaml"
    )


def test_render_yaml_has_database(render_config):
    """La sección databases contiene al menos una entrada (PostgreSQL)."""
    databases = render_config.get("databases", [])
    assert isinstance(databases, list), "databases debe ser una lista"
    assert len(databases) >= 1, "No se encontró ninguna base de datos declarada en render.yaml"


def test_docker_runtime_services_use_docker_command(render_config):
    """Los servicios con runtime docker deben usar dockerCommand."""
    services = render_config.get("services", [])
    docker_services = [service for service in services if service.get("runtime") == "docker"]

    assert docker_services, "No se encontraron servicios Docker en render.yaml"

    for service in docker_services:
        service_name = service.get("name", "<sin-nombre>")
        assert service.get("dockerCommand"), (
            f"El servicio Docker '{service_name}' debe definir dockerCommand"
        )
        assert "startCommand" not in service, (
            f"El servicio Docker '{service_name}' no debe usar startCommand"
        )
        assert "buildCommand" not in service, (
            f"El servicio Docker '{service_name}' no debe usar buildCommand"
        )


def test_render_yaml_health_check_path_matches_project_contract(render_config):
    """El health check de staging usa el endpoint versionado esperado por el proyecto."""
    services = render_config.get("services", [])
    web_service = next((s for s in services if s.get("type") == "web"), None)

    assert web_service is not None, "No se encontró servicio web en render.yaml"
    assert web_service.get("healthCheckPath") == "/api/v1/health/"


def test_render_yaml_web_cors_origins_include_github_pages(render_config):
    """El servicio web declara origen GitHub Pages en CORS_ALLOWED_ORIGINS."""
    services = render_config.get("services", [])
    web_service = next((s for s in services if s.get("type") == "web"), None)

    assert web_service is not None, "No se encontró servicio web en render.yaml"

    env_vars = web_service.get("envVars", [])
    assert isinstance(env_vars, list), "envVars del servicio web debe ser una lista"

    cors_entry = next(
        (entry for entry in env_vars if entry.get("key") == "CORS_ALLOWED_ORIGINS"), None
    )
    assert cors_entry is not None, (
        "No se encontró CORS_ALLOWED_ORIGINS en envVars del servicio web"
    )

    raw_value = cors_entry.get("value")
    assert isinstance(raw_value, str) and raw_value.strip(), (
        "CORS_ALLOWED_ORIGINS debe definir un valor no vacío"
    )

    origins = [origin.strip() for origin in raw_value.split(",") if origin.strip()]
    assert "https://qhx0329.github.io" in origins


def test_worker_services_do_not_use_free_plan(render_config):
    """Los workers de Render no deben declararse con plan free."""
    services = render_config.get("services", [])
    worker_services = [s for s in services if s.get("type") == "worker"]

    assert worker_services, "No se encontraron workers en render.yaml"

    for service in worker_services:
        service_name = service.get("name", "<sin-nombre>")
        assert service.get("plan") != "free", (
            f"El worker '{service_name}' no puede usar plan free en Render"
        )
