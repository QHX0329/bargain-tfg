"""
Fixtures globales de pytest para el backend de BargAIn.

Disponibles en todos los módulos de tests sin importar explícitamente.
"""

import pytest
from django.contrib.gis.geos import Point
from rest_framework.test import APIClient


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
