import React from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { cleanup, fireEvent, render, screen } from "@testing-library/react-native";
import { DEFAULT_APP_CONFIG } from "../../config";
import { MealType } from "../../domain";
import { UI_TEXT } from "../../strings";
import { ThemeProvider } from "../../theme";
import { MealMenuEditor } from "./MealMenuEditor";

const dayConfig = DEFAULT_APP_CONFIG.days.map((day, index) => ({
  ...day,
  enabled: index === 0,
  lunch: { ...day.lunch, enabled: index === 0, current: index === 0, parcel: true },
}));
const initialMenu = { veg: ["Luchi"], nonVeg: ["Fish Curry"], vegPrice: "80", nonVegPrice: "120" };

function renderMenuEditor(onChange = jest.fn()) {
  return {
    onChange,
    ...render(
      <ThemeProvider>
        <MealMenuEditor
          title="Lunch"
          mealKey={MealType.LUNCH}
          dayId="Shashthi"
          config={dayConfig}
          value={initialMenu}
          onChange={onChange}
          foodPriceEnabled
          kidsEnabled
          guestsEnabled
        />
      </ThemeProvider>,
    ),
  };
}

afterEach(cleanup);

describe("MealMenuEditor", () => {
  it("adds a typed menu item to its selected variety", () => {
    const { onChange } = renderMenuEditor();

    fireEvent.changeText(screen.getByPlaceholderText("Add item to Veg..."), "Payesh");
    fireEvent.press(screen.getByRole("button", { name: "Add Veg" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ veg: ["Luchi", "Payesh"] }));
  });

  it("removes a menu item from its variety", () => {
    const { onChange } = renderMenuEditor();

    fireEvent.press(screen.getByRole("button", { name: UI_TEXT.removeMenuItem.replace("{item}", "Luchi") }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ veg: [] }));
  });

  it("synchronizes adult variety pricing with the legacy menu field", () => {
    const { onChange } = renderMenuEditor();

    fireEvent.changeText(screen.getByDisplayValue("80"), "95");

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({
      vegPrice: "95",
      varieties: expect.objectContaining({
        veg_default: expect.objectContaining({ adultPrice: "95" }),
      }),
    }));
  });
});