import React from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme";
import { UI_TEXT } from "../../strings";

const modalTracker = {
  register: jest.fn(),
  unregister: jest.fn(),
};

jest.doMock("../../context/ChatContext", () => ({
  useChat: () => ({
    registerModalOpen: modalTracker.register,
    unregisterModalOpen: modalTracker.unregister,
  }),
}));

const { CustomAlert } = require("./CustomAlert") as typeof import("./CustomAlert");
const { Dropdown } = require("./Dropdown") as typeof import("./Dropdown");
const { EditableMetric } = require("./EditableMetric") as typeof import("./EditableMetric");
const { ThemeToggleButton } = require("./ThemeToggleButton") as typeof import("./ThemeToggleButton");

function EditableMetricHarness({ onSave }: { onSave: (value: number) => void }) {
  const [value, setValue] = React.useState(24);

  return (
    <EditableMetric
      icon="people-outline"
      label="Members"
      value={value}
      onSave={(nextValue) => {
        onSave(nextValue);
        setValue(nextValue);
      }}
    />
  );
}

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("shared interactive controls", () => {
  it("selects an option and closes the Dropdown modal", () => {
    const onChange = jest.fn();

    render(
      <ThemeProvider>
        <Dropdown label="Meal" value="Lunch" options={["Breakfast", "Lunch", "Dinner"]} onChange={onChange} />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole("combobox", { name: "Meal" }));
    expect(modalTracker.register).toHaveBeenCalledWith("dropdown");
    fireEvent.press(screen.getByRole("menuitem", { name: "Dinner" }));

    expect(onChange).toHaveBeenCalledWith("Dinner");
    expect(screen.queryByRole("menuitem", { name: "Dinner" })).toBeNull();
    expect(modalTracker.unregister).toHaveBeenCalledWith("dropdown");
  });

  it("sanitizes and saves an edited metric value", () => {
    const onSave = jest.fn();

    render(
      <ThemeProvider>
        <EditableMetricHarness onSave={onSave} />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole("button", { name: "Members: 24" }));
    fireEvent.changeText(screen.getByLabelText("Members"), "18people");
    fireEvent.press(screen.getByRole("button", { name: UI_TEXT.saveChanges }));

    expect(onSave).toHaveBeenCalledWith(18);
    expect(screen.getByText("18")).toBeTruthy();
  });

  it("runs the selected alert action and closes the dialog", () => {
    const onClose = jest.fn();
    const onDelete = jest.fn();

    render(
      <ThemeProvider>
        <CustomAlert
          visible
          title="Delete package?"
          message="This cannot be undone."
          buttons={[{ text: "Cancel", style: "cancel" }, { text: "Delete", style: "destructive", onPress: onDelete }]}
          onClose={onClose}
        />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole("button", { name: "Delete" }));

    expect(onDelete).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("toggles the theme and updates the accessible action label", async () => {
    render(
      <ThemeProvider>
        <ThemeToggleButton />
      </ThemeProvider>,
    );

    fireEvent.press(screen.getByRole("button", { name: UI_TEXT.switchToDark }));

    await waitFor(() => expect(screen.getByRole("button", { name: UI_TEXT.switchToLight })).toBeTruthy());
  });
});