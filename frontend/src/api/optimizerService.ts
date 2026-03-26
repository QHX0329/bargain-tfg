/**
 * [F5-05] Servicio HTTP para el endpoint de optimización de rutas.
 *
 * POST /api/v1/optimize/
 * - Request: { shopping_list_id, lat, lng, max_distance_km?, max_stops?, w_precio?, w_distancia?, w_tiempo? }
 * - Success: { success: true, data: OptimizeResponse }
 * - Error 404: { success: false, error: { code: "OPTIMIZER_NO_STORES_IN_RADIUS", message: "..." } }
 */

import { apiClient } from './client';

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

export interface RouteStopProduct {
  product_id: number;
  name: string;
  price: number;
}

export interface RouteStop {
  store_id: number;
  store_name: string;
  chain: string;
  lat: number;
  lng: number;
  distance_km: number;
  time_minutes: number;
  products: RouteStopProduct[];
}

export interface OptimizeResponse {
  id: number;
  total_price: number;
  total_distance_km: number;
  estimated_time_minutes: number;
  route: RouteStop[];
}

export const optimizeRoute = (data: OptimizeRequest) =>
  apiClient.post<OptimizeResponse>('/optimize/', data);
