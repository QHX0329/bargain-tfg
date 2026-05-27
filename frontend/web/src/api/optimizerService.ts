/**
 * Servicio de optimizador de rutas — wrapper tipado sobre apiClient.
 */

import { apiClient } from './client';
import type { OptimizeResponse, OptimizerConfig } from '../types/consumer';

export interface OptimizeRequest {
  shopping_list_id: number;
  lat: number;
  lng: number;
  max_distance_km?: number;
  max_stops?: number;
  w_precio?: number;
  w_distancia?: number;
  w_tiempo?: number;
}

export const optimizerService = {
  /** POST /optimizer/optimize/ — ejecutar optimización de ruta */
  optimize: (data: OptimizeRequest): Promise<OptimizeResponse> =>
    apiClient.post<never, OptimizeResponse>('/optimizer/optimize/', data),

  /** GET /optimizer/config/ — obtener configuración del usuario */
  getConfig: (): Promise<OptimizerConfig> =>
    apiClient.get<never, OptimizerConfig>('/optimizer/config/'),

  /** PATCH /optimizer/config/ — actualizar configuración del usuario */
  updateConfig: (data: Partial<OptimizerConfig>): Promise<OptimizerConfig> =>
    apiClient.patch<never, OptimizerConfig>('/optimizer/config/', data),
};
