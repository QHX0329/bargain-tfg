"""Configuración de URLs principal del proyecto BargAIn."""

from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from drf_spectacular.views import SpectacularAPIView, SpectacularRedocView, SpectacularSwaggerView

urlpatterns = [
    # Health check (sin autenticación, para Docker / load balancers)
    path("api/health/", include("apps.core.urls")),
    # Admin
    path("admin/", admin.site.urls),
    # API v1 — five core domains
    path("api/v1/auth/", include("apps.users.urls")),
    path("api/v1/products/", include("apps.products.urls")),
    path("api/v1/stores/", include("apps.stores.urls")),
    path("api/v1/prices/", include("apps.prices.urls")),
    path("api/v1/lists/", include("apps.shopping_lists.urls")),
    # API v1 — future domains (skeleton URLs)
    path("api/v1/optimize/", include("apps.optimizer.urls")),
    path("api/v1/ocr/", include("apps.ocr.urls")),
    path("api/v1/assistant/", include("apps.assistant.urls")),
    path("api/v1/business/", include("apps.business.urls")),
    path("api/v1/notifications/", include("apps.notifications.urls")),
    # OpenAPI / Swagger — mounted at api/v1/schema/ per Phase 1 gate spec
    path("api/v1/schema/", SpectacularAPIView.as_view(), name="schema"),
    path(
        "api/v1/schema/swagger-ui/",
        SpectacularSwaggerView.as_view(url_name="schema"),
        name="swagger-ui",
    ),
    path(
        "api/v1/schema/redoc/",
        SpectacularRedocView.as_view(url_name="schema"),
        name="redoc",
    ),
]

# Archivos media y debug toolbar solo en desarrollo
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

    try:
        import debug_toolbar

        urlpatterns = [
            path("__debug__/", include(debug_toolbar.urls)),
        ] + urlpatterns
    except ImportError:
        pass
