/**
 * Zustand store para listas de la compra del consumidor.
 */

import { create } from 'zustand';
import type { ShoppingList } from '../../types/consumer';

interface ListStoreState {
  lists: ShoppingList[];
  activeListId: string | null;
  setLists: (lists: ShoppingList[]) => void;
  upsertList: (list: ShoppingList) => void;
  removeList: (id: string) => void;
  setActiveListId: (id: string | null) => void;
}

export const useListStore = create<ListStoreState>((set) => ({
  lists: [],
  activeListId: null,

  setLists: (lists) => set({ lists }),

  upsertList: (list) =>
    set((state) => ({
      lists: state.lists.some((l) => l.id === list.id)
        ? state.lists.map((l) => (l.id === list.id ? list : l))
        : [...state.lists, list],
    })),

  removeList: (id) => set((state) => ({ lists: state.lists.filter((l) => l.id !== id) })),

  setActiveListId: (id) => set({ activeListId: id }),
}));
