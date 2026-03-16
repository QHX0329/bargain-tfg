"""
Configuración de URLs para el dominio products.

Rutas:
- /api/v1/products/                    → ProductViewSet (lista y detalle)
- /api/v1/products/autocomplete/       → ProductViewSet.autocomplete
- /api/v1/products/categories/         → CategoryViewSet
- /api/v1/products/proposals/          → ProductProposalView
"""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.products.views import CategoryViewSet, ProductProposalView, ProductViewSet

router = DefaultRouter()
router.register(r"categories", CategoryViewSet, basename="category")
router.register(r"", ProductViewSet, basename="product")

urlpatterns = [
    path("proposals/", ProductProposalView.as_view(), name="product-proposal-create"),
    path("", include(router.urls)),
]
