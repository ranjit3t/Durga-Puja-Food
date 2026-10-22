import React, { useState } from "react";
import { View } from "react-native";
import { SubscriptionListScreen } from "./SubscriptionListScreen";
import { StoryMockProvider, STORY_FIXTURES } from "../../.storybook/storyMocks";
import { FilterMode } from "../types";
import { MealType, DietaryOption, PaymentMode } from "../domain";

// Rich Mock Subscriptions covering all default and current meal filter combinations
const filterStorySubscriptions = [
  {
    id: "pass-101",
    block: "A",
    flat: "101",
    peopleCount: 2,
    kidsCount: 1,
    guestsCount: 1,
    meals: { Shashthi: { veg: 2, nonVeg: 2 } },
    mealSlots: {
      Shashthi: [
        { [MealType.LUNCH]: DietaryOption.VEG, lunchParcel: false },
        { [MealType.LUNCH]: DietaryOption.NON_VEG, lunchParcel: true },
        { [MealType.LUNCH]: DietaryOption.VEG, lunchParcel: false }, // Kid
        { [MealType.LUNCH]: DietaryOption.NON_VEG, lunchParcel: false }, // Guest
      ],
    },
    takenByPerson: {
      Shashthi: [
        { lunch: true },
        { lunch: false }, // Pending non-veg adult
        { lunch: false }, // Pending kid
        { lunch: false }, // Pending guest
      ],
    },
    payments: [{ amount: "300", mode: PaymentMode.UPI }],
    amount: "300",
    passcode: "1010",
    mobile: 9876543210,
    timestamp: Date.now(),
  },
  {
    id: "pass-202",
    block: "B",
    flat: "202",
    peopleCount: 1,
    kidsCount: 2,
    guestsCount: 0,
    meals: { Shashthi: { veg: 3, nonVeg: 0 } },
    mealSlots: {
      Shashthi: [
        { [MealType.LUNCH]: DietaryOption.VEG, lunchParcel: false },
        { [MealType.LUNCH]: DietaryOption.VEG, lunchParcel: false }, // Kid 1
        { [MealType.LUNCH]: DietaryOption.VEG, lunchParcel: false }, // Kid 2
      ],
    },
    takenByPerson: {
      Shashthi: [
        { lunch: false },
        { lunch: false },
        { lunch: false },
      ],
    },
    payments: [{ amount: "240", mode: PaymentMode.CASH }],
    amount: "240",
    passcode: "2020",
    mobile: 9876543211,
    timestamp: Date.now() - 3600000,
  },
  {
    id: "pass-303",
    block: "C",
    flat: "303",
    peopleCount: 1,
    kidsCount: 0,
    guestsCount: 2,
    meals: { Shashthi: { veg: 3, nonVeg: 0 } },
    mealSlots: {
      Shashthi: [
        { [MealType.LUNCH]: DietaryOption.VEG, lunchParcel: true },
        { [MealType.LUNCH]: DietaryOption.VEG, lunchParcel: true }, // Guest 1
        { [MealType.LUNCH]: DietaryOption.VEG, lunchParcel: true }, // Guest 2
      ],
    },
    takenByPerson: {
      Shashthi: [
        { lunch: true, lunchParcel: true },
        { lunch: true, lunchParcel: true },
        { lunch: true, lunchParcel: true },
      ],
    },
    payments: [{ amount: "400", mode: PaymentMode.UPI }],
    amount: "400",
    passcode: "3030",
    mobile: 9876543212,
    timestamp: Date.now() - 7200000,
  },
  {
    id: "pass-404",
    block: "D",
    flat: "404",
    peopleCount: 2,
    kidsCount: 0,
    guestsCount: 0,
    isPackageApplied: true,
    appliedPackages: { 0: { packageId: "pkg-1", packageName: "All Veg Festival Package", packagePrice: 1000 } },
    meals: { Shashthi: { veg: 2, nonVeg: 0 } },
    mealSlots: {
      Shashthi: [
        { [MealType.LUNCH]: DietaryOption.VEG, lunchParcel: false },
        { [MealType.LUNCH]: DietaryOption.VEG, lunchParcel: false },
      ],
    },
    takenByPerson: { Shashthi: [{ lunch: true }, { lunch: true }] },
    payments: [{ amount: "1000", mode: PaymentMode.UPI }],
    amount: "1000",
    passcode: "4040",
    mobile: 9876543213,
    timestamp: Date.now() - 10800000,
  },
];

const dayConfigWithActiveMeal = STORY_FIXTURES.dayConfig.map((day, idx) => ({
  ...day,
  enabled: true,
  lunch: {
    ...day.lunch,
    enabled: true,
    current: idx === 0, // Shashthi lunch is live active meal
    parcel: true,
  },
}));

function StatefulFilterWrapper({ initialFilters }: { initialFilters: FilterMode[] }) {
  const [activeFilters, setActiveFilters] = useState<FilterMode[]>(initialFilters);

  return (
    <StoryMockProvider
      database={{
        subscriptions: filterStorySubscriptions as any,
        dayConfig: dayConfigWithActiveMeal as any,
        kidsEnabled: true,
        guestsEnabled: true,
        freeMealEnabled: true,
      }}
      navigation={{
        activeFilters,
        setActiveFilters,
      }}
    >
      <View style={{ flex: 1 }}>
        <SubscriptionListScreen />
      </View>
    </StoryMockProvider>
  );
}

export default {
  title: "UI/SubscriptionListFilters",
  parameters: {
    controls: { disable: true },
    layout: "fullscreen",
  },
};

export const AllFiltersAvailable = {
  name: "Default/AllPassesDirectory",
  render: () => <StatefulFilterWrapper initialFilters={[FilterMode.ALL]} />,
};

export const CurrentMealKidsAndGuestsActive = {
  name: "CurrentMeal/KidsAndGuestsFilters",
  render: () => (
    <StatefulFilterWrapper initialFilters={[FilterMode.CURRENT_MEAL_KIDS, FilterMode.CURRENT_MEAL_GUESTS]} />
  ),
};

export const LiveMealMissedAndPartial = {
  name: "CurrentMeal/MissedAndPartialPickupFilters",
  render: () => (
    <StatefulFilterWrapper initialFilters={[FilterMode.MISSED, FilterMode.PARTIAL_CHECKOUT]} />
  ),
};

export const CompletedCheckoutAndSpecialMeals = {
  name: "CurrentMeal/CompletedCheckoutAndVegOnlyFilters",
  render: () => (
    <StatefulFilterWrapper initialFilters={[FilterMode.COMPLETED_CHECKOUT, FilterMode.VEG_ONLY]} />
  ),
};
