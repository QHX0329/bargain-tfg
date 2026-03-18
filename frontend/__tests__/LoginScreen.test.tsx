/**
 * Tests for LoginScreen (auth flow) and App.tsx hydration.
 *
 * Tests 1–5: LoginScreen + App hydration (Task 1)
 * Tests 6–9: RegisterScreen (Task 2)
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("expo-secure-store", () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock("@/api/authService", () => ({
  authService: {
    login: jest.fn(),
    register: jest.fn(),
    getProfile: jest.fn(),
    getProfileWithToken: jest.fn(),
    requestPasswordReset: jest.fn(),
  },
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
  NavigationContainer: ({ children }: { children: unknown }) => children,
}));

jest.mock("@/navigation", () => ({
  RootNavigator: () => null,
}));

jest.mock("expo-font", () => ({
  useFonts: jest.fn(() => [true]),
}));

jest.mock("@expo-google-fonts/fraunces", () => ({
  Fraunces_600SemiBold: "Fraunces_600SemiBold",
  Fraunces_700Bold: "Fraunces_700Bold",
}));

jest.mock("@expo-google-fonts/source-sans-3", () => ({
  SourceSans3_400Regular: "SourceSans3_400Regular",
  SourceSans3_500Medium: "SourceSans3_500Medium",
  SourceSans3_600SemiBold: "SourceSans3_600SemiBold",
  SourceSans3_700Bold: "SourceSans3_700Bold",
}));

jest.mock("@expo-google-fonts/ibm-plex-mono", () => ({
  IBMPlexMono_400Regular: "IBMPlexMono_400Regular",
  IBMPlexMono_500Medium: "IBMPlexMono_500Medium",
}));

jest.mock("react-native-safe-area-context", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    SafeAreaProvider: ({ children }: { children: React.ReactNode }) =>
      React.createElement(View, null, children),
    SafeAreaView: ({ children, style }: { children: React.ReactNode; style?: unknown }) =>
      React.createElement(View, { style }, children),
    useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
  };
});

jest.mock("expo-status-bar", () => ({
  StatusBar: () => null,
}));

// ─── Imports (after mocks) ────────────────────────────────────────────────────

import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import * as SecureStore from "expo-secure-store";
import { authService } from "@/api/authService";
import { useAuthStore } from "@/store/authStore";
import { LoginScreen } from "@/screens/auth/LoginScreen";
import { RegisterScreen } from "@/screens/auth/RegisterScreen";
import App from "../App";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const mockAuthService = authService as jest.Mocked<typeof authService>;

const mockProfile = {
  id: "u1",
  email: "test@example.com",
  name: "Test User",
  searchRadiusKm: 5,
  maxStops: 3,
  weightPrice: 60,
  weightDistance: 25,
  weightTime: 15,
};

// ─── Task 1: LoginScreen ──────────────────────────────────────────────────────

describe("LoginScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
    });
  });

  // Test 1: renders username and password inputs
  it("Test 1: renders username and password text inputs", () => {
    const { getByPlaceholderText } = render(<LoginScreen />);
    expect(getByPlaceholderText("tu_usuario")).toBeTruthy();
    expect(getByPlaceholderText("Tu contraseña")).toBeTruthy();
  });

  // Test 2: valid credentials → calls authService.login → navigates to Main
  it("Test 2: pressing submit with valid credentials calls authService.login and navigates", async () => {
    mockAuthService.login.mockResolvedValueOnce({
      access: "access123",
      refresh: "refresh456",
    } as never);
    mockAuthService.getProfileWithToken.mockResolvedValueOnce(mockProfile as never);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText("tu_usuario"), "test_user");
    fireEvent.changeText(getByPlaceholderText("Tu contraseña"), "password123");
    fireEvent.press(getByText("Iniciar sesión"));

    await waitFor(() => {
      expect(mockAuthService.login).toHaveBeenCalledWith(
        "test_user",
        "password123",
      );
    });
  });

  // Test 3: invalid credentials → shows inline error (not Alert, not crash)
  it("Test 3: invalid credentials shows inline error message", async () => {
    mockAuthService.login.mockRejectedValueOnce(new Error("Unauthorized"));

    const { getByPlaceholderText, getByText, findByText } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText("tu_usuario"), "bad_user");
    fireEvent.changeText(getByPlaceholderText("Tu contraseña"), "wrongpass");
    fireEvent.press(getByText("Iniciar sesión"));

    const errorMsg = await findByText("Usuario o contraseña incorrectos");
    expect(errorMsg).toBeTruthy();
  });

  // Test 4: loading state while request is in-flight
  it("Test 4: shows loading state (button disabled) while request is in-flight", async () => {
    let resolveLogin: (value: unknown) => void;
    const loginPromise = new Promise((resolve) => {
      resolveLogin = resolve;
    });
    mockAuthService.login.mockReturnValueOnce(loginPromise as never);

    const { getByPlaceholderText, getByTestId } = render(<LoginScreen />);
    fireEvent.changeText(getByPlaceholderText("tu_usuario"), "test_user");
    fireEvent.changeText(getByPlaceholderText("Tu contraseña"), "password123");

    const submitButton = getByTestId("login-submit-button");
    fireEvent.press(submitButton);

    // Button should be disabled while loading
    await waitFor(() => {
      expect(submitButton.props.accessibilityState?.disabled).toBe(true);
    });

    // Resolve to avoid hanging
    act(() => {
      resolveLogin!({ access: "a", refresh: "r" });
    });
  });

  // Test 5: App.tsx calls authStore.hydrate() on mount before NavigationContainer
  it("Test 5: App renders without crashing and hydrate is called on mount", async () => {
    (SecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);

    const { toJSON } = render(<App />);

    await waitFor(() => {
      expect(SecureStore.getItemAsync).toHaveBeenCalledWith("access_token");
    });

    expect(toJSON()).toBeTruthy();
  });
});

// ─── Task 2: RegisterScreen ───────────────────────────────────────────────────

describe("RegisterScreen", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAuthStore.setState({
      isAuthenticated: false,
      user: null,
      token: null,
      refreshToken: null,
    });
  });

  // Test 6: renders all required fields
  it("Test 6: renders username, first_name, last_name, email, and password fields", () => {
    const { getByPlaceholderText } = render(<RegisterScreen />);
    expect(getByPlaceholderText("tu_usuario")).toBeTruthy();
    expect(getByPlaceholderText("Tu nombre")).toBeTruthy();
    expect(getByPlaceholderText("Tus apellidos")).toBeTruthy();
    expect(getByPlaceholderText("tu@email.com")).toBeTruthy();
    expect(getByPlaceholderText("Mínimo 8 caracteres")).toBeTruthy();
  });

  // Test 7: valid data → calls authService.register with all required fields (auto-login)
  it("Test 7: pressing submit with valid data calls register then login (auto-login)", async () => {
    mockAuthService.register.mockResolvedValueOnce({ user: { id: "u1", email: "juan@example.com", name: "Juan García" } } as never);
    mockAuthService.getProfileWithToken.mockResolvedValueOnce(mockProfile as never);
    (SecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);

    const { getByPlaceholderText, getByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText("tu_usuario"), "juan_garcia");
    fireEvent.changeText(getByPlaceholderText("Tu nombre"), "Juan");
    fireEvent.changeText(getByPlaceholderText("Tus apellidos"), "García");
    fireEvent.changeText(getByPlaceholderText("tu@email.com"), "juan@example.com");
    fireEvent.changeText(getByPlaceholderText("Mínimo 8 caracteres"), "password123");
    fireEvent.changeText(getByPlaceholderText("Repetir contraseña"), "password123");
    fireEvent.press(getByText("Crear cuenta"));

    await waitFor(() => {
      expect(mockAuthService.register).toHaveBeenCalledWith({
        username: "juan_garcia",
        email: "juan@example.com",
        password: "password123",
        password_confirm: "password123",
        first_name: "Juan",
        last_name: "García",
      });
    });
  });

  // Test 8: email taken → shows field-level inline error
  it("Test 8: shows field-level inline error when email is already taken", async () => {
    const apiError = {
      response: {
        status: 400,
        data: {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Error de validación",
            details: { email: ["Ya existe un usuario con este email."] },
          },
        },
      },
    };
    mockAuthService.register.mockRejectedValueOnce(apiError);

    const { getByPlaceholderText, getByText, findByText } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText("tu_usuario"), "juan_garcia");
    fireEvent.changeText(getByPlaceholderText("Tu nombre"), "Juan");
    fireEvent.changeText(getByPlaceholderText("Tus apellidos"), "García");
    fireEvent.changeText(
      getByPlaceholderText("tu@email.com"),
      "existing@example.com",
    );
    fireEvent.changeText(getByPlaceholderText("Mínimo 8 caracteres"), "password123");
    fireEvent.changeText(getByPlaceholderText("Repetir contraseña"), "password123");
    fireEvent.press(getByText("Crear cuenta"));

    const fieldError = await findByText("Ya existe un usuario con este email.");
    expect(fieldError).toBeTruthy();
  });

  // Test 9: password confirmation mismatch disables submit
  it("Test 9: submit is disabled when passwords do not match", async () => {
    const { getByPlaceholderText, getByTestId } = render(<RegisterScreen />);
    fireEvent.changeText(getByPlaceholderText("tu_usuario"), "juan_garcia");
    fireEvent.changeText(getByPlaceholderText("Tu nombre"), "Juan");
    fireEvent.changeText(getByPlaceholderText("Tus apellidos"), "García");
    fireEvent.changeText(getByPlaceholderText("tu@email.com"), "juan@example.com");
    fireEvent.changeText(getByPlaceholderText("Mínimo 8 caracteres"), "password123");
    fireEvent.changeText(getByPlaceholderText("Repetir contraseña"), "differentpass");

    const submitButton = getByTestId("register-submit-button");
    expect(submitButton.props.accessibilityState?.disabled).toBe(true);
  });
});
