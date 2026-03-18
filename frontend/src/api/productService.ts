/**
 * Servicio de productos — wrapper tipado sobre apiClient.
 */

import { apiClient } from "./client";
import type { Product } from "@/types/domain";

export interface ProductSearchResult {
  count: number;
  next: string | null;
  previous: string | null;
  results: Product[];
}

export const productService = {
  /** GET /products/?search={query}&page={page} — buscar productos */
  search: (query: string, page = 1): Promise<ProductSearchResult> =>
    apiClient.get<never, ProductSearchResult>("/products/", {
      params: { search: query, page },
    }),

  /** GET /products/autocomplete/?q={q} — sugerencias de autocompletado */
  autocomplete: (q: string): Promise<Product[]> =>
    apiClient.get<never, Product[]>("/products/autocomplete/", {
      params: { q },
    }),
};
