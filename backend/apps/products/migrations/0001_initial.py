"""
Migración inicial del dominio products.

Operaciones:
1. TrigramExtension() - habilita pg_trgm para búsqueda fuzzy
2. Tabla categories
3. Tabla products con GIN index en normalized_name (gin_trgm_ops)
4. Tabla product_proposals
"""

import django.db.models.deletion
from django.conf import settings
from django.contrib.postgres.indexes import GinIndex
from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        # 1. Habilitar extensión pg_trgm (requerida para TrigramSimilarity y GIN index)
        TrigramExtension(),
        # 2. Tabla Category
        migrations.CreateModel(
            name="Category",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("name", models.CharField(max_length=100, verbose_name="Nombre")),
                ("slug", models.SlugField(blank=True, max_length=120, unique=True)),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True),
                ),
                (
                    "parent",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="children",
                        to="products.category",
                        verbose_name="Categoría padre",
                    ),
                ),
            ],
            options={
                "verbose_name": "Categoría",
                "verbose_name_plural": "Categorías",
                "ordering": ["name"],
            },
        ),
        # 3. Tabla Product
        migrations.CreateModel(
            name="Product",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("name", models.CharField(max_length=200, verbose_name="Nombre")),
                (
                    "normalized_name",
                    models.CharField(
                        blank=True, max_length=200, verbose_name="Nombre normalizado"
                    ),
                ),
                (
                    "barcode",
                    models.CharField(
                        blank=True,
                        max_length=20,
                        null=True,
                        unique=True,
                        verbose_name="Código de barras",
                    ),
                ),
                ("brand", models.CharField(blank=True, max_length=100, verbose_name="Marca")),
                (
                    "unit",
                    models.CharField(
                        choices=[
                            ("kg", "Kilogramos"),
                            ("g", "Gramos"),
                            ("l", "Litros"),
                            ("ml", "Mililitros"),
                            ("units", "Unidades"),
                        ],
                        default="units",
                        max_length=10,
                        verbose_name="Unidad",
                    ),
                ),
                (
                    "unit_quantity",
                    models.FloatField(default=1.0, verbose_name="Cantidad por unidad"),
                ),
                ("image_url", models.URLField(blank=True, verbose_name="URL imagen")),
                ("is_active", models.BooleanField(default=True, verbose_name="Activo")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "category",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="products",
                        to="products.category",
                        verbose_name="Categoría",
                    ),
                ),
            ],
            options={
                "verbose_name": "Producto",
                "verbose_name_plural": "Productos",
                "ordering": ["normalized_name"],
            },
        ),
        # GIN index en normalized_name con operador class gin_trgm_ops
        migrations.AddIndex(
            model_name="product",
            index=GinIndex(
                fields=["normalized_name"],
                name="products_normalized_name_gin",
                opclasses=["gin_trgm_ops"],
            ),
        ),
        # 4. Tabla ProductProposal
        migrations.CreateModel(
            name="ProductProposal",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True, primary_key=True, serialize=False, verbose_name="ID"
                    ),
                ),
                ("name", models.CharField(max_length=200, verbose_name="Nombre")),
                ("brand", models.CharField(blank=True, max_length=100, verbose_name="Marca")),
                (
                    "barcode",
                    models.CharField(
                        blank=True, max_length=20, verbose_name="Código de barras"
                    ),
                ),
                ("image_url", models.URLField(blank=True, verbose_name="URL imagen")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "Pendiente"),
                            ("approved", "Aprobado"),
                            ("rejected", "Rechazado"),
                        ],
                        default="pending",
                        max_length=20,
                        verbose_name="Estado",
                    ),
                ),
                ("notes", models.TextField(blank=True, verbose_name="Notas")),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "category",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        to="products.category",
                        verbose_name="Categoría",
                    ),
                ),
                (
                    "proposed_by",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="proposals",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="Propuesto por",
                    ),
                ),
            ],
            options={
                "verbose_name": "Propuesta de producto",
                "verbose_name_plural": "Propuestas de productos",
                "ordering": ["-created_at"],
            },
        ),
    ]
