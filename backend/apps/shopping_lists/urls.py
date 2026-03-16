"""URLs para el dominio shopping_lists."""

from rest_framework.routers import DefaultRouter

from .views import ShoppingListViewSet

router = DefaultRouter()
router.register(r"", ShoppingListViewSet, basename="shoppinglist")

urlpatterns = router.urls
