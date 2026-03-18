/**
 * Servicio de notificaciones — wrapper tipado sobre apiClient.
 */

import { apiClient } from "./client";
import type { Notification } from "@/types/domain";

export interface NotificationPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

export const notificationService = {
  /** GET /notifications/?page={page} — listar notificaciones paginadas */
  getNotifications: (page = 1): Promise<NotificationPage> =>
    apiClient.get<never, NotificationPage>("/notifications/", {
      params: { page },
    }),

  /** PATCH /notifications/{id}/read/ — marcar notificación como leída */
  markAsRead: (id: string): Promise<Notification> =>
    apiClient.patch<never, Notification>(`/notifications/${id}/read/`),

  /** PATCH /notifications/ con {mark_all_read: true} — marcar todas como leídas */
  markAllAsRead: (): Promise<void> =>
    apiClient.patch<never, void>("/notifications/", { mark_all_read: true }),

  /** DELETE /notifications/{id}/ — eliminar (soft-delete) notificación */
  deleteNotification: (id: string): Promise<void> =>
    apiClient.delete<never, void>(`/notifications/${id}/`),

  /**
   * POST /notifications/push-token/ — registrar token de push (Expo)
   */
  registerPushToken: (token: string, deviceId: string): Promise<void> =>
    apiClient.post<never, void>("/notifications/push-token/", {
      token,
      device_id: deviceId,
    }),
};
