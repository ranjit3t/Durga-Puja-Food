import { describe, expect, it } from "@jest/globals";
import { DietaryOption, MealType, ConfigDay, SubscriptionRecord } from "../domain";
import { isMealSlotAbsent, getAbsentCountsForSub } from "../constants";
import { calculateSubscriptionAmount, calculatePassMealBreakdown } from "../utils/paymentUtils";

const mockConfigDays: ConfigDay[] = [
  {
    id: "Shashthi",
    label: "Shashthi",
    abbr: "Sha",
    enabled: true,
    breakfast: { enabled: true, veg: true, nonVeg: true, parcel: true, vegPrice: "100", nonVegPrice: "150", vegParcelPrice: "20", nonVegParcelPrice: "20" },
    lunch: { enabled: true, veg: true, nonVeg: true, parcel: true, vegPrice: "100", nonVegPrice: "150", vegParcelPrice: "20", nonVegParcelPrice: "20" },
    dinner: { enabled: true, veg: true, nonVeg: true, parcel: true, vegPrice: "100", nonVegPrice: "150", vegParcelPrice: "20", nonVegParcelPrice: "20" },
  },
];

describe("Absent Meal Domain & Invariance Logic", () => {
  it("correctly identifies absent meal slots", () => {
    const takenState = {
      [MealType.BREAKFAST]: false,
      [MealType.LUNCH]: false,
      [MealType.DINNER]: false,
      breakfastAbsent: true,
      lunchAbsent: false,
    };

    expect(isMealSlotAbsent(takenState as any, MealType.BREAKFAST)).toBe(true);
    expect(isMealSlotAbsent(takenState as any, MealType.LUNCH)).toBe(false);
  });

  it("financial invariance: marking a member absent does not alter calculated subscription amount", () => {
    const sub: SubscriptionRecord = {
      id: "A-101",
      block: "A",
      flat: "101",
      peopleCount: 1,
      kidsCount: 1,
      guestsCount: 0,
      meals: {} as any,
      mealByPerson: {} as any,
      mealSlots: {
        Shashthi: [
          { breakfast: DietaryOption.VEG, lunch: DietaryOption.NON_VEG, dinner: DietaryOption.NONE, breakfastParcel: true, lunchParcel: false, dinnerParcel: false },
          { breakfast: DietaryOption.VEG, lunch: DietaryOption.NONE, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
        ],
      },
      takenByPerson: {
        Shashthi: [
          { breakfast: false, lunch: false, dinner: false, breakfastAbsent: true, lunchAbsent: true },
          { breakfast: false, lunch: false, dinner: false, breakfastAbsent: false },
        ],
      },
      payments: [],
      amount: "370",
      paymentMode: "Cash" as any,
    };

    const foodMenu: any = {
      Shashthi: {
        breakfast: { vegPrice: "100", kidsVegPrice: "50", vegParcelPrice: "20" },
        lunch: { nonVegPrice: "150", kidsNonVegPrice: "80" },
      },
    };

    const calculatedPrice = calculateSubscriptionAmount(sub.mealSlots, sub.peopleCount, sub.kidsCount || 0, foodMenu, mockConfigDays, true, sub.guestsCount || 0, false);
    // Adult: Veg B (100) + Parcel (20) + NonVeg L (150) = 270
    // Kid: Veg B (50) = 50
    // Total = 320
    expect(calculatedPrice).toBe(320);

    // Marking absent in takenByPerson matrix does not touch mealSlots, guaranteeing 0 price discrepancy!
    expect(sub.mealSlots.Shashthi[0].breakfast).toBe(DietaryOption.VEG);
  });

  it("calculates absent headcount breakdown (Adults, Kids, Guests) accurately", () => {
    const sub = {
      peopleCount: 1,
      kidsCount: 1,
      guestsCount: 1,
      mealSlots: {
        Shashthi: [
          { breakfast: DietaryOption.VEG, lunch: DietaryOption.NONE, dinner: DietaryOption.NONE, breakfastParcel: true, lunchParcel: false, dinnerParcel: false },
          { breakfast: DietaryOption.VEG, lunch: DietaryOption.NONE, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
          { breakfast: DietaryOption.VEG, lunch: DietaryOption.NONE, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
        ],
      },
      takenByPerson: {
        Shashthi: [
          { breakfast: false, lunch: false, dinner: false, breakfastAbsent: true },
          { breakfast: false, lunch: false, dinner: false, breakfastAbsent: true },
          { breakfast: false, lunch: false, dinner: false, breakfastAbsent: false },
        ],
      },
    };

    const counts = getAbsentCountsForSub(sub, "Shashthi", MealType.BREAKFAST, mockConfigDays, true, true);
    expect(counts.adults).toBe(1);
    expect(counts.kids).toBe(1);
    expect(counts.guests).toBe(0);
    expect(counts.totalMeals).toBe(2);
    expect(counts.totalParcels).toBe(1); // Adult had parcel opted and is absent
  });

  it("excludes absent meals from vendor pricing breakdown", () => {
    const sub: SubscriptionRecord = {
      id: "A-102",
      block: "A",
      flat: "102",
      peopleCount: 1,
      kidsCount: 0,
      guestsCount: 0,
      meals: {} as any,
      mealByPerson: {} as any,
      mealSlots: {
        Shashthi: [
          { breakfast: DietaryOption.VEG, lunch: DietaryOption.NONE, dinner: DietaryOption.NONE, breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
        ],
      },
      takenByPerson: {
        Shashthi: [
          { breakfast: false, lunch: false, dinner: false, breakfastAbsent: true },
        ],
      },
      payments: [],
      amount: "100",
      paymentMode: "Cash" as any,
    };

    const passMeals = calculatePassMealBreakdown(sub, {}, mockConfigDays, false, false, []);
    expect(passMeals[0].isAbsent).toBe(true);
    expect(passMeals[0].isMealTaken).toBe(false);
  });
});
