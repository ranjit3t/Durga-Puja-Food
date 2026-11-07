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
import { generateUniquePasscode, getMealFreeMealCounts } from "../constants";

describe("free meal parcel counts and payment report integration", () => {
  it("calculates free meal dine-in, parcel, and total served counts correctly", () => {
    const mealMenu: any = {
      freeMealVeg: 10,
      freeMealNonVeg: 5,
      freeMealVegTaken: 6,
      freeMealNonVegTaken: 3,
      freeMealVegParcelTaken: 2,
      freeMealNonVegParcelTaken: 1,
    };

    const counts = getMealFreeMealCounts(mealMenu);
    expect(counts.freeMealVeg).toBe(10);
    expect(counts.freeMealNonVeg).toBe(5);
    expect(counts.freeMealTotal).toBe(15);

    expect(counts.freeMealVegTaken).toBe(6);
    expect(counts.freeMealNonVegTaken).toBe(3);
    expect(counts.freeMealDineInTaken).toBe(9);

    expect(counts.freeMealVegParcelTaken).toBe(2);
    expect(counts.freeMealNonVegParcelTaken).toBe(1);
    expect(counts.freeMealParcelTaken).toBe(3);

    expect(counts.freeMealTaken).toBe(12);
  });

  it("adds free meal dine-in and parcel portions to dineInCount and parcelCount in detailed payment reports", () => {
    const dummyDays: ConfigDay[] = [
      {
        id: "day1",
        label: "Saptami",
        abbr: "SEP",
        enabled: true,
        breakfast: { enabled: true, veg: true, nonVeg: true, parcel: false },
        lunch: { enabled: true, veg: true, nonVeg: true, parcel: false },
        dinner: { enabled: true, veg: true, nonVeg: true, parcel: false },
      },
    ];

    const foodMenu: any = {
      day1: {
        lunch: {
          freeMealVeg: 10,
          freeMealNonVeg: 5,
          freeMealVegTaken: 6,
          freeMealNonVegTaken: 3,
          freeMealVegParcelTaken: 2,
          freeMealNonVegParcelTaken: 1,
        },
      },
    };

    const report = calculateDetailedPaymentReportData(
      [],
      foodMenu,
      dummyDays,
      false,
      false,
      []
    );

    const lunchPayment = report.mealWisePayments.find((m) => m.dayId === "day1" && m.mealType === MealType.LUNCH);
    expect(lunchPayment).toBeDefined();
    if (lunchPayment) {
      expect(lunchPayment.portionCount).toBe(15);
      expect(lunchPayment.dineInCount).toBe(9);
      expect(lunchPayment.parcelCount).toBe(6);
    }
  });
});

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
});

import { findSubscriptionByPassCodeOrCheatCode, qrValueFor, blockOptions, isSeasonDone } from "../constants";
import { encryptQrPayload, decryptQrPayload } from "../utils/qrEncryption";
import { getPassDisplayLabel } from "../domain";

describe("Season Completion Invariants", () => {
  it("evaluates season as done only when all enabled meals across active days are done", () => {
    const unfinishedConfig: any[] = [
      {
        id: "day1",
        enabled: true,
        breakfast: { enabled: true, done: true },
        lunch: { enabled: true, done: false },
        dinner: { enabled: true, done: false },
      },
    ];
    expect(isSeasonDone(unfinishedConfig)).toBe(false);

    const finishedConfig: any[] = [
      {
        id: "day1",
        enabled: true,
        breakfast: { enabled: true, done: true },
        lunch: { enabled: true, done: true },
        dinner: { enabled: false, done: false },
      },
    ];
    expect(isSeasonDone(finishedConfig)).toBe(true);
  });
});

describe("Configurable Pass Identities", () => {
  it("formats pass display label correctly with custom identity names and enabled states", () => {
    const sub = { block: "10", flat: "A2" };

    // Default both enabled
    expect(getPassDisplayLabel(sub, { identity1Enabled: true, identity2Enabled: true })).toBe("10-A2");

    // Only identity 1 enabled
    expect(getPassDisplayLabel(sub, { identity1Enabled: true, identity1Name: "Tower No", identity2Enabled: false })).toBe("10");

    // Only identity 2 enabled
    expect(getPassDisplayLabel(sub, { identity1Enabled: false, identity2Enabled: true, identity2Name: "House No" })).toBe("A2");
  });
});

describe("Block Options Configuration", () => {
  it("includes Block 0 in blockOptions starting from 0 to 25", () => {
    expect(blockOptions[0]).toBe("0");
    expect(blockOptions).toContain("0");
    expect(blockOptions).toContain("25");
    expect(blockOptions.length).toBe(26);
  });
});

describe("QR Code Encryption & Decryption Lookup", () => {
  const mockSubs: any[] = [
    { id: "14-3S", block: "14", flat: "3S", passcode: "9999" },
    { id: "6-2E", block: "6", flat: "2E", passcode: "8888" },
  ];

  it("encrypts the ENTIRE QR payload into a cipher string without plain text URL or pass ID", () => {
    const encUrl = qrValueFor("14-3S");
    expect(encUrl.startsWith("DPF_ENC_")).toBe(true);
    expect(encUrl).not.toContain("https://");
    expect(encUrl).not.toContain("durga-puja-food");
    expect(encUrl).not.toContain("14-3S");
  });

  it("decrypts valid encrypted QR payload back to original pass ID", () => {
    const encUrl = encryptQrPayload("14-3S");
    const decrypted = decryptQrPayload(encUrl);
    expect(decrypted).toBe("14-3S");
  });

  it("generates unique encrypted QR payload for different season codes even with same subscription ID", () => {
    const sub = { id: "14-3S", block: "14", flat: "3S" };
    const qr2025 = qrValueFor(sub as any, "DP2025");
    const qr2026 = qrValueFor(sub as any, "DP2026");
    expect(qr2025).not.toBe(qr2026);
    expect(decryptQrPayload(qr2025)).toBe("14-3S");
    expect(decryptQrPayload(qr2026)).toBe("14-3S");
  });

  it("returns null when decrypting invalid or unencrypted strings", () => {
    expect(decryptQrPayload("https://random-url.com")).toBeNull();
    expect(decryptQrPayload("14-3S")).toBeNull();
  });

  it("finds pass by encrypted QR payload string in scanner lookup", () => {
    const encUrl = qrValueFor("14-3S");
    const match = findSubscriptionByPassCodeOrCheatCode(encUrl, mockSubs, false);
    expect(match?.id).toBe("14-3S");
  });

  it("finds legacy encrypted QR payloads without tenant or season metadata in tenant mode", () => {
    const legacyEncryptedQr = encryptQrPayload("14-3S");
    const match = findSubscriptionByPassCodeOrCheatCode(
      `https://durga-puja-food.app/pass/enc:${legacyEncryptedQr.slice("DPF_ENC_".length)}`,
      mockSubs,
      false,
      "fooddesk",
      "DP2026"
    );

    expect(match?.id).toBe("14-3S");
  });

  it("accepts unencrypted legacy flat URLs as fallback", () => {
    const legacyUrl = "https://durga-puja-food.app/flat/14-3S";
    const match = findSubscriptionByPassCodeOrCheatCode(legacyUrl, mockSubs, false, "fooddesk", "DP2026");
    expect(match?.id).toBe("14-3S");
  });

  it("strictly rejects QR codes belonging to a different tenant or season", () => {
    const encUrlFoodDesk = encryptQrPayload("14-3S", "fooddesk", "DP2026", "14", "3S");
    const encUrlOtherTenant = encryptQrPayload("14-3S", "other_tenant", "DP2026", "14", "3S");
    const encUrlOtherSeason = encryptQrPayload("14-3S", "fooddesk", "DP2025", "14", "3S");

    expect(findSubscriptionByPassCodeOrCheatCode(encUrlFoodDesk, mockSubs, false, "fooddesk", "DP2026")?.id).toBe("14-3S");
    expect(findSubscriptionByPassCodeOrCheatCode(encUrlOtherTenant, mockSubs, false, "fooddesk", "DP2026")).toBeUndefined();
    expect(findSubscriptionByPassCodeOrCheatCode(encUrlOtherSeason, mockSubs, false, "fooddesk", "DP2026")).toBeUndefined();
  });

  it("guarantees 100% unique passcodes for all passes in the same season without collisions", () => {
    const subs: any[] = [];
    const usedPasscodes = new Set<string>();

    for (let i = 1; i <= 50; i++) {
      const passId = `14-${i}S`;
      const passCode = generateUniquePasscode(subs, passId, passId, "fooddesk", "DP2026");
      expect(usedPasscodes.has(passCode)).toBe(false);
      usedPasscodes.add(passCode);
      subs.push({ id: passId, passcode: passCode });
    }

    expect(usedPasscodes.size).toBe(50);
  });

  it("finds pass by cheat code when enabled", () => {
    expect(findSubscriptionByPassCodeOrCheatCode("143s", mockSubs, true)?.id).toBe("14-3S");
    expect(findSubscriptionByPassCodeOrCheatCode("143S", mockSubs, true)?.id).toBe("14-3S");
    expect(findSubscriptionByPassCodeOrCheatCode("062e", mockSubs, true)?.id).toBe("6-2E");
    expect(findSubscriptionByPassCodeOrCheatCode("062E", mockSubs, true)?.id).toBe("6-2E");
  });

  it("does not find pass by cheat code when disabled", () => {
    expect(findSubscriptionByPassCodeOrCheatCode("143s", mockSubs, false)).toBeUndefined();
  });

  it("finds pass by standard passcode when numeric", () => {
    expect(findSubscriptionByPassCodeOrCheatCode("9999", mockSubs, false)?.id).toBe("14-3S");
  });

  it("supports custom passcode digit count and padded cheat codes", () => {
    const code5 = generateUniquePasscode([], "14-3S", "14-3S", "fooddesk", "DP2026", 5);
    expect(code5.length).toBe(5);

    const paddedCheatMatch = findSubscriptionByPassCodeOrCheatCode("0143s", mockSubs, true, "fooddesk", "DP2026", 5);
    expect(paddedCheatMatch?.id).toBe("14-3S");
  });
});
