/**
 * Servicio de tiendas — wrapper tipado sobre apiClient.
 */

import { apiClient } from "./client";
import type { Store } from "@/types/domain";

export const storeService = {
  /**
   * GET /stores/?lat={lat}&lng={lng}&radius={radius}
   * Devuelve tiendas cercanas a la ubicación del usuario.
   */
  getNearby: (lat: number, lng: number, radius = 10): Promise<Store[]> =>
    apiClient.get<never, Store[]>("/stores/", {
      params: { lat, lng, radius },
    }),
};
