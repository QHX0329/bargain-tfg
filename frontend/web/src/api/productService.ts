/**
 * Servicio de productos — wrapper tipado sobre apiClient.
 * Portado desde frontend/src/api/productService.ts para la web de consumidor.
 */

import { apiClient } from './client';
import type { Product, ProductCategory } from '../types/consumer';

interface RawCategory {
  id?: number;
  name?: string;
}

interface RawProduct {
  id: string | number;
  name: string;
  normalized_name?: string;
  normalizedName?: string;
  barcode?: string | null;
  category?: string | RawCategory | null;
  brand?: string | null;
  unit?: string;
  unit_quantity?: number;
  unitQuantity?: number;
  image_url?: string | null;
  imageUrl?: string | null;
}

function normalizeProduct(raw: RawProduct): Product {
  const category =
    typeof raw.category === 'string' ? raw.category : (raw.category?.name ?? 'Sin categoría');

  return {
    id: String(raw.id),
    name: raw.name,
    normalizedName: raw.normalizedName ?? raw.normalized_name ?? raw.name.toLowerCase(),
    brand: raw.brand ?? undefined,
    category,
    barcode: raw.barcode ?? undefined,
    unit: (raw.unit as Product['unit']) ?? 'ud',
    unitQuantity: raw.unitQuantity ?? raw.unit_quantity ?? 1,
    imageUrl: raw.imageUrl ?? raw.image_url ?? undefined,
  };
}

export interface ProductListParams {
  q?: string;
  category?: number;
  brand?: string;
  page?: number;
}

export interface ProductSearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export const productService = {
  /** GET /products/categories/ — árbol de categorías */
  getCategories: (): Promise<ProductCategory[]> =>
    apiClient.get<never, ProductCategory[]>('/products/categories/'),

  /** GET /products/?q=<q>&category=<id>&brand=<brand>&page=<n> */
  list: async ({ q, category, brand, page = 1 }: ProductListParams): Promise<ProductSearchResult> => {
    const payload = await apiClient.get<
      never,
      { count: number; next: string | null; previous: string | null; results: RawProduct[] }
    >('/products/', {
      params: {
        ...(q ? { q } : {}),
        ...(category ? { category } : {}),
        ...(brand ? { brand } : {}),
        page,
      },
    });

    return {
      ...payload,
      results: payload.results.map(normalizeProduct),
    };
  },

  /** Alias para búsqueda por query string */
  search: async (query: string, page = 1): Promise<ProductSearchResult> => {
    const payload = await apiClient.get<
      never,
      { count: number; next: string | null; previous: string | null; results: RawProduct[] }
    >('/products/', {
      params: { ...(query ? { q: query } : {}), page },
    });

    return {
      ...payload,
      results: payload.results.map(normalizeProduct),
    };
  },

  /** GET /products/autocomplete/?q={q} — sugerencias de autocompletado */
  autocomplete: async (q: string): Promise<Product[]> => {
    const payload = await apiClient.get<never, RawProduct[]>('/products/autocomplete/', {
      params: { q },
    });
    return payload.map(normalizeProduct);
  },

  /** POST /products/proposals/ — propone un nuevo producto con precio */
  createProposal: async (data: {
    name: string;
    brand?: string;
    barcode?: string;
    category?: number;
    image_url?: string;
    notes?: string;
    price?: number;
    unit_price?: number;
    store?: number;
  }): Promise<void> => {
    await apiClient.post('/products/proposals/', data);
  },
};
