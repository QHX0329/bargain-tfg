"""Permisos personalizados para el portal business de BargAIn."""

from rest_framework.permissions import BasePermission


class IsVerifiedBusiness(BasePermission):
    """
    Permiso que verifica que el usuario es un negocio verificado.

    Requiere:
    - Usuario autenticado
    - role == 'business'
    - BusinessProfile.is_verified == True
    """

    def has_permission(self, request, view) -> bool:
        if not request.user or not request.user.is_authenticated:
            return False
        if request.user.role != "business":
            return False
        from apps.business.models import BusinessProfile

        return BusinessProfile.objects.filter(user=request.user, is_verified=True).exists()


class IsBusinessOwner(BasePermission):
    """
    Permiso a nivel de objeto: verifica que el usuario es el propietario del negocio.

    Aplica a objetos Promotion y Price donde store.business_profile.user == request.user.
    """

    def has_object_permission(self, request, view, obj) -> bool:
        try:
            return obj.store.business_profile.user == request.user
        except AttributeError:
            return False
