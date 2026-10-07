import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ActivityAction, ActivityModule, CheckoutSource, FreeMealCheckoutSource } from "../../../domain";
import { UI_TEXT } from "../../../strings";
import { createStyles } from "../../../styles";
import { primaryTheme } from "../../../theme/primary";
import { ActivityLogItem } from "./ActivityLogItem";

const styles = createStyles(primaryTheme, 375, 812);
const subscription = { id: "pass-1", block: "A", flat: "101", peopleCount: 1 } as any;
const noop = () => undefined;

function renderItem(overrides: Record<string, any> = {}) {
  const onNavigateToDetails = jest.fn();
  const onToggleStack = jest.fn();
  const item = {
    id: "log-1",
    timestamp: Date.now(),
    userName: "Preview Admin",
    module: ActivityModule.SUBSCRIPTION,
    action: ActivityAction.CREATE,
    targetId: subscription.id,
    description: "Opened pass details",
    ...overrides,
  };

  const view = render(
    <ActivityLogItem
      item={item}
      index={0}
      theme={primaryTheme}
      styles={styles}
      s={(value) => value}
      subscriptions={[subscription]}
      onNavigateToDetails={onNavigateToDetails}
      expanded={false}
      onToggleStack={onToggleStack}
    />,
  );

  return { ...view, onNavigateToDetails, onToggleStack, item };
}

describe("ActivityLogItem", () => {
  it("navigates to the matching pass when a log row is pressed", () => {
    const { onNavigateToDetails } = renderItem();

    fireEvent.press(screen.getByRole("button", { name: /Opened pass details/ }));

    expect(onNavigateToDetails).toHaveBeenCalledWith(subscription.id);
  });

  it("discloses and hides an error stack through the accessible control", () => {
    const stack = "Error: update failed\\n  at saveMenu";
    const { onToggleStack, rerender, item } = renderItem({
      module: ActivityModule.MENU,
      action: ActivityAction.ERROR,
      targetId: undefined,
      description: "Unable to update lunch menu",
      stack,
    });

    fireEvent.press(screen.getByRole("button", { name: UI_TEXT.viewStackTrace }));
    expect(onToggleStack).toHaveBeenCalledWith("log-1");

    rerender(
      <ActivityLogItem
        item={item}
        index={0}
        theme={primaryTheme}
        styles={styles}
        s={(value) => value}
        subscriptions={[]}
        onNavigateToDetails={noop}
        expanded
        onToggleStack={onToggleStack}
      />,
    );

    expect(screen.getByText(stack)).toBeTruthy();
    expect(screen.getByRole("button", { name: UI_TEXT.hideStackTrace })).toBeTruthy();
  });

  it.each([
    [ActivityModule.SCANNER, `Checked in pass via ${CheckoutSource.SCANNER}`, CheckoutSource.SCANNER],
    [ActivityModule.FREE_MEAL, `Served free meal via ${FreeMealCheckoutSource.FREE_MEAL_MODAL}`, FreeMealCheckoutSource.FREE_MEAL_MODAL],
  ])("identifies the source for %s events", (module, description, sourceLabel) => {
    renderItem({ module, action: ActivityAction.UPDATE, description, targetId: undefined });

    expect(screen.getByText(sourceLabel)).toBeTruthy();
  });
});