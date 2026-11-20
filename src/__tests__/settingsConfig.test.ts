import { describe, expect, it } from "@jest/globals";
import { buildSettingsConfigPatch } from "../utils/settingsConfig";
import type { SettingsBaseline } from "../utils/settingsConfig";

const baseline: SettingsBaseline = {
  config: [],
  seasonName: "Festival",
  seasonCode: "DP2026",
  seasonEnabled: true,
  payment: { enabled: true, options: { upi: true, cash: true, bankTransfer: true } },
  freeMealEnabled: true,
  mobileEnabled: true,
  foodPriceEnabled: false,
  kidsEnabled: false,
  guestsEnabled: false,
  vendorKidsMealChargingEnabled: true,
  whatsappCountryCode: "91",
  quickCheckoutAutoCloseMs: 3000,
  soundEnabled: true,
  nonAdminCheckoutEnabled: true,
  cheatCodeEnabled: false,
  passcodeDigitCount: 4,
  seasonCompleted: false,
  vendorName: "",
  vendorAddress: "",
  vendorSettledCost: "",
  identity1Enabled: true,
  identity1Name: "Block No",
  identity1Options: [],
  identity2Enabled: true,
  identity2Name: "Flat No",
  footerText: "",
};

describe("buildSettingsConfigPatch", () => {
  it("includes only changed settings and always includes the season key", () => {
    expect(buildSettingsConfigPatch(baseline, {
      ...baseline,
      mobileEnabled: false,
    }, false)).toEqual({
      seasonCode: "DP2026",
      mobileEnabled: false,
    });
  });

  it("updates season enabled and completed values together", () => {
    expect(buildSettingsConfigPatch(baseline, {
      ...baseline,
      seasonEnabled: false,
      seasonCompleted: true,
    }, false)).toEqual({
      seasonCode: "DP2026",
      seasonEnabled: false,
      seasonCompleted: true,
    });
  });
});
