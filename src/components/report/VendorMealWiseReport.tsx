import React from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import {
  getDayLabel,
  isMealEnabled,
  isDietaryEnabled,
  getMealLabel,
  getMealFreeMealCounts,
  getMealVarieties,
  getVarietyForChoice,
  isSpecialMeal,
} from "../../constants";
import {
  ConfigDay,
  FoodMenu,
  MealType,
  DietType,
  AppThemeMode,
  SubscriptionRecord,
  DietaryOption,
  FoodPackage,
  normalizeChoice,
  toBool,
  TakenState,
} from "../../domain";
import {
  formatCurrencyAmount,
  resolveVarietyPrice,
  resolvePrice,
  resolveGuestPrice,
  distributeAmountWithRemainder,
  calculatePaidAmount,
  calculatePassMealBreakdown,
} from "../../utils/paymentUtils";

export function VendorMealWiseReport({
  activeDays,
  foodMenu,
  dayConfig,
  subscriptions = [],
  kidsEnabled = false,
  guestsEnabled = false,
  foodPackages = [],
  vendorKidsMealChargingEnabled = true,
  freeMealEnabled = true,
}: {
  activeDays: string[];
  foodMenu: FoodMenu;
  dayConfig: ConfigDay[];
  subscriptions?: SubscriptionRecord[];
  kidsEnabled?: boolean;
  guestsEnabled?: boolean;
  foodPackages?: FoodPackage[] | Record<string, FoodPackage>;
  vendorKidsMealChargingEnabled?: boolean;
  freeMealEnabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const getExcessOrDeficiencyLabel = (amount: number) =>
    amount >= 0 ? UI_TEXT.excess : UI_TEXT.deficiency;

  const memberLabel = kidsEnabled ? UI_TEXT.adults : UI_TEXT.members;

  let seasonTotalSubscription = 0;
  let seasonTotalExpectedVendor = 0;
  let seasonTotalActualVendor = 0;

  let seasonAdultDineSub = 0, seasonAdultParcelSub = 0, seasonAdultDineExp = 0, seasonAdultParcelExp = 0, seasonAdultDineAct = 0, seasonAdultParcelAct = 0;
  let seasonKidsDineSub = 0, seasonKidsParcelSub = 0, seasonKidsDineExp = 0, seasonKidsParcelExp = 0, seasonKidsDineAct = 0, seasonKidsParcelAct = 0;
  let seasonGuestsDineSub = 0, seasonGuestsParcelSub = 0, seasonGuestsDineExp = 0, seasonGuestsParcelExp = 0, seasonGuestsDineAct = 0, seasonGuestsParcelAct = 0;
  let seasonFreeDineExp = 0, seasonFreeDineAct = 0, seasonFreeParcelAct = 0;

  const dayReports = activeDays.map((dayId, index) => {
    const dMenu = foodMenu[dayId];
    if (!dMenu) return null;
    const colorScheme = theme.cardColors[index % theme.cardColors.length];
    const meals = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].filter(m => isMealEnabled(dayId, m, dayConfig));
    if (meals.length === 0) return null;

    let daySubTotal = 0;
    let dayExpectedVendorTotal = 0;
    let dayActualVendorTotal = 0;

    const mealReports = meals.map((mKey) => {
      const gm = dMenu[mKey];
      if (!gm) return null;
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

      const categoryMap: Record<string, {
        name: string;
        planned: number;
        served: number;
        catSub: number;
        catExpVendor: number;
        catActVendor: number;
      }> = {};

      subscriptions.forEach((sub) => {
        const passMeals = calculatePassMealBreakdown(sub, foodMenu, dayConfig, kidsEnabled, guestsEnabled, foodPackages);
        const mealSlotItems = passMeals.filter((m: any) => m.dayId === dayId && m.mealType === mKey);

        mealSlotItems.forEach((m: any) => {
          if (m.isAbsent) return; // Absent meal/food won't be counted in vendor pricing

          const matchedVar = varieties.find(v => v.id === m.choice) || getVarietyForChoice(m.choice, varieties);
          const isVeg = matchedVar ? matchedVar.type === DietType.VEG : (m.choice === DietType.VEG || m.choice.toLowerCase().includes("veg"));
          const varietyName = matchedVar?.name || (isVeg ? UI_TEXT.veg : UI_TEXT.nonVeg);
          const varMenu = gm.varieties?.[m.choice];

          // Vendor meal & parcel prices
          const baseVendorMeal = varMenu?.vendorPrice ? Number(varMenu.vendorPrice) : (isVeg ? defAdultVegVendor : defAdultNvVendor);
          const varVendorMeal = (m.category === "kid" && vendorKidsMealChargingEnabled === false) ? 0 : baseVendorMeal;
          const varVendorParcel = varMenu?.vendorParcelPrice ? Number(varMenu.vendorParcelPrice) : (isVeg ? defAdultVegParcelVendor : defAdultNvParcelVendor);

          const slotParcelSub = m.isParcelAllowed ? m.parcelPrice : 0;
          const slotDineSub = m.netPayment - slotParcelSub;

          const categoryPrefix = m.category === "guest" ? UI_TEXT.guests : m.category === "kid" ? UI_TEXT.kids : memberLabel;

          // Meal (Dine-in)
          const dineKey = `${m.category}_${m.choice}_dine`;
          if (!categoryMap[dineKey]) {
            categoryMap[dineKey] = {
              name: `${categoryPrefix} (${varietyName} ${UI_TEXT.meal})`,
              planned: 0,
              served: 0,
              catSub: 0,
              catExpVendor: 0,
              catActVendor: 0,
            };
          }
          categoryMap[dineKey].planned++;
          if (m.isMealTaken) categoryMap[dineKey].served++;
          categoryMap[dineKey].catSub += slotDineSub;
          categoryMap[dineKey].catExpVendor += varVendorMeal;
          categoryMap[dineKey].catActVendor += (m.isMealTaken ? varVendorMeal : 0);

          // Parcel
          if (m.isParcelAllowed) {
            const parcelKey = `${m.category}_${m.choice}_parcel`;
            if (!categoryMap[parcelKey]) {
              categoryMap[parcelKey] = {
                name: `${categoryPrefix} (${varietyName} ${UI_TEXT.parcel})`,
                planned: 0,
                served: 0,
                catSub: 0,
                catExpVendor: 0,
                catActVendor: 0,
              };
            }
            categoryMap[parcelKey].planned++;
            if (m.isParcelTaken) categoryMap[parcelKey].served++;
            categoryMap[parcelKey].catSub += slotParcelSub;
            categoryMap[parcelKey].catExpVendor += varVendorParcel;
            categoryMap[parcelKey].catActVendor += (m.isParcelTaken ? varVendorParcel : 0);
          }
        });
      });

      const freeVegPlanned = (freeMealEnabled && vEnabled) ? fmCounts.freeMealVeg : 0;
      const freeNonVegPlanned = (freeMealEnabled && nvEnabled) ? fmCounts.freeMealNonVeg : 0;
      const freeVegTotalServed = (freeMealEnabled && vEnabled) ? ((fmCounts.freeMealVegTaken || 0) + (fmCounts.freeMealVegParcelTaken || 0)) : 0;
      const freeNonVegTotalServed = (freeMealEnabled && nvEnabled) ? ((fmCounts.freeMealNonVegTaken || 0) + (fmCounts.freeMealNonVegParcelTaken || 0)) : 0;
      const freeVegParcelServed = (freeMealEnabled && vEnabled) ? (fmCounts.freeMealVegParcelTaken || 0) : 0;
      const freeNonVegParcelServed = (freeMealEnabled && nvEnabled) ? (fmCounts.freeMealNonVegParcelTaken || 0) : 0;

      const freeDineExp = (freeVegPlanned * defAdultVegVendor) + (freeNonVegPlanned * defAdultNvVendor);
      const freeDineAct = (freeVegTotalServed * defAdultVegVendor) + (freeNonVegTotalServed * defAdultNvVendor);
      const freeParcelAct = (freeVegParcelServed * defAdultVegParcelVendor) + (freeNonVegParcelServed * defAdultNvParcelVendor);

      if (freeMealEnabled) {
        if (vEnabled && (freeVegPlanned > 0 || freeVegTotalServed > 0)) {
          const vegName = varieties.find(v => v.type === DietType.VEG)?.name || UI_TEXT.veg;
          categoryMap[`free_veg_dine`] = {
            name: `${UI_TEXT.freeMealSuffix} (${vegName} ${UI_TEXT.meal})`,
            planned: freeVegPlanned,
            served: freeVegTotalServed,
            catSub: 0,
            catExpVendor: freeVegPlanned * defAdultVegVendor,
            catActVendor: freeVegTotalServed * defAdultVegVendor,
          };
        }
        if (vEnabled && freeVegParcelServed > 0) {
          const vegName = varieties.find(v => v.type === DietType.VEG)?.name || UI_TEXT.veg;
          categoryMap[`free_veg_parcel`] = {
            name: `${UI_TEXT.freeMealSuffix} (${vegName} ${UI_TEXT.parcel})`,
            planned: 0,
            served: freeVegParcelServed,
            catSub: 0,
            catExpVendor: 0,
            catActVendor: freeVegParcelServed * defAdultVegParcelVendor,
          };
        }
        if (nvEnabled && (freeNonVegPlanned > 0 || freeNonVegTotalServed > 0)) {
          const nvName = varieties.find(v => v.type === DietType.NON_VEG)?.name || UI_TEXT.nonVeg;
          categoryMap[`free_nv_dine`] = {
            name: `${UI_TEXT.freeMealSuffix} (${nvName} ${UI_TEXT.meal})`,
            planned: freeNonVegPlanned,
            served: freeNonVegTotalServed,
            catSub: 0,
            catExpVendor: freeNonVegPlanned * defAdultNvVendor,
            catActVendor: freeNonVegTotalServed * defAdultNvVendor,
          };
        }
        if (nvEnabled && freeNonVegParcelServed > 0) {
          const nvName = varieties.find(v => v.type === DietType.NON_VEG)?.name || UI_TEXT.nonVeg;
          categoryMap[`free_nv_parcel`] = {
            name: `${UI_TEXT.freeMealSuffix} (${nvName} ${UI_TEXT.parcel})`,
            planned: 0,
            served: freeNonVegParcelServed,
            catSub: 0,
            catExpVendor: 0,
            catActVendor: freeNonVegParcelServed * defAdultNvParcelVendor,
          };
        }
      }

      const categories = Object.values(categoryMap).filter(cat => cat.planned > 0 || cat.served > 0 || cat.catSub > 0 || cat.catExpVendor > 0 || cat.catActVendor > 0);

      let mealSubTotal = 0;
      let mealExpectedVendorTotal = 0;
      let mealActualVendorTotal = 0;
      let mealDineSub = 0;
      let mealParcelSub = 0;
      let mealDineExp = 0;
      let mealParcelExp = 0;
      let mealDineAct = 0;
      let mealParcelAct = 0;

      categories.forEach((cat) => {
        mealSubTotal += cat.catSub;
        mealExpectedVendorTotal += cat.catExpVendor;
        mealActualVendorTotal += cat.catActVendor;
        if (cat.name.includes(UI_TEXT.parcel)) {
          mealParcelSub += cat.catSub;
          mealParcelExp += cat.catExpVendor;
          mealParcelAct += cat.catActVendor;
        } else {
          mealDineSub += cat.catSub;
          mealDineExp += cat.catExpVendor;
          mealDineAct += cat.catActVendor;
        }
      });

      daySubTotal += mealSubTotal;
      dayExpectedVendorTotal += mealExpectedVendorTotal;
      dayActualVendorTotal += mealActualVendorTotal;

      // Accumulate season totals
      if (categories.some(c => c.name.includes(memberLabel))) {
        categories.forEach(c => {
          if (c.name.includes(memberLabel)) {
            if (c.name.includes(UI_TEXT.parcel)) {
              seasonAdultParcelSub += c.catSub;
              seasonAdultParcelExp += c.catExpVendor;
              seasonAdultParcelAct += c.catActVendor;
            } else {
              seasonAdultDineSub += c.catSub;
              seasonAdultDineExp += c.catExpVendor;
              seasonAdultDineAct += c.catActVendor;
            }
          }
        });
      }
      if (kidsEnabled) {
        categories.forEach(c => {
          if (c.name.includes(UI_TEXT.kids)) {
            if (c.name.includes(UI_TEXT.parcel)) {
              seasonKidsParcelSub += c.catSub;
              seasonKidsParcelExp += c.catExpVendor;
              seasonKidsParcelAct += c.catActVendor;
            } else {
              seasonKidsDineSub += c.catSub;
              seasonKidsDineExp += c.catExpVendor;
              seasonKidsDineAct += c.catActVendor;
            }
          }
        });
      }
      if (guestsEnabled) {
        categories.forEach(c => {
          if (c.name.includes(UI_TEXT.guests)) {
            if (c.name.includes(UI_TEXT.parcel)) {
              seasonGuestsParcelSub += c.catSub;
              seasonGuestsParcelExp += c.catExpVendor;
              seasonGuestsParcelAct += c.catActVendor;
            } else {
              seasonGuestsDineSub += c.catSub;
              seasonGuestsDineExp += c.catExpVendor;
              seasonGuestsDineAct += c.catActVendor;
            }
          }
        });
      }
      if (freeMealEnabled) {
        categories.forEach(c => {
          if (c.name.includes(UI_TEXT.freeMealSuffix)) {
            if (c.name.includes(UI_TEXT.parcel)) {
              seasonFreeParcelAct += c.catActVendor;
            } else {
              seasonFreeDineExp += c.catExpVendor;
              seasonFreeDineAct += c.catActVendor;
            }
          }
        });
      }

      return {
        mKey,
        categories,
        gm,
        defAdultVegVendor,
        defAdultNvVendor,
        defAdultVegParcelVendor,
        defAdultNvParcelVendor,
        varieties,
        vEnabled,
        nvEnabled,
        mealSubTotal,
        mealExpectedVendorTotal,
        mealActualVendorTotal,
        mealExcessDeficiency: mealSubTotal - mealActualVendorTotal,
        mealDineSub,
        mealParcelSub,
        mealDineExp,
        mealParcelExp,
        mealDineAct,
        mealParcelAct,
      };
    }).filter(Boolean);

    seasonTotalSubscription += daySubTotal;
    seasonTotalExpectedVendor += dayExpectedVendorTotal;
    seasonTotalActualVendor += dayActualVendorTotal;

    return {
      dayId,
      colorScheme,
      mealReports,
      daySubTotal,
      dayExpectedVendorTotal,
      dayActualVendorTotal,
      dayExcessDeficiency: daySubTotal - dayActualVendorTotal,
    };
  }).filter(Boolean);

  const seasonNetExcessDeficiency = seasonTotalSubscription - seasonTotalActualVendor;
  const seasonSummaryA11yLabel = `${UI_TEXT.vendorPriceSeasonSummary}: Subscription Amount ${seasonTotalSubscription}, Expected Vendor Cost ${seasonTotalExpectedVendor}, Actual Vendor Cost ${seasonTotalActualVendor}, Net ${getExcessOrDeficiencyLabel(seasonNetExcessDeficiency)} ${seasonNetExcessDeficiency}`;

  const seasonTotalDineSub = seasonAdultDineSub + seasonKidsDineSub + seasonGuestsDineSub;
  const seasonTotalParcelSub = seasonAdultParcelSub + seasonKidsParcelSub + seasonGuestsParcelSub;

  const seasonTotalDineExp = seasonAdultDineExp + seasonKidsDineExp + seasonGuestsDineExp + seasonFreeDineExp;
  const seasonTotalParcelExp = seasonAdultParcelExp + seasonKidsParcelExp + seasonGuestsParcelExp;

  const seasonTotalDineAct = seasonAdultDineAct + seasonKidsDineAct + seasonGuestsDineAct + seasonFreeDineAct;
  const seasonTotalParcelAct = seasonAdultParcelAct + seasonKidsParcelAct + seasonGuestsParcelAct + seasonFreeParcelAct;

  const seasonExpectedDiff = seasonTotalExpectedVendor - seasonTotalSubscription;
  const seasonExpectedLabel = seasonExpectedDiff > 0 ? UI_TEXT.totalExpectedDeficiency : UI_TEXT.totalExpectedExcess;
  const seasonExpectedVal = Math.abs(seasonExpectedDiff);

  const seasonActualDiff = seasonTotalActualVendor - seasonTotalSubscription;
  const seasonActualLabel = seasonActualDiff > 0 ? UI_TEXT.totalActualDeficiency : UI_TEXT.totalActualExcess;
  const seasonActualVal = Math.abs(seasonActualDiff);

  const handleExportCsv = async () => {
    try {
      const rows: string[] = [];
      rows.push(`"${UI_TEXT.vendorReportTitle}"`);
      rows.push(`"${UI_TEXT.generatedDate}","${new Date().toLocaleDateString()}"`);
      rows.push("");

      // Season Summary
      rows.push(`"${UI_TEXT.seasonSummaryHeading}"`);
      rows.push(`"${UI_TEXT.metric}","${UI_TEXT.amountInr}","${UI_TEXT.details}"`);
      rows.push(`"${UI_TEXT.totalSubscriptionAmount}",${seasonTotalSubscription.toFixed(2)},"${UI_TEXT.totalPaidByMembers}"`);
      rows.push(`"${UI_TEXT.totalExpectedVendorCost}",${seasonTotalExpectedVendor.toFixed(2)},"${UI_TEXT.vendorCostExpectedDesc}"`);
      rows.push(`"${UI_TEXT.totalActualVendorCost}",${seasonTotalActualVendor.toFixed(2)},"${UI_TEXT.vendorCostActualDesc}"`);
      rows.push(`"${seasonExpectedLabel}",${seasonExpectedVal.toFixed(2)},"${UI_TEXT.expectedVsSubVariance}"`);
      rows.push(`"${seasonActualLabel}",${seasonActualVal.toFixed(2)},"${UI_TEXT.actualVsSubVariance}"`);
      rows.push("");

      // Season Subcategory Breakdown
      rows.push(`"${UI_TEXT.seasonSubcategoryBreakdownHeading}"`);
      rows.push(`"${UI_TEXT.category}","${UI_TEXT.serviceType}","${UI_TEXT.expectedVendorCostInr}","${UI_TEXT.actualVendorCostInr}"`);
      if (seasonTotalDineExp > 0 || seasonTotalDineAct > 0) {
        rows.push(`"${memberLabel} / General","${UI_TEXT.dineInService}",${seasonAdultDineExp.toFixed(2)},${seasonAdultDineAct.toFixed(2)}`);
      }
      if (seasonTotalParcelExp > 0 || seasonTotalParcelAct > 0) {
        rows.push(`"${memberLabel} / General","${UI_TEXT.parcelServiceLabel}",${seasonAdultParcelExp.toFixed(2)},${seasonAdultParcelAct.toFixed(2)}`);
      }
      if (kidsEnabled && (seasonKidsDineExp > 0 || seasonKidsDineAct > 0)) {
        rows.push(`"${UI_TEXT.kids}","${UI_TEXT.dineInService}",${seasonKidsDineExp.toFixed(2)},${seasonKidsDineAct.toFixed(2)}`);
      }
      if (kidsEnabled && (seasonKidsParcelExp > 0 || seasonKidsParcelAct > 0)) {
        rows.push(`"${UI_TEXT.kids}","${UI_TEXT.parcelServiceLabel}",${seasonKidsParcelExp.toFixed(2)},${seasonKidsParcelAct.toFixed(2)}`);
      }
      if (guestsEnabled && (seasonGuestsDineExp > 0 || seasonGuestsDineAct > 0)) {
        rows.push(`"${UI_TEXT.guests}","${UI_TEXT.dineInService}",${seasonGuestsDineExp.toFixed(2)},${seasonGuestsDineAct.toFixed(2)}`);
      }
      if (guestsEnabled && (seasonGuestsParcelExp > 0 || seasonGuestsParcelAct > 0)) {
        rows.push(`"${UI_TEXT.guests}","${UI_TEXT.parcelServiceLabel}",${seasonGuestsParcelExp.toFixed(2)},${seasonGuestsParcelAct.toFixed(2)}`);
      }
      if (freeMealEnabled && (seasonFreeDineExp > 0 || seasonFreeDineAct > 0 || seasonFreeParcelAct > 0)) {
        rows.push(`"${UI_TEXT.freeMeals}","${UI_TEXT.dineInService}",${seasonFreeDineExp.toFixed(2)},${seasonFreeDineAct.toFixed(2)}`);
        if (seasonFreeParcelAct > 0) {
          rows.push(`"${UI_TEXT.freeMeals}","${UI_TEXT.parcelServiceLabel}","0.00",${seasonFreeParcelAct.toFixed(2)}`);
        }
      }
      rows.push("");

      // Menu & Vendor Pricing Details
      rows.push(`"${UI_TEXT.menuVendorPricingDetailsHeading}"`);
      rows.push(`"${UI_TEXT.day}","${UI_TEXT.meal}","${UI_TEXT.varietyOrItem}","${UI_TEXT.adultPriceCol}","${UI_TEXT.kidsPriceCol}","${UI_TEXT.guestPriceCol}","${UI_TEXT.vendorMealPriceInr}","${UI_TEXT.vendorParcelPriceInr}"`);

      const fmtNum = (n: number | undefined | null) => (n && Number(n) > 0 ? Number(n).toFixed(2) : "");
      const fmtCell = (val: number | undefined | null, isCurrency: boolean = false) =>
        (val !== undefined && val !== null && !isNaN(val) && val !== 0 ? (isCurrency ? `"${val.toFixed(2)}"` : `"${val}"`) : '""');

      activeDays.forEach(dayId => {
        const dMenu = foodMenu[dayId];
        const dayLabel = getDayLabel(dayId, dayConfig);
        const dayConf = dayConfig.find(d => d.id === dayId);

        [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach(mKey => {
          const mealEnabled = isMealEnabled(dayId, mKey, dayConfig);
          const mealLabel = getMealLabel(mKey);

          if (!mealEnabled) {
            return;
          }

          const gm = dMenu?.[mKey];
          if (!gm) {
            return;
          }

          const mConf = dayConf ? dayConf[mKey] : undefined;
          const vEnabled = isDietaryEnabled(dayId, mKey, DietType.VEG, dayConfig);
          const nvEnabled = isDietaryEnabled(dayId, mKey, DietType.NON_VEG, dayConfig);
          const varieties = getMealVarieties(mConf, dayConf?.vegOnly);
          const defVeg = Number(gm.vegPrice ?? mConf?.vegPrice ?? 0);
          const defNv = Number(gm.nonVegPrice ?? mConf?.nonVegPrice ?? 0);
          const defVegVendor = Number(gm.vendorVegPrice ?? defVeg);
          const defNvVendor = Number(gm.vendorNonVegPrice ?? defNv);
          const defVegParcelVendor = Number(gm.vendorVegParcelPrice ?? Number(gm.vegParcelPrice ?? mConf?.vegParcelPrice ?? 0));
          const defNvParcelVendor = Number(gm.vendorNonVegParcelPrice ?? Number(gm.nonVegParcelPrice ?? mConf?.nonVegParcelPrice ?? 0));

          if (gm.varieties && Object.keys(gm.varieties).length > 0) {
            Object.entries(gm.varieties).forEach(([vKey, vData]: [string, any]) => {
              const matchedVar = varieties.find((v: any) => v.id === vKey) || getVarietyForChoice(vKey, varieties);
              const displayName = matchedVar?.name || vData?.name || vKey;
              const adPrice = Number(vData?.adultPrice || vData?.vendorPrice || (matchedVar?.type === DietType.VEG ? defVeg : defNv));
              const kPrice = Number(vData?.kidsPrice || vData?.kidsVegPrice || vData?.kidsNonVegPrice || 0);
              const gPrice = Number(vData?.guestPrice || vData?.guestsVegPrice || vData?.guestsNonVegPrice || 0);
              const vPrice = Number(vData?.vendorPrice || vData?.adultPrice || defVegVendor);
              const vParcelPrice = Number(vData?.vendorParcelPrice || vData?.parcelPrice || defVegParcelVendor);
              rows.push(`"${dayLabel}","${mealLabel}","${displayName}",${fmtNum(adPrice)},${fmtNum(kPrice)},${fmtNum(gPrice)},${fmtNum(vPrice)},${fmtNum(vParcelPrice)}`);
            });
          } else {
            const kidsVeg = Number(gm?.kidsVegPrice || 0);
            const guestsVeg = Number(gm?.guestsVegPrice || 0);
            const kidsNv = Number(gm?.kidsNonVegPrice || 0);
            const guestsNv = Number(gm?.guestsNonVegPrice || 0);

            if (vEnabled) {
              rows.push(`"${dayLabel}","${mealLabel}","${UI_TEXT.veg}",${fmtNum(defVeg)},${fmtNum(kidsVeg)},${fmtNum(guestsVeg)},${fmtNum(defVegVendor)},${fmtNum(defVegParcelVendor)}`);
            }

            if (nvEnabled) {
              rows.push(`"${dayLabel}","${mealLabel}","${UI_TEXT.nonVeg}",${fmtNum(defNv)},${fmtNum(kidsNv)},${fmtNum(guestsNv)},${fmtNum(defNvVendor)},${fmtNum(defNvParcelVendor)}`);
            }
          }
        });
      });
      rows.push("");

      // Detailed Calculation Breakup (Expected vs Actual Side-by-Side)
      rows.push(`"${UI_TEXT.detailedCalculationBreakupHeading}"`);
      rows.push(`"${UI_TEXT.day}","${UI_TEXT.meal}","${UI_TEXT.categoryOrSubcategory}","${UI_TEXT.typeCol}","${UI_TEXT.plannedCountCol}","${UI_TEXT.servedCountCol}","${UI_TEXT.subscriptionAmountInr}","${UI_TEXT.expectedVendorCostInr}","${UI_TEXT.actualVendorCostInr}","${UI_TEXT.varianceSubActual}"`);

      activeDays.forEach((dayId) => {
        const dayLabel = getDayLabel(dayId, dayConfig);
        const dayRep = dayReports.find((d: any) => d?.dayId === dayId);

        [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mKey) => {
          const mealEnabled = isMealEnabled(dayId, mKey, dayConfig);
          const mealLabel = getMealLabel(mKey);

          if (!mealEnabled) {
            return;
          }

          const mRep = dayRep?.mealReports?.find((m: any) => m?.mKey === mKey);
          if (!mRep || !mRep.categories || mRep.categories.length === 0) {
            return;
          }

          mRep.categories.forEach((cat: any) => {
            const isParcel = cat.name.includes(UI_TEXT.parcel);
            const serviceType = isParcel ? UI_TEXT.parcelType : UI_TEXT.dineInType;
            const catNameClean = cat.name.replace(/"/g, '""');
            const variance = cat.catSub - cat.catActVendor;
            rows.push(`"${dayLabel}","${mealLabel}","  - ${catNameClean}","${serviceType}",${fmtCell(cat.planned)},${fmtCell(cat.served)},${fmtCell(cat.catSub, true)},${fmtCell(cat.catExpVendor, true)},${fmtCell(cat.catActVendor, true)},${fmtCell(variance, true)}`);
          });

          const mealVariance = mRep.mealSubTotal - mRep.mealActualVendorTotal;
          rows.push(`"${dayLabel}","${mealLabel}","${UI_TEXT.mealTotalLabel}","${UI_TEXT.allType}",,,${fmtCell(mRep.mealSubTotal, true)},${fmtCell(mRep.mealExpectedVendorTotal, true)},${fmtCell(mRep.mealActualVendorTotal, true)},${fmtCell(mealVariance, true)}`);
        });

        if (dayRep) {
          const dayVariance = dayRep.daySubTotal - dayRep.dayActualVendorTotal;
          rows.push(`"${dayLabel}","${UI_TEXT.dayTotalLabel}","","${UI_TEXT.allType}",,,${fmtCell(dayRep.daySubTotal, true)},${fmtCell(dayRep.dayExpectedVendorTotal, true)},${fmtCell(dayRep.dayActualVendorTotal, true)},${fmtCell(dayVariance, true)}`);
        }
      });

      const seasonVariance = seasonTotalSubscription - seasonTotalActualVendor;
      rows.push(`"${UI_TEXT.grandTotalLabel}","","","${UI_TEXT.allType}",,,${fmtCell(seasonTotalSubscription, true)},${fmtCell(seasonTotalExpectedVendor, true)},${fmtCell(seasonTotalActualVendor, true)},${fmtCell(seasonVariance, true)}`);

      const csvContent = rows.join("\n");
      const fileName = `vendor_meal_wise_report_${new Date().toISOString().slice(0, 10)}.csv`;

      if (Platform.OS === "web") {
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const { FileSystem, Sharing } = await import("expo-file-system" as any).catch(() => ({}) as any);
        if (FileSystem && FileSystem.documentDirectory) {
          const fileUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
          if (Sharing && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: UI_TEXT.exportVendorCsv });
          }
        } else {
          const { Share } = await import("react-native");
          await Share.share({
            message: csvContent,
            title: fileName,
          });
        }
      }
    } catch (err) {
      console.error("Failed to export vendor report CSV", err);
    }
  };

  return (
    <View style={{ gap: 16 }}>
      {/* Top Season Summary Card */}
      <View
        style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}
        accessible={true}
        accessibilityRole="summary"
        accessibilityLabel={seasonSummaryA11yLabel}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap", justifyContent: "space-between" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 160 }}>
            <Ionicons name="receipt-outline" size={20} color={theme.colors.white} />
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1, flexWrap: "wrap" }} numberOfLines={2}>
              {UI_TEXT.vendorPriceSeasonSummary}
            </Text>
          </View>
          <Pressable
            onPress={handleExportCsv}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={UI_TEXT.exportVendorCsv}
            style={({ pressed }) => [
              {
                backgroundColor: theme.colors.surface + "33",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                borderWidth: 1,
                borderColor: theme.colors.white + "60",
              },
              pressed && { opacity: 0.8 }
            ]}
          >
            <Ionicons name="download-outline" size={16} color={theme.colors.white} />
            <Text style={{ color: theme.colors.white, fontWeight: "800", fontSize: 12 }}>
              {UI_TEXT.exportVendorCsv}
            </Text>
          </Pressable>
        </View>

        <View style={{ gap: 12, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
          {/* 1. Total Subscription Amount (Meal vs Parcel with subcategories) */}
          <View style={{ gap: 4 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "900", flex: 1, marginRight: 8 }} numberOfLines={1}>
                {UI_TEXT.totalSubscriptionAmount}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 15, fontWeight: "900", flexShrink: 0 }} numberOfLines={1}>
                {UI_TEXT.rs} {formatCurrencyAmount(seasonTotalSubscription)}
              </Text>
            </View>

            {/* Meal Service Subcategory */}
            {seasonTotalDineSub > 0 && (
              <View style={{ paddingLeft: 10, gap: 2, marginTop: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: theme.colors.white + "CC", fontSize: 12, fontWeight: "800" }}>• {UI_TEXT.mealService}</Text>
                  <Text style={{ color: theme.colors.white + "DD", fontSize: 12, fontWeight: "800" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonTotalDineSub)}</Text>
                </View>
                <View style={{ paddingLeft: 12, gap: 2 }}>
                  {seasonAdultDineSub > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {memberLabel}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonAdultDineSub)}</Text>
                    </View>
                  )}
                  {kidsEnabled && seasonKidsDineSub > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.kids}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonKidsDineSub)}</Text>
                    </View>
                  )}
                  {guestsEnabled && seasonGuestsDineSub > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.guests}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonGuestsDineSub)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Parcel Service Subcategory */}
            {seasonTotalParcelSub > 0 && (
              <View style={{ paddingLeft: 10, gap: 2, marginTop: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: theme.colors.white + "CC", fontSize: 12, fontWeight: "800" }}>• {UI_TEXT.parcelService}</Text>
                  <Text style={{ color: theme.colors.white + "DD", fontSize: 12, fontWeight: "800" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonTotalParcelSub)}</Text>
                </View>
                <View style={{ paddingLeft: 12, gap: 2 }}>
                  {seasonAdultParcelSub > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {memberLabel}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonAdultParcelSub)}</Text>
                    </View>
                  )}
                  {kidsEnabled && seasonKidsParcelSub > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.kids}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonKidsParcelSub)}</Text>
                    </View>
                  )}
                  {guestsEnabled && seasonGuestsParcelSub > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.guests}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonGuestsParcelSub)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* 2. Total Expected Vendor Cost (Meal vs Parcel with subcategories) */}
          <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: theme.colors.white + "30", paddingTop: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "900", flex: 1, marginRight: 8 }} numberOfLines={1}>
                {UI_TEXT.totalExpectedVendorCost}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 15, fontWeight: "900", flexShrink: 0 }} numberOfLines={1}>
                {UI_TEXT.rs} {formatCurrencyAmount(seasonTotalExpectedVendor)}
              </Text>
            </View>

            {/* Meal Service Subcategory */}
            {seasonTotalDineExp > 0 && (
              <View style={{ paddingLeft: 10, gap: 2, marginTop: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: theme.colors.white + "CC", fontSize: 12, fontWeight: "800" }}>• {UI_TEXT.mealService}</Text>
                  <Text style={{ color: theme.colors.white + "DD", fontSize: 12, fontWeight: "800" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonTotalDineExp)}</Text>
                </View>
                <View style={{ paddingLeft: 12, gap: 2 }}>
                  {seasonAdultDineExp > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {memberLabel}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonAdultDineExp)}</Text>
                    </View>
                  )}
                  {kidsEnabled && seasonKidsDineExp > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.kids}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonKidsDineExp)}</Text>
                    </View>
                  )}
                  {guestsEnabled && seasonGuestsDineExp > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.guests}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonGuestsDineExp)}</Text>
                    </View>
                  )}
                  {freeMealEnabled && seasonFreeDineExp > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.freeMealSuffix}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonFreeDineExp)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Parcel Service Subcategory */}
            {seasonTotalParcelExp > 0 && (
              <View style={{ paddingLeft: 10, gap: 2, marginTop: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: theme.colors.white + "CC", fontSize: 12, fontWeight: "800" }}>• {UI_TEXT.parcelService}</Text>
                  <Text style={{ color: theme.colors.white + "DD", fontSize: 12, fontWeight: "800" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonTotalParcelExp)}</Text>
                </View>
                <View style={{ paddingLeft: 12, gap: 2 }}>
                  {seasonAdultParcelExp > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {memberLabel}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonAdultParcelExp)}</Text>
                    </View>
                  )}
                  {kidsEnabled && seasonKidsParcelExp > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.kids}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonKidsParcelExp)}</Text>
                    </View>
                  )}
                  {guestsEnabled && seasonGuestsParcelExp > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.guests}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonGuestsParcelExp)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* 3. Total Expected Excess / Deficiency Summary */}
          <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.white + "30", paddingTop: 8, marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 15, flex: 1, marginRight: 8 }} numberOfLines={1}>
              {seasonExpectedLabel}
            </Text>
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flexShrink: 0 }} numberOfLines={1}>
              {UI_TEXT.rs} {formatCurrencyAmount(seasonExpectedVal)}
            </Text>
          </View>

          {/* 4. Total Actual Vendor Cost (Meal vs Parcel with subcategories) */}
          <View style={{ gap: 4, borderTopWidth: 1, borderTopColor: theme.colors.white + "30", paddingTop: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "900", flex: 1, marginRight: 8 }} numberOfLines={1}>
                {UI_TEXT.totalActualVendorCost}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 15, fontWeight: "900", flexShrink: 0 }} numberOfLines={1}>
                {UI_TEXT.rs} {formatCurrencyAmount(seasonTotalActualVendor)}
              </Text>
            </View>

            {/* Meal Service Subcategory */}
            {seasonTotalDineAct > 0 && (
              <View style={{ paddingLeft: 10, gap: 2, marginTop: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: theme.colors.white + "CC", fontSize: 12, fontWeight: "800" }}>• {UI_TEXT.mealService}</Text>
                  <Text style={{ color: theme.colors.white + "DD", fontSize: 12, fontWeight: "800" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonTotalDineAct)}</Text>
                </View>
                <View style={{ paddingLeft: 12, gap: 2 }}>
                  {seasonAdultDineAct > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {memberLabel}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonAdultDineAct)}</Text>
                    </View>
                  )}
                  {kidsEnabled && seasonKidsDineAct > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.kids}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonKidsDineAct)}</Text>
                    </View>
                  )}
                  {guestsEnabled && seasonGuestsDineAct > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.guests}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonGuestsDineAct)}</Text>
                    </View>
                  )}
                  {freeMealEnabled && seasonFreeDineAct > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.freeMealSuffix}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonFreeDineAct)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Parcel Service Subcategory */}
            {seasonTotalParcelAct > 0 && (
              <View style={{ paddingLeft: 10, gap: 2, marginTop: 4 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ color: theme.colors.white + "CC", fontSize: 12, fontWeight: "800" }}>• {UI_TEXT.parcelService}</Text>
                  <Text style={{ color: theme.colors.white + "DD", fontSize: 12, fontWeight: "800" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonTotalParcelAct)}</Text>
                </View>
                <View style={{ paddingLeft: 12, gap: 2 }}>
                  {seasonAdultParcelAct > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {memberLabel}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonAdultParcelAct)}</Text>
                    </View>
                  )}
                  {kidsEnabled && seasonKidsParcelAct > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.kids}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonKidsParcelAct)}</Text>
                    </View>
                  )}
                  {guestsEnabled && seasonGuestsParcelAct > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.guests}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonGuestsParcelAct)}</Text>
                    </View>
                  )}
                  {freeMealEnabled && seasonFreeParcelAct > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 11, fontWeight: "600" }}>{UI_TEXT.hyphen} {UI_TEXT.freeMealSuffix}</Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700" }}>{UI_TEXT.rs} {formatCurrencyAmount(seasonFreeParcelAct)}</Text>
                    </View>
                  )}
                </View>
              </View>
            )}
          </View>

          {/* 5. Total Actual Excess / Deficiency Summary */}
          <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 8, marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 16, flex: 1, marginRight: 8 }} numberOfLines={1}>
              {seasonActualLabel}
            </Text>
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 20, flexShrink: 0 }} numberOfLines={1}>
              {UI_TEXT.rs} {formatCurrencyAmount(seasonActualVal)}
            </Text>
          </View>
        </View>
      </View>

      {/* Day-Wise Breakdown Cards */}
      {dayReports.map((dayRep: any) => {
        if (!dayRep) return null;
        const { dayId, colorScheme, mealReports, daySubTotal, dayExpectedVendorTotal, dayActualVendorTotal, dayExcessDeficiency } = dayRep;

        return (
          <View key={dayId} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
            <View style={[styles.dashboardCardTop, { borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 12, marginBottom: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }]}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{getDayLabel(dayId, dayConfig)}</Text>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary }}>
                {UI_TEXT.paid}: {UI_TEXT.rs} {formatCurrencyAmount(daySubTotal)} | {UI_TEXT.actualVendorCost}: {UI_TEXT.rs} {formatCurrencyAmount(dayActualVendorTotal)}
              </Text>
            </View>

            <View style={{ gap: 12 }}>
              {mealReports.map((mRep: any) => {
                if (!mRep) return null;
                const {
                  mKey,
                  categories,
                  gm,
                  defAdultVegVendor,
                  defAdultNvVendor,
                  defAdultVegParcelVendor,
                  defAdultNvParcelVendor,
                  varieties,
                  vEnabled,
                  nvEnabled,
                  mealSubTotal,
                  mealExpectedVendorTotal,
                  mealActualVendorTotal,
                  mealExcessDeficiency,
                  mealDineSub,
                  mealParcelSub,
                } = mRep;

                const isSpecial = isSpecialMeal(dayId, mKey, dayConfig);

                return (
                  <View
                    key={mKey}
                    style={{
                      backgroundColor: theme.colors.surfaceDark + (theme.themeType === AppThemeMode.DARK ? "66" : "80"),
                      borderRadius: 16,
                      padding: 12,
                      borderWidth: isSpecial ? 2 : 1,
                      borderColor: isSpecial ? theme.colors.specialMealBorder : theme.colors.border,
                      gap: 10
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <View style={{ flex: 1, minWidth: 120, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                          <Ionicons
                            name={mKey === MealType.BREAKFAST ? "sunny-outline" : mKey === MealType.LUNCH ? "restaurant-outline" : "moon-outline"}
                            size={16}
                            color={theme.colors.primary}
                          />
                          <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary }}>
                            {getMealLabel(mKey)}
                          </Text>
                          {isSpecial && (
                            <View style={{ backgroundColor: theme.colors.specialMealBorder, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <Ionicons name="star" size={10} color={theme.colors.white} />
                              <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.specialMealBadge}</Text>
                            </View>
                          )}
                        </View>
                        {mealParcelSub > 0 && (
                          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, paddingLeft: 22 }}>
                            {UI_TEXT.openParen}{UI_TEXT.meal}{UI_TEXT.colon}{UI_TEXT.space}{UI_TEXT.rs}{formatCurrencyAmount(mealDineSub)}{UI_TEXT.space}{UI_TEXT.pipe}{UI_TEXT.space}{UI_TEXT.parcel}{UI_TEXT.colon}{UI_TEXT.space}{UI_TEXT.rs}{formatCurrencyAmount(mealParcelSub)}{UI_TEXT.closeParen}
                          </Text>
                        )}
                      </View>

                      <View style={{ backgroundColor: theme.colors.primary + "22", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary, flexShrink: 0 }}>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: theme.colors.primary }}>
                          {getExcessOrDeficiencyLabel(mealExcessDeficiency)}{UI_TEXT.colon}{UI_TEXT.space}{UI_TEXT.rs}{UI_TEXT.space}{formatCurrencyAmount(Math.abs(mealExcessDeficiency))}
                        </Text>
                      </View>
                    </View>

                    {/* Meal Vendor Prices Info Bar (Showing actual menu varieties if present, or fallback to default veg/non-veg without duplication) */}
                    <View style={{ backgroundColor: theme.colors.surface + "AA", borderRadius: 10, padding: 8, borderWidth: 1, borderColor: theme.colors.border, gap: 4 }}>
                      <Text style={{ fontSize: 10, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                        {UI_TEXT.vendorPricesLabel}
                      </Text>
                      {gm?.varieties && Object.keys(gm.varieties).length > 0 ? (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 2 }}>
                          {Object.entries(gm.varieties).map(([vKey, vData]: [string, any]) => {
                            const matchedVar = varieties.find((v: any) => v.id === vKey) || getVarietyForChoice(vKey, varieties);
                            const displayName = matchedVar?.name || vData?.name || vKey;
                            const isVegVar = matchedVar ? matchedVar.type === DietType.VEG : (vKey.toLowerCase().includes("veg") || displayName.toLowerCase().includes("veg"));
                            const vPrice = vData?.vendorPrice || vData?.adultPrice || (isVegVar ? defAdultVegVendor : defAdultNvVendor) || "-";
                            const vParcelPrice = vData?.vendorParcelPrice || vData?.parcelPrice || (isVegVar ? defAdultVegParcelVendor : defAdultNvParcelVendor) || "-";
                            return (
                              <Text key={vKey} style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textPrimary }}>
                                • {displayName}: {UI_TEXT.rs}{vPrice} {vParcelPrice && vParcelPrice !== "-" ? `(${UI_TEXT.parcelAbbr}: ${UI_TEXT.rs}${vParcelPrice})` : ""}
                              </Text>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                          {vEnabled && (
                            <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.veg }}>
                              • {UI_TEXT.veg}: {UI_TEXT.rs}{defAdultVegVendor} {defAdultVegParcelVendor > 0 ? `(${UI_TEXT.parcelAbbr}: ${UI_TEXT.rs}${defAdultVegParcelVendor})` : ""}
                            </Text>
                          )}
                          {nvEnabled && (
                            <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.nonVeg }}>
                              • {UI_TEXT.nonVeg}: {UI_TEXT.rs}{defAdultNvVendor} {defAdultNvParcelVendor > 0 ? `(${UI_TEXT.parcelAbbr}: ${UI_TEXT.rs}${defAdultNvParcelVendor})` : ""}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>

                    {/* Category Breakdown */}
                    <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8 }}>
                      {categories.map((cat: any, cIdx: number) => {
                        return (
                          <View key={cIdx} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6, paddingVertical: 2 }}>
                            <View style={{ flex: 1, minWidth: 120 }}>
                              <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary }}>
                                {cat.name}
                              </Text>
                              <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textMuted }}>
                                {UI_TEXT.planLabel}{UI_TEXT.colon}{UI_TEXT.space}{cat.planned}{UI_TEXT.space}{UI_TEXT.pipe}{UI_TEXT.space}{UI_TEXT.servedLabel}{UI_TEXT.colon}{UI_TEXT.space}{cat.served}
                              </Text>
                            </View>
                            <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.textPrimary }}>
                                {UI_TEXT.subLabel}{UI_TEXT.colon}{UI_TEXT.space}{UI_TEXT.rs}{formatCurrencyAmount(cat.catSub)}
                              </Text>
                              <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary }}>
                                {UI_TEXT.expLabel}{UI_TEXT.colon}{UI_TEXT.space}{UI_TEXT.rs}{formatCurrencyAmount(cat.catExpVendor)}
                              </Text>
                              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.primary }}>
                                {UI_TEXT.actLabel}{UI_TEXT.colon}{UI_TEXT.space}{UI_TEXT.rs}{formatCurrencyAmount(cat.catActVendor)}
                              </Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>

                    {/* Meal Expected vs Actual Side-by-Side Comparison Footer */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8, marginTop: 4, flexWrap: "wrap", gap: 8 }}>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                          {UI_TEXT.expectedVendorCost}
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: "900", color: theme.colors.textPrimary, marginTop: 1 }}>
                          {UI_TEXT.rs} {formatCurrencyAmount(mealExpectedVendorTotal)}
                        </Text>
                      </View>
                      <View style={{ flex: 1, minWidth: 120, alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                          {UI_TEXT.actualVendorCost}
                        </Text>
                        <Text style={{ fontSize: 15, fontWeight: "900", color: theme.colors.primary, marginTop: 1 }}>
                          {UI_TEXT.rs} {formatCurrencyAmount(mealActualVendorTotal)}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
