/**
 * Tests for storeService — Phase 04 Google Places methods.
 *
 * Covers:
 *  1. getPlacesDetail returns null when backend returns empty object {}
 *  2. placesResolve returns null when lat is 0 (falsy payload guard)
 *  3. placesResolve returns a PlacesResolved object on a successful response
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../src/api/client", () => ({
  apiClient: {
    get: jest.fn(),
    post: jest.fn(),
    patch: jest.fn(),
    delete: jest.fn(),
  },
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import { apiClient } from "../src/api/client";
import { storeService } from "../src/api/storeService";
import type { PlacesDetail, PlacesResolved } from "../src/types/domain";

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("storeService — getPlacesDetail", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when backend returns empty object (no Places data for store)", async () => {
    // Backend returns {} when the store has no google_place_id or key is missing
    (apiClient.get as jest.Mock).mockResolvedValue({});

    const result = await storeService.getPlacesDetail("store-123");

    expect(result).toBeNull();
    expect(apiClient.get).toHaveBeenCalledWith("/stores/store-123/places-detail/");
  });

  it("returns null when backend call throws (silent fail)", async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error("Network error"));

    const result = await storeService.getPlacesDetail("store-456");

    expect(result).toBeNull();
  });

  it("returns PlacesDetail when backend returns enrichment data", async () => {
    const mockDetail: PlacesDetail = {
      rating: 4.5,
      user_rating_count: 123,
      website_url: "https://www.mercadona.es",
      opening_hours: { openNow: true, weekdayDescriptions: ["Lunes: 9:00–21:00"] },
    };
    (apiClient.get as jest.Mock).mockResolvedValue(mockDetail);

    const result = await storeService.getPlacesDetail("store-789");

    expect(result).not.toBeNull();
    expect(result?.rating).toBe(4.5);
    expect(result?.user_rating_count).toBe(123);
    expect(result?.website_url).toBe("https://www.mercadona.es");
  });
});

describe("storeService — placesResolve", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns null when resolved payload has lat=0 (falsy lat guard)", async () => {
    // Backend returns a payload where lat is 0 — treated as invalid coordinates
    (apiClient.get as jest.Mock).mockResolvedValue({
      place_id: "ChIJtest",
      name: "Test",
      address: "Test address",
      lat: 0,
      lng: 0,
    });

    const result = await storeService.placesResolve("ChIJtest");

    expect(result).toBeNull();
    expect(apiClient.get).toHaveBeenCalledWith("/stores/places-resolve/", {
      params: { place_id: "ChIJtest" },
    });
  });

  it("returns null when backend call throws (silent fail)", async () => {
    (apiClient.get as jest.Mock).mockRejectedValue(new Error("Places error"));

    const result = await storeService.placesResolve("ChIJfail");

    expect(result).toBeNull();
  });

  it("returns PlacesResolved with matched_store_id on successful backend response", async () => {
    const mockResolved: PlacesResolved = {
      place_id: "ChIJmercadona123",
      name: "Mercadona Triana",
      address: "C/ Pagés del Corro, 90, Sevilla",
      lat: 37.3886,
      lng: -5.9823,
      matched_store_id: "store-42",
    };
    (apiClient.get as jest.Mock).mockResolvedValue(mockResolved);

    const result = await storeService.placesResolve("ChIJmercadona123");

    expect(result).not.toBeNull();
    expect(result?.lat).toBe(37.3886);
    expect(result?.lng).toBe(-5.9823);
    expect(result?.matched_store_id).toBe("store-42");
    expect(result?.name).toBe("Mercadona Triana");
  });

  it("returns PlacesResolved without matched_store_id for non-DB places", async () => {
    const mockResolved: PlacesResolved = {
      place_id: "ChIJunknown999",
      name: "Frutería Carmen",
      address: "Calle Feria 22, Sevilla",
      lat: 37.3920,
      lng: -5.9900,
    };
    (apiClient.get as jest.Mock).mockResolvedValue(mockResolved);

    const result = await storeService.placesResolve("ChIJunknown999");

    expect(result).not.toBeNull();
    expect(result?.matched_store_id).toBeUndefined();
    expect(result?.lat).toBe(37.3920);
  });
});
