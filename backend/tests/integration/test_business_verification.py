"""
Tests de integración para el flujo de verificación de BusinessProfile.

TDD Wave 0 RED — estos tests fallan hasta que las acciones approve/reject estén implementadas.
"""

import pytest
from rest_framework.test import APIClient

pytestmark = pytest.mark.django_db


class TestBusinessVerification:
    """Tests para las acciones approve/reject del BusinessProfileViewSet."""

    def test_admin_can_approve_profile(self, api_client, admin_user, unverified_profile):
        """Un admin puede aprobar un BusinessProfile, que pasa a is_verified=True."""
        api_client.force_authenticate(user=admin_user)
        url = f"/api/v1/business/profiles/{unverified_profile.id}/approve/"
        response = api_client.post(url)

        assert response.status_code == 200
        unverified_profile.refresh_from_db()
        assert unverified_profile.is_verified is True

    def test_admin_can_reject_profile_with_reason(
        self, api_client, admin_user, unverified_profile
    ):
        """Un admin puede rechazar un BusinessProfile con motivo."""
        api_client.force_authenticate(user=admin_user)
        url = f"/api/v1/business/profiles/{unverified_profile.id}/reject/"
        response = api_client.post(url, data={"reason": "Documentación incompleta"}, format="json")

        assert response.status_code == 200
        unverified_profile.refresh_from_db()
        assert unverified_profile.is_verified is False
        assert unverified_profile.rejection_reason == "Documentación incompleta"

    def test_non_admin_approve_returns_403(
        self, api_client, business_user, unverified_profile
    ):
        """Un usuario no-admin no puede aprobar un BusinessProfile."""
        api_client.force_authenticate(user=business_user)
        url = f"/api/v1/business/profiles/{unverified_profile.id}/approve/"
        response = api_client.post(url)

        assert response.status_code == 403

    def test_non_admin_reject_returns_403(
        self, api_client, business_user, unverified_profile
    ):
        """Un usuario no-admin no puede rechazar un BusinessProfile."""
        api_client.force_authenticate(user=business_user)
        url = f"/api/v1/business/profiles/{unverified_profile.id}/reject/"
        response = api_client.post(url, data={"reason": "Intento"}, format="json")

        assert response.status_code == 403


# ── Fixtures ────────────────────────────────────────────────


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def admin_user(db):
    from apps.users.models import User

    return User.objects.create_user(
        username="admin_verif",
        email="admin_verif@test.com",
        password="pass1234",
        role=User.Role.ADMIN,
        is_staff=True,
    )


@pytest.fixture
def business_user(db):
    from apps.users.models import User

    return User.objects.create_user(
        username="biz_verif",
        email="biz_verif@test.com",
        password="pass1234",
        role=User.Role.BUSINESS,
    )


@pytest.fixture
def unverified_profile(db, business_user):
    from apps.business.models import BusinessProfile

    return BusinessProfile.objects.create(
        user=business_user,
        business_name="Negocio Pendiente",
        tax_id="F33445566",
        address="Calle Pendiente 7",
    )
