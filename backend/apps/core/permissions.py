"""
Permisos personalizados para la API de BargAIn.

Basados en el rol del usuario (consumer / business / admin).
"""

from rest_framework.permissions import BasePermission


class IsConsumer(BasePermission):
    """Permite acceso solo a usuarios con rol 'consumer'."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_consumer)


class IsBusiness(BasePermission):
    """Permite acceso solo a usuarios con rol 'business' (PYME)."""

    def has_permission(self, request, view) -> bool:
        return bool(request.user and request.user.is_authenticated and request.user.is_business)


class IsConsumerOrBusiness(BasePermission):
    """Permite acceso a usuarios consumer o business (cualquier usuario registrado con rol)."""

    def has_permission(self, request, view) -> bool:
        return bool(
            request.user
            and request.user.is_authenticated
            and (request.user.is_consumer or request.user.is_business)
        )


class IsOwnerOrAdmin(BasePermission):
    """
    Permite acceso al propietario del objeto o a un administrador.

    El modelo debe implementar `user` o `owner` como FK al usuario.
    """

    def has_object_permission(self, request, view, obj) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        owner = getattr(obj, "user", None) or getattr(obj, "owner", None)
        return owner == request.user


class IsBusinessOwnerOrAdmin(BasePermission):
    """
    Permite acceso al negocio propietario del objeto o a un administrador.

    El modelo debe implementar `business` como FK al BusinessProfile.
    """

    def has_object_permission(self, request, view, obj) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.is_staff:
            return True
        if not request.user.is_business:
            return False
        business = getattr(obj, "business", None)
        return business and business.user == request.user
