# Generated migration for apps.business 0001_initial

import django.db.models.deletion
import django.db.models.functions
from django.conf import settings
from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):
    initial = True

    dependencies = [
        ("products", "0001_initial"),
        ("stores", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="BusinessProfile",
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
                (
                    "business_name",
                    models.CharField(max_length=200, verbose_name="Nombre del negocio"),
                ),
                (
                    "tax_id",
                    models.CharField(max_length=20, unique=True, verbose_name="CIF/NIF"),
                ),
                ("address", models.TextField(verbose_name="Dirección")),
                ("website", models.URLField(blank=True, verbose_name="Sitio web")),
                (
                    "is_verified",
                    models.BooleanField(default=False, verbose_name="Verificado"),
                ),
                (
                    "rejection_reason",
                    models.TextField(blank=True, verbose_name="Motivo de rechazo"),
                ),
                (
                    "price_alert_threshold_pct",
                    models.PositiveSmallIntegerField(
                        default=10,
                        help_text="Porcentaje de diferencia mínimo para enviar alerta de competidor.",
                        verbose_name="Umbral de alerta de precio (%)",
                    ),
                ),
                (
                    "last_competitor_alert_at",
                    models.DateTimeField(
                        blank=True,
                        null=True,
                        verbose_name="Último aviso competidor",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Creado en"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="Actualizado en"),
                ),
                (
                    "user",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="business_profile",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Usuario",
                    ),
                ),
            ],
            options={
                "verbose_name": "Perfil de Negocio",
                "verbose_name_plural": "Perfiles de Negocio",
                "ordering": ["-created_at"],
            },
        ),
        migrations.CreateModel(
            name="Promotion",
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
                (
                    "discount_type",
                    models.CharField(
                        choices=[
                            ("flat", "Descuento fijo (€)"),
                            ("percentage", "Descuento porcentual (%)"),
                        ],
                        max_length=20,
                        verbose_name="Tipo de descuento",
                    ),
                ),
                (
                    "discount_value",
                    models.DecimalField(
                        decimal_places=2,
                        max_digits=10,
                        verbose_name="Valor del descuento",
                    ),
                ),
                ("start_date", models.DateField(verbose_name="Inicio de la promoción")),
                (
                    "end_date",
                    models.DateField(blank=True, null=True, verbose_name="Fin de la promoción"),
                ),
                (
                    "is_active",
                    models.BooleanField(default=True, verbose_name="Activa"),
                ),
                (
                    "min_quantity",
                    models.PositiveSmallIntegerField(
                        blank=True, null=True, verbose_name="Cantidad mínima"
                    ),
                ),
                (
                    "title",
                    models.CharField(blank=True, max_length=100, verbose_name="Título"),
                ),
                (
                    "description",
                    models.TextField(blank=True, verbose_name="Descripción"),
                ),
                (
                    "views",
                    models.PositiveIntegerField(default=0, verbose_name="Visualizaciones"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="Creado en"),
                ),
                (
                    "product",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="promotions",
                        to="products.product",
                        verbose_name="Producto",
                    ),
                ),
                (
                    "store",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="promotions",
                        to="stores.store",
                        verbose_name="Tienda",
                    ),
                ),
            ],
            options={
                "verbose_name": "Promoción",
                "verbose_name_plural": "Promociones",
                "ordering": ["-created_at"],
            },
        ),
        migrations.AddConstraint(
            model_name="promotion",
            constraint=models.UniqueConstraint(
                condition=Q(is_active=True),
                fields=["product", "store"],
                name="unique_active_promo_per_product_store",
            ),
        ),
    ]
