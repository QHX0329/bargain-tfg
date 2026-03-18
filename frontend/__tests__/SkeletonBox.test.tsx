/**
 * Tests for SkeletonBox animated loading placeholder component.
 *
 * Tests must be RED before the component is created.
 */

import React from "react";
import { render } from "@testing-library/react-native";
import { SkeletonBox } from "../src/components/ui/SkeletonBox";

describe("SkeletonBox", () => {
  // Test 1: renders with width and height props applied
  it("renders a View with width and height props applied", () => {
    const { getByTestId } = render(
      <SkeletonBox width={120} height={20} testID="skeleton" />,
    );
    const el = getByTestId("skeleton");
    expect(el).toBeTruthy();
    // Check that the style includes the width and height
    const flatStyle = Array.isArray(el.props.style)
      ? Object.assign({}, ...el.props.style.filter(Boolean))
      : el.props.style;
    expect(flatStyle.width).toBe(120);
    expect(flatStyle.height).toBe(20);
  });

  // Test 2: renders with accessible role or testID for query
  it("renders with testID accessible for query", () => {
    const { getByTestId } = render(
      <SkeletonBox width="100%" height={16} testID="skeleton-line" />,
    );
    expect(getByTestId("skeleton-line")).toBeTruthy();
  });
});

// ─── Zustand stores unit tests ────────────────────────────────────────────────

import { useListStore } from "../src/store/listStore";
import { useNotificationStore } from "../src/store/notificationStore";
import type { ShoppingList } from "../src/types/domain";

describe("listStore", () => {
  beforeEach(() => {
    useListStore.setState({ lists: [], activeList: null, isLoading: false });
  });

  // Test 3: setLists stores list array and getLists returns same data
  it("setLists() stores list array and lists state matches", () => {
    const mockLists: ShoppingList[] = [
      {
        id: "l1",
        name: "Compra semanal",
        items: [],
        totalEstimated: 0,
        createdAt: "2026-01-01T00:00:00Z",
        updatedAt: "2026-01-01T00:00:00Z",
        isFavorite: false,
      },
    ];

    useListStore.getState().setLists(mockLists);
    expect(useListStore.getState().lists).toEqual(mockLists);
  });
});

describe("notificationStore", () => {
  beforeEach(() => {
    useNotificationStore.setState({
      notifications: [],
      unreadCount: 0,
      isLoading: false,
      page: 1,
      hasMore: true,
    });
  });

  // Test 4: unreadCount returns count of notifications where is_read=false
  it("unreadCount returns correct count of unread notifications", () => {
    useNotificationStore.getState().setNotifications([
      {
        id: "n1",
        notification_type: "price_alert",
        title: "Precio bajó",
        body: "Leche más barata",
        is_read: false,
        data: {},
        action_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "n2",
        notification_type: "promo",
        title: "Oferta",
        body: "Promo nueva",
        is_read: true,
        data: {},
        action_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
      {
        id: "n3",
        notification_type: "system",
        title: "Aviso",
        body: "Sistema",
        is_read: false,
        data: {},
        action_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);

    expect(useNotificationStore.getState().unreadCount).toBe(2);
  });

  // Test 5: markRead(id) sets is_read=true for matching notification
  it("markRead(id) sets is_read=true for the matching notification", () => {
    useNotificationStore.getState().setNotifications([
      {
        id: "n1",
        notification_type: "price_alert",
        title: "Test",
        body: "Body",
        is_read: false,
        data: {},
        action_url: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    ]);

    useNotificationStore.getState().markRead("n1");

    const notification = useNotificationStore
      .getState()
      .notifications.find((n) => n.id === "n1");
    expect(notification?.is_read).toBe(true);
    expect(useNotificationStore.getState().unreadCount).toBe(0);
  });
});
