"""Serializers para el módulo de usuarios y autenticación."""

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserRegistrationSerializer(serializers.ModelSerializer):
    """Serializer para el registro de nuevos usuarios.

    Valida que las dos contraseñas coinciden y crea el usuario con hash.
    """

    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    role = serializers.ChoiceField(
        choices=["consumer", "business"],
        default="consumer",
        required=False,
        help_text="Rol del usuario: 'consumer' (por defecto) o 'business' (PYME).",
    )

    class Meta:
        model = User
        fields = [
            "username",
            "email",
            "password",
            "password_confirm",
            "first_name",
            "last_name",
            "role",
        ]

    def validate_email(self, value: str) -> str:
        """Verifica que el email no está ya registrado."""
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe un usuario con este email.")
        return value

    def validate(self, attrs: dict) -> dict:
        """Verifica que las contraseñas coinciden."""
        if attrs["password"] != attrs["password_confirm"]:
            raise serializers.ValidationError({"password": "Las contraseñas no coinciden."})
        return attrs

    def create(self, validated_data: dict) -> User:
        """Crea el usuario con la contraseña hasheada."""
        validated_data.pop("password_confirm")
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserProfileSerializer(serializers.ModelSerializer):
    """Serializer para leer y actualizar el perfil del usuario autenticado."""

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "email",
            "first_name",
            "last_name",
            "phone",
            "avatar",
            "role",
            "max_search_radius_km",
            "max_stops",
            "weight_price",
            "weight_distance",
            "weight_time",
            "push_notifications_enabled",
            "email_notifications_enabled",
            "notify_price_alerts",
            "notify_new_promos",
            "notify_shared_list_changes",
            "created_at",
        ]
        read_only_fields = ["id", "role", "created_at"]


class PasswordResetRequestSerializer(serializers.Serializer):
    """Serializer para solicitar el reset de contraseña."""

    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    """Serializer para confirmar el reset de contraseña con token."""

    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(validators=[validate_password])
    new_password_confirm = serializers.CharField()

    def validate(self, attrs: dict) -> dict:
        """Verifica que las contraseñas nuevas coinciden."""
        if attrs["new_password"] != attrs["new_password_confirm"]:
            raise serializers.ValidationError({"new_password": "Las contraseñas no coinciden."})
        return attrs
