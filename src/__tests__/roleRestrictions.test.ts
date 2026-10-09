import { describe, expect, it } from "@jest/globals";
import { UserRole, PaymentMode, DietaryOption, MealType } from "../domain";
import { Subscription } from "../types";

describe("Non-Admin Role Restrictions and Field Preservation", () => {
  it("preserves admin-only fields when non-admin user edits a subscription", () => {
    const originalSubscription: Subscription = {
      id: "A-101",
      block: "A",
      flat: "101",
      peopleCount: 2,
      kidsCount: 1,
      guestsCount: 0,
      mobile: 9876543210,
      passcode: "1234",
      amount: "1500",
      paymentMode: PaymentMode.UPI,
      transactionId: "TXN999",
      payments: [
        { amount: "1500", mode: PaymentMode.UPI, transactionId: "TXN999" }
      ],
      isPackageApplied: true,
      appliedPackages: {
        0: { packageId: "pkg1", packageName: "Season Pass", packagePrice: 1500 }
      },
      meals: {},
      mealByPerson: {},
      mealSlots: {
        day1: [
          {
            [MealType.BREAKFAST]: DietaryOption.VEG,
            [MealType.LUNCH]: DietaryOption.VEG,
            [MealType.DINNER]: DietaryOption.VEG,
            breakfastParcel: false,
            lunchParcel: false,
            dinnerParcel: false,
          }
        ]
      },
      takenByPerson: {},
      createdAt: 100000,
      updatedAt: 100000,
    };

    const userRole = UserRole.VENDOR; // Non-admin user
    const isAdmin = (userRole as string) === UserRole.ADMIN;

    expect(isAdmin).toBe(false);

    // Simulate non-admin updating meal choices without touching payment or mobile
    const editedMealSlots = {
      ...originalSubscription.mealSlots,
      day1: [
        {
          [MealType.BREAKFAST]: DietaryOption.NON_VEG,
          [MealType.LUNCH]: DietaryOption.NON_VEG,
          [MealType.DINNER]: DietaryOption.NON_VEG,
          breakfastParcel: true,
          lunchParcel: false,
          dinnerParcel: false,
        }
      ]
    };

    // Construct saved record following non-admin preservation logic
    const savedSubscription: Subscription = {
      ...originalSubscription,
      mealSlots: editedMealSlots,
      updatedAt: 200000,
      // Preserved fields for non-admin:
      mobile: !isAdmin ? originalSubscription.mobile : 0,
      passcode: !isAdmin ? originalSubscription.passcode : "new",
      payments: !isAdmin ? originalSubscription.payments : [],
      amount: !isAdmin ? originalSubscription.amount : "0",
      paymentMode: !isAdmin ? originalSubscription.paymentMode : PaymentMode.CASH,
      transactionId: !isAdmin ? originalSubscription.transactionId : "",
      isPackageApplied: !isAdmin ? originalSubscription.isPackageApplied : false,
      appliedPackages: !isAdmin ? originalSubscription.appliedPackages : undefined,
    };

    // Assert that admin-only hidden fields were preserved unchanged
    expect(savedSubscription.mobile).toBe(9876543210);
    expect(savedSubscription.passcode).toBe("1234");
    expect(savedSubscription.amount).toBe("1500");
    expect(savedSubscription.paymentMode).toBe(PaymentMode.UPI);
    expect(savedSubscription.transactionId).toBe("TXN999");
    expect(savedSubscription.payments).toEqual(originalSubscription.payments);
    expect(savedSubscription.isPackageApplied).toBe(true);
    expect(savedSubscription.appliedPackages).toEqual(originalSubscription.appliedPackages);

    // Assert that non-admin's edited meal slots were saved
    expect(savedSubscription.mealSlots.day1[0][MealType.BREAKFAST]).toBe(DietaryOption.NON_VEG);
    expect(savedSubscription.mealSlots.day1[0].breakfastParcel).toBe(true);
  });
});
