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
  FoodMenu,
} from "../domain";
import { isParcelEnabled, isKidsParcelEnabled, isDietaryEnabled, isMealEnabled, getMealVarieties, getDietTypeForChoice, getVarietyForChoice, isGuestsParcelEnabled, getMealFreeMealCounts } from "../constants";

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
  if (adultVal !== undefined && adultVal !== null && adultVal !== '' && !isNaN(Number(adultVal))) {
    return Number(adultVal);
  }
  if (confVal !== undefined && confVal !== null && confVal !== '' && !isNaN(Number(confVal))) {
    return Number(confVal);
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
  isKid: boolean = false,
  isGuest: boolean = false,
  applicability: string = "member",
  dayConfig: any[] = [],
  foodMenu: Record<string, any> = {}
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
        adultParcelPrice = dayMenu?.[mType]?.nonVegParcelPrice ?? mealConf.nonVegParcelPrice;
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
 * Computes exact discrepancy detail (type and amount) comparing paid vs calculated amounts.
 */
export function getDiscrepancyDetail(paidAmount: number, calculatedAmount: number): {
  hasDiscrepancy: boolean;
  type: "deficiency" | "excess" | "none";
  amount: number;
} {
  const difference = Math.round((paidAmount - calculatedAmount) * 100) / 100;
  if (Math.abs(difference) <= 0.01) {
    return { hasDiscrepancy: false, type: "none", amount: 0 };
  }
  if (difference < 0) {
    return { hasDiscrepancy: true, type: "deficiency", amount: Math.abs(difference) };
  } else {
    return { hasDiscrepancy: true, type: "excess", amount: difference };
  }
}

/**
 * Calculates exact amount discrepancy (paid vs calculated) for a single subscription pass.
 * Shared directly across Amount Discrepancy reports, View Pass, Edit Pass, and Directory Filters.
 */
export function calculatePassDiscrepancy(
  sub: {
    mealSlots: Record<string, MealSlot[]>;
    peopleCount: number;
    kidsCount?: number;
    guestsCount?: number;
    payments?: PaymentEntry[];
    amount?: string;
    isPackageApplied?: boolean;
    appliedPackages?: Record<number, AppliedPackageInfo>;
  },
  foodMenu: Record<string, any>,
  dayConfig: ConfigDay[],
  kidsEnabled: boolean,
  guestsEnabled: boolean = false,
  foodPackages: FoodPackage[] | Record<string, FoodPackage> = []
): {
  hasDiscrepancy: boolean;
  type: "deficiency" | "excess" | "none";
  difference: number;
  amount: number;
  paidAmount: number;
  calculatedAmount: number;
} {
  const pkgList = Array.isArray(foodPackages)
    ? foodPackages
    : Object.values(foodPackages || {});

  const paidAmount = calculatePaidAmount(sub);
  const isPkgApplied = sub.isPackageApplied || (sub.appliedPackages && Object.keys(sub.appliedPackages).length > 0);
  const calculatedAmount = isPkgApplied
    ? calculatePassTotalWithPackages(
        sub.mealSlots,
        sub.peopleCount || 0,
        sub.kidsCount || 0,
        sub.appliedPackages,
        pkgList,
        foodMenu,
        dayConfig,
        kidsEnabled,
        sub.guestsCount || 0,
        guestsEnabled
      )
    : calculateSubscriptionAmount(
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
  const hasDiscrepancy = Math.abs(difference) > 0.01;
  const type = !hasDiscrepancy ? "none" : difference < 0 ? "deficiency" : "excess";

  return {
    hasDiscrepancy,
    type,
    difference,
    amount: Math.abs(difference),
    paidAmount,
    calculatedAmount,
  };
}

/**
 * Checks whether a subscription has an amount discrepancy (paid vs calculated).
 */
export function hasAmountDiscrepancy(
  sub: SubscriptionRecord,
  foodMenu: Record<string, any>,
  dayConfig: ConfigDay[],
  kidsEnabled: boolean,
  guestsEnabled: boolean = false,
  foodPackages: FoodPackage[] | Record<string, FoodPackage> = []
): boolean {
  return calculatePassDiscrepancy(sub, foodMenu, dayConfig, kidsEnabled, guestsEnabled, foodPackages).hasDiscrepancy;
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
  guestsEnabled: boolean = false,
  foodPackages: FoodPackage[] | Record<string, FoodPackage> = []
): DiscrepancyItem[] {
  return subscriptions
    .map((sub) => {
      const disc = calculatePassDiscrepancy(sub, foodMenu, dayConfig, kidsEnabled, guestsEnabled, foodPackages);
      return {
        id: sub.id,
        block: sub.block,
        flat: sub.flat,
        peopleCount: sub.peopleCount || 0,
        kidsCount: sub.kidsCount || 0,
        guestsCount: sub.guestsCount || 0,
        paidAmount: disc.paidAmount,
        calculatedAmount: disc.calculatedAmount,
        difference: disc.difference,
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

export interface MealPaymentDetail {
  dayId: string;
  mealType: MealType;
  menuPrice: number;       // food menu price
  parcelPrice: number;     // associated parcel price for this meal slot
  packageDiscount: number;
  excessDeficient: number; // positive for excess
  netPayment: number;      // menuPrice + parcelPrice - packageDiscount + excessDeficient
  passCount: number;       // number of unique passes subscribed to this meal
  portionCount: number;    // total subscribed meal portions (Dine In + Parcel)
  dineInCount: number;     // Dine In portion count
  parcelCount: number;     // Parcel portion count
  adultPortionCount: number;
  kidsPortionCount: number;
  guestsPortionCount: number;
  freeMealPortionCount: number;
}

export interface DayPaymentDetail {
  dayId: string;
  menuPrice: number;
  parcelPrice: number;
  packageDiscount: number;
  excessDeficient: number;
  netPayment: number;
  meals: Record<MealType, MealPaymentDetail>;
  passCount: number;
  adultPortionCount: number;
  kidsPortionCount: number;
  guestsPortionCount: number;
  freeMealPortionCount: number;
}

export interface DetailedPaymentBreakdown {
  mealWisePayments: MealPaymentDetail[];
  dayWisePayments: DayPaymentDetail[];
  seasonTotalPayment: {
    menuPrice: number;
    parcelPrice: number;
    packageDiscount: number;
    excessDeficient: number;
    netPayment: number;
    totalPortions: number;
    dineInCount: number;
    parcelCount: number;
    seasonTotalPasses: number;
  };
}

/**
 * Distributes a total amount across items based on their weights,
 * avoiding decimals when totalAmount and weights are integers by using integer floor division
 * and assigning the remaining balance to the final item (e.g. 50 over 3 meals -> 16, 16, 18).
 * If totalAmount or weights are non-integers, distributes exact cents.
 */
export function distributeAmountWithRemainder(
  totalAmount: number,
  weights: number[]
): number[] {
  if (weights.length === 0) return [];
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  if (sumWeights === 0 || totalAmount === 0) {
    return new Array(weights.length).fill(0);
  }

  const isIntegerAmount = totalAmount % 1 === 0 && weights.every((w) => w % 1 === 0);

  if (isIntegerAmount) {
    const totalInt = Math.round(totalAmount);
    const result: number[] = [];
    let allocatedSum = 0;

    for (let i = 0; i < weights.length - 1; i++) {
      const rawShare = (totalInt * weights[i]) / sumWeights;
      const share = totalInt >= 0 ? Math.floor(rawShare) : Math.ceil(rawShare);
      result.push(share);
      allocatedSum += share;
    }

    // Assign the remaining balance to the final item
    const lastShare = totalInt - allocatedSum;
    result.push(lastShare);

    return result;
  } else {
    // For decimal amounts, work in integer cents
    const totalCents = Math.round(totalAmount * 100);
    const resultCents: number[] = [];
    let allocatedCentsSum = 0;

    for (let i = 0; i < weights.length - 1; i++) {
      const rawShare = (totalCents * weights[i]) / sumWeights;
      const share = totalCents >= 0 ? Math.floor(rawShare) : Math.ceil(rawShare);
      resultCents.push(share);
      allocatedCentsSum += share;
    }

    const lastCents = totalCents - allocatedCentsSum;
    resultCents.push(lastCents);

    return resultCents.map((c) => c / 100);
  }
}

export interface PassMealItem {
  dayId: string;
  mealType: MealType;
  personIndex: number;
  category: "adult" | "kid" | "guest";
  choice: string;
  menuPrice: number;
  parcelPrice: number;
  slotTotalPrice: number;
  pkgDiscount: number;
  discountedPrice: number;
  excessDeficient: number;
  netPayment: number;
  isMealTaken?: boolean;
  isParcelOpted?: boolean;
  isParcelAllowed?: boolean;
  isParcelTaken?: boolean;
}

export function calculatePassMealBreakdown(
  sub: SubscriptionRecord,
  foodMenu: Record<string, any>,
  dayConfig: ConfigDay[],
  kidsEnabled: boolean,
  guestsEnabled: boolean = false,
  foodPackages: FoodPackage[] | Record<string, FoodPackage> = []
): PassMealItem[] {
  const pkgList: FoodPackage[] = Array.isArray(foodPackages)
    ? foodPackages
    : Object.values(foodPackages || {});

  const mealTypes = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];
  const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
  const gCount = guestsEnabled ? (sub.guestsCount || 0) : 0;
  let maxPeople = (sub.peopleCount || 0) + kCount + gCount;
  Object.values(sub.mealSlots || {}).forEach((slots: any) => {
    if (Array.isArray(slots) && slots.length > maxPeople) {
      maxPeople = slots.length;
    }
  });
  const totalPeople = maxPeople;

  const passMeals: PassMealItem[] = [];

  Object.keys(sub.mealSlots || {}).forEach((dayId) => {
    const slots = sub.mealSlots?.[dayId] || [];
    const taken = sub.takenByPerson?.[dayId] || [];

    slots.forEach((personSlot: any, i: number) => {
      if (!personSlot) return;

      const isKid = kidsEnabled && i >= sub.peopleCount && i < sub.peopleCount + kCount;
      const isGuest = guestsEnabled && i >= sub.peopleCount + kCount && i < sub.peopleCount + kCount + gCount;
      const category = isGuest ? "guest" : isKid ? "kid" : "adult";

      mealTypes.forEach((mType) => {
        if (!isMealEnabled(dayId, mType, dayConfig)) return;
        const choice = normalizeChoice(personSlot[mType]);
        if (choice === DietaryOption.NONE) return;

        const mFoodPrice = resolveVarietyPrice(dayId, mType, choice, isKid, isGuest, "member", dayConfig, foodMenu);

        let mParcelPrice = 0;
        const isParcelOpted = toBool(personSlot[`${mType}Parcel` as keyof typeof personSlot]);
        const isParcelAllowed = isParcelOpted && (isGuest
          ? isGuestsParcelEnabled(dayId, mType, dayConfig, guestsEnabled)
          : isKid
          ? isKidsParcelEnabled(dayId, mType, dayConfig, kidsEnabled)
          : isParcelEnabled(dayId, mType, dayConfig));

        if (isParcelAllowed) {
          const dayConf = dayConfig.find((d) => d.id === dayId);
          const mConf = dayConf ? dayConf[mType] : null;
          const isVeg = choice === DietaryOption.VEG || choice === "veg_default" || (typeof choice === "string" && choice.toLowerCase().includes("veg") && !choice.toLowerCase().includes("non"));

          if (isVeg) {
            const adultParcelPrice = foodMenu?.[dayId]?.[mType]?.vegParcelPrice ?? mConf?.vegParcelPrice;
            const kidsParcelPrice = foodMenu?.[dayId]?.[mType]?.kidsVegParcelPrice;
            const guestsParcelPrice = foodMenu?.[dayId]?.[mType]?.guestsVegParcelPrice;

            mParcelPrice = isGuest
              ? resolveGuestPrice(guestsParcelPrice, adultParcelPrice, undefined)
              : resolvePrice(isKid, kidsParcelPrice, adultParcelPrice, undefined);
          } else {
            const adultParcelPrice = foodMenu?.[dayId]?.[mType]?.nonVegParcelPrice ?? mConf?.nonVegParcelPrice;
            const kidsParcelPrice = foodMenu?.[dayId]?.[mType]?.kidsNonVegParcelPrice;
            const guestsParcelPrice = foodMenu?.[dayId]?.[mType]?.guestsNonVegParcelPrice;

            mParcelPrice = isGuest
              ? resolveGuestPrice(guestsParcelPrice, adultParcelPrice, undefined)
              : resolvePrice(isKid, kidsParcelPrice, adultParcelPrice, undefined);
          }
        }

        const slotTotalPrice = mFoodPrice + mParcelPrice;
        const tState = taken[i] || {};
        const isParcelTaken = !!tState[`${mType}Parcel` as keyof typeof tState];
        const isMealTaken = !!tState[mType as keyof typeof tState] || isParcelTaken;

        passMeals.push({
          dayId,
          mealType: mType,
          personIndex: i,
          category,
          choice,
          menuPrice: mFoodPrice,
          parcelPrice: mParcelPrice,
          slotTotalPrice,
          pkgDiscount: 0,
          discountedPrice: slotTotalPrice,
          excessDeficient: 0,
          netPayment: slotTotalPrice,
          isMealTaken,
          isParcelOpted,
          isParcelAllowed,
          isParcelTaken,
        });
      });
    });
  });

  if (passMeals.length === 0) {
    const activeDayIds = dayConfig.filter(d => d.enabled).map(d => d.id);
    activeDayIds.forEach((dayId) => {
      mealTypes.forEach((mType) => {
        if (!isMealEnabled(dayId, mType, dayConfig)) return;
        passMeals.push({
          dayId,
          mealType: mType,
          personIndex: 0,
          category: "adult",
          choice: "veg_default",
          menuPrice: 0,
          parcelPrice: 0,
          slotTotalPrice: 0,
          pkgDiscount: 0,
          discountedPrice: 0,
          excessDeficient: 0,
          netPayment: 0,
          isMealTaken: false,
          isParcelOpted: false,
          isParcelAllowed: false,
          isParcelTaken: false,
        });
      });
    });
  }

  for (let i = 0; i < totalPeople; i++) {
    const appliedInfo = sub.appliedPackages?.[i] || (sub.appliedPackages as any)?.[String(i)] || (sub.isPackageApplied && i === 0 ? sub.appliedPackages?.[0] || (sub.appliedPackages as any)?.["0"] : undefined);

    if (appliedInfo) {
      const pkg = pkgList.find((p) => p.id === appliedInfo.packageId || p.id.trim() === (appliedInfo.packageId || '').trim());
      if (pkg) {
        const personMeals = passMeals.filter((m) => m.personIndex === i);
        const mealItemsMap = pkg.selectedMealItems || {};
        const legacyMealsMap = pkg.selectedMeals || {};
        const pkgDays = Object.keys(mealItemsMap).length > 0 ? Object.keys(mealItemsMap) : Object.keys(legacyMealsMap);

        let pkgTargetMeals: any[] = [];
        if (pkgDays.length > 0) {
          pkgTargetMeals = personMeals.filter((m) => {
            const targetItems = mealItemsMap[m.dayId] || (legacyMealsMap[m.dayId] || []).map((t: any) => ({ mealType: t, varietyId: "" }));
            return targetItems.some((item: any) => item.mealType === m.mealType);
          });
        } else {
          pkgTargetMeals = personMeals;
        }

        if (pkgTargetMeals.length > 0) {
          const normalPkgPrice = pkgTargetMeals.reduce((acc, m) => acc + m.menuPrice, 0);
          const isFlatDiscount = pkg.discountType === "flat_discount" || pkg.discountRate !== undefined;

          let totalPkgDiscount = 0;
          if (isFlatDiscount) {
            const discountPercent = Math.min(100, Math.max(0, pkg.discountRate ?? 0));
            totalPkgDiscount = (normalPkgPrice * discountPercent) / 100;
          } else {
            const pkgPrice = pkg.packagePrice ?? 0;
            totalPkgDiscount = Math.max(0, normalPkgPrice - pkgPrice);
          }

          if (totalPkgDiscount > 0) {
            const weights = pkgTargetMeals.map((m) => m.menuPrice);
            const distributedDiscounts = distributeAmountWithRemainder(totalPkgDiscount, weights);

            pkgTargetMeals.forEach((m, idx) => {
              m.pkgDiscount = distributedDiscounts[idx] || 0;
              m.discountedPrice = Math.max(0, m.slotTotalPrice - m.pkgDiscount);
            });
          }
        }
      }
    }
  }

  const paidAmount = calculatePaidAmount(sub);
  const passCalculatedTotal = calculatePassTotalWithPackages(
    sub.mealSlots || {},
    sub.peopleCount || 0,
    sub.kidsCount || 0,
    sub.appliedPackages,
    pkgList,
    foodMenu,
    dayConfig,
    kidsEnabled,
    sub.guestsCount || 0,
    guestsEnabled
  );
  const passDiff = Math.max(0, paidAmount - passCalculatedTotal);

  if (passDiff > 0 && passMeals.length > 0) {
    const weights = passMeals.map((m) => m.discountedPrice);
    const totalMealWeight = weights.reduce((acc, w) => acc + w, 0);

    if (totalMealWeight > 0) {
      const distributedDiff = distributeAmountWithRemainder(passDiff, weights);
      passMeals.forEach((m, idx) => {
        m.excessDeficient = distributedDiff[idx] || 0;
      });
    } else {
      const equalWeights = new Array(passMeals.length).fill(1);
      const distributedDiff = distributeAmountWithRemainder(passDiff, equalWeights);
      passMeals.forEach((m, idx) => {
        m.excessDeficient = distributedDiff[idx] || 0;
      });
    }
  }

  passMeals.forEach((m) => {
    m.netPayment = m.menuPrice + m.parcelPrice - m.pkgDiscount + m.excessDeficient;
  });

  return passMeals;
}

/**
 * Calculates meal-wise and day-wise payment breakdown for all subscriptions.
 */
export function calculateDetailedPaymentReportData(
  subscriptions: SubscriptionRecord[],
  foodMenu: Record<string, any>,
  dayConfig: ConfigDay[],
  kidsEnabled: boolean,
  guestsEnabled: boolean = false,
  foodPackages: FoodPackage[] | Record<string, FoodPackage> = []
): DetailedPaymentBreakdown {
  const pkgList: FoodPackage[] = Array.isArray(foodPackages)
    ? foodPackages
    : Object.values(foodPackages || {});

  const allDayIdsSet = new Set<string>();
  dayConfig.forEach((d) => allDayIdsSet.add(d.id));
  subscriptions.forEach((sub) => {
    Object.keys(sub.mealSlots || {}).forEach((dId) => allDayIdsSet.add(dId));
  });
  const activeDayIds = Array.from(allDayIdsSet);
  const mealTypes = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];

  const seasonUniquePassesSet = new Set<string>();
  subscriptions.forEach((sub) => {
    let hasAnyMeal = false;
    Object.keys(sub.mealSlots || {}).forEach((dayId) => {
      const slots = sub.mealSlots?.[dayId] || [];
      const opted = slots.some((personSlot) => {
        if (!personSlot) return false;
        return mealTypes.some((mType) => {
          if (!isMealEnabled(dayId, mType, dayConfig)) return false;
          return normalizeChoice(personSlot[mType]) !== DietaryOption.NONE;
        });
      });
      if (opted) hasAnyMeal = true;
    });
    if (!hasAnyMeal && (calculatePaidAmount(sub) > 0 || (sub.peopleCount || 0) > 0)) {
      hasAnyMeal = true;
    }
    if (hasAnyMeal) {
      seasonUniquePassesSet.add(sub.id);
    }
  });
  const seasonTotalPasses = seasonUniquePassesSet.size > 0 ? seasonUniquePassesSet.size : subscriptions.length;

  const mealMap: Record<
    string,
    {
      menuPrice: number;
      parcelPrice: number;
      packageDiscount: number;
      excessDeficient: number;
      netPayment: number;
      passIds: Set<string>;
      portionCount: number;
      dineInCount: number;
      parcelCount: number;
      adultPortionCount: number;
      kidsPortionCount: number;
      guestsPortionCount: number;
      freeMealPortionCount: number;
    }
  > = {};

  const dayPassIdsMap: Record<string, Set<string>> = {};

  activeDayIds.forEach((dayId) => {
    dayPassIdsMap[dayId] = new Set<string>();
    mealTypes.forEach((mType) => {
      mealMap[`${dayId}_${mType}`] = {
        menuPrice: 0,
        parcelPrice: 0,
        packageDiscount: 0,
        excessDeficient: 0,
        netPayment: 0,
        passIds: new Set<string>(),
        portionCount: 0,
        dineInCount: 0,
        parcelCount: 0,
        adultPortionCount: 0,
        kidsPortionCount: 0,
        guestsPortionCount: 0,
        freeMealPortionCount: 0,
      };
    });
  });

  subscriptions.forEach((sub) => {
    activeDayIds.forEach((dayId) => {
      const slots = sub.mealSlots?.[dayId] || [];
      const hasMeal = slots.some((personSlot) => {
        if (!personSlot) return false;
        return mealTypes.some((mType) => {
          if (!isMealEnabled(dayId, mType, dayConfig)) return false;
          return normalizeChoice(personSlot[mType]) !== DietaryOption.NONE;
        });
      });
      if (hasMeal) {
        dayPassIdsMap[dayId].add(sub.id);
      }
    });

    const passMeals = calculatePassMealBreakdown(sub, foodMenu, dayConfig, kidsEnabled, guestsEnabled, foodPackages);

    passMeals.forEach((m) => {
      const key = `${m.dayId}_${m.mealType}`;
      if (mealMap[key]) {
        mealMap[key].menuPrice += m.menuPrice;
        mealMap[key].parcelPrice += m.parcelPrice;
        mealMap[key].packageDiscount += m.pkgDiscount;
        mealMap[key].excessDeficient += m.excessDeficient;
        mealMap[key].netPayment += m.netPayment;
        mealMap[key].passIds.add(sub.id);

        mealMap[key].portionCount++;
        if (m.category === "guest") mealMap[key].guestsPortionCount++;
        else if (m.category === "kid") mealMap[key].kidsPortionCount++;
        else mealMap[key].adultPortionCount++;

        const isMissedParcel = m.isParcelAllowed && m.isMealTaken && !m.isParcelTaken;
        if (m.parcelPrice > 0 && !isMissedParcel) {
          mealMap[key].parcelCount++;
        } else {
          mealMap[key].dineInCount++;
        }
      }
    });
  });

  // Also include Free Meal Desk plates from foodMenu for each active day & meal slot
  activeDayIds.forEach((dayId) => {
    mealTypes.forEach((mType) => {
      if (!isMealEnabled(dayId, mType, dayConfig)) return;
      const key = `${dayId}_${mType}`;
      if (mealMap[key]) {
        const mealMenu = foodMenu?.[dayId]?.[mType];
        const dayConf = dayConfig.find((d) => d.id === dayId);
        const mConf = dayConf ? dayConf[mType] : null;
        const varieties = getMealVarieties(mConf ?? undefined);
        const freeMeals = getMealFreeMealCounts(mealMenu, varieties);
        const freeTotal = freeMeals.freeMealTotal || 0;
        const freeDineInPlates = freeMeals.freeMealDineInTaken;
        const freeParcelPlates = freeMeals.freeMealParcelTaken;
        const totalServedFreePlates = freeDineInPlates + freeParcelPlates;
        const freeUnservedPlates = Math.max(0, freeTotal - totalServedFreePlates);

        if (freeTotal > 0) {
          mealMap[key].portionCount += freeTotal;
          mealMap[key].dineInCount += freeDineInPlates;
          mealMap[key].parcelCount += freeParcelPlates + freeUnservedPlates;
          mealMap[key].freeMealPortionCount += freeTotal;
        }
      }
    });
  });

  const mealWisePayments: MealPaymentDetail[] = [];
  const dayWisePaymentsMap: Record<string, DayPaymentDetail> = {};

  activeDayIds.forEach((dayId) => {
    const dayMealDetails: Record<MealType, MealPaymentDetail> = {} as any;

    let dayMenuSum = 0;
    let dayParcelSum = 0;
    let dayPkgSum = 0;
    let dayExcessSum = 0;
    let dayNetSum = 0;
    let dayAdultPortionCount = 0;
    let dayKidsPortionCount = 0;
    let dayGuestsPortionCount = 0;
    let dayFreeMealPortionCount = 0;

    mealTypes.forEach((mType) => {
      const key = `${dayId}_${mType}`;
      const item = mealMap[key] || {
        menuPrice: 0,
        parcelPrice: 0,
        packageDiscount: 0,
        excessDeficient: 0,
        netPayment: 0,
        passIds: new Set(),
        portionCount: 0,
        dineInCount: 0,
        parcelCount: 0,
        adultPortionCount: 0,
        kidsPortionCount: 0,
        guestsPortionCount: 0,
        freeMealPortionCount: 0,
      };

      const detail: MealPaymentDetail = {
        dayId,
        mealType: mType,
        menuPrice: Math.round(item.menuPrice * 100) / 100,
        parcelPrice: Math.round(item.parcelPrice * 100) / 100,
        packageDiscount: Math.round(item.packageDiscount * 100) / 100,
        excessDeficient: Math.round(item.excessDeficient * 100) / 100,
        netPayment: Math.round(item.netPayment * 100) / 100,
        passCount: item.passIds.size,
        portionCount: item.portionCount,
        dineInCount: item.dineInCount,
        parcelCount: item.parcelCount,
        adultPortionCount: item.adultPortionCount,
        kidsPortionCount: item.kidsPortionCount,
        guestsPortionCount: item.guestsPortionCount,
        freeMealPortionCount: item.freeMealPortionCount,
      };

      mealWisePayments.push(detail);
      dayMealDetails[mType] = detail;

      dayMenuSum += detail.menuPrice;
      dayParcelSum += detail.parcelPrice;
      dayPkgSum += detail.packageDiscount;
      dayExcessSum += detail.excessDeficient;
      dayNetSum += detail.netPayment;

      dayAdultPortionCount += detail.adultPortionCount;
      dayKidsPortionCount += detail.kidsPortionCount;
      dayGuestsPortionCount += detail.guestsPortionCount;
      dayFreeMealPortionCount += detail.freeMealPortionCount;
    });

    dayWisePaymentsMap[dayId] = {
      dayId,
      menuPrice: Math.round(dayMenuSum * 100) / 100,
      parcelPrice: Math.round(dayParcelSum * 100) / 100,
      packageDiscount: Math.round(dayPkgSum * 100) / 100,
      excessDeficient: Math.round(dayExcessSum * 100) / 100,
      netPayment: Math.round(dayNetSum * 100) / 100,
      meals: dayMealDetails,
      passCount: (dayPassIdsMap[dayId] || new Set()).size,
      adultPortionCount: dayAdultPortionCount,
      kidsPortionCount: dayKidsPortionCount,
      guestsPortionCount: dayGuestsPortionCount,
      freeMealPortionCount: dayFreeMealPortionCount,
    };
  });

  const dayWisePayments = Object.values(dayWisePaymentsMap);

  const totalPortions = mealWisePayments.reduce((acc, m) => acc + (m.portionCount ?? m.passCount), 0);
  const dineInCount = mealWisePayments.reduce((acc, m) => acc + (m.dineInCount ?? 0), 0);
  const parcelCount = mealWisePayments.reduce((acc, m) => acc + (m.parcelCount ?? 0), 0);

  const paidPassesCount = subscriptions.filter((sub) => calculatePaidAmount(sub) > 0).length;
  const unpaidPassesCount = seasonTotalPasses - paidPassesCount;

  let seasonNetUnrounded = 0;
  Object.values(mealMap).forEach((item) => {
    seasonNetUnrounded += item.netPayment;
  });

  const seasonTotalPayment = {
    menuPrice: Math.round(dayWisePayments.reduce((acc, d) => acc + d.menuPrice, 0) * 100) / 100,
    parcelPrice: Math.round(dayWisePayments.reduce((acc, d) => acc + d.parcelPrice, 0) * 100) / 100,
    packageDiscount: Math.round(dayWisePayments.reduce((acc, d) => acc + d.packageDiscount, 0) * 100) / 100,
    excessDeficient: Math.round(dayWisePayments.reduce((acc, d) => acc + d.excessDeficient, 0) * 100) / 100,
    netPayment: Math.round(seasonNetUnrounded * 100) / 100,
    totalPortions,
    dineInCount,
    parcelCount,
    seasonTotalPasses,
    paidPassesCount,
    unpaidPassesCount,
  };

  return {
    mealWisePayments,
    dayWisePayments,
    seasonTotalPayment,
  };
}

export interface PackageReportSummary {
  totalPasses: number;
  totalPeopleCovered: number;
  packageCounts: Record<string, { packageName: string; count: number }>;
  expectedCostWithoutPackage: number;
  costAfterPackage: number;
  totalSavings: number;
}

export function calculatePackageReportSummary(
  subscriptions: SubscriptionRecord[],
  foodMenu: Record<string, any>,
  dayConfig: ConfigDay[],
  kidsEnabled: boolean,
  guestsEnabled: boolean,
  foodPackages: FoodPackage[] | Record<string, FoodPackage>
): PackageReportSummary {
  const pkgList: FoodPackage[] = Array.isArray(foodPackages)
    ? foodPackages
    : Object.values(foodPackages || {});

  const packagedSubs = subscriptions.filter(
    (sub) => sub.isPackageApplied || (sub.appliedPackages && Object.keys(sub.appliedPackages).length > 0)
  );

  const totalPasses = packagedSubs.length;
  let totalPeopleCovered = 0;
  const packageCounts: Record<string, { packageName: string; count: number }> = {};
  let expectedCostWithoutPackage = 0;
  let costAfterPackage = 0;

  const mealTypes = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];

  packagedSubs.forEach((sub) => {
    const appliedPackages = sub.appliedPackages || {};
    Object.entries(appliedPackages).forEach(([pIdxStr, appliedInfo]) => {
      const pIdx = Number(pIdxStr);
      const pkgId = appliedInfo.packageId;
      const pkgName = appliedInfo.packageName || pkgId;
      const pkgPrice = appliedInfo.packagePrice ?? 0;

      if (!packageCounts[pkgId]) {
        packageCounts[pkgId] = { packageName: pkgName, count: 0 };
      }
      packageCounts[pkgId].count++;
      totalPeopleCovered++;
      costAfterPackage += pkgPrice;

      const pkg = pkgList.find((p) => p.id === pkgId || p.id.trim() === pkgId.trim());
      const isKid = kidsEnabled && pIdx >= sub.peopleCount && pIdx < sub.peopleCount + (sub.kidsCount || 0);
      const isGuest = guestsEnabled && pIdx >= sub.peopleCount + (sub.kidsCount || 0);

      let personExpectedCost = 0;
      Object.keys(sub.mealSlots || {}).forEach((dayId) => {
        const slots = sub.mealSlots?.[dayId] || [];
        const personSlot = slots[pIdx];
        if (!personSlot) return;

        mealTypes.forEach((mType) => {
          if (!isMealEnabled(dayId, mType, dayConfig)) return;
          const choice = normalizeChoice(personSlot[mType]);
          if (choice === DietaryOption.NONE) return;

          let isMealInPackage = true;
          if (pkg) {
            const mealItemsMap = pkg.selectedMealItems || {};
            const legacyMealsMap = pkg.selectedMeals || {};
            const pkgDays = Object.keys(mealItemsMap).length > 0 ? Object.keys(mealItemsMap) : Object.keys(legacyMealsMap);
            if (pkgDays.length > 0) {
              const targetItems = mealItemsMap[dayId] || (legacyMealsMap[dayId] || []).map((t: any) => ({ mealType: t }));
              isMealInPackage = targetItems.some((item: any) => item.mealType === mType);
            }
          }

          if (isMealInPackage) {
            const mFoodPrice = resolveVarietyPrice(dayId, mType, choice, isKid, isGuest, "member", dayConfig, foodMenu);
            personExpectedCost += mFoodPrice;
          }
        });
      });

      expectedCostWithoutPackage += personExpectedCost;
    });
  });

  const totalSavings = Math.max(0, expectedCostWithoutPackage - costAfterPackage);

  return {
    totalPasses,
    totalPeopleCovered,
    packageCounts,
    expectedCostWithoutPackage: Math.round(expectedCostWithoutPackage * 100) / 100,
    costAfterPackage: Math.round(costAfterPackage * 100) / 100,
    totalSavings: Math.round(totalSavings * 100) / 100,
  };
}


export function calculateSeasonVendorTotals(
  activeDays: string[],
  foodMenu: FoodMenu,
  dayConfig: ConfigDay[],
  subscriptions: SubscriptionRecord[] = [],
  kidsEnabled: boolean = false,
  guestsEnabled: boolean = false,
  foodPackages: FoodPackage[] | Record<string, FoodPackage> = [],
  vendorKidsMealChargingEnabled: boolean = true,
  freeMealEnabled: boolean = true
) {
  let expectedTotal = 0;
  let actualTotal = 0;

  activeDays.forEach((dayId) => {
    const dMenu = foodMenu[dayId];
    if (!dMenu) return;
    const meals = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].filter(m => isMealEnabled(dayId, m, dayConfig));
    meals.forEach((mKey) => {
      const gm = dMenu[mKey];
      if (!gm) return;
      const dayConf = dayConfig.find(d => d.id === dayId);
      const mConf = dayConf ? dayConf[mKey] : undefined;
      const varieties = getMealVarieties(mConf, dayConf?.vegOnly);
      const fmCounts = getMealFreeMealCounts(gm, varieties);

      const vEnabled = isDietaryEnabled(dayId, mKey, DietType.VEG, dayConfig);
      const nvEnabled = isDietaryEnabled(dayId, mKey, DietType.NON_VEG, dayConfig);

      const defAdultVegSub = Number(gm.vegPrice ?? mConf?.vegPrice ?? 0);
      const defAdultNvSub = Number(gm.nonVegPrice ?? mConf?.nonVegPrice ?? 0);
      const defAdultVegParcelSub = Number(gm.vegParcelPrice ?? mConf?.vegParcelPrice ?? 0);
      const defAdultNvParcelSub = Number(gm.nonVegParcelPrice ?? mConf?.nonVegParcelPrice ?? 0);

      const defAdultVegVendor = Number(gm.vendorVegPrice ?? defAdultVegSub);
      const defAdultNvVendor = Number(gm.vendorNonVegPrice ?? defAdultNvSub);
      const defAdultVegParcelVendor = Number(gm.vendorVegParcelPrice ?? defAdultVegParcelSub);
      const defAdultNvParcelVendor = Number(gm.vendorNonVegParcelPrice ?? defAdultNvParcelSub);

      subscriptions.forEach((sub) => {
        const passMeals = calculatePassMealBreakdown(sub, foodMenu, dayConfig, kidsEnabled, guestsEnabled, foodPackages);
        const mealSlotItems = passMeals.filter((m: any) => m.dayId === dayId && m.mealType === mKey);

        mealSlotItems.forEach((m: any) => {
          const matchedVar = varieties.find(v => v.id === m.choice) || getVarietyForChoice(m.choice, varieties);
          const isVeg = matchedVar ? matchedVar.type === DietType.VEG : (m.choice === DietType.VEG || m.choice.toLowerCase().includes("veg"));
          const varMenu = gm.varieties?.[m.choice];

          const baseVendorMeal = varMenu?.vendorPrice ? Number(varMenu.vendorPrice) : (isVeg ? defAdultVegVendor : defAdultNvVendor);
          const varVendorMeal = (m.category === "kid" && vendorKidsMealChargingEnabled === false) ? 0 : baseVendorMeal;
          const varVendorParcel = varMenu?.vendorParcelPrice ? Number(varMenu.vendorParcelPrice) : (isVeg ? defAdultVegParcelVendor : defAdultNvParcelVendor);

          expectedTotal += varVendorMeal;
          if (m.isParcelAllowed) expectedTotal += varVendorParcel;

          if (m.isMealTaken) actualTotal += varVendorMeal;
          if (m.isParcelTaken) actualTotal += varVendorParcel;
        });
      });

      const freeVegPlanned = (freeMealEnabled && vEnabled) ? fmCounts.freeMealVeg : 0;
      const freeNonVegPlanned = (freeMealEnabled && nvEnabled) ? fmCounts.freeMealNonVeg : 0;
      const freeVegTotalServed = (freeMealEnabled && vEnabled) ? ((fmCounts.freeMealVegTaken || 0) + (fmCounts.freeMealVegParcelTaken || 0)) : 0;
      const freeNonVegTotalServed = (freeMealEnabled && nvEnabled) ? ((fmCounts.freeMealNonVegTaken || 0) + (fmCounts.freeMealNonVegParcelTaken || 0)) : 0;
      const freeVegParcelServed = (freeMealEnabled && vEnabled) ? (fmCounts.freeMealVegParcelTaken || 0) : 0;
      const freeNonVegParcelServed = (freeMealEnabled && nvEnabled) ? (fmCounts.freeMealNonVegParcelTaken || 0) : 0;

      expectedTotal += (freeVegPlanned * defAdultVegVendor) + (freeNonVegPlanned * defAdultNvVendor);
      actualTotal += (freeVegTotalServed * defAdultVegVendor) + (freeNonVegTotalServed * defAdultNvVendor);
      actualTotal += (freeVegParcelServed * defAdultVegParcelVendor) + (freeNonVegParcelServed * defAdultNvParcelVendor);
    });
  });

  return { expectedTotal: Math.round(expectedTotal * 100) / 100, actualTotal: Math.round(actualTotal * 100) / 100 };
}

export { toBool };
