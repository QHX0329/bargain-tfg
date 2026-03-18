/**
 * Store de notificaciones con Zustand.
 *
 * Gestiona el buzón de notificaciones del usuario, el contador de no leídas
 * y la paginación del feed.
 */

import { create } from "zustand";
import type { Notification } from "@/types/domain";

interface NotificationState {
  /** Lista de notificaciones cargadas */
  notifications: Notification[];
  /** Número de notificaciones no leídas */
  unreadCount: number;
  /** Carga en curso */
  isLoading: boolean;
  /** Página actual (paginación infinita) */
  page: number;
  /** Si hay más páginas disponibles */
  hasMore: boolean;

  /** Reemplazar notificaciones (primera carga o refresh) */
  setNotifications: (notifications: Notification[]) => void;
  /** Añadir notificaciones al final (scroll infinito) */
  appendNotifications: (notifications: Notification[]) => void;
  /** Marcar una notificación como leída */
  markRead: (id: string) => void;
  /** Marcar todas las notificaciones como leídas */
  markAllRead: () => void;
  /** Eliminar notificación del estado local */
  removeNotification: (id: string) => void;
}

function countUnread(notifications: Notification[]): number {
  return notifications.filter((n) => !n.is_read).length;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  page: 1,
  hasMore: true,

  setNotifications: (notifications) =>
    set({
      notifications,
      unreadCount: countUnread(notifications),
    }),

  appendNotifications: (newNotifications) =>
    set((state) => {
      const merged = [...state.notifications, ...newNotifications];
      return {
        notifications: merged,
        unreadCount: countUnread(merged),
        page: state.page + 1,
        hasMore: newNotifications.length > 0,
      };
    }),

  markRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, is_read: true } : n,
      );
      return {
        notifications: updated,
        unreadCount: countUnread(updated),
      };
    }),

  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, is_read: true })),
      unreadCount: 0,
    })),

  removeNotification: (id) =>
    set((state) => {
      const updated = state.notifications.filter((n) => n.id !== id);
      return {
        notifications: updated,
        unreadCount: countUnread(updated),
      };
    }),
}));
