/**
 * Servicio de notificaciones — wrapper tipado sobre apiClient.
 * Portado desde frontend/src/api/notificationService.ts para la web de consumidor.
 * Se elimina registerPushToken (no aplica en web).
 */

import { apiClient } from './client';
import type { Notification } from '../types/consumer';

export interface NotificationPage {
  count: number;
  next: string | null;
  previous: string | null;
  results: Notification[];
}

export const notificationService = {
  /** GET /notifications/?page={page} — listar notificaciones paginadas */
  getNotifications: (page = 1): Promise<NotificationPage> =>
    apiClient.get<never, NotificationPage>('/notifications/', { params: { page } }),

  /** PATCH /notifications/{id}/mark_read/ — marcar notificación como leída */
  markAsRead: (id: string | number): Promise<Notification> =>
    apiClient.patch<never, Notification>(`/notifications/${id}/mark_read/`),

  /** POST /notifications/read-all/ — marcar todas como leídas */
  markAllAsRead: (): Promise<void> =>
    apiClient.post<never, void>('/notifications/read-all/'),

  /** DELETE /notifications/{id}/ — eliminar (soft-delete) notificación */
  deleteNotification: (id: string | number): Promise<void> =>
    apiClient.delete<never, void>(`/notifications/${id}/`),
};
