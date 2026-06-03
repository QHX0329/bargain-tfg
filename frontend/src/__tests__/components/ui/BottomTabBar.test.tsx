/**
 * Tests for BottomTabBar desktop restyle (Wave 0, Plan 13-01, D-12).
 *
 * - desktop (width>=1024) → container style includes maxWidth: 900 (centered)
 * - mobile (width<768)    → container has NO maxWidth: 900 (unchanged behavior)
 */

jest.mock("react-native-reanimated", () => {
  const Reanimated = jest.requireActual("react-native-reanimated/mock");
  return Reanimated;
});

jest.mock("react-native-safe-area-context", () => ({
  SafeAreaView: ({ children }: { children: React.ReactNode }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

import React from "react";
import { Dimensions, Text } from "react-native";
import { render } from "@testing-library/react-native";
import { BottomTabBar, type TabDefinition } from "../../../components/ui/BottomTabBar";

const dimensionsSpy = jest.spyOn(Dimensions, "get");

function setWidth(width: number) {
  dimensionsSpy.mockReturnValue({ width, height: 800, scale: 1, fontScale: 1 });
}

const tabs: TabDefinition[] = [
  { key: "home", route: "Home", label: "Inicio", icon: <Text>i1</Text> },
  { key: "lists", route: "Lists", label: "Listas", icon: <Text>i2</Text> },
];

// Flatten a possibly-nested/falsy RN style prop into one object
function flatten(style: unknown): Record<string, unknown> {
  if (Array.isArray(style)) {
    return style.reduce(
      (acc, s) => Object.assign(acc, flatten(s)),
      {} as Record<string, unknown>,
    );
  }
  return (style as Record<string, unknown>) ?? {};
}

afterEach(() => {
  dimensionsSpy.mockReset();
});

describe("BottomTabBar desktop restyle", () => {
  it("centers with maxWidth 900 on desktop (width 1280)", () => {
    setWidth(1280);
    const { getByLabelText } = render(
      <BottomTabBar tabs={tabs} activeIndex={0} onTabPress={jest.fn()} />,
    );
    const container = getByLabelText("Navegación principal");
    expect(flatten(container.props.style).maxWidth).toBe(900);
  });

  it("has no maxWidth 900 on mobile (width 360)", () => {
    setWidth(360);
    const { getByLabelText } = render(
      <BottomTabBar tabs={tabs} activeIndex={0} onTabPress={jest.fn()} />,
    );
    const container = getByLabelText("Navegación principal");
    expect(flatten(container.props.style).maxWidth).toBeUndefined();
  });
});
