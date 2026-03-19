"""Tests de integración para los endpoints de autenticación y perfil."""

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()

REGISTER_URL = "/api/v1/auth/register/"
TOKEN_URL = "/api/v1/auth/token/"
REFRESH_URL = "/api/v1/auth/token/refresh/"
PASSWORD_RESET_URL = "/api/v1/auth/password-reset/"
PASSWORD_RESET_CONFIRM_URL = "/api/v1/auth/password-reset/confirm/"
PROFILE_URL = "/api/v1/auth/profile/me/"


@pytest.mark.django_db
class TestRegistration:
    """Tests para el endpoint de registro."""

    def test_register_creates_user(self, api_client):
        payload = {
            "username": "brandnewuser",
            "email": "brandnewuser@example.com",
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "first_name": "Brand",
            "last_name": "New",
        }
        response = api_client.post(REGISTER_URL, payload, format="json")
        assert response.status_code == 201
        assert response.data["success"] is True
        assert "data" in response.data
        assert User.objects.filter(username="brandnewuser").exists()

    def test_register_duplicate_email_returns_400(self, api_client, consumer_user):
        payload = {
            "username": "anotheruser",
            "email": consumer_user.email,  # duplicate email
            "password": "SecurePass123!",
            "password_confirm": "SecurePass123!",
            "first_name": "Another",
            "last_name": "User",
        }
        response = api_client.post(REGISTER_URL, payload, format="json")
        assert response.status_code == 400
        assert response.data["success"] is False

    def test_register_mismatched_passwords_returns_400(self, api_client):
        payload = {
            "username": "mismatchuser",
            "email": "mismatch@example.com",
            "password": "SecurePass123!",
            "password_confirm": "DifferentPass!",
            "first_name": "Mis",
            "last_name": "Match",
        }
        response = api_client.post(REGISTER_URL, payload, format="json")
        assert response.status_code == 400
        assert response.data["success"] is False


@pytest.mark.django_db
class TestLogin:
    """Tests para el endpoint de obtención de tokens JWT."""

    def test_login_returns_jwt_pair(self, api_client, consumer_user):
        payload = {"username": consumer_user.username, "password": "testpass123"}
        response = api_client.post(TOKEN_URL, payload, format="json")
        assert response.status_code == 200
        assert response.data["success"] is True
        assert "access" in response.data["data"]
        assert "refresh" in response.data["data"]

    def test_login_invalid_creds_returns_401(self, api_client, consumer_user):
        payload = {"username": consumer_user.username, "password": "wrongpassword"}
        response = api_client.post(TOKEN_URL, payload, format="json")
        assert response.status_code == 401
        assert response.data["success"] is False


@pytest.mark.django_db
class TestTokenRefresh:
    """Tests para la rotación del refresh token."""

    def test_refresh_rotates_token(self, api_client, consumer_user):
        # Get initial tokens
        login_resp = api_client.post(
            TOKEN_URL,
            {"username": consumer_user.username, "password": "testpass123"},
            format="json",
        )
        assert login_resp.status_code == 200
        refresh_token = login_resp.data["data"]["refresh"]

        # Refresh
        response = api_client.post(REFRESH_URL, {"refresh": refresh_token}, format="json")
        assert response.status_code == 200
        assert response.data["success"] is True
        assert "access" in response.data["data"]
        # Rotation: new refresh token should be issued
        assert "refresh" in response.data["data"]
        assert response.data["data"]["refresh"] != refresh_token


@pytest.mark.django_db
class TestPasswordReset:
    """Tests para el flujo de reset de contraseña."""

    def test_password_reset_request_always_returns_200_for_existing_email(
        self, api_client, consumer_user
    ):
        response = api_client.post(
            PASSWORD_RESET_URL, {"email": consumer_user.email}, format="json"
        )
        assert response.status_code == 200
        assert response.data["success"] is True

    def test_password_reset_request_always_returns_200_for_nonexistent_email(self, api_client):
        response = api_client.post(
            PASSWORD_RESET_URL, {"email": "nonexistent@example.com"}, format="json"
        )
        assert response.status_code == 200
        assert response.data["success"] is True

    def test_password_reset_confirm_valid(self, api_client, consumer_user):
        from django.contrib.auth.tokens import PasswordResetTokenGenerator
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        token = PasswordResetTokenGenerator().make_token(consumer_user)
        uid = urlsafe_base64_encode(force_bytes(consumer_user.pk))

        response = api_client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": token,
                "new_password": "NewSecurePass123!",
                "new_password_confirm": "NewSecurePass123!",
            },
            format="json",
        )
        assert response.status_code == 200
        assert response.data["success"] is True
        # Verify password was actually changed
        consumer_user.refresh_from_db()
        assert consumer_user.check_password("NewSecurePass123!")

    def test_password_reset_confirm_invalid_token_returns_400(self, api_client, consumer_user):
        from django.utils.encoding import force_bytes
        from django.utils.http import urlsafe_base64_encode

        uid = urlsafe_base64_encode(force_bytes(consumer_user.pk))
        response = api_client.post(
            PASSWORD_RESET_CONFIRM_URL,
            {
                "uid": uid,
                "token": "invalid-token",
                "new_password": "NewSecurePass123!",
                "new_password_confirm": "NewSecurePass123!",
            },
            format="json",
        )
        assert response.status_code == 400
        assert response.data["success"] is False


@pytest.mark.django_db
class TestProfile:
    """Tests para los endpoints de perfil de usuario."""

    def test_profile_get_authenticated(self, authenticated_client, consumer_user):
        response = authenticated_client.get(PROFILE_URL)
        assert response.status_code == 200
        assert response.data["success"] is True
        data = response.data["data"]
        assert data["username"] == consumer_user.username
        assert data["email"] == consumer_user.email
        assert "weight_price" in data
        assert "weight_distance" in data
        assert "weight_time" in data
        assert "max_search_radius_km" in data

    def test_profile_get_unauthenticated_returns_401(self, api_client):
        response = api_client.get(PROFILE_URL)
        assert response.status_code == 401

    def test_profile_patch_weight_price(self, authenticated_client):
        response = authenticated_client.patch(
            PROFILE_URL,
            {"weight_price": 70, "weight_distance": 15, "weight_time": 15},
            format="json",
        )
        assert response.status_code == 200
        assert response.data["success"] is True
        assert response.data["data"]["weight_price"] == 70

    def test_profile_patch_max_radius(self, authenticated_client):
        response = authenticated_client.patch(
            PROFILE_URL, {"max_search_radius_km": 5.0}, format="json"
        )
        assert response.status_code == 200
        assert response.data["success"] is True
        assert response.data["data"]["max_search_radius_km"] == 5.0
