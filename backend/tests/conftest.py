"""
Fixtures globales de pytest para el backend de BarGAIN.

Disponibles en todos los módulos de tests sin importar explícitamente.
"""

import os
import sys
from pathlib import Path

import pytest
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient


def _bootstrap_scraping_path() -> None:
    """Asegura que el paquete bargain_scraping sea importable en tests backend."""
    repo_root = Path(__file__).resolve().parents[2]
    default_scraping_dir = repo_root / "scraping"

    candidates: list[Path] = []
    env_scraping_dir = os.environ.get("SCRAPING_PROJECT_DIR")
    if env_scraping_dir:
        candidates.append(Path(env_scraping_dir))
    candidates.append(default_scraping_dir)

    for candidate in candidates:
        resolved_candidate = candidate.resolve()
        candidate_str = str(resolved_candidate)
        if resolved_candidate.is_dir() and candidate_str not in sys.path:
            sys.path.insert(0, candidate_str)
            return


_bootstrap_scraping_path()


@pytest.fixture
def api_client() -> APIClient:
    """Cliente de API DRF sin autenticación."""
    return APIClient()


@pytest.fixture
def consumer_user(db, django_user_model):
    """Usuario con rol consumer listo para usar en tests."""
    return django_user_model.objects.create_user(
        username="consumer_test",
        email="consumer@test.com",
        password="testpass123",
        role="consumer",
        first_name="Test",
        last_name="Consumer",
    )


@pytest.fixture
def business_user(db, django_user_model):
    """Usuario con rol business listo para usar en tests."""
    return django_user_model.objects.create_user(
        username="business_test",
        email="business@test.com",
        password="testpass123",
        role="business",
        first_name="Test",
        last_name="Business",
    )


@pytest.fixture
def admin_user(db, django_user_model):
    """Usuario administrador listo para usar en tests."""
    return django_user_model.objects.create_superuser(
        username="admin_test",
        email="admin@test.com",
        password="testpass123",
    )


@pytest.fixture
def authenticated_client(api_client, consumer_user) -> APIClient:
    """Cliente de API autenticado como consumer."""
    api_client.force_authenticate(user=consumer_user)
    return api_client


@pytest.fixture
def business_client(api_client, business_user) -> APIClient:
    """Cliente de API autenticado como business."""
    api_client.force_authenticate(user=business_user)
    return api_client


@pytest.fixture
def admin_client(api_client, admin_user) -> APIClient:
    """Cliente de API autenticado como administrador."""
    api_client.force_authenticate(user=admin_user)
    return api_client


@pytest.fixture
def seville_point() -> Point:
    """Punto geoespacial en el centro de Sevilla para tests de geolocalización."""
    return Point(-5.9845, 37.3891, srid=4326)  # Plaza Nueva, Sevilla
