"""Helpers de respuesta estándar para la API de BarGAIN."""

from rest_framework import status as http_status
from rest_framework.response import Response


def success_response(data: object, status: int = http_status.HTTP_200_OK) -> Response:
    """Devuelve una respuesta de éxito con el formato estándar de BarGAIN.

    Args:
        data: Datos a incluir en el campo ``data`` de la respuesta.
        status: Código HTTP de la respuesta (por defecto 200).

    Returns:
        Response con body ``{"success": True, "data": <data>}``.
    """
    return Response({"success": True, "data": data}, status=status)


def created_response(data: object) -> Response:
    """Atajo para success_response con status 201 Created.

    Args:
        data: Datos del recurso creado.

    Returns:
        Response con status 201 y body ``{"success": True, "data": <data>}``.
    """
    return success_response(data, status=http_status.HTTP_201_CREATED)
