/**
 * Domain types for the consumer web section.
 * Ported from frontend/src/types/domain.ts with web-specific adjustments.
 */

export type StoreChain = 'mercadona' | 'lidl' | 'aldi' | 'carrefour' | 'dia' | 'alcampo' | 'local';
export type ProductUnit = 'kg' | 'g' | 'l' | 'ml' | 'ud' | 'pack';
export type PriceSource = 'scraping' | 'crowdsourcing' | 'api' | 'manual' | 'business';

export interface ShoppingListItem {
  id: string;
  name: string;
  product_name?: string;
  normalized_name?: string;
  quantity: number;
  is_checked?: boolean;
  note?: string;
  latest_price?: number | null;
  is_stale?: boolean | null;
}

export interface ShoppingList {
  id: string;
  name: string;
  owner?: string;
  items: ShoppingListItem[];
  is_archived?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ListTemplateItem {
  id: string;
  name: string;
  ordering: number;
}

export interface ListTemplate {
  id: string;
  name: string;
  items: ListTemplateItem[];
  item_count: number;
  created_at: string;
  source_list?: string | null;
}

export interface Product {
  id: string;
  name: string;
  normalizedName: string;
  brand?: string;
  category: string;
  barcode?: string;
  unit: ProductUnit;
  unitQuantity: number;
  imageUrl?: string;
}

export interface ProductCategory {
  id: number;
  name: string;
  children?: ProductCategory[];
}

export interface Store {
  id: string;
  name: string;
  chain: StoreChain;
  address: string;
  distanceKm: number;
  estimatedMinutes: number;
  isOpen: boolean;
  location?: { type: string; coordinates: [number, number] };
  isFavorite?: boolean;
  openingHours?: Record<string, string>;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  max_search_radius_km: number;
  max_stops: number;
  weight_price: number;
  weight_distance: number;
  weight_time: number;
  push_notifications_enabled?: boolean;
}

export interface Notification {
  id: string;
  notification_type: string;
  title: string;
  body: string;
  is_read: boolean;
  data: Record<string, unknown>;
  action_url: string | null;
  created_at: string;
}

export interface PriceAlert {
  id: string;
  product: number | Product;
  product_name?: string;
  target_price: number;
  is_active: boolean;
  created_at: string;
  triggered_at?: string | null;
}

export interface PriceCompare {
  store_id: number;
  store_name: string;
  price: string;
  offer_price: string | null;
  source: PriceSource;
  is_stale: boolean;
  distance_km: number | null;
  verified_at: string;
}

export interface OCRItem {
  raw_text: string;
  matched_product_id?: number;
  matched_product_name?: string;
  confidence: number;
  quantity: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface OptimizerConfig {
  max_distance_km: number;
  max_stops: number;
  w_precio: number;
  w_distancia: number;
  w_tiempo: number;
}

export interface RouteStopProduct {
  query_text: string;
  quantity: number;
  matched_product_id: number;
  matched_product_name: string;
  price: number;
  matched_store_name: string;
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
  shopping_list_id: number;
  total_price: number;
  total_distance_km: number;
  estimated_time_minutes: number;
  route: RouteStop[];
  w_precio: number;
  w_distancia: number;
  w_tiempo: number;
  max_distance_km: number;
  max_stops: number;
}
