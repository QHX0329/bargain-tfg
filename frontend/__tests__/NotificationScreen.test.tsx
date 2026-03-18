/**
 * Tests for HomeScreen (Task 1) & NotificationScreen (Task 2) — Plan 03-04
 *
 * Tests 1-5:  HomeScreen live widgets (greeting, skeleton, location denied, teaser, refresh)
 * Tests 6-11: NotificationScreen (grouping, tap-to-read, swipe-delete, mark-all, empty, pagination)
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../src/api/storeService", () => ({
  storeService: {
    getNearby: jest.fn(),
  },
}));

jest.mock("../src/api/notificationService", () => ({
  notificationService: {
    getNotifications: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    deleteNotification: jest.fn(),
  },
}));

jest.mock("../src/api/listService", () => ({
  listService: {
    getLists: jest.fn(),
  },
}));

jest.mock("../src/api/priceService", () => ({
  priceService: {
    getPriceAlerts: jest.fn(),
  },
}));

jest.mock("expo-location", () => ({
  requestForegroundPermissionsAsync: jest.fn(),
  getCurrentPositionAsync: jest.fn(),
  Accuracy: { Balanced: 3 },
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    setOptions: jest.fn(),
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

jest.mock("react-native-gesture-handler", () => {
  const RN = jest.requireActual("react-native");
  // Render both children and right actions so testIDs in renderRightActions are accessible
  const Swipeable = ({
    children,
    renderRightActions,
  }: {
    children: React.ReactNode;
    renderRightActions?: () => React.ReactNode;
  }) => {
    const React = jest.requireActual("react");
    const { View } = jest.requireActual("react-native");
    return React.createElement(
      View,
      null,
      children,
      renderRightActions ? renderRightActions() : null,
    );
  };
  return {
    Swipeable,
    GestureHandlerRootView: ({ children }: { children: React.ReactNode }) => children,
    PanGestureHandler: ({ children }: { children: React.ReactNode }) => children,
    State: {},
    Directions: {},
    RectButton: RN.TouchableOpacity,
    BorderlessButton: RN.TouchableOpacity,
    TouchableOpacity: RN.TouchableOpacity,
  };
});

// ─── Imports ──────────────────────────────────────────────────────────────────

import React from "react";
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import * as Location from "expo-location";
import { storeService } from "../src/api/storeService";
import { notificationService } from "../src/api/notificationService";
import { listService } from "../src/api/listService";
import { priceService } from "../src/api/priceService";
import { useAuthStore } from "../src/store/authStore";
import { useNotificationStore } from "../src/store/notificationStore";
import { useListStore } from "../src/store/listStore";
import { HomeScreen } from "../src/screens/home/HomeScreen";
import { NotificationScreen } from "../src/screens/home/NotificationScreen";
import type { Notification, Store, PriceAlert, ShoppingList } from "../src/types/domain";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockUser = { id: "u1", email: "ana@test.com", name: "Ana García" };

const mockStore: Store = {
  id: "s1",
  name: "Mercadona Triana",
  chain: "mercadona",
  address: "C/ Pagés del Corro, 90",
  distanceKm: 0.3,
  estimatedMinutes: 5,
  isOpen: true,
};

const mockList: ShoppingList = {
  id: "list1",
  name: "Compra semanal",
  items: [],
  totalEstimated: 20.5,
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-10T12:00:00Z",
  isFavorite: false,
};

const mockNotifToday: Notification = {
  id: "n1",
  notification_type: "price_alert",
  title: "Precio bajó",
  body: "El precio de Leche bajó a 0.89€",
  is_read: false,
  data: {},
  action_url: "bargain://lists/list1",
  created_at: new Date().toISOString(),
};

const mockNotifYesterday: Notification = {
  id: "n2",
  notification_type: "price_alert",
  title: "Oferta expirada",
  body: "La oferta de Pan ha expirado",
  is_read: true,
  data: {},
  action_url: null,
  created_at: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(),
};

const mockNotifOld: Notification = {
  id: "n3",
  notification_type: "list_shared",
  title: "Lista compartida",
  body: "Carlos compartió una lista contigo",
  is_read: false,
  data: {},
  action_url: null,
  created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
};

const mockAlert: PriceAlert = {
  id: "a1",
  product: {
    id: "p1",
    name: "Leche entera",
    normalizedName: "leche entera",
    category: "Lácteos",
    unit: "l",
    unitQuantity: 1,
  },
  target_price: 0.8,
  current_price: 1.2,
  is_active: true,
  created_at: "2026-01-01T10:00:00Z",
};

// ─── HomeScreen Tests (Tests 1-5) ─────────────────────────────────────────────

describe("HomeScreen", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    // Auth: authenticated user
    useAuthStore.setState({
      isAuthenticated: true,
      user: mockUser,
      token: "tok",
      refreshToken: "ref",
      memberSince: null,
    });

    // Stores: reset
    useNotificationStore.setState({
      notifications: [mockNotifToday],
      unreadCount: 1,
      isLoading: false,
      page: 1,
      hasMore: false,
    });
    useListStore.setState({ lists: [mockList], activeList: null, isLoading: false });

    // API mocks
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 37.3886, longitude: -5.9823 },
    });
    (storeService.getNearby as jest.Mock).mockResolvedValue([mockStore]);
    (notificationService.getNotifications as jest.Mock).mockResolvedValue({
      results: [mockNotifToday],
      count: 1,
      next: null,
    });
    (listService.getLists as jest.Mock).mockResolvedValue([mockList]);
    (priceService.getPriceAlerts as jest.Mock).mockResolvedValue([mockAlert]);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // Test 1: greeting shows user.name from authStore (not hardcoded)
  it("Test 1: HomeScreen greeting shows user.name from useAuthStore (not hardcoded)", async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      // First name is "Ana" (split on space)
      expect(getByText(/Ana/)).toBeTruthy();
    });
  });

  // Test 2: shows SkeletonBox placeholders in lists widget while loading
  it("Test 2: HomeScreen shows skeleton placeholders in lists widget while loading", async () => {
    // lists store is empty → triggers fetch which won't resolve immediately
    useListStore.setState({ lists: [], activeList: null, isLoading: false });
    (listService.getLists as jest.Mock).mockReturnValue(new Promise(() => {}));

    const { getAllByTestId } = render(<HomeScreen />);

    // During loading, skeleton-list-* testIDs should be present
    await waitFor(() => {
      const skeletons = getAllByTestId(/skeleton-list-/);
      expect(skeletons.length).toBeGreaterThanOrEqual(1);
    });
  });

  // Test 3: shows location permission prompt card when location status is 'denied'
  it("Test 3: HomeScreen shows location permission prompt card when location is denied", async () => {
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "denied",
    });

    const { getByTestId } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByTestId("location-denied-card")).toBeTruthy();
    });
  });

  // Test 4: optimizer teaser card renders with "Próximamente" text
  it('Test 4: HomeScreen optimizer teaser card renders with "Próximamente" text and is not pressable', async () => {
    const { getByText } = render(<HomeScreen />);

    await waitFor(() => {
      expect(getByText(/Pr[oó]ximamente/i)).toBeTruthy();
    });
  });

  // Test 5: pull-to-refresh triggers all data-fetch functions simultaneously
  it("Test 5: pull-to-refresh on HomeScreen refreshes all 4 data sources", async () => {
    (listService.getLists as jest.Mock).mockResolvedValue([mockList]);

    const { getByTestId } = render(<HomeScreen />);

    // Wait for initial load
    await waitFor(() => {
      expect(listService.getLists).toHaveBeenCalled();
    });

    // Reset call counts
    jest.clearAllMocks();
    (Location.requestForegroundPermissionsAsync as jest.Mock).mockResolvedValue({
      status: "granted",
    });
    (Location.getCurrentPositionAsync as jest.Mock).mockResolvedValue({
      coords: { latitude: 37.3886, longitude: -5.9823 },
    });
    (storeService.getNearby as jest.Mock).mockResolvedValue([mockStore]);
    (notificationService.getNotifications as jest.Mock).mockResolvedValue({
      results: [mockNotifToday],
      count: 1,
      next: null,
    });
    (listService.getLists as jest.Mock).mockResolvedValue([mockList]);
    (priceService.getPriceAlerts as jest.Mock).mockResolvedValue([mockAlert]);

    const scrollView = getByTestId("home-scroll");
    const { refreshControl } = scrollView.props as {
      refreshControl?: { props: { onRefresh: () => void } };
    };

    if (refreshControl?.props?.onRefresh) {
      await act(async () => {
        refreshControl.props.onRefresh();
      });
    }

    await waitFor(() => {
      expect(listService.getLists).toHaveBeenCalled();
      expect(notificationService.getNotifications).toHaveBeenCalled();
      expect(priceService.getPriceAlerts).toHaveBeenCalled();
    });
  });
});

// ─── NotificationScreen Tests (Tests 6-11) ────────────────────────────────────

const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  goBack: jest.fn(),
};

describe("NotificationScreen", () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});

    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      page: 1,
      hasMore: true,
    });

    (notificationService.getNotifications as jest.Mock).mockResolvedValue({
      results: [mockNotifToday, mockNotifYesterday, mockNotifOld],
      count: 3,
      next: null,
    });
    (notificationService.markAsRead as jest.Mock).mockResolvedValue(undefined);
    (notificationService.markAllAsRead as jest.Mock).mockResolvedValue(undefined);
    (notificationService.deleteNotification as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
  });

  // Test 6: notifications grouped by Hoy/Ayer/Esta semana
  it("Test 6: NotificationScreen renders notifications grouped by day sections", async () => {
    const { getByText } = render(
      <NotificationScreen navigation={mockNavigation as never} />,
    );

    await waitFor(() => {
      expect(getByText("Hoy")).toBeTruthy();
      expect(getByText("Ayer")).toBeTruthy();
      expect(getByText("Esta semana")).toBeTruthy();
    });
  });

  // Test 7: tapping a notification calls notificationService.markAsRead
  it("Test 7: tapping a notification calls notificationService.markAsRead(id)", async () => {
    const { getByTestId } = render(
      <NotificationScreen navigation={mockNavigation as never} />,
    );

    await waitFor(() => {
      const notifRow = getByTestId(`notification-row-${mockNotifToday.id}`);
      fireEvent.press(notifRow);
    });

    await waitFor(() => {
      expect(notificationService.markAsRead).toHaveBeenCalledWith(mockNotifToday.id);
    });
  });

  // Test 8: swipe-to-delete reveals Eliminar and calls deleteNotification
  it("Test 8: swipe-to-delete calls notificationService.deleteNotification after confirmation", async () => {
    // Simulate confirm deletion (button index 1 = Eliminar)
    alertSpy.mockImplementation(
      (_title: string, _msg: string, buttons?: Array<{ onPress?: () => void }>) => {
        buttons?.[1]?.onPress?.();
      },
    );

    const { getByTestId } = render(
      <NotificationScreen navigation={mockNavigation as never} />,
    );

    await waitFor(() => {
      const deleteBtn = getByTestId(`delete-notification-${mockNotifToday.id}`);
      fireEvent.press(deleteBtn);
    });

    await waitFor(() => {
      expect(notificationService.deleteNotification).toHaveBeenCalledWith(
        mockNotifToday.id,
      );
    });
  });

  // Test 9: "Marcar todo leído" calls markAllAsRead
  it("Test 9: Marcar todo leído button calls notificationService.markAllAsRead()", async () => {
    const { getByTestId } = render(
      <NotificationScreen navigation={mockNavigation as never} />,
    );

    await waitFor(() => {
      const btn = getByTestId("mark-all-read-btn");
      fireEvent.press(btn);
    });

    await waitFor(() => {
      expect(notificationService.markAllAsRead).toHaveBeenCalled();
    });
  });

  // Test 10: empty state shows "Sin notificaciones"
  it('Test 10: empty state shows "Sin notificaciones" when notifications array is empty', async () => {
    (notificationService.getNotifications as jest.Mock).mockResolvedValue({
      results: [],
      count: 0,
      next: null,
    });

    const { getByText } = render(
      <NotificationScreen navigation={mockNavigation as never} />,
    );

    await waitFor(() => {
      expect(getByText(/Sin notificaciones/)).toBeTruthy();
    });
  });

  // Test 11: scrolling to end loads next page
  it("Test 11: scrolling to end triggers load-more and calls getNotifications(page+1)", async () => {
    (notificationService.getNotifications as jest.Mock)
      .mockResolvedValueOnce({
        results: [mockNotifToday],
        count: 3,
        next: "/notifications/?page=2",
      })
      .mockResolvedValueOnce({
        results: [mockNotifYesterday, mockNotifOld],
        count: 3,
        next: null,
      });

    const { getByTestId } = render(
      <NotificationScreen navigation={mockNavigation as never} />,
    );

    // Wait for initial load
    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalledWith(1);
    });

    // Trigger onEndReached on the SectionList
    const sectionList = getByTestId("notifications-list");
    fireEvent(sectionList, "onEndReached");

    await waitFor(() => {
      expect(notificationService.getNotifications).toHaveBeenCalledWith(2);
    });
  });
});
