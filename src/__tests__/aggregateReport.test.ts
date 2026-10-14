import { describe, expect, it } from "@jest/globals";
import { DietaryOption, MealType, PaymentMode, SubscriptionRecord } from "../domain";

describe("Aggregate Report Filtering & Permutations", () => {
  const mockSubscriptions: SubscriptionRecord[] = [
    {
      id: "sub-1",
      block: "A",
      flat: "101",
      peopleCount: 2,
      kidsCount: 1,
      guestsCount: 0,
      amount: "1500",
      paymentMode: PaymentMode.UPI,
      payments: [{ amount: "1500", mode: PaymentMode.UPI }],
      meals: {},
      mealByPerson: {},
      mealSlots: {
        shashthi: [
          {
            breakfast: DietaryOption.VEG,
            lunch: DietaryOption.VEG,
            dinner: DietaryOption.NON_VEG,
            breakfastParcel: false,
            lunchParcel: true,
            dinnerParcel: false,
          },
          {
            breakfast: DietaryOption.VEG,
            lunch: DietaryOption.NONE,
            dinner: DietaryOption.NONE,
            breakfastParcel: false,
            lunchParcel: false,
            dinnerParcel: false,
          },
        ],
      },
      takenByPerson: {},
    },
    {
      id: "sub-2",
      block: "B",
      flat: "202",
      peopleCount: 1,
      kidsCount: 0,
      guestsCount: 1,
      amount: "1000",
      paymentMode: PaymentMode.CASH,
      payments: [{ amount: "1000", mode: PaymentMode.CASH }],
      meals: {},
      mealByPerson: {},
      mealSlots: {
        shashthi: [
          {
            breakfast: DietaryOption.NON_VEG,
            lunch: DietaryOption.NON_VEG,
            dinner: DietaryOption.VEG,
            breakfastParcel: false,
            lunchParcel: false,
            dinnerParcel: true,
          },
        ],
      },
      takenByPerson: {},
    },
  ];

  it("filters subscriptions by block and flat correctly", () => {
    const blockA = mockSubscriptions.filter((s) => s.block === "A");
    expect(blockA.length).toBe(1);
    expect(blockA[0].flat).toBe("101");

    const flat202 = mockSubscriptions.filter((s) => s.flat === "202");
    expect(flat202.length).toBe(1);
    expect(flat202[0].block).toBe("B");
  });

  it("filters subscriptions by payment mode correctly", () => {
    const upiSubs = mockSubscriptions.filter((s) =>
      s.payments?.some((p) => p.mode === PaymentMode.UPI)
    );
    expect(upiSubs.length).toBe(1);
    expect(upiSubs[0].id).toBe("sub-1");

    const cashSubs = mockSubscriptions.filter((s) =>
      s.payments?.some((p) => p.mode === PaymentMode.CASH)
    );
    expect(cashSubs.length).toBe(1);
    expect(cashSubs[0].id).toBe("sub-2");
  });

  it("calculates matching portions and service types (dine-in vs parcel)", () => {
    let parcelCount = 0;
    let dineInCount = 0;

    mockSubscriptions.forEach((sub) => {
      const slots = sub.mealSlots?.shashthi || [];
      slots.forEach((slot: any) => {
        [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mType) => {
          const choice = slot[mType];
          if (choice && choice !== DietaryOption.NONE) {
            const isParcel = !!slot[`${mType}Parcel`];
            if (isParcel) parcelCount++;
            else dineInCount++;
          }
        });
      });
    });

    expect(parcelCount).toBe(2); // sub-1 lunchParcel, sub-2 dinnerParcel
    expect(dineInCount).toBe(5); // 5 dine-in portions total
  });
});
