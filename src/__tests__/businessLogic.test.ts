import { describe, expect, it } from "@jest/globals";
import { DietaryOption, MealType, normalizeChoice, normalizeSlot, toBool } from "../domain";
import { resolveGuestPrice, resolvePrice, calculateDetailedPaymentReportData, calculatePassTotalWithPackages } from "../utils/paymentUtils";
import {
  cleanExtractedTxnId,
  extractCandidateTxnIds,
  parseAmountFromText,
  parseAmountFromWords,
  parseTransactionIdFromText,
} from "../utils/ocrScanner";

describe("domain normalization", () => {
  it.each([
    ["veg", DietaryOption.VEG],
    ["non_veg", DietaryOption.NON_VEG],
    ["", DietaryOption.NONE],
  ])("normalizes %s", (input, expected) => {
    expect(normalizeChoice(input)).toBe(expected);
  });

  it("accepts persisted boolean representations", () => {
    expect(toBool(true)).toBe(true);
    expect(toBool("1")).toBe(true);
    expect(toBool("false")).toBe(false);
  });

  it("clears parcel selections when their meal choice is none", () => {
    const slot = normalizeSlot({
      [MealType.BREAKFAST]: DietaryOption.NONE,
      lunch: "veg",
      dinner: "non-veg",
      breakfastParcel: true,
      lunchParcel: "true",
      dinnerParcel: false,
    });

    expect(slot.breakfastParcel).toBe(false);
    expect(slot.lunchParcel).toBe(true);
    expect(slot.dinner).toBe(DietaryOption.NON_VEG);
  });
});

describe("subscription price resolution", () => {
  it("does not fall back from missing child prices to adult prices", () => {
    expect(resolvePrice(true, undefined, 120, 100)).toBe(0);
    expect(resolvePrice(false, undefined, undefined, "85")).toBe(85);
  });

  it("resolves guest prices through guest, adult, then config values", () => {
    expect(resolveGuestPrice("90", 120, 80)).toBe(90);
    expect(resolveGuestPrice(undefined, 120, 80)).toBe(120);
    expect(resolveGuestPrice(undefined, undefined, 80)).toBe(80);
  });
});

describe("receipt OCR text parsing", () => {
  it("parses word and numeric payment amounts", () => {
    expect(parseAmountFromWords("Two Thousand Eight Hundred Rupees")).toBe(2800);
    expect(parseAmountFromText("Paid\n₹ 1,250.00\nRupees")).toBe(1250);
    expect(parseAmountFromText("No amount present")).toBeNull();
  });

  it("normalizes and finds transaction references", () => {
    expect(cleanExtractedTxnId("Reference ID 6264 6291 6810")).toBe("626462916810");
    expect(extractCandidateTxnIds("UPI Ref No: 626462916810")).toContain("626462916810");
    expect(parseTransactionIdFromText("Txn ID: PAYTM1234567890")).toBe("PAYTM1234567890");
  });
});

import {
  distributeAmountWithRemainder,
} from "../utils/paymentUtils";
import { ConfigDay, PaymentMode } from "../domain";

describe("remainder distribution and detailed payment report calculation", () => {
  it("distributes 50 discount across 3 meals as 16, 16, 18 without decimals", () => {
    const shares = distributeAmountWithRemainder(50, [100, 100, 100]);
    expect(shares).toEqual([16, 16, 18]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(50);
  });

  it("distributes negative deficient amounts correctly as -16, -16, -18 without decimals", () => {
    const shares = distributeAmountWithRemainder(-50, [100, 100, 100]);
    expect(shares).toEqual([-16, -16, -18]);
    expect(shares.reduce((a, b) => a + b, 0)).toBe(-50);
  });

  it("distributes decimal amounts to exact cents", () => {
    const shares = distributeAmountWithRemainder(50.5, [100, 100, 100]);
    expect(shares.reduce((a, b) => a + b, 0)).toBeCloseTo(50.5);
  });

  it("calculates meal-wise and day-wise payment reports maintaining identity: day meal sum = day total, total day sum = total season", () => {
    const dummyDays: ConfigDay[] = [
      {
        id: "day1",
        label: "Saptami",
        abbr: "SEP",
        enabled: true,
        breakfast: { enabled: true, veg: true, nonVeg: true, parcel: false, vegPrice: "100", nonVegPrice: "100" },
        lunch: { enabled: true, veg: true, nonVeg: true, parcel: false, vegPrice: "100", nonVegPrice: "100" },
        dinner: { enabled: true, veg: true, nonVeg: true, parcel: false, vegPrice: "100", nonVegPrice: "100" },
      },
      {
        id: "day2",
        label: "Ashtami",
        abbr: "ASH",
        enabled: true,
        breakfast: { enabled: true, veg: true, nonVeg: true, parcel: false, vegPrice: "100", nonVegPrice: "100" },
        lunch: { enabled: true, veg: true, nonVeg: true, parcel: false, vegPrice: "100", nonVegPrice: "100" },
        dinner: { enabled: true, veg: true, nonVeg: true, parcel: false, vegPrice: "100", nonVegPrice: "100" },
      },
    ];

    const mockSubscriptions: any[] = [
      {
        id: "sub1",
        block: "A",
        flat: "101",
        peopleCount: 1,
        mealSlots: {
          day1: [
            {
              breakfast: DietaryOption.VEG,
              lunch: DietaryOption.VEG,
              dinner: DietaryOption.VEG,
              breakfastParcel: false,
              lunchParcel: false,
              dinnerParcel: false,
            },
          ],
          day2: [
            {
              breakfast: DietaryOption.VEG,
              lunch: DietaryOption.VEG,
              dinner: DietaryOption.VEG,
              breakfastParcel: false,
              lunchParcel: false,
              dinnerParcel: false,
            },
          ],
        },
        amount: "550", // Subscribed menu = 600, paid 550 (deficient -50)
        payments: [{ amount: "550", mode: PaymentMode.CASH }],
        takenByPerson: {},
      },
    ];

    const foodMenu = {
      day1: {
        breakfast: { vegPrice: "100" },
        lunch: { vegPrice: "100" },
        dinner: { vegPrice: "100" },
      },
      day2: {
        breakfast: { vegPrice: "100" },
        lunch: { vegPrice: "100" },
        dinner: { vegPrice: "100" },
      },
    };

    const report = calculateDetailedPaymentReportData(
      mockSubscriptions,
      foodMenu,
      dummyDays,
      false,
      false,
      []
    );

    // Menu price sum = 600
    expect(report.seasonTotalPayment.menuPrice).toBe(600);
    // Excess sum = 0 (underpaid pass has 0 excess)
    expect(report.seasonTotalPayment.excessDeficient).toBe(0);
    // Net meal subscription value = 600
    expect(report.seasonTotalPayment.netPayment).toBe(600);

    // Verify Day 1 sum + Day 2 sum = Season total
    const sumDays = report.dayWisePayments.reduce((acc, d) => acc + d.netPayment, 0);
    expect(sumDays).toBe(report.seasonTotalPayment.netPayment);

    // Verify Day 1 meal sum = Day 1 total
    const day1 = report.dayWisePayments.find((d) => d.dayId === "day1");
    expect(day1).toBeDefined();
    if (day1) {
      const sumDay1Meals =
        day1.meals.breakfast.netPayment +
        day1.meals.lunch.netPayment +
        day1.meals.dinner.netPayment;
      expect(sumDay1Meals).toBe(day1.netPayment);
    }
  });

  it("calculates real DB dump report correctly showing exact season excess", () => {
    const fs = require("fs");
    const dumpPath =
      "C:/Users/ranji/AppData/Local/Google/AndroidStudio2026.1.4/projects/durga-puja-food.735d10b4/.artifacts/b2cb853c-840d-4702-8bb8-96ea4d1352e1/scratch/db_dump.json";
    const dump = JSON.parse(fs.readFileSync(dumpPath, "utf8"));

    const subs = Object.values(dump.subscriptions || {});
    const dayConfig = dump.config.days;
    const foodMenu = dump.menu;
    const foodPackages = dump.food_packages;
    const kidsEnabled = !!dump.config.kidsEnabled;
    const guestsEnabled = !!dump.config.guestsEnabled;

    const report = calculateDetailedPaymentReportData(
      subs as any,
      foodMenu,
      dayConfig,
      kidsEnabled,
      guestsEnabled,
      foodPackages
    );

    expect(report.seasonTotalPayment.totalPortions).toBe(641);
    expect(report.seasonTotalPayment.excessDeficient).toBe(90);
  });
});