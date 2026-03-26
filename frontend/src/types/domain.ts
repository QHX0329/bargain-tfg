/**
 * Tipos de dominio de BargAIn.
 *
 * Estos tipos reflejan los modelos del backend (ver CLAUDE.md).
 * Las propiedades opcionales pueden no estar presentes en respuestas
 * parciales o de listado (vs. respuestas de detalle).
 */

// ─── Cadenas de supermercado ──────────────────────────────────────────────────

export type StoreChain =
  | "mercadona"
  | "lidl"
  | "aldi"
  | "carrefour"
  | "dia"
  | "alcampo"
  | "local";

// ─── Tienda ───────────────────────────────────────────────────────────────────

export interface Store {
  id: string;
  name: string;
  chain: StoreChain;
  address: string;
  distanceKm: number;
  /** Minutos a pie o en coche según preferencia del usuario */
  estimatedMinutes: number;
  isOpen: boolean;
  logoUrl?: string;
  openingHours?: Record<string, string>;
  isFavorite?: boolean;
  /**
   * Punto geográfico PostGIS serializado como GeoJSON.
   * Formato: { type: "Point", coordinates: [lng, lat] }
   * Extraer: lat = coordinates[1], lng = coordinates[0]
   */
  location?: { type: string; coordinates: [number, number] };
  /** Google Place ID vinculado en la BD (puede estar vacío) */
  googlePlaceId?: string;
}

// ─── Google Places enrichment data (from backend proxy) ───────────────────────

export interface PlacesOpeningHours {
  openNow?: boolean;
  weekdayDescriptions?: string[];
}

export interface PlacesDetail {
  opening_hours?: PlacesOpeningHours | null;
  rating?: number | null;
  user_rating_count?: number | null;
  website_url?: string | null;
}

// ─── Google Places Autocomplete (backend proxy) ──────────────────────────────

export interface PlacesPrediction {
  place_id: string;
  description: string;
  structured: {
    main_text: string;
    secondary_text: string;
  };
}

export interface PlacesResolved {
  place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  /** ID de tienda en BD que tiene este google_place_id (si existe) */
  matched_store_id?: string;
}

// ─── Producto ─────────────────────────────────────────────────────────────────

export type ProductUnit = "kg" | "g" | "l" | "ml" | "ud" | "pack";

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

// ─── Precio ───────────────────────────────────────────────────────────────────

export type PriceSource = "scraping" | "crowdsourcing" | "api" | "manual";

export interface Price {
  id: string;
  product: Product;
  store: Store;
  /** Precio actual */
  price: number;
  /** Precio por unidad normalizada (€/kg, €/l…) */
  unitPrice?: number;
  /** Precio en oferta, si existe */
  offerPrice?: number;
  offerEndDate?: string;
  source: PriceSource;
  verifiedAt: string;
}

// ─── Datos de producto + precio para visualización ───────────────────────────
// Usado en ProductCard, resultados de búsqueda, comparador.

export interface ProductPriceSummary {
  product: Product;
  /** Precio más bajo encontrado en el radio de búsqueda */
  bestPrice: number;
  /** Precio anterior (para mostrar descuento) */
  previousPrice?: number;
  /** Porcentaje de descuento calculado */
  discountPercent?: number;
  /** Tienda con el mejor precio */
  bestStore: Store;
  /** Cuánto ahorra vs. alternativa más cara */
  savingsVsMax?: number;
  /** Total de tiendas que venden este producto */
  storeCount: number;
}

// ─── Lista de la compra ───────────────────────────────────────────────────────

export interface ShoppingListItem {
  id: string;
  /** Texto libre persistido en la lista */
  name: string;
  /** Alias de compatibilidad con respuestas antiguas o mixtas */
  product_name?: string;
  normalized_name?: string;
  quantity: number;
  /** Backend devuelve is_checked (snake_case) */
  is_checked?: boolean;
  /** Alias camelCase para compatibilidad local */
  isChecked?: boolean;
  latest_price?: number | null;
  is_stale?: boolean | null;
  /** Tienda asignada tras optimización */
  assignedStore?: Store;
  /** Precio asignado en la optimización */
  assignedPrice?: number;
  note?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  owner?: string;
  items: ShoppingListItem[];
  is_archived?: boolean;
  /** Backend snake_case date fields */
  created_at?: string;
  updated_at?: string;
  /** Aliases camelCase (por si algún layer los mapea) */
  createdAt?: string;
  updatedAt?: string;
  /** Total estimado (no existe en backend — calculado localmente) */
  totalEstimated?: number;
  totalOptimized?: number;
  isFavorite?: boolean;
}

// ─── Resultado de optimización ────────────────────────────────────────────────

export type OptimizationMode = "price" | "time" | "balanced";

export interface RouteStop {
  order: number;
  store: Store;
  items: ShoppingListItem[];
  subtotal: number;
  estimatedTimeMinutes: number;
}

export interface OptimizationResult {
  id: string;
  shoppingList: ShoppingList;
  mode: OptimizationMode;
  totalPrice: number;
  originalPrice: number;
  savedAmount: number;
  savedPercent: number;
  totalDistanceKm: number;
  totalTimeMinutes: number;
  stops: RouteStop[];
  createdAt: string;
}

// ─── Resumen de ahorro semanal (para el Dashboard) ───────────────────────────

export interface WeeklySavings {
  thisWeek: number;
  lastWeek: number;
  improvementPercent: number;
  totalSavedAllTime: number;
  optimizationsCount: number;
}

// ─── Perfil de usuario ────────────────────────────────────────────────────────

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  /** Nombre compuesto generado localmente: `${first_name} ${last_name}`.trim() */
  name: string;
  phone?: string;
  avatar?: string | null;
  role?: string;
  /** Radio de búsqueda en km — campo real del backend */
  max_search_radius_km: number;
  /** Máx. paradas — campo real del backend */
  max_stops: number;
  /** Peso del criterio precio (0-100) — persistido en BD, default 34 */
  weight_price: number;
  /** Peso del criterio distancia (0-100) — persistido en BD, default 33 */
  weight_distance: number;
  /** Peso del criterio tiempo (0-100) — persistido en BD, default 33 */
  weight_time: number;
  push_notifications_enabled?: boolean;
  email_notifications_enabled?: boolean;
  notify_price_alerts?: boolean | null;
  notify_new_promos?: boolean | null;
  notify_shared_list_changes?: boolean | null;
  created_at?: string;
  // Alias camelCase generados localmente por normalizeProfile
  searchRadiusKm: number;
  maxStops: number;
  weightPrice: number;
  weightDistance: number;
  weightTime: number;
}

// ─── Plantillas de lista ───────────────────────────────────────────────────────

export interface ListTemplateItem {
  id: string;
  name: string;
  normalized_name?: string;
  ordering: number;
}

export interface ListTemplate {
  id: string;
  name: string;
  source_list?: string | null;
  created_at: string;
  items: ListTemplateItem[];
  item_count: number;
}

// ─── Preferencias de usuario ──────────────────────────────────────────────────

export interface UserPreferences {
  max_search_radius_km: number;
  max_stops: number;
  weight_price: number;
  weight_distance: number;
  weight_time: number;
  push_notifications_enabled: boolean;
  notify_price_alerts: boolean;
  notify_new_promos: boolean;
  notify_shared_list_changes: boolean;
}

// ─── Notificación ─────────────────────────────────────────────────────────────

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

// ─── Alerta de precio ─────────────────────────────────────────────────────────

export interface PriceAlert {
  id: string;
  product: number | Product;
  product_name?: string;
  store?: number | null;
  target_price: number;
  current_price?: number;
  is_active: boolean;
  triggered_at?: string | null;
  created_at: string;
}

// ─── Comparación de precios (endpoint /prices/compare/) ───────────────────────

export interface PromotionMinimal {
  id: number;
  discount_type: "flat" | "percentage";
  discount_value: string;
  title: string;
  end_date: string | null;
}

export interface PriceCompare {
  store_id: number;
  store_name: string;
  price: string;
  offer_price: string | null;
  promo_price: string | null;
  promotion: PromotionMinimal | null;
  source: "scraping" | "crowdsourcing" | "api" | "business";
  is_stale: boolean;
  distance_km: number | null;
  verified_at: string;
}

// ─── Mensajes del asistente IA ────────────────────────────────────────────────

export interface AssistantMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
}

// ─── Item OCR ─────────────────────────────────────────────────────────────────

export interface OCRItem {
  id: string;
  raw_text: string;
  matched_product?: Product;
  quantity: number;
  price?: number;
  confidence: number;
}
