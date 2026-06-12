"""Configuración del panel de administración para el módulo de usuarios."""

from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Admin para el modelo User extendido con campos adicionales de BarGAIN."""

    list_display = [
        "username",
        "email",
        "first_name",
        "last_name",
        "role",
        "phone",
        "created_at",
        "is_active",
        "is_staff",
    ]
    list_filter = ["role", "is_active", "is_staff", "is_superuser"]
    search_fields = ["username", "email", "first_name", "last_name", "phone"]
    ordering = ["-date_joined"]

    fieldsets = BaseUserAdmin.fieldsets + (
        (
            "Perfil BarGAIN",
            {
                "fields": (
                    "role",
                    "phone",
                    "avatar",
                    "default_location",
                    "max_search_radius_km",
                    "max_stops",
                    "weight_price",
                    "weight_distance",
                    "weight_time",
                    "push_notifications_enabled",
                    "email_notifications_enabled",
                )
            },
        ),
    )

    readonly_fields = ["created_at", "updated_at"]
