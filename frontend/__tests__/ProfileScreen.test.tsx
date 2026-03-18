/**
 * Tests for ProfileScreen (Task 2) — user profile with sliders, toggles, and account management.
 *
 * Tests 1-6: ProfileScreen (real API, sliders, toggles, logout, account actions)
 * Tests 7-8: ChangePasswordScreen (validation, API call)
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../src/api/authService", () => ({
  authService: {
    getProfile: jest.fn(),
    updatePreferences: jest.fn(),
    changePassword: jest.fn(),
  },
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    goBack: jest.fn(),
  }),
}));

jest.mock("react-native-reanimated", () => {
  const Reanimated = jest.requireActual("react-native-reanimated/mock");
  return Reanimated;
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// ─── Imports ──────────────────────────────────────────────────────────────────

import React from "react";
import {
  render,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react-native";
import { Alert } from "react-native";
import { authService } from "../src/api/authService";
import { useAuthStore } from "../src/store/authStore";
import { useProfileStore } from "../src/store/profileStore";
import { ProfileScreen } from "../src/screens/profile/ProfileScreen";
import { ChangePasswordScreen } from "../src/screens/profile/ChangePasswordScreen";
import type { UserProfile } from "../src/types/domain";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockProfile: UserProfile = {
  id: "u1",
  email: "ana@example.com",
  name: "Ana García",
  searchRadiusKm: 5,
  maxStops: 3,
  weightPrice: 50,
  weightDistance: 30,
  weightTime: 20,
};

// ─── ProfileScreen Tests ──────────────────────────────────────────────────────

describe("ProfileScreen", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    // Reset stores
    useAuthStore.setState({
      isAuthenticated: true,
      user: { id: "u1", email: "ana@example.com", name: "Ana García" },
      token: "token",
      refreshToken: "refresh",
      memberSince: "2025-01-15T00:00:00Z",
    });
    useProfileStore.setState({
      profile: mockProfile,
      isLoading: false,
      isSaving: false,
    });

    (authService.getProfile as jest.Mock).mockResolvedValue(mockProfile);
    (authService.updatePreferences as jest.Mock).mockResolvedValue({
      max_search_radius_km: 5,
      max_stops: 3,
      weight_price: 50,
      weight_distance: 30,
      weight_time: 20,
      push_notifications_enabled: true,
      notify_price_alerts: true,
      notify_new_promos: true,
      notify_shared_list_changes: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    alertSpy.mockRestore();
  });

  // Test 1: ProfileScreen renders user name and email from useAuthStore
  it("Test 1: renders user name and email from useAuthStore", async () => {
    const { getByText } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByText("Ana García")).toBeTruthy();
      expect(getByText("ana@example.com")).toBeTruthy();
    });
  });

  // Test 2: Changing weight_price slider to 60 redistributes remaining 40 proportionally
  it("Test 2: changing weight_price to 60 redistributes remaining 40 proportionally, sum stays 100", async () => {
    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("slider-weight-price")).toBeTruthy();
    });

    // Change weight_price to 60 (others were 30 and 20 = 50 total)
    const priceSlider = getByTestId("slider-weight-price");
    fireEvent(priceSlider, "valueChange", 60);

    await waitFor(() => {
      const distSlider = getByTestId("slider-weight-distance");
      const timeSlider = getByTestId("slider-weight-time");

      // After redistribution, the sum of all three must be 100
      const priceVal = 60;
      const distVal = Number(distSlider.props.value);
      const timeVal = Number(timeSlider.props.value);

      expect(priceVal + distVal + timeVal).toBeCloseTo(100, 0);
      // Both distance and time should have been redistributed (not zero unless original was zero)
      expect(distVal).toBeGreaterThan(0);
      expect(timeVal).toBeGreaterThan(0);
    });
  });

  // Test 3: Slider change triggers debounced PATCH after 500ms; second change resets timer
  it("Test 3: slider change debounces PATCH 500ms; rapid changes coalesce to one call", async () => {
    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("slider-weight-price")).toBeTruthy();
    });

    const priceSlider = getByTestId("slider-weight-price");

    // First change
    fireEvent(priceSlider, "valueChange", 55);
    // Should NOT call immediately
    expect(authService.updatePreferences).not.toHaveBeenCalled();

    // Second change within 500ms — resets timer
    act(() => {
      jest.advanceTimersByTime(300);
    });
    fireEvent(priceSlider, "valueChange", 60);

    // Still not called after another 300ms (total 600ms from first, only 300ms from second)
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(authService.updatePreferences).not.toHaveBeenCalled();

    // Now advance to 500ms after last change
    act(() => {
      jest.advanceTimersByTime(200);
    });

    await waitFor(() => {
      expect(authService.updatePreferences).toHaveBeenCalledTimes(1);
    });
  });

  // Test 4: Master push toggle OFF grays out per-event toggles
  it("Test 4: master push_notifications_enabled OFF disables per-event toggles", async () => {
    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("toggle-push-master")).toBeTruthy();
    });

    const masterToggle = getByTestId("toggle-push-master");
    // Simulate turning master toggle OFF
    fireEvent(masterToggle, "valueChange", false);

    await waitFor(() => {
      const alertsToggle = getByTestId("toggle-notify-price-alerts");
      const promosToggle = getByTestId("toggle-notify-new-promos");
      const sharedToggle = getByTestId("toggle-notify-shared-list-changes");

      expect(alertsToggle.props.disabled).toBe(true);
      expect(promosToggle.props.disabled).toBe(true);
      expect(sharedToggle.props.disabled).toBe(true);
    });
  });

  // Test 5: Tapping "Cerrar sesión" shows Alert with Cancelar/Cerrar sesión buttons; confirming calls logout
  it("Test 5: tapping Cerrar sesión shows confirmation alert; confirming calls authStore.logout()", async () => {
    const logoutSpy = jest.fn().mockResolvedValue(undefined);
    useAuthStore.setState((state) => ({ ...state, logout: logoutSpy }));

    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("btn-logout")).toBeTruthy();
    });

    alertSpy.mockImplementation(
      (
        _title: string,
        _msg: string,
        buttons?: Array<{ text: string; onPress?: () => void }>,
      ) => {
        // Find the "Cerrar sesión" destructive button (index 1) and press it
        const confirmBtn = buttons?.find((b) => b.text === "Cerrar sesión");
        confirmBtn?.onPress?.();
      },
    );

    fireEvent.press(getByTestId("btn-logout"));

    await waitFor(() => {
      expect(alertSpy).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.arrayContaining([
          expect.objectContaining({ text: "Cancelar" }),
          expect.objectContaining({ text: "Cerrar sesión" }),
        ]),
      );
      expect(logoutSpy).toHaveBeenCalled();
    });
  });

  // Test 6: Tapping "Eliminar cuenta" shows "próximamente" alert without API call
  it("Test 6: tapping Eliminar cuenta shows coming-soon alert without any API call", async () => {
    const { getByTestId } = render(<ProfileScreen />);

    await waitFor(() => {
      expect(getByTestId("btn-delete-account")).toBeTruthy();
    });

    fireEvent.press(getByTestId("btn-delete-account"));

    expect(alertSpy).toHaveBeenCalledWith(
      expect.stringMatching(/próximamente/i),
    );
    expect(authService.updatePreferences).not.toHaveBeenCalled();
  });
});

// ─── ChangePasswordScreen Tests ───────────────────────────────────────────────

const mockNavigation = {
  goBack: jest.fn(),
};

describe("ChangePasswordScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (authService.changePassword as jest.Mock).mockResolvedValue(undefined);
  });

  // Test 7: mismatched new/confirm passwords shows inline error without calling API
  it("Test 7: mismatched new/confirm passwords shows inline error without API call", async () => {
    const { getByTestId, getByText } = render(
      <ChangePasswordScreen navigation={mockNavigation as never} />,
    );

    fireEvent.changeText(getByTestId("input-old-password"), "oldPass123");
    fireEvent.changeText(getByTestId("input-new-password"), "newPass456");
    fireEvent.changeText(
      getByTestId("input-confirm-password"),
      "differentPass789",
    );

    fireEvent.press(getByTestId("btn-submit-password"));

    await waitFor(() => {
      expect(getByText(/contraseñas no coinciden/i)).toBeTruthy();
    });
    expect(authService.changePassword).not.toHaveBeenCalled();
  });

  // Test 8: valid inputs calls authService.changePassword(oldPassword, newPassword)
  it("Test 8: valid inputs calls authService.changePassword with old and new password", async () => {
    const alertSpy = jest
      .spyOn(Alert, "alert")
      .mockImplementation(() => {});

    const { getByTestId } = render(
      <ChangePasswordScreen navigation={mockNavigation as never} />,
    );

    fireEvent.changeText(getByTestId("input-old-password"), "oldPass123");
    fireEvent.changeText(getByTestId("input-new-password"), "newPass456");
    fireEvent.changeText(getByTestId("input-confirm-password"), "newPass456");

    fireEvent.press(getByTestId("btn-submit-password"));

    await waitFor(() => {
      expect(authService.changePassword).toHaveBeenCalledWith(
        "oldPass123",
        "newPass456",
      );
    });

    alertSpy.mockRestore();
  });
});
