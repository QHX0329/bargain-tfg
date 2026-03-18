/**
 * Servicio de precios — wrapper tipado sobre apiClient.
 */

import { apiClient } from "./client";
import type { Price, PriceAlert } from "@/types/domain";

export const priceService = {
  /** GET /prices/alerts/ — alertas de precio activas del usuario */
  getPriceAlerts: (): Promise<PriceAlert[]> =>
    apiClient.get<never, PriceAlert[]>("/prices/alerts/"),

  /** GET /prices/?product={productId} — comparar precios de un producto */
  getPriceComparison: (productId: string): Promise<Price[]> =>
    apiClient.get<never, Price[]>("/prices/", {
      params: { product: productId },
    }),
};
