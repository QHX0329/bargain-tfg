"""
Tests de integración para el registro de BusinessProfile.

TDD Wave 0 RED — estos tests fallan hasta que las vistas estén implementadas.
"""

import pytest
from django.urls import reverse
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


class TestBusinessProfileRegistration:
    """POST /api/v1/business/profiles/ — registro de perfil de negocio."""

    def test_business_user_can_register_profile(self, api_client, business_user):
        """Un usuario business autenticado puede crear un BusinessProfile no verificado."""
        api_client.force_authenticate(user=business_user)
        payload = {
            "business_name": "Mi Negocio SL",
            "tax_id": "B12345678",
            "address": "Calle Comercio 10, Sevilla",
            "website": "https://minegocio.es",
        }
        response = api_client.post("/api/v1/business/profiles/", data=payload, format="json")

        assert response.status_code == 201
        data = response.data
        # Is verified must start as False
        assert data["is_verified"] is False

    def test_unauthenticated_post_returns_401(self, api_client):
        """Un POST sin autenticación devuelve 401."""
        payload = {
            "business_name": "Anon Negocio",
            "tax_id": "X99999999",
            "address": "Calle Anon 1",
        }
        response = api_client.post("/api/v1/business/profiles/", data=payload, format="json")

        assert response.status_code == 401

    def test_non_business_role_returns_403(self, api_client, consumer_user):
        """Un usuario con rol consumer recibe 403 al intentar crear un BusinessProfile."""
        api_client.force_authenticate(user=consumer_user)
        payload = {
            "business_name": "Consumer Negocio",
            "tax_id": "Y11111111",
            "address": "Calle Consumer 2",
        }
        response = api_client.post("/api/v1/business/profiles/", data=payload, format="json")

        assert response.status_code == 403

    def test_business_user_can_get_own_profile(self, api_client, business_user, business_profile):
        """Un business user puede recuperar su propio perfil."""
        api_client.force_authenticate(user=business_user)
        response = api_client.get("/api/v1/business/profiles/")

        assert response.status_code == 200


# ── Fixtures ────────────────────────────────────────────────


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def business_user(db):
    from apps.users.models import User

    return User.objects.create_user(
        username="bizuser_reg",
        email="biz_reg@test.com",
        password="pass1234",
        role=User.Role.BUSINESS,
    )


@pytest.fixture
def consumer_user(db):
    from apps.users.models import User

    return User.objects.create_user(
        username="consumer_reg",
        email="consumer_reg@test.com",
        password="pass1234",
        role=User.Role.CONSUMER,
    )


@pytest.fixture
def business_profile(db, business_user):
    from apps.business.models import BusinessProfile

    return BusinessProfile.objects.create(
        user=business_user,
        business_name="Mi Negocio Existente",
        tax_id="B87654321",
        address="Calle Existente 5",
    )
