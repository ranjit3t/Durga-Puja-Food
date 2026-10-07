import React from "react";
import { afterEach, describe, expect, it, jest } from "@jest/globals";
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react-native";
import { ThemeProvider } from "../../theme";
import { DietaryOption, MealType } from "../../domain";
import { UI_TEXT } from "../../strings";

const dayConfig = [{
  id: "Shashthi",
  label: "Shashthi",
  abbr: "Sha",
  enabled: true,
  breakfast: { enabled: false, veg: true, nonVeg: true, parcel: false },
  lunch: { enabled: true, current: true, veg: true, nonVeg: true, parcel: true, kidsParcel: true, guestsParcel: true },
  dinner: { enabled: false, veg: true, nonVeg: true, parcel: false },
}];

const subscription = {
  id: "mixed-pass",
  block: "A",
  flat: "101",
  peopleCount: 2,
  kidsCount: 1,
  guestsCount: 1,
  mealSlots: {
    Shashthi: [
      { breakfast: DietaryOption.NONE, lunch: DietaryOption.VEG, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
      { breakfast: DietaryOption.NONE, lunch: DietaryOption.NON_VEG, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: true, dinnerParcel: false },
      { breakfast: DietaryOption.NONE, lunch: DietaryOption.VEG, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: true, dinnerParcel: false },
      { breakfast: DietaryOption.NONE, lunch: DietaryOption.NON_VEG, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
    ],
  },
  takenByPerson: {
    Shashthi: [
      { breakfast: false, lunch: false, dinner: false, lunchParcel: false },
      { breakfast: false, lunch: false, dinner: false, lunchParcel: false },
      { breakfast: false, lunch: false, dinner: false, lunchParcel: false },
      { breakfast: false, lunch: false, dinner: false, lunchParcel: false },
    ],
  },
  meals: { Shashthi: { veg: 2, nonVeg: 2 } },
  mealByPerson: { Shashthi: [DietaryOption.VEG, DietaryOption.NON_VEG, DietaryOption.VEG, DietaryOption.NON_VEG] },
  payments: [],
  amount: "0",
  paymentMode: "Cash",
};

const mockDatabase = {
  dayConfig,
  kidsEnabled: true,
  guestsEnabled: true,
  addActivityLog: jest.fn(),
  upsertSubscription: jest.fn(async (_subscription: any) => true),
  subscriptions: [subscription],
  quickCheckoutAutoCloseMs: 60000,
  soundEnabled: false,
};
const mockShowAlert = jest.fn();
const mockNavigate = jest.fn();
const mockRegisterModalOpen = jest.fn();
const mockUnregisterModalOpen = jest.fn();

jest.doMock("../../context/DatabaseContext", () => ({ useDatabase: () => mockDatabase }));
jest.doMock("../../context/UIContext", () => ({ useUI: () => ({ showAlert: mockShowAlert }) }));
jest.doMock("../../context/NavigationContext", () => ({ useAppNavigation: () => ({ navigate: mockNavigate }) }));
jest.doMock("../../context/ChatContext", () => ({
  useChat: () => ({ registerModalOpen: mockRegisterModalOpen, unregisterModalOpen: mockUnregisterModalOpen }),
}));

const { QuickCheckoutModal } = require("./QuickCheckoutModal") as typeof import("./QuickCheckoutModal");

function renderCheckout() {
  return render(
    <ThemeProvider>
      <QuickCheckoutModal
        visible
        subscription={subscription as any}
        currentMealInfo={{ dayId: "Shashthi", mealType: MealType.LUNCH, dayLabel: "Shashthi", mealLabel: "Lunch" }}
        onClose={jest.fn()}
        onSuccess={jest.fn()}
      />
    </ThemeProvider>,
  );
}

afterEach(() => {
  cleanup();
  jest.clearAllMocks();
});

describe("QuickCheckoutModal category handling", () => {
  it("shows independent controls for adults, kids, and guests", () => {
    renderCheckout();

    expect(screen.getByText("Adults", { exact: true })).toBeTruthy();
    expect(screen.getByText("Kids", { exact: true })).toBeTruthy();
    expect(screen.getByText("Guests", { exact: true })).toBeTruthy();
    expect(screen.getByLabelText("Veg (Adult) Dine-In quantity")).toBeTruthy();
    expect(screen.getByLabelText("Non-Veg (Adult) Parcels quantity")).toBeTruthy();
    expect(screen.getByLabelText("Veg (Kid) Parcels quantity")).toBeTruthy();
    expect(screen.getByLabelText("Non-Veg (Guest) Dine-In quantity")).toBeTruthy();
  });

  it("allocates selected parcel and dine-in counts only to their matching people", async () => {
    renderCheckout();

    fireEvent.press(screen.getByRole("button", { name: "Increase Veg (Adult) Dine-In" }));
    fireEvent.press(screen.getByRole("button", { name: "Increase Non-Veg (Adult) Parcels" }));
    fireEvent.press(screen.getByRole("button", { name: "Increase Veg (Kid) Parcels" }));
    fireEvent.press(screen.getByRole("button", { name: "Increase Non-Veg (Guest) Dine-In" }));

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: "Checkout" }));
    });

    await waitFor(() => expect(mockDatabase.upsertSubscription).toHaveBeenCalledTimes(1));
    const savedSubscription = mockDatabase.upsertSubscription.mock.calls[0][0] as typeof subscription;
    const savedSlots = savedSubscription.takenByPerson.Shashthi;

    expect(savedSlots.map((slot) => slot.lunch)).toEqual([true, true, true, true]);
    expect(savedSlots.map((slot) => slot.lunchParcel)).toEqual([false, true, true, false]);
    expect(screen.getByText("Veg (Adult)")).toBeTruthy();
    expect(screen.getByText("Non-Veg (Adult)")).toBeTruthy();
    expect(screen.getByText("Veg (Kid)")).toBeTruthy();
    expect(screen.getByText("Non-Veg (Guest)")).toBeTruthy();
    expect(mockDatabase.addActivityLog).toHaveBeenCalledTimes(1);
  });

  it("clamps each category input to its own remaining capacity", () => {
    renderCheckout();

    const adultDineIn = screen.getByLabelText("Veg (Adult) Dine-In quantity");
    const kidParcel = screen.getByLabelText("Veg (Kid) Parcels quantity");
    fireEvent.changeText(adultDineIn, "99");
    fireEvent.changeText(kidParcel, "99");

    expect(screen.getByLabelText("Veg (Adult) Dine-In quantity").props.value).toBe("1");
    expect(screen.getByLabelText("Veg (Kid) Parcels quantity").props.value).toBe("1");
  });

  it("shows partial-service and parcel alerts with the correct remaining totals", () => {
    const partiallyServedSubscription = {
      ...subscription,
      id: "partial-pass",
      takenByPerson: {
        Shashthi: subscription.takenByPerson.Shashthi.map((slot, index) =>
          index === 0 ? { ...slot, lunch: true } : slot,
        ),
      },
    };

    render(
      <ThemeProvider>
        <QuickCheckoutModal
          visible
          subscription={partiallyServedSubscription as any}
          currentMealInfo={{ dayId: "Shashthi", mealType: MealType.LUNCH, dayLabel: "Shashthi", mealLabel: "Lunch" }}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText(UI_TEXT.importantReminders)).toBeTruthy();
    expect(screen.getByText(/Parcel Pickup Alert: 2 takeaway parcel/)).toBeTruthy();
    expect(screen.getByText(/Partial Pickup Alert: 1 of 4 meals already collected.*3 remaining/)).toBeTruthy();
  });

  it("does not offer checkout controls when every subscribed slot is served", () => {
    const completedSubscription = {
      ...subscription,
      id: "completed-pass",
      takenByPerson: {
        Shashthi: subscription.takenByPerson.Shashthi.map((slot, index) => ({
          ...slot,
          lunch: true,
          lunchParcel: index === 1 || index === 2,
        })),
      },
    };

    render(
      <ThemeProvider>
        <QuickCheckoutModal
          visible
          subscription={completedSubscription as any}
          currentMealInfo={{ dayId: "Shashthi", mealType: MealType.LUNCH, dayLabel: "Shashthi", mealLabel: "Lunch" }}
          onClose={jest.fn()}
          onSuccess={jest.fn()}
        />
      </ThemeProvider>,
    );

    expect(screen.getByText(UI_TEXT.quickCheckoutAllServed)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Checkout" })).toBeDisabled();
  });
});