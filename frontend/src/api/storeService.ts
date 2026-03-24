/**
 * Servicio de tiendas — wrapper tipado sobre apiClient.
 */

import { apiClient } from "./client";
import type { PlacesDetail, PlacesPrediction, PlacesResolved, Store } from "@/types/domain";

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
      const payload = await apiClient.get<never, { predictions: PlacesPrediction[] }>(
        "/stores/places-autocomplete/",
        { params: { input, lat, lng } },
      );
      return payload?.predictions ?? [];
    } catch {
      return [];
    }
  },

  /** GET /stores/places-resolve/?place_id=X — resuelve Place ID a coordenadas */
  placesResolve: async (
    placeId: string,
  ): Promise<PlacesResolved | null> => {
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
};
