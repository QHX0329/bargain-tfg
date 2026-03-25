"""URLs del módulo de asistente LLM."""

from django.urls import path

from .views import AssistantChatView

urlpatterns = [
    path("chat/", AssistantChatView.as_view(), name="assistant-chat"),
]
