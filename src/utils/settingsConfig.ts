import type { AppConfig, ConfigDay, PaymentConfig } from "../domain";

export type SettingsBaseline = {
  config: ConfigDay[];
  seasonName: string;
  seasonCode: string;
  seasonEnabled: boolean;
  payment: PaymentConfig;
  freeMealEnabled: boolean;
  mobileEnabled: boolean;
  foodPriceEnabled: boolean;
  kidsEnabled: boolean;
  guestsEnabled: boolean;
  vendorKidsMealChargingEnabled: boolean;
  whatsappCountryCode: string;
  quickCheckoutAutoCloseMs: number;
  soundEnabled: boolean;
  nonAdminCheckoutEnabled: boolean;
  cheatCodeEnabled: boolean;
  passcodeDigitCount: number;
  seasonCompleted: boolean;
  vendorName: string;
  vendorAddress: string;
  vendorSettledCost: string;
  identity1Enabled: boolean;
  identity1Name: string;
  identity1Options: string[];
  identity2Enabled: boolean;
  identity2Name: string;
  footerText: string;
};

type SettingsConfigMappers = {
  [Key in keyof AppConfig]?: (baseline: SettingsBaseline) => AppConfig[Key];
};

const configMappers = {
  days: (baseline) => baseline.config,
  seasonName: (baseline) => baseline.seasonName,
  payment: (baseline) => baseline.payment,
  freeMealEnabled: (baseline) => baseline.freeMealEnabled,
  mobileEnabled: (baseline) => baseline.mobileEnabled,
  foodPriceEnabled: (baseline) => baseline.foodPriceEnabled,
  kidsEnabled: (baseline) => baseline.kidsEnabled,
  guestsEnabled: (baseline) => baseline.guestsEnabled,
  vendorKidsMealChargingEnabled: (baseline) => baseline.vendorKidsMealChargingEnabled,
  whatsappCountryCode: (baseline) => baseline.whatsappCountryCode,
  quickCheckoutAutoCloseMs: (baseline) => baseline.quickCheckoutAutoCloseMs,
  soundEnabled: (baseline) => baseline.soundEnabled,
  nonAdminCheckoutEnabled: (baseline) => baseline.nonAdminCheckoutEnabled,
  cheatCodeEnabled: (baseline) => baseline.cheatCodeEnabled,
  passcodeDigitCount: (baseline) => baseline.passcodeDigitCount,
  vendorName: (baseline) => baseline.vendorName,
  vendorAddress: (baseline) => baseline.vendorAddress,
  vendorSettledCost: (baseline) => baseline.vendorSettledCost,
  identity1Enabled: (baseline) => baseline.identity1Enabled,
  identity1Name: (baseline) => baseline.identity1Name,
  identity1Options: (baseline) => baseline.identity1Options,
  identity2Enabled: (baseline) => baseline.identity2Enabled,
  identity2Name: (baseline) => baseline.identity2Name,
  footerText: (baseline) => baseline.footerText,
} satisfies SettingsConfigMappers;

function setConfigValue<Key extends keyof AppConfig>(
  config: Partial<AppConfig>,
  key: Key,
  value: AppConfig[Key],
) {
  config[key] = value;
}

export function buildSettingsConfigPatch(
  previous: SettingsBaseline | null,
  current: SettingsBaseline,
  areAllMealsDone: boolean,
): Partial<AppConfig> {
  const patch: Partial<AppConfig> = { seasonCode: current.seasonCode };

  for (const key of Object.keys(configMappers) as Array<keyof typeof configMappers>) {
    if (key === "vendorSettledCost" && (!previous || !areAllMealsDone)) continue;

    const getValue = configMappers[key];
    if (!getValue) continue;

    const nextValue = getValue(current);
    const previousValue = previous ? getValue(previous) : undefined;
    if (!previous || JSON.stringify(previousValue) !== JSON.stringify(nextValue)) {
      setConfigValue(patch, key, nextValue);
    }
  }

  if (
    !previous ||
    previous.seasonEnabled !== current.seasonEnabled ||
    previous.seasonCompleted !== current.seasonCompleted
  ) {
    patch.seasonEnabled = current.seasonEnabled;
    patch.seasonCompleted = current.seasonCompleted;
  }

  return patch;
}
