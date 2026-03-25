"""URLs del modulo optimizer."""

from django.urls import path

from .views import OptimizeView

urlpatterns = [
    path("", OptimizeView.as_view(), name="optimize"),
]
