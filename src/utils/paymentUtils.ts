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
  DietaryVariety,
} from "../domain";
import { isParcelEnabled, isKidsParcelEnabled, isDietaryEnabled, isMealEnabled, getMealVarieties, getDietTypeForChoice, getVarietyForChoice } from "../constants";

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
        const varieties = getMealVarieties(mealConf);

        const choice = normalizeChoice(personSlot[mType]);
        if (choice === DietaryOption.NONE) return;

        const diet = getDietTypeForChoice(choice, varieties);
        if (!diet || !isDietaryEnabled(dayId, mType, diet, dayConfig)) return;

        const variety = getVarietyForChoice(choice, varieties);
        const isParcel = toBool(personSlot[`${mType}Parcel` as keyof MealSlot]);
        const isParcelAllowed = isParcel && (isKid
          ? isKidsParcelEnabled(dayId, mType, dayConfig, kidsEnabled)
          : isParcelEnabled(dayId, mType, dayConfig));

        let adultMealPrice: any;
        let kidsMealPrice: any;
        let adultParcelPrice: any;
        let kidsParcelPrice: any;

        if (variety?.id === "veg_default") {
          adultMealPrice = dayMenu?.[mType]?.vegPrice ?? mealConf.vegPrice;
          kidsMealPrice = dayMenu?.[mType]?.kidsVegPrice;
          adultParcelPrice = dayMenu?.[mType]?.vegParcelPrice ?? mealConf.vegParcelPrice;
          kidsParcelPrice = dayMenu?.[mType]?.kidsVegParcelPrice;
        } else if (variety?.id === "nonVeg_default") {
          adultMealPrice = dayMenu?.[mType]?.nonVegPrice ?? mealConf.nonVegPrice;
          kidsMealPrice = dayMenu?.[mType]?.kidsNonVegPrice;
          adultParcelPrice = dayMenu?.[mType]?.nonVegParcelPrice ?? mealConf.nonVegParcelPrice;
          kidsParcelPrice = dayMenu?.[mType]?.kidsNonVegParcelPrice;
        } else if (variety) {
          const varMenu = dayMenu?.[mType]?.varieties?.[variety.id];
          const isVeg = variety.type === DietType.VEG;
          const defaultAdultMeal = isVeg ? (dayMenu?.[mType]?.vegPrice ?? mealConf.vegPrice) : (dayMenu?.[mType]?.nonVegPrice ?? mealConf.nonVegPrice);
          const defaultKidsMeal = isVeg ? dayMenu?.[mType]?.kidsVegPrice : dayMenu?.[mType]?.kidsNonVegPrice;
          const defaultAdultParcel = isVeg ? (dayMenu?.[mType]?.vegParcelPrice ?? mealConf.vegParcelPrice) : (dayMenu?.[mType]?.nonVegParcelPrice ?? mealConf.nonVegParcelPrice);
          const defaultKidsParcel = isVeg ? dayMenu?.[mType]?.kidsVegParcelPrice : dayMenu?.[mType]?.kidsNonVegParcelPrice;

          adultMealPrice = (varMenu?.adultPrice !== undefined && varMenu?.adultPrice !== "") ? varMenu.adultPrice : defaultAdultMeal;
          kidsMealPrice = (varMenu?.kidsPrice !== undefined && varMenu?.kidsPrice !== "") ? varMenu.kidsPrice : defaultKidsMeal;
          adultParcelPrice = (varMenu?.parcelPrice !== undefined && varMenu?.parcelPrice !== "") ? varMenu.parcelPrice : defaultAdultParcel;
          kidsParcelPrice = (varMenu?.kidsParcelPrice !== undefined && varMenu?.kidsParcelPrice !== "") ? varMenu.kidsParcelPrice : defaultKidsParcel;
        } else {
          // Fallback
          const isVeg = diet === DietType.VEG;
          adultMealPrice = isVeg ? (dayMenu?.[mType]?.vegPrice ?? mealConf.vegPrice) : (dayMenu?.[mType]?.nonVegPrice ?? mealConf.nonVegPrice);
          kidsMealPrice = isVeg ? dayMenu?.[mType]?.kidsVegPrice : dayMenu?.[mType]?.kidsNonVegPrice;
          adultParcelPrice = isVeg ? (dayMenu?.[mType]?.vegParcelPrice ?? mealConf.vegParcelPrice) : (dayMenu?.[mType]?.nonVegParcelPrice ?? mealConf.nonVegParcelPrice);
          kidsParcelPrice = isVeg ? dayMenu?.[mType]?.kidsVegParcelPrice : dayMenu?.[mType]?.kidsNonVegParcelPrice;
        }

        const mealPrice = resolvePrice(isKid, kidsMealPrice, adultMealPrice, undefined);
        total += mealPrice;

        if (isParcelAllowed) {
          const parcelPrice = resolvePrice(isKid, kidsParcelPrice, adultParcelPrice, undefined);
          total += parcelPrice;
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
