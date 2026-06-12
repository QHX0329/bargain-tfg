"""URLs del módulo business de BarGAIN."""

from rest_framework.routers import DefaultRouter

from .views import BusinessPriceViewSet, BusinessProfileViewSet, PromotionViewSet

router = DefaultRouter()
router.register(r"profiles", BusinessProfileViewSet, basename="business-profile")
router.register(r"promotions", PromotionViewSet, basename="promotion")
router.register(r"prices", BusinessPriceViewSet, basename="business-price")

urlpatterns = router.urls
