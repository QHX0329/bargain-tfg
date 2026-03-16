"""
Registro de modelos del dominio products en el admin de Django.
"""

from django.contrib import admin
from django.utils.translation import gettext_lazy as _

from apps.products.models import Category, Product, ProductProposal


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    """Admin para categorías de productos."""

    list_display = ("name", "slug", "parent", "created_at")
    list_filter = ("parent",)
    search_fields = ("name", "slug")
    prepopulated_fields = {"slug": ("name",)}
    ordering = ("name",)


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    """Admin para el catálogo de productos."""

    list_display = (
        "name",
        "normalized_name",
        "barcode",
        "category",
        "brand",
        "unit",
        "unit_quantity",
        "is_active",
        "created_at",
    )
    list_filter = ("category", "unit", "is_active", "brand")
    search_fields = ("name", "normalized_name", "barcode", "brand")
    readonly_fields = ("created_at", "updated_at")
    ordering = ("normalized_name",)
    list_editable = ("is_active",)

    fieldsets = (
        (
            None,
            {
                "fields": ("name", "normalized_name", "barcode", "category", "brand"),
            },
        ),
        (
            _("Detalles"),
            {
                "fields": ("unit", "unit_quantity", "image_url"),
            },
        ),
        (
            _("Estado"),
            {
                "fields": ("is_active", "created_at", "updated_at"),
            },
        ),
    )


@admin.action(description=_("Aprobar propuestas seleccionadas"))
def approve_proposals(modeladmin, request, queryset):
    """Acción para aprobar propuestas y crear productos reales."""
    for proposal in queryset.filter(status="pending"):
        # Crear producto desde la propuesta
        Product.objects.create(
            name=proposal.name,
            brand=proposal.brand,
            barcode=proposal.barcode or None,
            category=proposal.category,
            image_url=proposal.image_url,
        )
        proposal.status = "approved"
        proposal.save()


@admin.register(ProductProposal)
class ProductProposalAdmin(admin.ModelAdmin):
    """Admin para propuestas de productos (crowdsourcing)."""

    list_display = (
        "name",
        "brand",
        "barcode",
        "category",
        "status",
        "proposed_by",
        "created_at",
    )
    list_filter = ("status", "category")
    search_fields = ("name", "brand", "barcode")
    readonly_fields = ("created_at",)
    ordering = ("-created_at",)
    actions = [approve_proposals]

    def get_queryset(self, request):
        """Optimiza queries con select_related."""
        return super().get_queryset(request).select_related("proposed_by", "category")
