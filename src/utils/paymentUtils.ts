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
  FoodPackage,
  AppliedPackageInfo,
  PackageMealItem,
} from "../domain";
import { isParcelEnabled, isKidsParcelEnabled, isDietaryEnabled, isMealEnabled, getMealVarieties, getDietTypeForChoice, getVarietyForChoice, isGuestsParcelEnabled } from "../constants";

export interface DiscrepancyItem {
  id: string;
  block: string;
  flat: string;
  peopleCount: number;
  kidsCount: number;
  guestsCount?: number;
  paidAmount: number;
  calculatedAmount: number;
  difference: number; // paidAmount - calculatedAmount
  payments: PaymentEntry[];
}

export interface PersonCostBreakdown {
  totalMealPrice: number;
  totalParcelPrice: number;
  totalPersonPrice: number;
  mealPricesMap: Record<string, Record<string, number>>; // dayId -> mealType -> mealPrice
}

export interface ApplicablePackageEvaluation {
  packageId: string;
  packageName: string;
  packageDescription: string;
  applicability: string;
  packagePrice: number;
  packageMealsNormalPrice: number;
  normalTotalMealPrice: number;
  totalParcelPrice: number;
  normalTotalPrice: number;
  priceWithPackage: number;
  savings: number;
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

export function resolveGuestPrice(
  guestVal: any,
  adultVal: any,
  confVal: any
): number {
  if (guestVal !== undefined && guestVal !== null && guestVal !== '' && !isNaN(Number(guestVal))) {
    return Number(guestVal);
  }
  return 0;
}

/**
 * Resolves the price for a specific meal dietary variety / sub-category.
 */
export function resolveVarietyPrice(
  dayId: string,
  mType: MealType,
  varietyId: string,
  isKid: boolean,
  isGuest: boolean,
  applicability: string,
  dayConfig: any[],
  foodMenu: Record<string, any>
): number {
  const dayConf = dayConfig.find((d) => d.id === dayId);
  const mealConf = dayConf ? dayConf[mType] : null;
  const dayMenu = foodMenu?.[dayId]?.[mType];
  const varieties = getMealVarieties(mealConf);
  const variety = varieties.find((v) => v.id === varietyId);

  let adultMealPrice: any;
  let kidsMealPrice: any;
  let guestsMealPrice: any;

  if (variety?.id === "veg_default") {
    adultMealPrice = dayMenu?.vegPrice ?? mealConf?.vegPrice;
    kidsMealPrice = dayMenu?.kidsVegPrice;
    guestsMealPrice = dayMenu?.guestsVegPrice;
  } else if (variety?.id === "nonVeg_default") {
    adultMealPrice = dayMenu?.nonVegPrice ?? mealConf?.nonVegPrice;
    kidsMealPrice = dayMenu?.kidsNonVegPrice;
    guestsMealPrice = dayMenu?.guestsNonVegPrice;
  } else if (variety) {
    const varMenu = dayMenu?.varieties?.[variety.id];
    const isVeg = variety.type === DietType.VEG;
    const defaultAdultMeal = isVeg ? (dayMenu?.vegPrice ?? mealConf?.vegPrice) : (dayMenu?.nonVegPrice ?? mealConf?.nonVegPrice);
    const defaultKidsMeal = isVeg ? dayMenu?.kidsVegPrice : dayMenu?.kidsNonVegPrice;
    const defaultGuestsMeal = isVeg ? dayMenu?.guestsVegPrice : dayMenu?.guestsNonVegPrice;

    adultMealPrice = (varMenu?.adultPrice !== undefined && varMenu?.adultPrice !== "") ? varMenu.adultPrice : defaultAdultMeal;
    kidsMealPrice = (varMenu?.kidsPrice !== undefined && varMenu?.kidsPrice !== "") ? varMenu.kidsPrice : defaultKidsMeal;
    guestsMealPrice = (varMenu?.guestsVegPrice !== undefined && varMenu?.guestsVegPrice !== "") ? varMenu.guestsVegPrice :
                      (varMenu?.guestsNonVegPrice !== undefined && varMenu?.guestsNonVegPrice !== "") ? varMenu.guestsNonVegPrice :
                      (varMenu?.guestPrice !== undefined && varMenu?.guestPrice !== "") ? varMenu.guestPrice : defaultGuestsMeal;
  } else {
    adultMealPrice = dayMenu?.vegPrice ?? mealConf?.vegPrice;
    kidsMealPrice = dayMenu?.kidsVegPrice;
    guestsMealPrice = dayMenu?.guestsVegPrice;
  }

  if (isGuest) {
    return resolveGuestPrice(guestsMealPrice, adultMealPrice, undefined);
  }
  const shouldUseKidPrice = isKid || applicability === "kids";
  return resolvePrice(shouldUseKidPrice, kidsMealPrice, adultMealPrice, undefined);
}

/**
 * Calculates normal meal cost and parcel cost breakdown for a single person index.
 */
export function calculatePersonMealAndParcelCost(
  personIndex: number,
  mealSlots: Record<string, MealSlot[]>,
  isKid: boolean,
  foodMenu: Record<string, any>,
  dayConfig: any[],
  kidsEnabled: boolean,
  isGuest: boolean = false,
  guestsEnabled: boolean = false
): PersonCostBreakdown {
  let totalMealPrice = 0;
  let totalParcelPrice = 0;
  const mealPricesMap: Record<string, Record<string, number>> = {};

  const dayIds = Object.keys(mealSlots || {});

  dayIds.forEach((dayId) => {
    const dayConf = dayConfig.find((d) => d.id === dayId);
    if (!dayConf || !dayConf.enabled) return;

    const dayMenu = foodMenu?.[dayId];
    const slots = mealSlots[dayId] || [];
    const personSlot = slots[personIndex];
    if (!personSlot) return;

    mealPricesMap[dayId] = mealPricesMap[dayId] || {};

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
      const isParcelAllowed = isParcel && (isGuest
        ? isGuestsParcelEnabled(dayId, mType, dayConfig, guestsEnabled)
        : isKid
        ? isKidsParcelEnabled(dayId, mType, dayConfig, kidsEnabled)
        : isParcelEnabled(dayId, mType, dayConfig));

      let adultMealPrice: any;
      let kidsMealPrice: any;
      let guestsMealPrice: any;
      let adultParcelPrice: any;
      let kidsParcelPrice: any;
      let guestsParcelPrice: any;

      if (variety?.id === "veg_default") {
        adultMealPrice = dayMenu?.[mType]?.vegPrice ?? mealConf.vegPrice;
        kidsMealPrice = dayMenu?.[mType]?.kidsVegPrice;
        guestsMealPrice = dayMenu?.[mType]?.guestsVegPrice;
        adultParcelPrice = dayMenu?.[mType]?.vegParcelPrice ?? mealConf.vegParcelPrice;
        kidsParcelPrice = dayMenu?.[mType]?.kidsVegParcelPrice;
        guestsParcelPrice = dayMenu?.[mType]?.guestsVegParcelPrice;
      } else if (variety?.id === "nonVeg_default") {
        adultMealPrice = dayMenu?.[mType]?.nonVegPrice ?? mealConf.nonVegPrice;
        kidsMealPrice = dayMenu?.[mType]?.kidsNonVegPrice;
        guestsMealPrice = dayMenu?.[mType]?.guestsNonVegPrice;
        adultParcelPrice = dayMenu?.[mType]?.vegParcelPrice ?? mealConf.vegParcelPrice;
        kidsParcelPrice = dayMenu?.[mType]?.kidsNonVegParcelPrice;
        guestsParcelPrice = dayMenu?.[mType]?.guestsNonVegParcelPrice;
      } else if (variety) {
        const varMenu = dayMenu?.[mType]?.varieties?.[variety.id];
        const isVeg = variety.type === DietType.VEG;
        const defaultAdultMeal = isVeg ? (dayMenu?.[mType]?.vegPrice ?? mealConf.vegPrice) : (dayMenu?.[mType]?.nonVegPrice ?? mealConf.nonVegPrice);
        const defaultKidsMeal = isVeg ? dayMenu?.[mType]?.kidsVegPrice : dayMenu?.[mType]?.kidsNonVegPrice;
        const defaultGuestsMeal = isVeg ? dayMenu?.[mType]?.guestsVegPrice : dayMenu?.[mType]?.guestsNonVegPrice;
        const defaultAdultParcel = isVeg ? (dayMenu?.[mType]?.vegParcelPrice ?? mealConf.vegParcelPrice) : (dayMenu?.[mType]?.nonVegParcelPrice ?? mealConf.nonVegParcelPrice);
        const defaultKidsParcel = isVeg ? dayMenu?.[mType]?.kidsVegParcelPrice : dayMenu?.[mType]?.kidsNonVegParcelPrice;
        const defaultGuestsParcel = isVeg ? dayMenu?.[mType]?.guestsVegParcelPrice : dayMenu?.[mType]?.guestsNonVegParcelPrice;

        adultMealPrice = (varMenu?.adultPrice !== undefined && varMenu?.adultPrice !== "") ? varMenu.adultPrice : defaultAdultMeal;
        kidsMealPrice = (varMenu?.kidsPrice !== undefined && varMenu?.kidsPrice !== "") ? varMenu.kidsPrice : defaultKidsMeal;
        guestsMealPrice = (varMenu?.guestsVegPrice !== undefined && varMenu?.guestsVegPrice !== "") ? varMenu.guestsVegPrice :
                          (varMenu?.guestsNonVegPrice !== undefined && varMenu?.guestsNonVegPrice !== "") ? varMenu.guestsNonVegPrice :
                          (varMenu?.guestPrice !== undefined && varMenu?.guestPrice !== "") ? varMenu.guestPrice : defaultGuestsMeal;
        adultParcelPrice = (varMenu?.parcelPrice !== undefined && varMenu?.parcelPrice !== "") ? varMenu.parcelPrice : defaultAdultParcel;
        kidsParcelPrice = (varMenu?.kidsParcelPrice !== undefined && varMenu?.kidsParcelPrice !== "") ? varMenu.kidsParcelPrice : defaultKidsParcel;
        guestsParcelPrice = (varMenu?.guestsParcelPrice !== undefined && varMenu?.guestsParcelPrice !== "") ? varMenu.guestsParcelPrice :
                            (varMenu?.guestParcelPrice !== undefined && varMenu?.guestParcelPrice !== "") ? varMenu.guestParcelPrice : defaultGuestsParcel;
      } else {
        const isVeg = diet === DietType.VEG;
        adultMealPrice = isVeg ? (dayMenu?.[mType]?.vegPrice ?? mealConf.vegPrice) : (dayMenu?.[mType]?.nonVegPrice ?? mealConf.nonVegPrice);
        kidsMealPrice = isVeg ? dayMenu?.[mType]?.kidsVegPrice : dayMenu?.[mType]?.kidsNonVegPrice;
        guestsMealPrice = isVeg ? dayMenu?.[mType]?.guestsVegPrice : dayMenu?.[mType]?.guestsNonVegPrice;
        adultParcelPrice = isVeg ? (dayMenu?.[mType]?.vegParcelPrice ?? mealConf.vegParcelPrice) : (dayMenu?.[mType]?.nonVegParcelPrice ?? mealConf.nonVegParcelPrice);
        kidsParcelPrice = isVeg ? dayMenu?.[mType]?.kidsVegParcelPrice : dayMenu?.[mType]?.kidsNonVegParcelPrice;
        guestsParcelPrice = isVeg ? dayMenu?.[mType]?.guestsVegParcelPrice : dayMenu?.[mType]?.guestsNonVegParcelPrice;
      }

      const mealPrice = isGuest
        ? resolveGuestPrice(guestsMealPrice, adultMealPrice, undefined)
        : resolvePrice(isKid, kidsMealPrice, adultMealPrice, undefined);
      totalMealPrice += mealPrice;
      mealPricesMap[dayId][mType] = mealPrice;

      if (isParcelAllowed) {
        const parcelPrice = isGuest
          ? resolveGuestPrice(guestsParcelPrice, adultParcelPrice, undefined)
          : resolvePrice(isKid, kidsParcelPrice, adultParcelPrice, undefined);
        totalParcelPrice += parcelPrice;
      }
    });
  });

  return {
    totalMealPrice,
    totalParcelPrice,
    totalPersonPrice: totalMealPrice + totalParcelPrice,
    mealPricesMap,
  };
}

/**
 * Calculates the expected total subscription cost for a pass based on configured
 * food menu pricing, day configurations, and headcounts.
 */
export function calculateSubscriptionAmount(
  mealSlots: Record<string, MealSlot[]>,
  peopleCount: number,
  kidsCount: number,
  foodMenu: Record<string, any>,
  dayConfig: any[],
  kidsEnabled: boolean,
  guestsCount: number = 0,
  guestsEnabled: boolean = false
): number {
  let total = 0;
  const kCount = kidsEnabled ? (kidsCount || 0) : 0;
  const gCount = guestsEnabled ? (guestsCount || 0) : 0;
  const totalPeople = (peopleCount || 0) + kCount + gCount;

  for (let i = 0; i < totalPeople; i++) {
    const isKid = kidsEnabled && i >= peopleCount && i < peopleCount + kCount;
    const isGuest = guestsEnabled && i >= peopleCount + kCount;
    const cost = calculatePersonMealAndParcelCost(i, mealSlots, isKid, foodMenu, dayConfig, kidsEnabled, isGuest, guestsEnabled);
    total += cost.totalPersonPrice;
  }

  return total;
}

/**
 * Evaluates enabled packages for a single person to determine which packages match
 * the person's category and selected meals (including percentage flat discounts and min cart value), and calculates savings.
 */
export function findApplicablePackagesForPerson(
  personIndex: number,
  mealSlots: Record<string, MealSlot[]>,
  isKid: boolean,
  foodPackages: FoodPackage[],
  foodMenu: Record<string, any>,
  dayConfig: any[],
  kidsEnabled: boolean,
  isGuest: boolean = false,
  guestsEnabled: boolean = false
): ApplicablePackageEvaluation[] {
  if (!foodPackages || foodPackages.length === 0) return [];

  const personCost = calculatePersonMealAndParcelCost(personIndex, mealSlots, isKid, foodMenu, dayConfig, kidsEnabled, isGuest, guestsEnabled);
  const applicableList: ApplicablePackageEvaluation[] = [];

  foodPackages.forEach((pkg) => {
    if (!pkg.enabled) return;

    if (pkg.applicability === "adult" && (isKid || isGuest)) return;
    if (pkg.applicability === "kids" && !isKid) return;
    if (pkg.applicability === "guests" && !isGuest) return;

    const isFlatDiscount = pkg.discountType === "flat_discount" || pkg.discountRate !== undefined;

    if (isFlatDiscount) {
      const mealItemsMap = pkg.selectedMealItems || {};
      const legacyMealsMap = pkg.selectedMeals || {};
      const pkgDays = Object.keys(mealItemsMap).length > 0 ? Object.keys(mealItemsMap) : Object.keys(legacyMealsMap);

      if (pkgDays.length > 0) {
        // Meal-specific percentage flat discount
        let coversAllPackageMeals = true;
        let packageMealsNormalPrice = 0;

        for (const dayId of pkgDays) {
          const mealItems: PackageMealItem[] = mealItemsMap[dayId] || (legacyMealsMap[dayId] || []).map((m: any) => ({ mealType: m, varietyId: "" }));
          if (mealItems.length === 0) continue;

          const personDaySlots = mealSlots[dayId]?.[personIndex];
          if (!personDaySlots) {
            coversAllPackageMeals = false;
            break;
          }

          for (const item of mealItems) {
            const mType = item.mealType;
            const targetVarietyId = item.varietyId;

            const choice = normalizeChoice(personDaySlots[mType]);
            if (choice === DietaryOption.NONE) {
              coversAllPackageMeals = false;
              break;
            }

            const mealConf = dayConfig.find((d) => d.id === dayId)?.[mType];
            const varieties = getMealVarieties(mealConf);
            const personVariety = getVarietyForChoice(choice, varieties);

            if (targetVarietyId && targetVarietyId !== "" && personVariety?.id !== targetVarietyId) {
              coversAllPackageMeals = false;
              break;
            }

            const slotNormalMealPrice = personCost.mealPricesMap[dayId]?.[mType] || 0;
            packageMealsNormalPrice += slotNormalMealPrice;
          }

          if (!coversAllPackageMeals) break;
        }

        if (!coversAllPackageMeals) return;

        const minCart = pkg.minCartValue ?? 0;
        if (packageMealsNormalPrice < minCart) return;

        const discountPercent = Math.min(100, Math.max(0, pkg.discountRate ?? 0));
        const effectiveDiscount = (packageMealsNormalPrice * discountPercent) / 100;
        const discountedMealsPrice = Math.max(0, packageMealsNormalPrice - effectiveDiscount);
        const priceWithPackage = (personCost.totalMealPrice - packageMealsNormalPrice + discountedMealsPrice) + personCost.totalParcelPrice;
        const savings = Math.round((personCost.totalPersonPrice - priceWithPackage) * 100) / 100;

        if (savings > 0) {
          applicableList.push({
            packageId: pkg.id,
            packageName: pkg.name,
            packageDescription: pkg.description,
            applicability: pkg.applicability,
            packagePrice: Math.round(discountedMealsPrice * 100) / 100,
            packageMealsNormalPrice,
            normalTotalMealPrice: personCost.totalMealPrice,
            totalParcelPrice: personCost.totalParcelPrice,
            normalTotalPrice: personCost.totalPersonPrice,
            priceWithPackage: Math.round(priceWithPackage * 100) / 100,
            savings,
          });
        }
      } else {
        // All-meal percentage flat discount
        const totalMealPrice = personCost.totalMealPrice;
        const minCart = pkg.minCartValue ?? 0;
        if (totalMealPrice < minCart) return;

        const discountPercent = Math.min(100, Math.max(0, pkg.discountRate ?? 0));
        const effectiveDiscount = (totalMealPrice * discountPercent) / 100;
        const discountedMealsPrice = Math.max(0, totalMealPrice - effectiveDiscount);
        const priceWithPackage = discountedMealsPrice + personCost.totalParcelPrice;
        const savings = Math.round((personCost.totalPersonPrice - priceWithPackage) * 100) / 100;

        if (savings > 0) {
          applicableList.push({
            packageId: pkg.id,
            packageName: pkg.name,
            packageDescription: pkg.description,
            applicability: pkg.applicability,
            packagePrice: Math.round(discountedMealsPrice * 100) / 100,
            packageMealsNormalPrice: totalMealPrice,
            normalTotalMealPrice: totalMealPrice,
            totalParcelPrice: personCost.totalParcelPrice,
            normalTotalPrice: personCost.totalPersonPrice,
            priceWithPackage: Math.round(priceWithPackage * 100) / 100,
            savings,
          });
        }
      }
    } else {
      // Meal-based package (fixed package price)
      const mealItemsMap = pkg.selectedMealItems || {};
      const legacyMealsMap = pkg.selectedMeals || {};
      const pkgDays = Object.keys(mealItemsMap).length > 0 ? Object.keys(mealItemsMap) : Object.keys(legacyMealsMap);
      if (pkgDays.length === 0) return;

      let coversAllPackageMeals = true;
      let packageMealsNormalPrice = 0;

      for (const dayId of pkgDays) {
        const mealItems: PackageMealItem[] = mealItemsMap[dayId] || (legacyMealsMap[dayId] || []).map((m: any) => ({ mealType: m, varietyId: "" }));
        if (mealItems.length === 0) continue;

        const personDaySlots = mealSlots[dayId]?.[personIndex];
        if (!personDaySlots) {
          coversAllPackageMeals = false;
          break;
        }

        for (const item of mealItems) {
          const mType = item.mealType;
          const targetVarietyId = item.varietyId;

          const choice = normalizeChoice(personDaySlots[mType]);
          if (choice === DietaryOption.NONE) {
            coversAllPackageMeals = false;
            break;
          }

          const mealConf = dayConfig.find((d) => d.id === dayId)?.[mType];
          const varieties = getMealVarieties(mealConf);
          const personVariety = getVarietyForChoice(choice, varieties);

          if (targetVarietyId && targetVarietyId !== "" && personVariety?.id !== targetVarietyId) {
            coversAllPackageMeals = false;
            break;
          }

          const slotNormalMealPrice = personCost.mealPricesMap[dayId]?.[mType] || 0;
          packageMealsNormalPrice += slotNormalMealPrice;
        }

        if (!coversAllPackageMeals) break;
      }

      if (!coversAllPackageMeals) return;

      const normalTotalMealPrice = personCost.totalMealPrice;
      const totalParcelPrice = personCost.totalParcelPrice;
      const normalTotalPrice = personCost.totalPersonPrice;

      const pkgPrice = pkg.packagePrice ?? 0;
      const priceWithPackage = (normalTotalMealPrice - packageMealsNormalPrice + pkgPrice) + totalParcelPrice;
      const savings = Math.round((normalTotalPrice - priceWithPackage) * 100) / 100;

      if (savings > 0 || priceWithPackage < normalTotalPrice) {
        applicableList.push({
          packageId: pkg.id,
          packageName: pkg.name,
          packageDescription: pkg.description,
          applicability: pkg.applicability,
          packagePrice: pkgPrice,
          packageMealsNormalPrice,
          normalTotalMealPrice,
          totalParcelPrice,
          normalTotalPrice,
          priceWithPackage: Math.round(priceWithPackage * 100) / 100,
          savings,
        });
      }
    }
  });

  return applicableList.sort((a, b) => b.savings - a.savings);
}

/**
 * Calculates total subscription amount for a pass considering per-person applied packages (meal packages or percentage flat discounts).
 */
export function calculatePassTotalWithPackages(
  mealSlots: Record<string, MealSlot[]>,
  peopleCount: number,
  kidsCount: number,
  appliedPackages: Record<number, AppliedPackageInfo> | undefined,
  foodPackages: FoodPackage[],
  foodMenu: Record<string, any>,
  dayConfig: any[],
  kidsEnabled: boolean,
  guestsCount: number = 0,
  guestsEnabled: boolean = false
): number {
  let totalPassPrice = 0;
  const kCount = kidsEnabled ? (kidsCount || 0) : 0;
  const gCount = guestsEnabled ? (guestsCount || 0) : 0;
  const totalPeople = (peopleCount || 0) + kCount + gCount;

  for (let i = 0; i < totalPeople; i++) {
    const isKid = kidsEnabled && i >= peopleCount && i < peopleCount + kCount;
    const isGuest = guestsEnabled && i >= peopleCount + kCount;
    const personCost = calculatePersonMealAndParcelCost(i, mealSlots, isKid, foodMenu, dayConfig, kidsEnabled, isGuest, guestsEnabled);

    const appliedInfo = appliedPackages?.[i];
    if (appliedInfo) {
      const pkg = foodPackages.find((p) => p.id === appliedInfo.packageId);
      if (pkg) {
        const isFlatDiscount = pkg.discountType === "flat_discount" || pkg.discountRate !== undefined;

        if (isFlatDiscount) {
          const mealItemsMap = pkg.selectedMealItems || {};
          const legacyMealsMap = pkg.selectedMeals || {};
          const pkgDays = Object.keys(mealItemsMap).length > 0 ? Object.keys(mealItemsMap) : Object.keys(legacyMealsMap);

          if (pkgDays.length > 0) {
            let packageMealsNormalPrice = 0;
            pkgDays.forEach((dayId) => {
              const mealItems: PackageMealItem[] = mealItemsMap[dayId] || (legacyMealsMap[dayId] || []).map((m: any) => ({ mealType: m, varietyId: "" }));
              mealItems.forEach((item) => {
                const slotNormalMealPrice = personCost.mealPricesMap[dayId]?.[item.mealType] || 0;
                packageMealsNormalPrice += slotNormalMealPrice;
              });
            });
            const discountPercent = Math.min(100, Math.max(0, pkg.discountRate ?? 0));
            const effectiveDiscount = (packageMealsNormalPrice * discountPercent) / 100;
            const discountedMealsPrice = Math.max(0, packageMealsNormalPrice - effectiveDiscount);
            const personPriceWithPkg = (personCost.totalMealPrice - packageMealsNormalPrice + discountedMealsPrice) + personCost.totalParcelPrice;
            totalPassPrice += Math.max(0, personPriceWithPkg);
            continue;
          } else {
            const totalMealPrice = personCost.totalMealPrice;
            const discountPercent = Math.min(100, Math.max(0, pkg.discountRate ?? 0));
            const effectiveDiscount = (totalMealPrice * discountPercent) / 100;
            const discountedMealsPrice = Math.max(0, totalMealPrice - effectiveDiscount);
            const personPriceWithPkg = discountedMealsPrice + personCost.totalParcelPrice;
            totalPassPrice += Math.max(0, personPriceWithPkg);
            continue;
          }
        } else {
          let packageMealsNormalPrice = 0;
          const mealItemsMap = pkg.selectedMealItems || {};
          const legacyMealsMap = pkg.selectedMeals || {};
          const pkgDays = Object.keys(mealItemsMap).length > 0 ? Object.keys(mealItemsMap) : Object.keys(legacyMealsMap);

          pkgDays.forEach((dayId) => {
            const mealItems: PackageMealItem[] = mealItemsMap[dayId] || (legacyMealsMap[dayId] || []).map((m: any) => ({ mealType: m, varietyId: "" }));
            mealItems.forEach((item) => {
              const slotNormalMealPrice = personCost.mealPricesMap[dayId]?.[item.mealType] || 0;
              packageMealsNormalPrice += slotNormalMealPrice;
            });
          });

          const pkgPrice = pkg.packagePrice ?? 0;
          const personPriceWithPkg = (personCost.totalMealPrice - packageMealsNormalPrice + pkgPrice) + personCost.totalParcelPrice;
          totalPassPrice += Math.max(0, personPriceWithPkg);
          continue;
        }
      }
    }

    totalPassPrice += personCost.totalPersonPrice;
  }

  return totalPassPrice;
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
 * Automatically excludes passes where a food package discount has been applied.
 */
export function getAmountDiscrepancyData(
  subscriptions: SubscriptionRecord[],
  foodMenu: Record<string, any>,
  dayConfig: ConfigDay[],
  kidsEnabled: boolean,
  guestsEnabled: boolean = false
): DiscrepancyItem[] {
  return subscriptions
    .filter((sub) => !sub.isPackageApplied)
    .map((sub) => {
      const paidAmount = calculatePaidAmount(sub);
      const calculatedAmount = calculateSubscriptionAmount(
        sub.mealSlots,
        sub.peopleCount,
        sub.kidsCount || 0,
        foodMenu,
        dayConfig,
        kidsEnabled,
        sub.guestsCount || 0,
        guestsEnabled
      );
      const difference = Math.round((paidAmount - calculatedAmount) * 100) / 100;

      return {
        id: sub.id,
        block: sub.block,
        flat: sub.flat,
        peopleCount: sub.peopleCount || 0,
        kidsCount: sub.kidsCount || 0,
        guestsCount: sub.guestsCount || 0,
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

export function formatCurrencyAmount(num: number): string {
  if (isNaN(num)) return "0";
  return num % 1 !== 0 ? num.toFixed(2) : num.toFixed(0);
}
