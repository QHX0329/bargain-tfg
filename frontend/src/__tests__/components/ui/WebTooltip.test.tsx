/**
 * Tests for WebTooltip (Wave 0, Plan 13-01, D-06).
 *
 * - native (Platform.OS='ios') → passthrough: children present, no tooltip label
 * - web (Platform.OS='web') → after mouseEnter + 400ms, label becomes visible
 */

import React from "react";
import { Platform, Text } from "react-native";
import { render, fireEvent, act } from "@testing-library/react-native";
import { WebTooltip } from "../../../components/ui/WebTooltip";

const originalOS = Platform.OS;

function setPlatform(os: string) {
  // Platform.OS is a writable plain property in the RN test environment
  (Platform as unknown as { OS: string }).OS = os;
}

afterEach(() => {
  setPlatform(originalOS);
  jest.useRealTimers();
});

describe("WebTooltip", () => {
  it("renders children without a tooltip label on native", () => {
    setPlatform("ios");
    const { getByText, queryByText } = render(
      <WebTooltip label="TIP">
        <Text>CHILD</Text>
      </WebTooltip>,
    );
    expect(getByText("CHILD")).toBeTruthy();
    expect(queryByText("TIP")).toBeNull();
  });

  it("shows the label after hover + 400ms on web", () => {
    setPlatform("web");
    jest.useFakeTimers();
    const { root, getByText, queryByText } = render(
      <WebTooltip label="TIP">
        <Text>CHILD</Text>
      </WebTooltip>,
    );

    expect(queryByText("TIP")).toBeNull();

    fireEvent(root, "mouseEnter");
    act(() => {
      jest.advanceTimersByTime(400);
    });

    expect(getByText("TIP")).toBeTruthy();
  });
});
