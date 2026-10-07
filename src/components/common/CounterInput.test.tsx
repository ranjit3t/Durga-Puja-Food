import React from "react";
import { describe, expect, it, jest } from "@jest/globals";
import { fireEvent, render, screen } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme";
import { CounterInput } from "./CounterInput";

describe("CounterInput", () => {
  it("increments and decrements through its accessible controls", () => {
    const onChange = jest.fn();

    render(
      <ThemeProvider>
        <CounterInput label="Meal" value={2} onChange={onChange} min={0} max={3} />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole("button", { name: "Increase Meal" }));
    fireEvent.press(screen.getByRole("button", { name: "Decrease Meal" }));

    expect(onChange).toHaveBeenNthCalledWith(1, 3);
    expect(onChange).toHaveBeenNthCalledWith(2, 1);
  });

  it("disables increment at the maximum", () => {
    const onChange = jest.fn();

    render(
      <ThemeProvider>
        <CounterInput label="Meal" value={3} onChange={onChange} max={3} />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole("button", { name: "Increase Meal" }));

    expect(onChange).not.toHaveBeenCalled();
  });
});