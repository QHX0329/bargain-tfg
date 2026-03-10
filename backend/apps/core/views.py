"""Vistas del módulo core: health check y utilidades."""

from django.db import connection
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response


@api_view(["GET"])
@permission_classes([AllowAny])
def health_check(request) -> Response:
    """
    Endpoint de health check para Docker, load balancers y monitorización.

    Verifica que la base de datos esté accesible.
    """
    try:
        connection.ensure_connection()
        db_status = "ok"
    except Exception:
        db_status = "error"

    is_healthy = db_status == "ok"

    return Response(
        {
            "status": "ok" if is_healthy else "degraded",
            "services": {
                "database": db_status,
            },
        },
        status=200 if is_healthy else 503,
    )
