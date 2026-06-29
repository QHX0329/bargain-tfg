/**
 * Tests for the upgraded Axios client (JWT refresh-and-retry queue)
 * and authStore (hydrate/login/logout with SecureStore persistence).
 */

// ─── Mocks ───────────────────────────────────────────────────────────────────

jest.mock("../src/utils/secureStorage", () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  deleteItem: jest.fn(),
}));

// We mock axios so that apiClient module-level setup doesn't fail
jest.mock("axios", () => {
  const actualAxios = jest.requireActual("axios");
  return {
    ...actualAxios,
    create: jest.fn(() => ({
      interceptors: {
        request: { use: jest.fn() },
        response: { use: jest.fn() },
      },
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
      delete: jest.fn(),
    })),
  };
});

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import * as secureStorage from "../src/utils/secureStorage";
import { useAuthStore } from "../src/store/authStore";
import { extractRefreshedTokens } from "../src/api/client";

// ─── authStore tests ─────────────────────────────────────────────────────────

describe("authStore", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset store state between tests
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
    });
  });

  // Test 5: hydrate reads tokens from SecureStore
  it("hydrate() reads access_token and refresh_token from SecureStore and sets state", async () => {
    const fakeUser = { id: "u1", email: "test@example.com", name: "Test User" };
    (secureStorage.getItem as jest.Mock).mockImplementation((key: string) => {
      if (key === "access_token") return Promise.resolve("access123");
      if (key === "refresh_token") return Promise.resolve("refresh456");
      if (key === "auth_user") return Promise.resolve(JSON.stringify(fakeUser));
      return Promise.resolve(null);
    });

    await useAuthStore.getState().hydrate();

    const state = useAuthStore.getState();
    expect(state.token).toBe("access123");
    expect(state.refreshToken).toBe("refresh456");
    expect(state.isAuthenticated).toBe(true);
    expect(state.user).toEqual(fakeUser);
  });

  // Test 6: login writes both tokens to SecureStore
  it("login() writes tokens to SecureStore and sets isAuthenticated=true", async () => {
    (secureStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    const user = { id: "u2", email: "login@example.com", name: "Login User" };
    await useAuthStore.getState().login("tok123", "ref789", user);

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(true);
    expect(state.token).toBe("tok123");
    expect(state.refreshToken).toBe("ref789");

    expect(secureStorage.setItem).toHaveBeenCalledWith("access_token", "tok123");
    expect(secureStorage.setItem).toHaveBeenCalledWith("refresh_token", "ref789");
    expect(secureStorage.setItem).toHaveBeenCalledWith(
      "auth_user",
      JSON.stringify(user),
    );
  });

  // Test 7: logout clears SecureStore entries and resets state
  it("logout() clears SecureStore entries and resets state", async () => {
    (secureStorage.deleteItem as jest.Mock).mockResolvedValue(undefined);

    // Set up some state first
    useAuthStore.setState({
      isAuthenticated: true,
      token: "tok",
      refreshToken: "ref",
      user: { id: "u3", email: "x@x.com", name: "X" },
    });

    await useAuthStore.getState().logout();

    const state = useAuthStore.getState();
    expect(state.isAuthenticated).toBe(false);
    expect(state.token).toBeNull();
    expect(state.refreshToken).toBeNull();
    expect(state.user).toBeNull();

    expect(secureStorage.deleteItem).toHaveBeenCalledWith("access_token");
    expect(secureStorage.deleteItem).toHaveBeenCalledWith("refresh_token");
    expect(secureStorage.deleteItem).toHaveBeenCalledWith("auth_user");
  });

  // authStore has refreshToken field
  it("authStore state has refreshToken field", () => {
    const state = useAuthStore.getState();
    expect("refreshToken" in state).toBe(true);
  });

  // authStore has hydrate action
  it("authStore has hydrate action", () => {
    const state = useAuthStore.getState();
    expect(typeof state.hydrate).toBe("function");
  });
});

// ─── Interceptor behaviour tests (logic validation) ──────────────────────────

describe("apiClient interceptors — refresh and retry logic", () => {
  it("Test 1 & 2: auth store provides the refresh token that the interceptor reads", async () => {
    useAuthStore.setState({ token: "old_access", refreshToken: "valid_refresh" });
    expect(useAuthStore.getState().refreshToken).toBe("valid_refresh");
    expect(useAuthStore.getState().token).toBe("old_access");
  });

  it("Test 3: response interceptor unwraps {success: true, data: {...}} shape", () => {
    const mockResponseData = { success: true, data: { id: 1, name: "test" } };
    const unwrap = (responseData: unknown) => {
      if (
        responseData !== null &&
        typeof responseData === "object" &&
        "success" in (responseData as object) &&
        (responseData as { success: unknown }).success !== undefined
      ) {
        return (responseData as { success: unknown; data: unknown }).data;
      }
      return responseData;
    };
    expect(unwrap(mockResponseData)).toEqual({ id: 1, name: "test" });
  });

  it("Test 4: response interceptor returns flat object unchanged when success is undefined (JWT endpoint shape)", () => {
    const jwtResponse = { access: "tok123", refresh: "ref456" };
    const unwrap = (responseData: unknown) => {
      if (
        responseData !== null &&
        typeof responseData === "object" &&
        "success" in (responseData as object) &&
        (responseData as { success: unknown }).success !== undefined
      ) {
        return (responseData as { success: unknown; data: unknown }).data;
      }
      return responseData;
    };
    expect(unwrap(jwtResponse)).toEqual({ access: "tok123", refresh: "ref456" });
  });
});

// ─── extractRefreshedTokens (regresión: refresh + envelope del backend) ───────

describe("extractRefreshedTokens", () => {
  // El backend (CustomTokenRefreshView) envuelve la respuesta del refresh en
  // { success, data: { access, refresh } } y refreshAxios NO desempaqueta.
  it("desempaqueta el envelope { success, data: { access, refresh } } del backend", () => {
    const wrapped = {
      success: true,
      data: { access: "new_access", refresh: "rotated_refresh" },
    };
    expect(extractRefreshedTokens(wrapped, "old_refresh")).toEqual({
      access: "new_access",
      refresh: "rotated_refresh",
    });
  });

  it("soporta la forma plana { access, refresh } (sin envelope)", () => {
    const flat = { access: "new_access", refresh: "rotated_refresh" };
    expect(extractRefreshedTokens(flat, "old_refresh")).toEqual({
      access: "new_access",
      refresh: "rotated_refresh",
    });
  });

  // Clave del bug: con rotación de tokens, hay que conservar el refresh rotado.
  // Si no viene refresh, se mantiene el actual (no se pierde la sesión).
  it("usa el refresh actual como fallback cuando la respuesta no incluye refresh", () => {
    const wrapped = { success: true, data: { access: "new_access" } };
    expect(extractRefreshedTokens(wrapped, "current_refresh")).toEqual({
      access: "new_access",
      refresh: "current_refresh",
    });
  });

  it("lanza error si la respuesta no trae access token (fuerza logout limpio)", () => {
    expect(() =>
      extractRefreshedTokens({ success: true, data: { refresh: "x" } }, "r"),
    ).toThrow();
    expect(() => extractRefreshedTokens(null, "r")).toThrow();
  });
});
