"""Configuración de URLs principal del proyecto BargAIn."""

from django.conf import settings
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView

urlpatterns = [
    # Health check (sin autenticación, para Docker / load balancers)
    path("api/health/", include("apps.core.urls")),
    # Admin
    path("admin/", admin.site.urls),
    # API v1
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/products/", include("apps.products.urls")),
    path("api/v1/stores/", include("apps.stores.urls")),
    path("api/v1/prices/", include("apps.prices.urls")),
    path("api/v1/lists/", include("apps.shopping_lists.urls")),
    path("api/v1/optimize/", include("apps.optimizer.urls")),
    path("api/v1/ocr/", include("apps.ocr.urls")),
    path("api/v1/assistant/", include("apps.assistant.urls")),
    path("api/v1/business/", include("apps.business.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    # OpenAPI / Swagger
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
]

# Debug toolbar solo en desarrollo
if settings.DEBUG:
    try:
        import debug_toolbar

        urlpatterns = [
            path("__debug__/", include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass
