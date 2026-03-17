"""URLs del módulo de notificaciones."""

from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import NotificationViewSet, PushTokenView

router = DefaultRouter()
router.register(r"", NotificationViewSet, basename="notification")

urlpatterns = [
    path("push-token/", PushTokenView.as_view(), name="push-token"),
    path("", include(router.urls)),
]
