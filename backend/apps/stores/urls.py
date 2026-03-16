"""URLs del módulo de tiendas."""

from rest_framework.routers import DefaultRouter

from .views import StoreViewSet

router = DefaultRouter()
router.register(r"", StoreViewSet, basename="store")

urlpatterns = router.urls
