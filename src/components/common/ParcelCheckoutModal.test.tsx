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
  id: "parcel-mixed-pass",
  block: "B",
  flat: "202",
  peopleCount: 2,
  kidsCount: 1,
  guestsCount: 1,
  mealSlots: {
    Shashthi: [
      { breakfast: DietaryOption.NONE, lunch: DietaryOption.VEG, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: true, dinnerParcel: false },
      { breakfast: DietaryOption.NONE, lunch: DietaryOption.NON_VEG, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: true, dinnerParcel: false },
      { breakfast: DietaryOption.NONE, lunch: DietaryOption.VEG, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: true, dinnerParcel: false },
      { breakfast: DietaryOption.NONE, lunch: DietaryOption.NON_VEG, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: true, dinnerParcel: false },
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
  upsertSubscription: jest.fn(async (_sub: any) => true),
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

const { ParcelCheckoutModal } = require("./ParcelCheckoutModal") as typeof import("./ParcelCheckoutModal");

function renderParcelCheckout(sub = subscription, currentMealInfo = { dayId: "Shashthi", mealType: MealType.LUNCH, dayLabel: "Shashthi", mealLabel: "Lunch" }) {
  return render(
    <ThemeProvider>
      <ParcelCheckoutModal
        visible
        subscription={sub as any}
        currentMealInfo={currentMealInfo}
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

describe("ParcelCheckoutModal combinations and permutations", () => {
  it("renders parcel categories for adults, kids, and guests", () => {
    renderParcelCheckout();

    expect(screen.getByText(/Adult - Veg/i)).toBeTruthy();
    expect(screen.getByText(/Adult - Non-Veg/i)).toBeTruthy();
    expect(screen.getByText(/Kid - Veg/i)).toBeTruthy();
    expect(screen.getByText(/Guest - Non-Veg/i)).toBeTruthy();
  });

  it("initializes counters at 0 and keeps checkout button disabled until incremented", () => {
    renderParcelCheckout();

    const checkoutBtn = screen.getByRole("button", { name: UI_TEXT.parcelCheckout });
    expect(checkoutBtn).toBeDisabled();

    fireEvent.press(screen.getByLabelText("Increase parcel count for Adult - Veg"));
    expect(checkoutBtn).not.toBeDisabled();
  });

  it("checks out selected parcel categories and updates takenByPerson status", async () => {
    renderParcelCheckout();

    fireEvent.press(screen.getByLabelText("Increase parcel count for Adult - Veg"));
    fireEvent.press(screen.getByLabelText("Increase parcel count for Kid - Veg"));

    await act(async () => {
      fireEvent.press(screen.getByRole("button", { name: UI_TEXT.parcelCheckout }));
    });

    await waitFor(() => expect(mockDatabase.upsertSubscription).toHaveBeenCalledTimes(1));
    const savedSub = mockDatabase.upsertSubscription.mock.calls[0][0] as typeof subscription;
    const savedSlots = savedSub.takenByPerson.Shashthi;

    expect(savedSlots[0].lunchParcel).toBe(true);
    expect(savedSlots[0].lunch).toBe(true);
    expect(savedSlots[2].lunchParcel).toBe(true);
    expect(savedSlots[2].lunch).toBe(true);
    expect(mockDatabase.addActivityLog).toHaveBeenCalledTimes(1);
  });

  it("excludes dine-in fulfilled members from unserved parcel counts", () => {
    const dineInServedSub = {
      ...subscription,
      id: "dinein-fulfilled-pass",
      takenByPerson: {
        Shashthi: [
          { breakfast: false, lunch: true, dinner: false, lunchParcel: false },
          { breakfast: false, lunch: false, dinner: false, lunchParcel: false },
          { breakfast: false, lunch: false, dinner: false, lunchParcel: false },
          { breakfast: false, lunch: false, dinner: false, lunchParcel: false },
        ],
      },
    };

    renderParcelCheckout(dineInServedSub);

    expect(screen.getByText(/1\s*\/\s*1\s*Served/i)).toBeTruthy();
    expect(screen.getByText(/Adult - Non-Veg/i)).toBeTruthy();
  });

  it("handles adult-only parcel subscriptions", () => {
    const adultOnlySub = {
      ...subscription,
      id: "adult-only-pass",
      peopleCount: 2,
      kidsCount: 0,
      guestsCount: 0,
      mealSlots: {
        Shashthi: [
          { breakfast: DietaryOption.NONE, lunch: DietaryOption.VEG, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: true, dinnerParcel: false },
          { breakfast: DietaryOption.NONE, lunch: DietaryOption.NON_VEG, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: true, dinnerParcel: false },
        ],
      },
      takenByPerson: {
        Shashthi: [
          { breakfast: false, lunch: false, dinner: false, lunchParcel: false },
          { breakfast: false, lunch: false, dinner: false, lunchParcel: false },
        ],
      },
    };

    renderParcelCheckout(adultOnlySub);

    expect(screen.getByText(/Adult - Veg/i)).toBeTruthy();
    expect(screen.getByText(/Adult - Non-Veg/i)).toBeTruthy();
    expect(screen.queryByText(/Kid/i)).toBeFalsy();
    expect(screen.queryByText(/Guest/i)).toBeFalsy();
  });
});
