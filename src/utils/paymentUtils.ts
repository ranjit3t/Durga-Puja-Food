import {
  MealSlot,
  MealType,
  DietaryOption,
  DietType,
  ConfigDay,
  PaymentEntry,
  SubscriptionRecord,
  normalizeChoice,
  toBool,
} from "../domain";
import { isParcelEnabled, isKidsParcelEnabled, isDietaryEnabled, isMealEnabled } from "../constants";

export interface DiscrepancyItem {
  id: string;
  block: string;
  flat: string;
  peopleCount: number;
  kidsCount: number;
  paidAmount: number;
  calculatedAmount: number;
  difference: number; // paidAmount - calculatedAmount
  payments: PaymentEntry[];
}

/**
 * Resolves a price value strictly per headcount category:
 * - Kids strictly resolve from kidVal; if kidVal is omitted/invalid, price is 0 (no fallback to adult).
 * - Adults strictly resolve from adultVal, falling back to day config default (confVal).
 */
export function resolvePrice(
  isKid: boolean,
  kidVal: any,
  adultVal: any,
  confVal: any
): number {
  if (isKid) {
    if (kidVal !== undefined && kidVal !== null && kidVal !== '' && !isNaN(Number(kidVal))) {
      return Number(kidVal);
    }
    return 0;
  }

  if (adultVal !== undefined && adultVal !== null && adultVal !== '' && !isNaN(Number(adultVal))) {
    return Number(adultVal);
  }
  if (confVal !== undefined && confVal !== null && confVal !== '' && !isNaN(Number(confVal))) {
    return Number(confVal);
  }
  return 0;
}

/**
 * Calculates the expected total subscription cost for a pass based on configured
 * food menu pricing, day configurations, and headcounts.
 */
export function calculateSubscriptionAmount(
  mealSlots: Record<string, MealSlot[]>,
  peopleCount: number,
  _kidsCount: number,
  foodMenu: Record<string, any>,
  dayConfig: any[],
  kidsEnabled: boolean
): number {
  let total = 0;
  const dayIds = Object.keys(mealSlots || {});

  dayIds.forEach((dayId) => {
    const dayConf = dayConfig.find((d) => d.id === dayId);
    if (!dayConf || !dayConf.enabled) return;

    const dayMenu = foodMenu?.[dayId];
    const slots = mealSlots[dayId] || [];

    slots.forEach((personSlot, index) => {
      const isKid = kidsEnabled && index >= peopleCount;

      const mealTypes = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];
      mealTypes.forEach((mType) => {
        if (!isMealEnabled(dayId, mType, dayConfig)) return;
        const mealConf = dayConf[mType];

        const choice = normalizeChoice(personSlot[mType]);
        if (choice === DietaryOption.NONE) return;

        const diet = choice === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
        if (!isDietaryEnabled(dayId, mType, diet, dayConfig)) return;

        const isParcel = toBool(personSlot[`${mType}Parcel` as keyof MealSlot]);
        const isParcelAllowed = isParcel && (isKid
          ? isKidsParcelEnabled(dayId, mType, dayConfig, kidsEnabled)
          : isParcelEnabled(dayId, mType, dayConfig));

        if (choice === DietaryOption.VEG) {
          // Veg Meal Price
          const mealPrice = resolvePrice(
            isKid,
            dayMenu?.[mType]?.kidsVegPrice,
            dayMenu?.[mType]?.vegPrice,
            mealConf.vegPrice
          );
          total += mealPrice;

          // Veg Parcel Price
          if (isParcelAllowed) {
            const parcelPrice = resolvePrice(
              isKid,
              dayMenu?.[mType]?.kidsVegParcelPrice,
              dayMenu?.[mType]?.vegParcelPrice,
              mealConf.vegParcelPrice
            );
            total += parcelPrice;
          }
        } else if (choice === DietaryOption.NON_VEG) {
          // Non-Veg Meal Price
          const mealPrice = resolvePrice(
            isKid,
            dayMenu?.[mType]?.kidsNonVegPrice,
            dayMenu?.[mType]?.nonVegPrice,
            mealConf.nonVegPrice
          );
          total += mealPrice;

          // Non-Veg Parcel Price
          if (isParcelAllowed) {
            const parcelPrice = resolvePrice(
              isKid,
              dayMenu?.[mType]?.kidsNonVegParcelPrice,
              dayMenu?.[mType]?.nonVegParcelPrice,
              mealConf.nonVegParcelPrice
            );
            total += parcelPrice;
          }
        }
      });
    });
  });

  return total;
}

/**
 * Calculates the actual total paid amount for a subscription pass.
 */
export function calculatePaidAmount(sub: { payments?: PaymentEntry[]; amount?: string }): number {
  if (sub.payments && sub.payments.length > 0) {
    return sub.payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
  }
  return parseFloat(sub.amount || "0") || 0;
}

/**
 * Identifies all subscriptions where paid amount and calculated meal amount do not match.
 */
export function getAmountDiscrepancyData(
  subscriptions: SubscriptionRecord[],
  foodMenu: Record<string, any>,
  dayConfig: ConfigDay[],
  kidsEnabled: boolean
): DiscrepancyItem[] {
  return subscriptions
    .map((sub) => {
      const paidAmount = calculatePaidAmount(sub);
      const calculatedAmount = calculateSubscriptionAmount(
        sub.mealSlots,
        sub.peopleCount,
        sub.kidsCount || 0,
        foodMenu,
        dayConfig,
        kidsEnabled
      );
      const difference = Math.round((paidAmount - calculatedAmount) * 100) / 100;

      return {
        id: sub.id,
        block: sub.block,
        flat: sub.flat,
        peopleCount: sub.peopleCount || 0,
        kidsCount: sub.kidsCount || 0,
        paidAmount,
        calculatedAmount,
        difference,
        payments: sub.payments || [],
      };
    })
    .filter((item) => Math.abs(item.difference) > 0.01)
    .sort(
      (a, b) =>
        (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: "base" }) ||
        (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: "base" })
    );
}
