/**
 * Servicio de listas de la compra — wrapper tipado sobre apiClient.
 */

import { apiClient } from "./client";
import type {
  ShoppingList,
  ShoppingListItem,
  ListTemplate,
} from "@/types/domain";

export interface ListCollaboratorUser {
  id: number;
  username: string;
}

export interface ListCollaborator {
  id: string;
  user: ListCollaboratorUser;
  invited_by: ListCollaboratorUser | null;
  created_at: string;
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function normalizeListCollection(
  payload: ShoppingList[] | PaginatedResponse<ShoppingList>,
): ShoppingList[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.results)) {
    return payload.results;
  }

  return [];
}

export interface AddItemPayload {
  name: string;
  quantity: number;
  is_checked?: boolean;
}

export interface UpdateItemPayload {
  quantity?: number;
  is_checked?: boolean;
  note?: string;
}

export const listService = {
  /** GET /lists/ — listar todas las listas del usuario */
  getLists: async (): Promise<ShoppingList[]> => {
    const payload = await apiClient.get<
      never,
      ShoppingList[] | PaginatedResponse<ShoppingList>
    >("/lists/");
    return normalizeListCollection(payload);
  },

  /** GET /lists/{id}/ — detalle de una lista */
  getList: (id: string): Promise<ShoppingList> =>
    apiClient.get<never, ShoppingList>(`/lists/${id}/`),

  /** POST /lists/ — crear nueva lista */
  createList: (name: string): Promise<ShoppingList> =>
    apiClient.post<never, ShoppingList>("/lists/", { name }),

  /** PATCH /lists/{id}/ — actualizar nombre o estado de archivado */
  updateList: (
    id: string,
    data: Partial<Pick<ShoppingList, "name" | "is_archived">>,
  ): Promise<ShoppingList> =>
    apiClient.patch<never, ShoppingList>(`/lists/${id}/`, data),

  /** DELETE /lists/{id}/ — eliminar lista */
  deleteList: (id: string): Promise<void> =>
    apiClient.delete<never, void>(`/lists/${id}/`),

  /** POST /lists/{id}/items/ — añadir producto a la lista */
  addItem: (
    listId: string,
    payload: AddItemPayload,
  ): Promise<ShoppingListItem> =>
    apiClient.post<never, ShoppingListItem>(`/lists/${listId}/items/`, payload),

  /** PATCH /lists/{id}/items/{itemId}/ — actualizar ítem */
  updateItem: (
    listId: string,
    itemId: string,
    data: UpdateItemPayload,
  ): Promise<ShoppingListItem> =>
    apiClient.patch<never, ShoppingListItem>(
      `/lists/${listId}/items/${itemId}/`,
      data,
    ),

  /** DELETE /lists/{id}/items/{itemId}/ — eliminar ítem */
  deleteItem: (listId: string, itemId: string): Promise<void> =>
    apiClient.delete<never, void>(`/lists/${listId}/items/${itemId}/`),

  /** GET /lists/{id}/collaborators/ — listar colaboradores */
  getCollaborators: (listId: string): Promise<ListCollaborator[]> =>
    apiClient.get<never, ListCollaborator[]>(`/lists/${listId}/collaborators/`),

  /** POST /lists/{id}/collaborators/ — invitar colaborador por username */
  addCollaborator: (
    listId: string,
    username: string,
  ): Promise<ListCollaborator> =>
    apiClient.post<never, ListCollaborator>(`/lists/${listId}/collaborators/`, {
      username,
    }),

  /** DELETE /lists/{id}/collaborators/{userId}/ — eliminar colaborador */
  removeCollaborator: (listId: string, userId: number): Promise<void> =>
    apiClient.delete<never, void>(`/lists/${listId}/collaborators/${userId}/`),

  // ── Plantillas ──────────────────────────────────────────────────────────────

  /** GET /lists/templates/ — listar plantillas del usuario */
  getTemplates: async (): Promise<ListTemplate[]> => {
    const payload = await apiClient.get<
      never,
      ListTemplate[] | { results: ListTemplate[] }
    >("/lists/templates/");
    if (Array.isArray(payload)) return payload;
    if (payload && Array.isArray((payload as any).results))
      return (payload as any).results;
    return [];
  },

  /** GET /lists/templates/{id}/ — detalle de plantilla */
  getTemplate: (id: string): Promise<ListTemplate> =>
    apiClient.get<never, ListTemplate>(`/lists/templates/${id}/`),

  /** POST /lists/templates/ — crear plantilla vacía con nombre */
  createTemplate: (name: string): Promise<ListTemplate> =>
    apiClient.post<never, ListTemplate>("/lists/templates/", { name }),

  /** PATCH /lists/templates/{id}/ — renombrar plantilla */
  updateTemplate: (id: string, name: string): Promise<ListTemplate> =>
    apiClient.patch<never, ListTemplate>(`/lists/templates/${id}/`, { name }),

  /** DELETE /lists/templates/{id}/ — eliminar plantilla */
  deleteTemplate: (id: string): Promise<void> =>
    apiClient.delete<never, void>(`/lists/templates/${id}/`),

  /** POST /lists/templates/{id}/create-list/ — instanciar lista desde plantilla */
  createListFromTemplate: (
    templateId: string,
    name?: string,
  ): Promise<ShoppingList> =>
    apiClient.post<never, ShoppingList>(
      `/lists/templates/${templateId}/create-list/`,
      {
        ...(name ? { name } : {}),
      },
    ),

  /** POST /lists/{id}/save-template/ — guardar lista actual como plantilla */
  saveAsTemplate: (listId: string, name: string): Promise<ListTemplate> =>
    apiClient.post<never, ListTemplate>(`/lists/${listId}/save-template/`, {
      name,
    }),
};
