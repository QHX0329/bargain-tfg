/**
 * Tests for the React Navigation deep-linking config.
 * Validates URL-to-state resolution for key screens (ListDetail, StoreProfile, ProductsCatalog).
 *
 * @jest-environment jsdom
 */

import { getStateFromPath, getPathFromState } from '@react-navigation/native';
import { linking } from '@/navigation/linking';

// ── Helper: traverse nested routes to the deepest active route ───────────────

interface NavRoute {
  name: string;
  params?: Record<string, unknown>;
  state?: NavState;
}

interface NavState {
  routes: NavRoute[];
  index?: number;
}

function getLeafRoute(state: NavState | undefined): NavRoute | null {
  if (!state) return null;
  const index = state.index ?? state.routes.length - 1;
  const route = state.routes[index];
  if (!route) return null;
  if (route.state) return getLeafRoute(route.state);
  return route;
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('linking config — URL to state resolution', () => {
  it('resolves /app/lists/abc to ListDetail with params.listId = "abc"', () => {
    const state = getStateFromPath('/app/lists/abc', linking.config);
    expect(state).not.toBeNull();
    const leaf = getLeafRoute(state as NavState);
    expect(leaf?.name).toBe('ListDetail');
    expect(leaf?.params).toMatchObject({ listId: 'abc' });
  });

  it('resolves /app/map/store/42 to StoreProfile with params.storeId = "42"', () => {
    const state = getStateFromPath('/app/map/store/42', linking.config);
    expect(state).not.toBeNull();
    const leaf = getLeafRoute(state as NavState);
    expect(leaf?.name).toBe('StoreProfile');
    expect(leaf?.params).toMatchObject({ storeId: '42' });
  });

  it('resolves /app/home/catalog to ProductsCatalog (non-null state)', () => {
    const state = getStateFromPath('/app/home/catalog', linking.config);
    expect(state).not.toBeNull();
    const leaf = getLeafRoute(state as NavState);
    expect(leaf?.name).toBe('ProductsCatalog');
  });

  it('resolves /app/lists to Lists screen', () => {
    const state = getStateFromPath('/app/lists', linking.config);
    expect(state).not.toBeNull();
    const leaf = getLeafRoute(state as NavState);
    expect(leaf?.name).toBe('Lists');
  });

  it('resolves /app/assistant to Assistant screen', () => {
    const state = getStateFromPath('/app/assistant', linking.config);
    expect(state).not.toBeNull();
    const leaf = getLeafRoute(state as NavState);
    expect(leaf?.name).toBe('Assistant');
  });

  it('resolves /login to Login screen', () => {
    const state = getStateFromPath('/login', linking.config);
    expect(state).not.toBeNull();
    const leaf = getLeafRoute(state as NavState);
    expect(leaf?.name).toBe('Login');
  });
});

describe('linking config — state to path round-trip', () => {
  it('getPathFromState for ListDetail with listId="abc" includes "app/lists/abc"', () => {
    const state = getStateFromPath('/app/lists/abc', linking.config);
    const path = getPathFromState(state as NavState, linking.config);
    expect(path).toContain('app/lists/abc');
  });
});

describe('linking config structure', () => {
  it('exports a linking object with prefixes array', () => {
    expect(linking).toBeDefined();
    expect(Array.isArray(linking.prefixes)).toBe(true);
    expect(linking.prefixes.length).toBeGreaterThan(0);
  });

  it('config contains Auth and Main screens', () => {
    const screens = linking.config?.screens as Record<string, unknown>;
    expect(screens).toHaveProperty('Auth');
    expect(screens).toHaveProperty('Main');
  });

  it('FavoriteStores is registered under HomeTab (not MapTab)', () => {
    const screens = linking.config?.screens as Record<string, {
      screens?: Record<string, { screens?: Record<string, unknown> }>
    }>;
    const mainScreens = screens?.Main?.screens ?? {};
    const homeTabScreens = mainScreens?.HomeTab?.screens ?? {};
    const mapTabScreens = mainScreens?.MapTab?.screens ?? {};
    expect(homeTabScreens).toHaveProperty('FavoriteStores');
    expect(mapTabScreens).not.toHaveProperty('FavoriteStores');
  });
});
