"""Migración inicial del modelo User personalizado de BargAIn."""

import django.contrib.auth.models
import django.contrib.auth.validators
import django.contrib.gis.db.models.fields
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):
    """Crea el modelo User extendido con roles, ubicación y preferencias."""

    initial = True

    dependencies = [
        ("auth", "0012_alter_user_first_name_max_length"),
        ("core", "0001_postgis"),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("password", models.CharField(max_length=128, verbose_name="password")),
                (
                    "last_login",
                    models.DateTimeField(
                        blank=True, null=True, verbose_name="last login"
                    ),
                ),
                (
                    "is_superuser",
                    models.BooleanField(
                        default=False,
                        help_text="Designates that this user has all permissions without explicitly assigning them.",
                        verbose_name="superuser status",
                    ),
                ),
                (
                    "username",
                    models.CharField(
                        error_messages={
                            "unique": "A user with that username already exists."
                        },
                        help_text="Required. 150 characters or fewer. Letters, digits and @/./+/-/_ only.",
                        max_length=150,
                        unique=True,
                        validators=[
                            django.contrib.auth.validators.UnicodeUsernameValidator()
                        ],
                        verbose_name="username",
                    ),
                ),
                (
                    "first_name",
                    models.CharField(
                        blank=True, max_length=150, verbose_name="first name"
                    ),
                ),
                (
                    "last_name",
                    models.CharField(
                        blank=True, max_length=150, verbose_name="last name"
                    ),
                ),
                (
                    "email",
                    models.EmailField(
                        blank=True, max_length=254, verbose_name="email address"
                    ),
                ),
                (
                    "is_staff",
                    models.BooleanField(
                        default=False,
                        help_text="Designates whether the user can log into this admin site.",
                        verbose_name="staff status",
                    ),
                ),
                (
                    "is_active",
                    models.BooleanField(
                        default=True,
                        help_text="Designates whether this user should be treated as active. Unselect this instead of deleting accounts.",
                        verbose_name="active",
                    ),
                ),
                (
                    "date_joined",
                    models.DateTimeField(
                        default=django.utils.timezone.now, verbose_name="date joined"
                    ),
                ),
                # ── Campos personalizados BargAIn ──────────────────
                (
                    "role",
                    models.CharField(
                        choices=[
                            ("consumer", "Consumidor"),
                            ("business", "Comercio"),
                            ("admin", "Administrador"),
                        ],
                        default="consumer",
                        max_length=20,
                        verbose_name="Rol",
                    ),
                ),
                (
                    "phone",
                    models.CharField(
                        blank=True, max_length=20, verbose_name="Teléfono"
                    ),
                ),
                (
                    "avatar",
                    models.ImageField(
                        blank=True,
                        null=True,
                        upload_to="avatars/",
                        verbose_name="Avatar",
                    ),
                ),
                (
                    "default_location",
                    django.contrib.gis.db.models.fields.PointField(
                        blank=True,
                        help_text="Ubicación habitual del usuario para búsquedas.",
                        null=True,
                        srid=4326,
                        verbose_name="Ubicación por defecto",
                    ),
                ),
                (
                    "max_search_radius_km",
                    models.FloatField(
                        default=10.0,
                        verbose_name="Radio máximo de búsqueda (km)",
                    ),
                ),
                (
                    "max_stops",
                    models.PositiveSmallIntegerField(
                        default=3,
                        verbose_name="Máximo de paradas por ruta",
                    ),
                ),
                (
                    "optimization_preference",
                    models.CharField(
                        choices=[
                            ("price", "Priorizar precio"),
                            ("distance", "Priorizar distancia"),
                            ("time", "Priorizar tiempo"),
                            ("balanced", "Equilibrado"),
                        ],
                        default="balanced",
                        max_length=20,
                        verbose_name="Preferencia de optimización",
                    ),
                ),
                (
                    "push_notifications_enabled",
                    models.BooleanField(
                        default=True,
                        verbose_name="Notificaciones push activadas",
                    ),
                ),
                (
                    "email_notifications_enabled",
                    models.BooleanField(
                        default=True,
                        verbose_name="Notificaciones por email activadas",
                    ),
                ),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                # ── Relaciones M2M de AbstractUser ──────────────────
                (
                    "groups",
                    models.ManyToManyField(
                        blank=True,
                        help_text="The groups this user belongs to. A user will get all permissions granted to each of their groups.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.group",
                        verbose_name="groups",
                    ),
                ),
                (
                    "user_permissions",
                    models.ManyToManyField(
                        blank=True,
                        help_text="Specific permissions for this user.",
                        related_name="user_set",
                        related_query_name="user",
                        to="auth.permission",
                        verbose_name="user permissions",
                    ),
                ),
            ],
            options={
                "verbose_name": "Usuario",
                "verbose_name_plural": "Usuarios",
                "ordering": ["-date_joined"],
            },
            bases=(django.contrib.auth.models.AbstractUser,),
            managers=[
                ("objects", django.contrib.auth.models.UserManager()),
            ],
        ),
    ]
