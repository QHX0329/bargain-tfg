/**
 * Store de listas de la compra con Zustand.
 *
 * Gestiona las listas del usuario, la lista activa y el estado de carga.
 * Las acciones aquí solo modifican el estado local — los servicios de API
 * (listService) son responsables de comunicarse con el backend.
 */

import { create } from "zustand";
import type { ShoppingList, ShoppingListItem } from "@/types/domain";

interface ListState {
  /** Todas las listas del usuario */
  lists: ShoppingList[];
  /** Lista activa (seleccionada para ver/editar) */
  activeList: ShoppingList | null;
  /** Carga en curso */
  isLoading: boolean;

  /** Reemplazar todas las listas (tras fetch) */
  setLists: (lists: ShoppingList[]) => void;
  /** Activar una lista */
  setActiveList: (list: ShoppingList | null) => void;
  /** Añadir lista al estado local */
  addList: (list: ShoppingList) => void;
  /** Eliminar lista del estado local */
  removeList: (id: string) => void;
  /** Actualizar un ítem dentro de la lista activa */
  updateListItem: (listId: string, item: ShoppingListItem) => void;
}

export const useListStore = create<ListState>((set) => ({
  lists: [],
  activeList: null,
  isLoading: false,

  setLists: (lists) => set({ lists }),

  setActiveList: (list) => set({ activeList: list }),

  addList: (list) =>
    set((state) => ({ lists: [list, ...state.lists] })),

  removeList: (id) =>
    set((state) => ({
      lists: state.lists.filter((l) => l.id !== id),
      activeList: state.activeList?.id === id ? null : state.activeList,
    })),

  updateListItem: (listId, updatedItem) =>
    set((state) => ({
      lists: state.lists.map((list) =>
        list.id === listId
          ? {
              ...list,
              items: list.items.map((item) =>
                item.id === updatedItem.id ? updatedItem : item,
              ),
            }
          : list,
      ),
      activeList:
        state.activeList?.id === listId
          ? {
              ...state.activeList,
              items: state.activeList.items.map((item) =>
                item.id === updatedItem.id ? updatedItem : item,
              ),
            }
          : state.activeList,
    })),
}));
