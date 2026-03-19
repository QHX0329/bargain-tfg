"""
Permisos personalizados para el dominio shopping_lists.
"""

from rest_framework.permissions import BasePermission


class IsOwnerOrCollaborator(BasePermission):
    """
    Permite acceso si el usuario es propietario o colaborador de la lista.

    Funciona tanto para ShoppingList directamente como para objetos anidados
    que tengan el atributo `shopping_list` (ShoppingListItem, ListCollaborator).
    """

    def has_object_permission(self, request, view, obj) -> bool:
        shopping_list = obj.shopping_list if hasattr(obj, "shopping_list") else obj

        if request.user == shopping_list.owner:
            return True
        return shopping_list.listcollaborator_set.filter(user=request.user).exists()
