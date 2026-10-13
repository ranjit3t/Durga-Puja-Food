import React from "react";
import { View, Text } from "react-native";
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
  isParcelEnabled,
  isKidsParcelEnabled,
  isGuestsParcelEnabled,
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
  let seasonFreeDineExp = 0, seasonFreeDineAct = 0;

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

      // Track Dine-In vs Parcel separately for each category
      let adultDinePlanned = 0, adultDineServed = 0, adultDineSub = 0, adultDineExp = 0, adultDineAct = 0;
      let adultParcelPlanned = 0, adultParcelServed = 0, adultParcelSub = 0, adultParcelExp = 0, adultParcelAct = 0;

      let kidsDinePlanned = 0, kidsDineServed = 0, kidsDineSub = 0, kidsDineExp = 0, kidsDineAct = 0;
      let kidsParcelPlanned = 0, kidsParcelServed = 0, kidsParcelSub = 0, kidsParcelExp = 0, kidsParcelAct = 0;

      let guestsDinePlanned = 0, guestsDineServed = 0, guestsDineSub = 0, guestsDineExp = 0, guestsDineAct = 0;
      let guestsParcelPlanned = 0, guestsParcelServed = 0, guestsParcelSub = 0, guestsParcelExp = 0, guestsParcelAct = 0;

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
          const matchedVar = varieties.find(v => v.id === m.choice);
          const isVeg = matchedVar ? matchedVar.type === DietType.VEG : (m.choice === DietType.VEG || m.choice.toLowerCase().includes("veg"));
          const varMenu = gm.varieties?.[m.choice];

          // Vendor meal & parcel prices
          const baseVendorMeal = varMenu?.vendorPrice ? Number(varMenu.vendorPrice) : (isVeg ? defAdultVegVendor : defAdultNvVendor);
          const varVendorMeal = (m.category === "kid" && vendorKidsMealChargingEnabled === false) ? 0 : baseVendorMeal;
          const varVendorParcel = varMenu?.vendorParcelPrice ? Number(varMenu.vendorParcelPrice) : (isVeg ? defAdultVegParcelVendor : defAdultNvParcelVendor);

          const slotParcelSub = m.isParcelAllowed ? m.parcelPrice : 0;
          const slotDineSub = m.netPayment - slotParcelSub;

          const dineExp = varVendorMeal;
          const dineAct = m.isMealTaken ? varVendorMeal : 0;
          const parcelExp = m.isParcelAllowed ? varVendorParcel : 0;
          const parcelAct = m.isParcelTaken ? varVendorParcel : 0;

          if (m.category === "guest") {
            if (guestsEnabled) {
              guestsDineSub += slotDineSub;
              guestsDineExp += dineExp;
              guestsDineAct += dineAct;
              guestsDinePlanned++;
              if (m.isMealTaken) guestsDineServed++;

              if (m.isParcelAllowed) {
                guestsParcelSub += slotParcelSub;
                guestsParcelExp += parcelExp;
                guestsParcelAct += parcelAct;
                guestsParcelPlanned++;
                if (m.isParcelTaken) guestsParcelServed++;
              }
            }
          } else if (m.category === "kid") {
            if (kidsEnabled) {
              kidsDineSub += slotDineSub;
              kidsDineExp += dineExp;
              kidsDineAct += dineAct;
              kidsDinePlanned++;
              if (m.isMealTaken) kidsDineServed++;

              if (m.isParcelAllowed) {
                kidsParcelSub += slotParcelSub;
                kidsParcelExp += parcelExp;
                kidsParcelAct += parcelAct;
                kidsParcelPlanned++;
                if (m.isParcelTaken) kidsParcelServed++;
              }
            }
          } else {
            adultDineSub += slotDineSub;
            adultDineExp += dineExp;
            adultDineAct += dineAct;
            adultDinePlanned++;
            if (m.isMealTaken) adultDineServed++;

            if (m.isParcelAllowed) {
              adultParcelSub += slotParcelSub;
              adultParcelExp += parcelExp;
              adultParcelAct += parcelAct;
              adultParcelPlanned++;
              if (m.isParcelTaken) adultParcelServed++;
            }
          }
        });
      });

      const freeVegPlanned = (freeMealEnabled && vEnabled) ? fmCounts.freeMealVeg : 0;
      const freeNonVegPlanned = (freeMealEnabled && nvEnabled) ? fmCounts.freeMealNonVeg : 0;
      const freeVegServed = (freeMealEnabled && vEnabled) ? fmCounts.freeMealVegTaken : 0;
      const freeNonVegServed = (freeMealEnabled && nvEnabled) ? fmCounts.freeMealNonVegTaken : 0;

      const freeDineExp = (freeVegPlanned * defAdultVegVendor) + (freeNonVegPlanned * defAdultNvVendor);
      const freeDineAct = (freeVegServed * defAdultVegVendor) + (freeNonVegServed * defAdultNvVendor);

      seasonAdultDineSub += adultDineSub; seasonAdultParcelSub += adultParcelSub;
      seasonAdultDineExp += adultDineExp; seasonAdultParcelExp += adultParcelExp;
      seasonAdultDineAct += adultDineAct; seasonAdultParcelAct += adultParcelAct;

      if (kidsEnabled) {
        seasonKidsDineSub += kidsDineSub; seasonKidsParcelSub += kidsParcelSub;
        seasonKidsDineExp += kidsDineExp; seasonKidsParcelExp += kidsParcelExp;
        seasonKidsDineAct += kidsDineAct; seasonKidsParcelAct += kidsParcelAct;
      }
      if (guestsEnabled) {
        seasonGuestsDineSub += guestsDineSub; seasonGuestsParcelSub += guestsParcelSub;
        seasonGuestsDineExp += guestsDineExp; seasonGuestsParcelExp += guestsParcelExp;
        seasonGuestsDineAct += guestsDineAct; seasonGuestsParcelAct += guestsParcelAct;
      }
      if (freeMealEnabled) {
        seasonFreeDineExp += freeDineExp;
        seasonFreeDineAct += freeDineAct;
      }

      const categories = [
        ...(adultDinePlanned > 0 || adultDineServed > 0 || adultDineSub > 0 ? [{
          name: `${memberLabel} (${UI_TEXT.dineIn})`,
          planned: adultDinePlanned,
          served: adultDineServed,
          catSub: adultDineSub,
          catExpVendor: adultDineExp,
          catActVendor: adultDineAct,
        }] : []),
        ...(adultParcelPlanned > 0 || adultParcelServed > 0 || adultParcelSub > 0 ? [{
          name: `${memberLabel} (${UI_TEXT.parcel})`,
          planned: adultParcelPlanned,
          served: adultParcelServed,
          catSub: adultParcelSub,
          catExpVendor: adultParcelExp,
          catActVendor: adultParcelAct,
        }] : []),
        ...(kidsEnabled ? [
          ...(kidsDinePlanned > 0 || kidsDineServed > 0 || kidsDineSub > 0 ? [{
            name: `${UI_TEXT.kids} (${UI_TEXT.dineIn})`,
            planned: kidsDinePlanned,
            served: kidsDineServed,
            catSub: kidsDineSub,
            catExpVendor: kidsDineExp,
            catActVendor: kidsDineAct,
          }] : []),
          ...(kidsParcelPlanned > 0 || kidsParcelServed > 0 || kidsParcelSub > 0 ? [{
            name: `${UI_TEXT.kids} (${UI_TEXT.parcel})`,
            planned: kidsParcelPlanned,
            served: kidsParcelServed,
            catSub: kidsParcelSub,
            catExpVendor: kidsParcelExp,
            catActVendor: kidsParcelAct,
          }] : []),
        ] : []),
        ...(guestsEnabled ? [
          ...(guestsDinePlanned > 0 || guestsDineServed > 0 || guestsDineSub > 0 ? [{
            name: `${UI_TEXT.guests} (${UI_TEXT.dineIn})`,
            planned: guestsDinePlanned,
            served: guestsDineServed,
            catSub: guestsDineSub,
            catExpVendor: guestsDineExp,
            catActVendor: guestsDineAct,
          }] : []),
          ...(guestsParcelPlanned > 0 || guestsParcelServed > 0 || guestsParcelSub > 0 ? [{
            name: `${UI_TEXT.guests} (${UI_TEXT.parcel})`,
            planned: guestsParcelPlanned,
            served: guestsParcelServed,
            catSub: guestsParcelSub,
            catExpVendor: guestsParcelExp,
            catActVendor: guestsParcelAct,
          }] : []),
        ] : []),
        ...(freeMealEnabled && (freeVegPlanned + freeNonVegPlanned > 0 || freeVegServed + freeNonVegServed > 0) ? [{
          name: `${UI_TEXT.freeMealSuffix} (${UI_TEXT.dineIn})`,
          planned: freeVegPlanned + freeNonVegPlanned,
          served: freeVegServed + freeNonVegServed,
          catSub: 0,
          catExpVendor: freeDineExp,
          catActVendor: freeDineAct,
        }] : []),
      ].filter(cat => cat.planned > 0 || cat.served > 0 || cat.catSub > 0 || cat.catExpVendor > 0 || cat.catActVendor > 0);

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

      return {
        mKey,
        categories,
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
  const seasonTotalParcelAct = seasonAdultParcelAct + seasonKidsParcelAct + seasonGuestsParcelAct;

  const seasonExpectedDiff = seasonTotalExpectedVendor - seasonTotalSubscription;
  const seasonExpectedLabel = seasonExpectedDiff > 0 ? UI_TEXT.totalExpectedDeficiency : UI_TEXT.totalExpectedExcess;
  const seasonExpectedVal = Math.abs(seasonExpectedDiff);

  const seasonActualDiff = seasonTotalActualVendor - seasonTotalSubscription;
  const seasonActualLabel = seasonActualDiff > 0 ? UI_TEXT.totalActualDeficiency : UI_TEXT.totalActualExcess;
  const seasonActualVal = Math.abs(seasonActualDiff);

  return (
    <View style={{ gap: 16 }}>
      {/* Top Season Summary Card */}
      <View
        style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}
        accessible={true}
        accessibilityRole="summary"
        accessibilityLabel={seasonSummaryA11yLabel}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <Ionicons name="receipt-outline" size={20} color={theme.colors.white} />
          <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1, flexWrap: "wrap" }} numberOfLines={2}>
            {UI_TEXT.vendorPriceSeasonSummary}
          </Text>
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
                const { mKey, categories, mealSubTotal, mealExpectedVendorTotal, mealActualVendorTotal, mealExcessDeficiency, mealDineSub, mealParcelSub } = mRep;

                return (
                  <View
                    key={mKey}
                    style={{ backgroundColor: theme.colors.surfaceDark + (theme.themeType === AppThemeMode.DARK ? "66" : "80"), borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.colors.border, gap: 10 }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                      <View style={{ flex: 1, minWidth: 120, gap: 2 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Ionicons
                            name={mKey === MealType.BREAKFAST ? "sunny-outline" : mKey === MealType.LUNCH ? "restaurant-outline" : "moon-outline"}
                            size={16}
                            color={theme.colors.primary}
                          />
                          <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary }}>
                            {getMealLabel(mKey)}
                          </Text>
                        </View>
                        {mealParcelSub > 0 && (
                          <Text style={{ fontSize: 12, fontWeight: '700', color: theme.colors.textSecondary, paddingLeft: 22 }}>
                            {UI_TEXT.openParen}{UI_TEXT.dineIn}{UI_TEXT.colon}{UI_TEXT.space}{UI_TEXT.rs}{formatCurrencyAmount(mealDineSub)}{UI_TEXT.space}{UI_TEXT.pipe}{UI_TEXT.space}{UI_TEXT.parcel}{UI_TEXT.colon}{UI_TEXT.space}{UI_TEXT.rs}{formatCurrencyAmount(mealParcelSub)}{UI_TEXT.closeParen}
                          </Text>
                        )}
                      </View>

                      <View style={{ backgroundColor: theme.colors.primary + "22", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary, flexShrink: 0 }}>
                        <Text style={{ fontSize: 12, fontWeight: '900', color: theme.colors.primary }}>
                          {getExcessOrDeficiencyLabel(mealExcessDeficiency)}{UI_TEXT.colon}{UI_TEXT.space}{UI_TEXT.rs}{UI_TEXT.space}{formatCurrencyAmount(Math.abs(mealExcessDeficiency))}
                        </Text>
                      </View>
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
