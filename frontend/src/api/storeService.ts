/**
 * Servicio de tiendas — wrapper tipado sobre apiClient.
 */

import { apiClient } from "./client";
import type {
  PlacesDetail,
  PlacesPrediction,
  PlacesResolved,
  Store,
} from "@/types/domain";

interface RawStoreChain {
  id?: number;
  name?: string;
}

interface RawStore {
  id: string | number;
  name: string;
  chain?: string | RawStoreChain;
  address?: string;
  distance_km?: number | null;
  distanceKm?: number;
  location?: { type?: string; coordinates?: [number, number] } | null;
  opening_hours?: Record<string, string>;
  is_favorite?: boolean;
  google_place_id?: string;
}

interface RawStoreProduct {
  id: string | number;
  name: string;
  normalized_name?: string;
  normalizedName?: string;
  category?: string | { id?: number; name?: string } | null;
  brand?: string | null;
  unit?: string;
  unit_quantity?: number;
  unitQuantity?: number;
  image_url?: string | null;
}

interface RawStoreProductOffer {
  product: RawStoreProduct;
  price: string | number;
  offer_price?: string | number | null;
  source: "scraping" | "crowdsourcing" | "api" | "business";
  is_stale: boolean;
  verified_at: string;
}

export interface StoreProductOffer {
  product: {
    id: string;
    name: string;
    normalizedName: string;
    category: string;
    brand?: string;
    unit: "kg" | "g" | "l" | "ml" | "ud" | "pack";
    unitQuantity: number;
    imageUrl?: string;
  };
  price: number;
  offerPrice: number | null;
  source: "scraping" | "crowdsourcing" | "api" | "business";
  isStale: boolean;
  verifiedAt: string;
}

export interface StoreProductsParams {
  page?: number;
  pageSize?: number;
  categoryId?: number;
}

export interface StoreProductsResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: StoreProductOffer[];
}

interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

function normalizeChain(chain: RawStore["chain"]): Store["chain"] {
  if (typeof chain === "string") {
    return (chain.toLowerCase() as Store["chain"]) ?? "local";
  }

  const value = chain?.name?.toLowerCase();
  switch (value) {
    case "mercadona":
    case "lidl":
    case "aldi":
    case "carrefour":
    case "dia":
    case "alcampo":
    case "local":
      return value;
    default:
      return "local";
  }
}

function normalizeStoreProductOffer(
  raw: RawStoreProductOffer,
): StoreProductOffer {
  const categoryName =
    typeof raw.product.category === "string"
      ? raw.product.category
      : (raw.product.category?.name ?? "Sin categoría");

  const unitMap: Record<string, StoreProductOffer["product"]["unit"]> = {
    kg: "kg",
    g: "g",
    l: "l",
    ml: "ml",
    pack: "pack",
    units: "ud",
    ud: "ud",
  };

  return {
    product: {
      id: String(raw.product.id),
      name: raw.product.name,
      normalizedName:
        raw.product.normalizedName ??
        raw.product.normalized_name ??
        raw.product.name.toLowerCase(),
      category: categoryName,
      brand: raw.product.brand ?? undefined,
      unit: unitMap[String(raw.product.unit ?? "ud").toLowerCase()] ?? "ud",
      unitQuantity: raw.product.unitQuantity ?? raw.product.unit_quantity ?? 1,
      imageUrl: raw.product.image_url ?? undefined,
    },
    price: parseFloat(String(raw.price)),
    offerPrice:
      raw.offer_price != null ? parseFloat(String(raw.offer_price)) : null,
    source: raw.source,
    isStale: raw.is_stale,
    verifiedAt: raw.verified_at,
  };
}

function normalizeStore(raw: RawStore): Store {
  const distanceKm = raw.distanceKm ?? raw.distance_km ?? 0;
  const location = raw.location?.coordinates
    ? {
        type: raw.location.type ?? "Point",
        coordinates: raw.location.coordinates,
      }
    : undefined;

  return {
    id: String(raw.id),
    name: raw.name,
    chain: normalizeChain(raw.chain),
    address: raw.address ?? "",
    distanceKm,
    estimatedMinutes: Math.max(1, Math.round(distanceKm * 3.5)),
    isOpen: true,
    location,
    openingHours: raw.opening_hours,
    isFavorite: raw.is_favorite,
    googlePlaceId: raw.google_place_id || undefined,
  };
}

function normalizeCollection(
  payload: RawStore[] | PaginatedResponse<RawStore>,
): Store[] {
  if (Array.isArray(payload)) {
    return payload.map(normalizeStore);
  }

  if (payload && Array.isArray(payload.results)) {
    return payload.results.map(normalizeStore);
  }

  return [];
}

function normalizeStoreProductsCollection(
  payload: RawStoreProductOffer[] | PaginatedResponse<RawStoreProductOffer>,
): StoreProductsResult {
  if (Array.isArray(payload)) {
    return {
      count: payload.length,
      next: null,
      previous: null,
      results: payload.map(normalizeStoreProductOffer),
    };
  }

  if (payload && Array.isArray(payload.results)) {
    return {
      count: payload.count,
      next: payload.next,
      previous: payload.previous,
      results: payload.results.map(normalizeStoreProductOffer),
    };
  }

  return {
    count: 0,
    next: null,
    previous: null,
    results: [],
  };
}

export const storeService = {
  /**
   * GET /stores/?lat={lat}&lng={lng}&radius={radius}
   * Devuelve tiendas cercanas a la ubicación del usuario.
   */
  getNearby: async (
    lat: number,
    lng: number,
    radius_km = 10,
  ): Promise<Store[]> => {
    const payload = await apiClient.get<
      never,
      RawStore[] | PaginatedResponse<RawStore>
    >("/stores/", {
      params: { lat, lng, radius_km },
    });

    return normalizeCollection(payload);
  },

  /** GET /stores/{id}/?lat={lat}&lng={lng}&radius_km={radius} */
  getDetail: async (
    storeId: string,
    lat: number,
    lng: number,
    radius_km = 10,
  ): Promise<Store> => {
    const payload = await apiClient.get<never, RawStore>(
      `/stores/${storeId}/`,
      {
        params: { lat, lng, radius_km },
      },
    );

    return normalizeStore(payload);
  },

  /** GET /stores/?favorites=true — tiendas marcadas como favoritas por el usuario */
  getFavorites: async (): Promise<Store[]> => {
    const payload = await apiClient.get<
      never,
      RawStore[] | PaginatedResponse<RawStore>
    >("/stores/", { params: { favorites: "true" } });
    return normalizeCollection(payload);
  },

  /** POST /stores/{id}/favorite/ — alterna favorito y devuelve estado final */
  toggleFavorite: async (storeId: string): Promise<boolean> => {
    const payload = await apiClient.post<never, { is_favorite: boolean }>(
      `/stores/${storeId}/favorite/`,
      {},
    );

    return Boolean(payload.is_favorite);
  },

  /** GET /stores/places-autocomplete/?input=X&lat=Y&lng=Z — proxy autocompletado */
  placesAutocomplete: async (
    input: string,
    lat: number,
    lng: number,
  ): Promise<PlacesPrediction[]> => {
    try {
      const payload = await apiClient.get<
        never,
        { predictions: PlacesPrediction[] }
      >("/stores/places-autocomplete/", { params: { input, lat, lng } });
      return payload?.predictions ?? [];
    } catch {
      return [];
    }
  },

  /** GET /stores/places-resolve/?place_id=X — resuelve Place ID a coordenadas */
  placesResolve: async (placeId: string): Promise<PlacesResolved | null> => {
    try {
      const payload = await apiClient.get<never, PlacesResolved>(
        "/stores/places-resolve/",
        { params: { place_id: placeId } },
      );
      if (!payload || !payload.lat) return null;
      return payload;
    } catch {
      return null;
    }
  },

  /** GET /stores/{id}/places-detail/ — Google Places enrichment */
  getPlacesDetail: async (storeId: string): Promise<PlacesDetail | null> => {
    try {
      const payload = await apiClient.get<never, PlacesDetail>(
        `/stores/${storeId}/places-detail/`,
      );
      // Backend returns {} when no Places data — treat as null
      if (!payload || Object.keys(payload).length === 0) return null;
      return payload;
    } catch {
      return null; // Silent fail per user decision
    }
  },

  /** GET /stores/{id}/products/ — productos con precio en la tienda */
  getProducts: async (
    storeId: string,
    {
      page = 1,
      pageSize = 20,
      categoryId,
    }: StoreProductsParams = {},
  ): Promise<StoreProductsResult> => {
    const payload = await apiClient.get<
      never,
      RawStoreProductOffer[] | PaginatedResponse<RawStoreProductOffer>
    >(`/stores/${storeId}/products/`, {
      params: {
        page,
        page_size: pageSize,
        ...(categoryId ? { category: categoryId } : {}),
      },
    });

    return normalizeStoreProductsCollection(payload);
  },
};
