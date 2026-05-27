/**
 * Servicio de precios y alertas — wrapper tipado sobre apiClient.
 */

import { apiClient } from './client';
import type { PriceAlert, PriceCompare } from '../types/consumer';

export const priceService = {
  /** GET /prices/compare/?product_id={id} — comparar precio en todas las tiendas */
  compare: (productId: number | string): Promise<PriceCompare[]> =>
    apiClient.get<never, PriceCompare[]>('/prices/compare/', {
      params: { product_id: productId },
    }),

  /** GET /prices/alerts/ — listar alertas de precio del usuario */
  getAlerts: (): Promise<PriceAlert[]> =>
    apiClient.get<never, PriceAlert[]>('/prices/alerts/'),

  /** POST /prices/alerts/ — crear nueva alerta de precio */
  createAlert: (data: {
    product: number;
    target_price: number;
    store?: number;
  }): Promise<PriceAlert> =>
    apiClient.post<never, PriceAlert>('/prices/alerts/', data),

  /** DELETE /prices/alerts/{id}/ — eliminar alerta de precio */
  deleteAlert: (id: string): Promise<void> =>
    apiClient.delete<never, void>(`/prices/alerts/${id}/`),
};
