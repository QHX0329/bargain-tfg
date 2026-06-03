/**
 * Tests for MasterDetailLayout (Wave 0, Plan 13-01, D-05).
 *
 * - mobile/tablet → only master pane (detail absent)
 * - desktop → both master and detail panes rendered (split)
 */

import React from "react";
import { Text } from "react-native";
import { render } from "@testing-library/react-native";
import { MasterDetailLayout } from "../../../components/ui/MasterDetailLayout";

const master = <Text>MASTER</Text>;
const detail = <Text>DETAIL</Text>;

describe("MasterDetailLayout", () => {
  it("renders only the master pane on mobile", () => {
    const { getByText, queryByText } = render(
      <MasterDetailLayout
        masterPane={master}
        detailPane={detail}
        breakpoint="mobile"
      />,
    );
    expect(getByText("MASTER")).toBeTruthy();
    expect(queryByText("DETAIL")).toBeNull();
  });

  it("renders only the master pane on tablet", () => {
    const { getByText, queryByText } = render(
      <MasterDetailLayout
        masterPane={master}
        detailPane={detail}
        breakpoint="tablet"
      />,
    );
    expect(getByText("MASTER")).toBeTruthy();
    expect(queryByText("DETAIL")).toBeNull();
  });

  it("renders both master and detail panes on desktop", () => {
    const { getByText } = render(
      <MasterDetailLayout
        masterPane={master}
        detailPane={detail}
        breakpoint="desktop"
      />,
    );
    expect(getByText("MASTER")).toBeTruthy();
    expect(getByText("DETAIL")).toBeTruthy();
  });
});
