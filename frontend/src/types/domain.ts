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
  product: Product;
  quantity: number;
  isChecked: boolean;
  /** Tienda asignada tras optimización */
  assignedStore?: Store;
  /** Precio asignado en la optimización */
  assignedPrice?: number;
  note?: string;
}

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  /** Total estimado sin optimizar */
  totalEstimated: number;
  /** Total optimizado (post-ruta) */
  totalOptimized?: number;
  createdAt: string;
  updatedAt: string;
  isFavorite: boolean;
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
  email: string;
  name: string;
  avatarUrl?: string;
  /** Radio de búsqueda en km */
  searchRadiusKm: number;
  /** Máximo de paradas por ruta */
  maxStops: number;
  /** Pesos del scoring (0-100, deben sumar 100) */
  weightPrice: number;
  weightDistance: number;
  weightTime: number;
}
