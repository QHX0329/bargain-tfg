/**
 * Tests for ListsScreen (Tasks 1 & 2) — shopping list management screens.
 *
 * Tests 1-7: ListsScreen (real API, CRUD, skeleton, empty state)
 * Tests 8-13: ListDetailScreen (items, autocomplete, check/delete)
 */

// ─── Mocks ────────────────────────────────────────────────────────────────────

jest.mock("../src/api/listService", () => ({
  listService: {
    getLists: jest.fn(),
    getList: jest.fn(),
    createList: jest.fn(),
    updateList: jest.fn(),
    deleteList: jest.fn(),
    saveAsTemplate: jest.fn(),
    addItem: jest.fn(),
    updateItem: jest.fn(),
    deleteItem: jest.fn(),
  },
}));

jest.mock("../src/api/productService", () => ({
  productService: {
    search: jest.fn(),
    autocomplete: jest.fn(),
  },
}));

jest.mock("@react-navigation/native", () => ({
  useNavigation: () => ({
    navigate: jest.fn(),
    setOptions: jest.fn(),
  }),
  useFocusEffect: () => undefined,
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
import { render, fireEvent, waitFor, act } from "@testing-library/react-native";
import { Alert } from "react-native";
import { listService } from "../src/api/listService";
import { productService } from "../src/api/productService";
import { useListStore } from "../src/store/listStore";
import { ListsScreen } from "../src/screens/lists/ListsScreen";
import { ListDetailScreen } from "../src/screens/lists/ListDetailScreen";
import type { ShoppingList, ShoppingListItem } from "../src/types/domain";

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const mockItem: ShoppingListItem = {
  id: "i1",
  name: "Leche entera",
  quantity: 2,
  isChecked: false,
};

const mockList: ShoppingList = {
  id: "list1",
  name: "Compra semanal",
  items: [mockItem],
  totalEstimated: 5.5,
  createdAt: "2026-01-01T10:00:00Z",
  updatedAt: "2026-01-02T12:00:00Z",
  isFavorite: false,
};

const mockList2: ShoppingList = {
  id: "list2",
  name: "Cena del viernes",
  items: [],
  totalEstimated: 0,
  createdAt: "2026-01-03T10:00:00Z",
  updatedAt: "2026-01-03T11:00:00Z",
  isFavorite: false,
};

// ─── ListsScreen Tests ────────────────────────────────────────────────────────

describe("ListsScreen", () => {
  let alertAlertSpy: jest.SpyInstance;
  let alertPromptSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertAlertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    alertPromptSpy = jest.spyOn(Alert, "prompt").mockImplementation(() => {});
    // Reset store to clean state
    useListStore.setState({ lists: [], activeList: null, isLoading: false });
    (listService.getLists as jest.Mock).mockResolvedValue([mockList, mockList2]);
  });

  afterEach(() => {
    alertAlertSpy.mockRestore();
    alertPromptSpy.mockRestore();
  });

  // Test 1: renders FlatList with list items when lists are present
  it("Test 1: renders list items from store when lists are present", async () => {
    // Pre-seed the store so component renders with data immediately
    useListStore.setState({ lists: [mockList, mockList2], isLoading: false });

    const { getByText } = render(<ListsScreen />);

    await waitFor(() => {
      expect(getByText("Compra semanal")).toBeTruthy();
      expect(getByText("Cena del viernes")).toBeTruthy();
    });
  });

  // Test 2: shows SkeletonBox placeholders while isLoading=true
  it("Test 2: shows skeleton placeholders while isLoading is true", () => {
    useListStore.setState({ lists: [], isLoading: true });

    const { getAllByTestId } = render(<ListsScreen />);

    const skeletons = getAllByTestId(/skeleton-list-/);
    expect(skeletons.length).toBeGreaterThanOrEqual(3);
  });

  // Test 3: shows empty state text when lists array is empty
  it("Test 3: shows empty state when lists array is empty and not loading", async () => {
    (listService.getLists as jest.Mock).mockResolvedValue([]);

    const { getByText } = render(<ListsScreen />);

    await waitFor(() => {
      expect(
        getByText("No tienes listas aún. ¡Crea tu primera lista!"),
      ).toBeTruthy();
    });
  });

  // Test 4: tapping FAB opens create modal and confirms createList
  it("Test 4: tapping FAB opens create modal and confirm calls createList", async () => {
    (listService.getLists as jest.Mock).mockResolvedValue([]);
    (listService.createList as jest.Mock).mockResolvedValue(mockList);

    const { getByTestId } = render(<ListsScreen />);

    // Wait for initial load to complete so skeleton is gone
    await waitFor(() => {
      expect(listService.getLists).toHaveBeenCalled();
    });

    const fab = getByTestId("fab-create-list");
    fireEvent.press(fab);

    const input = getByTestId("modal-create-list-input");
    fireEvent.changeText(input, "Compra finde");

    const confirm = getByTestId("modal-create-list-confirm");
    fireEvent.press(confirm);

    await waitFor(() => {
      expect(listService.createList).toHaveBeenCalledWith("Compra finde");
    });
  });

  // Test 5: each list card shows name and item count
  it("Test 5: each list card shows name and item count", async () => {
    useListStore.setState({ lists: [mockList], isLoading: false });

    const { getByText } = render(<ListsScreen />);

    await waitFor(() => {
      expect(getByText("Compra semanal")).toBeTruthy();
      expect(getByText(/1 producto/)).toBeTruthy();
    });
  });

  // Test 6: pressing delete button opens modal and confirm calls deleteList
  it("Test 6: pressing delete button calls listService.deleteList", async () => {
    useListStore.setState({ lists: [mockList], isLoading: false });
    (listService.deleteList as jest.Mock).mockResolvedValue(undefined);

    const { getByTestId } = render(<ListsScreen />);

    await waitFor(() => {
      const deleteBtn = getByTestId(`delete-list-${mockList.id}`);
      fireEvent.press(deleteBtn);
    });

    const confirm = getByTestId("modal-delete-list-confirm");
    fireEvent.press(confirm);

    await waitFor(() => {
      expect(listService.deleteList).toHaveBeenCalledWith(mockList.id);
    });
  });

  // Test 7: pull-to-refresh calls listService.getLists
  it("Test 7: pull-to-refresh calls listService.getLists and updates store", async () => {
    useListStore.setState({ lists: [mockList], isLoading: false });
    (listService.getLists as jest.Mock).mockResolvedValue([mockList, mockList2]);

    const { getByTestId } = render(<ListsScreen />);

    // Wait for initial load (from useEffect on mount)
    await waitFor(() => {
      expect(listService.getLists).toHaveBeenCalledTimes(1);
    });

    // Trigger the onRefresh handler on the FlatList's refreshControl
    const flatList = getByTestId("lists-flatlist");
    const { refreshControl } = flatList.props as { refreshControl?: { props: { onRefresh: () => void } } };
    if (refreshControl?.props?.onRefresh) {
      await act(async () => {
        refreshControl.props.onRefresh();
      });
    }

    await waitFor(() => {
      expect(listService.getLists).toHaveBeenCalledTimes(2);
    });
  });
});

// ─── ListDetailScreen Tests ───────────────────────────────────────────────────

const mockRoute = {
  params: { listId: "list1", listName: "Compra semanal" },
  key: "ListDetail-1",
  name: "ListDetail" as const,
};

const mockNavigation = {
  navigate: jest.fn(),
  setOptions: jest.fn(),
  goBack: jest.fn(),
};

describe("ListDetailScreen", () => {
  let alertAlertSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    alertAlertSpy = jest.spyOn(Alert, "alert").mockImplementation(() => {});
    useListStore.setState({ lists: [], activeList: null, isLoading: false });
    (listService.getList as jest.Mock).mockResolvedValue(mockList);
    (productService.autocomplete as jest.Mock).mockResolvedValue([]);
  });

  afterEach(() => {
    alertAlertSpy.mockRestore();
  });

  // Test 8: fetches and renders items
  it("Test 8: fetches and renders items from listService.getList", async () => {
    const { getByText } = render(
      <ListDetailScreen route={mockRoute} navigation={mockNavigation as never} />,
    );

    await waitFor(() => {
      expect(listService.getList).toHaveBeenCalledWith("list1");
    });

    // The store should have activeList set after getList resolves
    await waitFor(() => {
      expect(getByText("Leche entera")).toBeTruthy();
    });
  });

  // Test 9: increase quantity triggers updateItem with +1 quantity
  it("Test 9: pressing increase quantity calls listService.updateItem", async () => {
    (listService.updateItem as jest.Mock).mockResolvedValue({
      ...mockItem,
      quantity: 3,
    });
    const { getByTestId } = render(
      <ListDetailScreen route={mockRoute} navigation={mockNavigation as never} />,
    );

    await waitFor(() => {
      expect(listService.getList).toHaveBeenCalled();
    });

    const increaseButton = getByTestId(`increase-item-${mockItem.id}`);
    fireEvent.press(increaseButton);

    await waitFor(() => {
      expect(listService.updateItem).toHaveBeenCalledWith("list1", mockItem.id, {
        quantity: 3,
      });
    });
  });

  // Test 10: catalog FAB navigates to ProductsCatalog for current list
  it("Test 10: pressing catalog FAB navigates to ProductsCatalog", async () => {
    const { getByTestId } = render(
      <ListDetailScreen route={mockRoute} navigation={mockNavigation as never} />,
    );
    await waitFor(() => {
      expect(listService.getList).toHaveBeenCalled();
    });

    const openCatalogFab = getByTestId("fab-open-product-catalog");
    fireEvent.press(openCatalogFab);

    await waitFor(() => {
      expect(mockNavigation.navigate).toHaveBeenCalledWith("ProductsCatalog", {
        listId: "list1",
        listName: "Compra semanal",
      });
    });
  });

  // Test 11: tapping checkbox calls listService.updateItem
  it("Test 11: tapping checkbox calls listService.updateItem with toggled isChecked", async () => {
    (listService.updateItem as jest.Mock).mockResolvedValue({
      ...mockItem,
      isChecked: true,
    });

    const { getByTestId } = render(
      <ListDetailScreen route={mockRoute} navigation={mockNavigation as never} />,
    );

    // Wait for items to load
    await waitFor(() => {
      expect(listService.getList).toHaveBeenCalled();
    });

    await waitFor(() => {
      const checkbox = getByTestId(`checkbox-item-${mockItem.id}`);
      fireEvent.press(checkbox);
    });

    await waitFor(() => {
      expect(listService.updateItem).toHaveBeenCalledWith("list1", mockItem.id, {
        is_checked: true,
      });
    });
  });

  // Test 12: long-pressing item calls listService.deleteItem after confirmation
  it("Test 12: long-pressing item shows delete confirmation and calls listService.deleteItem", async () => {
    (listService.deleteItem as jest.Mock).mockResolvedValue(undefined);
    alertAlertSpy.mockImplementation(
      (_title: string, _msg: string, buttons?: Array<{ onPress?: () => void }>) => {
        buttons?.[1]?.onPress?.();
      },
    );

    const { getByTestId } = render(
      <ListDetailScreen route={mockRoute} navigation={mockNavigation as never} />,
    );

    await waitFor(() => {
      expect(listService.getList).toHaveBeenCalled();
    });

    await waitFor(() => {
      const itemRow = getByTestId(`item-row-${mockItem.id}`);
      fireEvent(itemRow, "longPress");
    });

    await waitFor(() => {
      expect(listService.deleteItem).toHaveBeenCalledWith("list1", mockItem.id);
    });
  });

  // Test 13: shows skeleton placeholders while loading
  it("Test 13: shows skeleton placeholders while initial data loads", () => {
    (listService.getList as jest.Mock).mockReturnValue(new Promise(() => {})); // never resolves

    const { getAllByTestId } = render(
      <ListDetailScreen route={mockRoute} navigation={mockNavigation as never} />,
    );

    const skeletons = getAllByTestId(/skeleton-item-/);
    expect(skeletons.length).toBeGreaterThanOrEqual(4);
  });
});
