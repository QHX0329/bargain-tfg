/**
 * [F5-05] Servicio HTTP para el endpoint de optimización de rutas.
 *
 * POST /api/v1/optimize/
 * - Request: { shopping_list_id, lat, lng, max_distance_km?, max_stops?, w_precio?, w_distancia?, w_tiempo? }
 * - Success: { success: true, data: OptimizeResponse }
 * - Error 404: { success: false, error: { code: "OPTIMIZER_NO_STORES_IN_RADIUS", message: "..." } }
 */

import { apiClient } from "./client";

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
  query_text: string;
  quantity: number;
  matched_product_id: number;
  matched_product_name: string;
  matched_store_id: number;
  matched_store_name: string;
  matched_chain: string;
  price: number;
  similarity_score: number;
  candidate_rank: number;
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

interface RawRouteStopProduct {
  query_text: string;
  quantity: number | string;
  matched_product_id: number | string;
  matched_product_name: string;
  matched_store_id: number | string;
  matched_store_name: string;
  matched_chain: string;
  price: number | string;
  similarity_score: number | string;
  candidate_rank: number | string;
}

interface RawRouteStop {
  store_id: number | string;
  store_name: string;
  chain: string;
  lat: number | string;
  lng: number | string;
  distance_km: number | string;
  time_minutes: number | string;
  products: RawRouteStopProduct[];
}

interface RawOptimizeResponse {
  id: number | string;
  total_price?: number | string;
  total_distance_km?: number | string;
  estimated_time_minutes?: number | string;
  route?: RawRouteStop[];
  route_data?: RawRouteStop[];
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }
  return fallback;
}

function normalizeRouteStopProduct(raw: RawRouteStopProduct): RouteStopProduct {
  return {
    query_text: raw.query_text,
    quantity: Math.max(0, Math.round(toNumber(raw.quantity, 0))),
    matched_product_id: Math.round(toNumber(raw.matched_product_id, 0)),
    matched_product_name: raw.matched_product_name,
    matched_store_id: Math.round(toNumber(raw.matched_store_id, 0)),
    matched_store_name: raw.matched_store_name,
    matched_chain: raw.matched_chain,
    price: toNumber(raw.price, 0),
    similarity_score: toNumber(raw.similarity_score, 0),
    candidate_rank: Math.max(1, Math.round(toNumber(raw.candidate_rank, 1))),
  };
}

function normalizeRouteStop(raw: RawRouteStop): RouteStop {
  return {
    store_id: Math.round(toNumber(raw.store_id, 0)),
    store_name: raw.store_name,
    chain: raw.chain,
    lat: toNumber(raw.lat, 0),
    lng: toNumber(raw.lng, 0),
    distance_km: toNumber(raw.distance_km, 0),
    time_minutes: toNumber(raw.time_minutes, 0),
    products: (raw.products ?? []).map(normalizeRouteStopProduct),
  };
}

function normalizeOptimizeResponse(raw: RawOptimizeResponse): OptimizeResponse {
  const routeRaw = raw.route ?? raw.route_data ?? [];

  return {
    id: Math.round(toNumber(raw.id, 0)),
    total_price: toNumber(raw.total_price, 0),
    total_distance_km: toNumber(raw.total_distance_km, 0),
    estimated_time_minutes: toNumber(raw.estimated_time_minutes, 0),
    route: routeRaw.map(normalizeRouteStop),
  };
}

export const optimizeRoute = async (
  data: OptimizeRequest,
): Promise<OptimizeResponse> => {
  const payload = await apiClient.post<never, RawOptimizeResponse | { data: RawOptimizeResponse }>(
    "/optimize/",
    data,
  );

  const raw =
    payload && typeof payload === "object" && "data" in payload
      ? (payload.data as RawOptimizeResponse)
      : (payload as RawOptimizeResponse);

  return normalizeOptimizeResponse(raw);
};
