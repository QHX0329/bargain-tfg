"""Vistas de autenticación y perfil para el módulo de usuarios."""

import structlog
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import PasswordResetTokenGenerator
from django.core.mail import send_mail
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from drf_spectacular.utils import extend_schema
from rest_framework import generics, mixins, serializers, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.core.responses import created_response, success_response

from .serializers import (
    PasswordResetConfirmSerializer,
    PasswordResetRequestSerializer,
    UserProfileSerializer,
    UserRegistrationSerializer,
)

User = get_user_model()
logger = structlog.get_logger(__name__)


class UserRegistrationView(generics.CreateAPIView):
    """Endpoint de registro de nuevos usuarios.

    POST /api/v1/auth/register/
    """

    permission_classes = [AllowAny]
    serializer_class = UserRegistrationSerializer

    def create(self, request: Request, *args, **kwargs) -> Response:
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        output = UserProfileSerializer(user).data
        logger.info("user_registered", user_id=user.pk, username=user.username)
        return created_response(output)


class CustomTokenObtainPairView(TokenObtainPairView):
    """Endpoint de login JWT — envuelve la respuesta en el envelope estándar.

    POST /api/v1/auth/token/
    """

    def post(self, request: Request, *args, **kwargs) -> Response:
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            return success_response(response.data)
        return response


class CustomTokenRefreshView(TokenRefreshView):
    """Endpoint de renovación de token JWT — envuelve la respuesta.

    POST /api/v1/auth/token/refresh/
    """

    def post(self, request: Request, *args, **kwargs) -> Response:
        response = super().post(request, *args, **kwargs)
        if response.status_code == status.HTTP_200_OK:
            return success_response(response.data)
        return response


class PasswordResetRequestView(APIView):
    """Solicita el envío de un email de reset de contraseña.

    Siempre devuelve 200 para no revelar si el email existe (anti-enumeración).

    POST /api/v1/auth/password-reset/
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=PasswordResetRequestSerializer,
        responses={200: None},
        description="Solicita un enlace de restablecimiento de contraseña por email. Siempre devuelve 200 (anti-enumeración).",
    )
    def post(self, request: Request) -> Response:
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]

        try:
            user = User.objects.get(email=email)
            token = PasswordResetTokenGenerator().make_token(user)
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            reset_link = f"http://localhost:8081/reset-password?uid={uid}&token={token}"
            send_mail(
                subject="Restablecer contraseña — BargAIn",
                message=f"Usa este enlace para restablecer tu contraseña: {reset_link}",
                from_email="noreply@bargain.app",
                recipient_list=[email],
                fail_silently=True,
            )
            logger.info("password_reset_requested", user_id=user.pk)
        except User.DoesNotExist:
            logger.info("password_reset_requested_unknown_email")

        return success_response(
            {"message": "Si el email existe, recibirás un enlace de recuperación."}
        )


class PasswordResetConfirmView(APIView):
    """Confirma el reset de contraseña con uid + token.

    POST /api/v1/auth/password-reset/confirm/
    """

    permission_classes = [AllowAny]

    @extend_schema(
        request=PasswordResetConfirmSerializer,
        responses={200: None},
        description="Confirma el restablecimiento de contraseña usando uid + token del enlace de email.",
    )
    def post(self, request: Request) -> Response:
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        uid = serializer.validated_data["uid"]
        token = serializer.validated_data["token"]
        new_password = serializer.validated_data["new_password"]

        try:
            pk = force_str(urlsafe_base64_decode(uid))
            user = User.objects.get(pk=pk)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError) as exc:
            raise serializers.ValidationError(
                {"uid": "El enlace de restablecimiento no es válido."}
            ) from exc

        if not PasswordResetTokenGenerator().check_token(user, token):
            raise serializers.ValidationError(
                {"token": "El token de restablecimiento no es válido o ha expirado."}
            )

        user.set_password(new_password)
        user.save()
        logger.info("password_reset_confirmed", user_id=user.pk)
        return success_response({"message": "Contraseña restablecida correctamente."})


class UserProfileViewSet(
    mixins.RetrieveModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """ViewSet de lectura y actualización del perfil del usuario autenticado.

    GET    /api/v1/auth/profile/me/
    PATCH  /api/v1/auth/profile/me/
    PUT    /api/v1/auth/profile/me/
    """

    permission_classes = [IsAuthenticated]
    serializer_class = UserProfileSerializer

    def get_object(self) -> User:
        """Devuelve siempre el usuario autenticado, ignorando el pk de la URL."""
        return self.request.user

    def retrieve(self, request: Request, *args, **kwargs) -> Response:
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        return success_response(serializer.data)

    def update(self, request: Request, *args, **kwargs) -> Response:
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return success_response(serializer.data)
