import { describe, expect, it } from "@jest/globals";
import { DietaryOption, MealType, normalizeChoice, normalizeSlot, toBool } from "../domain";
import { resolveGuestPrice, resolvePrice } from "../utils/paymentUtils";
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