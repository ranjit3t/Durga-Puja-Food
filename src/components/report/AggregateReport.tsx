import React, { useState, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { Dropdown } from "../common/Dropdown";
import { ReportSummaryCard } from "./ReportSummaryCard";
import { ConfigDay, MealType, DietType, DietaryOption, SubscriptionRecord, FoodMenu, PaymentMode, FoodPackage, TakenState } from "../../domain";
import {
  getDayLabel,
  getMealLabel,
  isMealEnabled,
  getDietTypeForChoice,
  getMealVarieties,
  isParcelEnabled,
  formatTimestamp,
  isDietaryEnabled,
  isMealSlotAbsent,
} from "../../constants";
import {
  calculatePassMealBreakdown,
} from "../../utils/paymentUtils";
import { useAppNavigation } from "../../context/NavigationContext";

interface AggregateReportProps {
  subscriptions: SubscriptionRecord[];
  dayConfig: ConfigDay[];
  foodMenu: FoodMenu;
  seasonName: string;
  kidsEnabled: boolean;
  guestsEnabled: boolean;
  freeMealEnabled: boolean;
  paymentConfig: any;
  foodPackages: FoodPackage[] | Record<string, FoodPackage>;
  onSelectFlat: (id: string) => void;
  isCapturing?: boolean;
}

function useOptionalNavigation() {
  try {
    return useAppNavigation();
  } catch {
    return null;
  }
}

export function AggregateReport({
  subscriptions,
  dayConfig,
  foodMenu,
  seasonName,
  kidsEnabled,
  guestsEnabled,
  freeMealEnabled,
  paymentConfig,
  foodPackages,
  onSelectFlat,
  isCapturing = false,
}: AggregateReportProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const nav = useOptionalNavigation();

  // Local fallback states for isolation/Storybook
  const [localBlock, setLocalBlock] = useState<string>(UI_TEXT.allBlocks);
  const [localFlat, setLocalFlat] = useState<string>(UI_TEXT.allFlats);
  const [localPersonType, setLocalPersonType] = useState<string>(UI_TEXT.allPersons);
  const [localDiet, setLocalDiet] = useState<string>(UI_TEXT.allDiets);
  const [localDay, setLocalDay] = useState<string>(UI_TEXT.allDays);
  const [localMeal, setLocalMeal] = useState<string>(UI_TEXT.allMeals);
  const [localService, setLocalService] = useState<string>(UI_TEXT.allServices);
  const [localPaymentMode, setLocalPaymentMode] = useState<string>(UI_TEXT.allPaymentModes);
  const [localPaymentStatus, setLocalPaymentStatus] = useState<string>(UI_TEXT.allPaymentStatuses);
  const [localPackage, setLocalPackage] = useState<string>(UI_TEXT.allPackages);

  // Read or write to hoisted NavigationContext when available
  const selectedBlock = nav ? nav.aggregateBlock : localBlock;
  const setSelectedBlock = nav ? nav.setAggregateBlock : setLocalBlock;

  const selectedFlat = nav ? nav.aggregateFlat : localFlat;
  const setSelectedFlat = nav ? nav.setAggregateFlat : setLocalFlat;

  const selectedPersonType = nav ? nav.aggregatePersonType : localPersonType;
  const setSelectedPersonType = nav ? nav.setAggregatePersonType : setLocalPersonType;

  const selectedDiet = nav ? nav.aggregateDiet : localDiet;
  const setSelectedDiet = nav ? nav.setAggregateDiet : setLocalDiet;

  const selectedDay = nav ? nav.aggregateDay : localDay;
  const setSelectedDay = nav ? nav.setAggregateDay : setLocalDay;

  const selectedMeal = nav ? nav.aggregateMeal : localMeal;
  const setSelectedMeal = nav ? nav.setAggregateMeal : setLocalMeal;

  const selectedService = nav ? nav.aggregateService : localService;
  const setSelectedService = nav ? nav.setAggregateService : setLocalService;

  const selectedPaymentMode = nav ? nav.aggregatePaymentMode : localPaymentMode;
  const setSelectedPaymentMode = nav ? nav.setAggregatePaymentMode : setLocalPaymentMode;

  const selectedPaymentStatus = nav ? nav.aggregatePaymentStatus : localPaymentStatus;
  const setSelectedPaymentStatus = nav ? nav.setAggregatePaymentStatus : setLocalPaymentStatus;

  const selectedPackage = nav ? nav.aggregatePackage : localPackage;
  const setSelectedPackage = nav ? nav.setAggregatePackage : setLocalPackage;

  const pkgList = useMemo(() => {
    return Array.isArray(foodPackages) ? foodPackages : Object.values(foodPackages || {});
  }, [foodPackages]);

  const isPaymentEnabled = paymentConfig?.enabled !== false;

  // Dynamic filter options based strictly on enablement and applicability
  const blocks = useMemo(() => {
    const set = new Set(subscriptions.map((s) => s.block).filter(Boolean));
    return [
      UI_TEXT.allBlocks,
      ...Array.from(set).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
      ),
    ];
  }, [subscriptions]);

  const flats = useMemo(() => {
    const filtered = subscriptions.filter(
      (s) => selectedBlock === UI_TEXT.allBlocks || !selectedBlock || s.block === selectedBlock
    );
    const set = new Set(filtered.map((s) => s.flat).filter(Boolean));
    return [
      UI_TEXT.allFlats,
      ...Array.from(set).sort((a, b) =>
        a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
      ),
    ];
  }, [subscriptions, selectedBlock]);

  const personTypes = useMemo(() => {
    const list = [UI_TEXT.allPersons, UI_TEXT.adults];
    if (kidsEnabled) list.push(UI_TEXT.kids);
    if (guestsEnabled) list.push(UI_TEXT.guests);
    if (freeMealEnabled && subscriptions.some((s) => !s.amount || parseFloat(s.amount || "0") === 0)) {
      list.push(UI_TEXT.freeMeal);
    }
    return list;
  }, [kidsEnabled, guestsEnabled, freeMealEnabled, subscriptions]);

  const diets = useMemo(() => {
    const list = [UI_TEXT.allDiets];
    const activeDays = dayConfig.filter((d) => d.enabled);

    const isVegConfigured = activeDays.some((d) =>
      [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(
        (m) => isMealEnabled(d.id, m, dayConfig) && d[m]?.veg !== false
      )
    );
    const isNonVegConfigured = activeDays.some((d) =>
      [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(
        (m) => isMealEnabled(d.id, m, dayConfig) && !d.vegOnly && d[m]?.nonVeg !== false
      )
    );

    if (isVegConfigured) list.push(UI_TEXT.veg);
    if (isNonVegConfigured) list.push(UI_TEXT.nonVeg);

    return list;
  }, [dayConfig]);

  const days = useMemo(() => {
    return [UI_TEXT.allDays, ...dayConfig.filter((d) => d.enabled).map((d) => d.id)];
  }, [dayConfig]);

  const meals = useMemo(() => {
    const list = [UI_TEXT.allMeals];
    const activeDays = dayConfig.filter((d) => d.enabled);

    [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mType) => {
      const isConfigured = activeDays.some((d) => isMealEnabled(d.id, mType, dayConfig));
      if (isConfigured) list.push(mType);
    });

    return list;
  }, [dayConfig]);

  const services = useMemo(() => {
    const list = [UI_TEXT.allServices, UI_TEXT.dineIn];
    const activeDays = dayConfig.filter((d) => d.enabled);

    const isParcelConfigured = activeDays.some((d) =>
      [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some((m) =>
        isMealEnabled(d.id, m, dayConfig) && isParcelEnabled(d.id, m, dayConfig)
      )
    );

    if (isParcelConfigured) {
      list.push(UI_TEXT.parcel);
    }
    return list;
  }, [dayConfig]);

  const paymentModes = useMemo(() => {
    if (!isPaymentEnabled) return [UI_TEXT.allPaymentModes];
    const list = [UI_TEXT.allPaymentModes];
    if (paymentConfig?.options?.upi !== false) list.push(PaymentMode.UPI);
    if (paymentConfig?.options?.cash !== false) list.push(PaymentMode.CASH);
    if (paymentConfig?.options?.bankTransfer === true) list.push(PaymentMode.BANK_TRANSFER);
    return list;
  }, [isPaymentEnabled, paymentConfig]);

  const paymentStatuses = useMemo(() => {
    if (!isPaymentEnabled) return [UI_TEXT.allPaymentStatuses];
    return [UI_TEXT.allPaymentStatuses, UI_TEXT.paidPasses, UI_TEXT.unpaidPasses];
  }, [isPaymentEnabled]);

  const packageOptions = useMemo(() => {
    const list = [UI_TEXT.allPackages];
    const activePkgs = pkgList.filter((p) => p.enabled !== false || subscriptions.some((s) => Object.values(s.appliedPackages || {}).some((a: any) => a.packageId === p.id)));

    if (activePkgs.length > 0) {
      list.push(UI_TEXT.anyPackage);
      activePkgs.forEach((p) => {
        if (!list.includes(p.name)) {
          list.push(p.name);
        }
      });
    }
    return list;
  }, [pkgList, subscriptions]);

  const handleResetFilters = () => {
    if (nav) {
      nav.resetAggregateFilters();
    } else {
      setLocalBlock(UI_TEXT.allBlocks);
      setLocalFlat(UI_TEXT.allFlats);
      setLocalPersonType(UI_TEXT.allPersons);
      setLocalDiet(UI_TEXT.allDiets);
      setLocalDay(UI_TEXT.allDays);
      setLocalMeal(UI_TEXT.allMeals);
      setLocalService(UI_TEXT.allServices);
      setLocalPaymentMode(UI_TEXT.allPaymentModes);
      setLocalPaymentStatus(UI_TEXT.allPaymentStatuses);
      setLocalPackage(UI_TEXT.allPackages);
    }
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedBlock !== UI_TEXT.allBlocks) count++;
    if (selectedFlat !== UI_TEXT.allFlats) count++;
    if (selectedPersonType !== UI_TEXT.allPersons) count++;
    if (selectedDiet !== UI_TEXT.allDiets) count++;
    if (selectedDay !== UI_TEXT.allDays) count++;
    if (selectedMeal !== UI_TEXT.allMeals) count++;
    if (selectedService !== UI_TEXT.allServices) count++;
    if (isPaymentEnabled && selectedPaymentMode !== UI_TEXT.allPaymentModes) count++;
    if (isPaymentEnabled && selectedPaymentStatus !== UI_TEXT.allPaymentStatuses) count++;
    if (selectedPackage !== UI_TEXT.allPackages) count++;
    return count;
  }, [
    selectedBlock,
    selectedFlat,
    selectedPersonType,
    selectedDiet,
    selectedDay,
    selectedMeal,
    selectedService,
    selectedPaymentMode,
    selectedPaymentStatus,
    selectedPackage,
    isPaymentEnabled,
  ]);

  const activeFilterChips = useMemo(() => {
    const chips: { label: string; value: string }[] = [];
    if (selectedBlock !== UI_TEXT.allBlocks) chips.push({ label: UI_TEXT.filterByBlock, value: selectedBlock });
    if (selectedFlat !== UI_TEXT.allFlats) chips.push({ label: UI_TEXT.filterByFlat, value: selectedFlat });
    if (selectedPersonType !== UI_TEXT.allPersons) chips.push({ label: UI_TEXT.filterByPersonType, value: selectedPersonType });
    if (selectedDiet !== UI_TEXT.allDiets) chips.push({ label: UI_TEXT.filterByDiet, value: selectedDiet });
    if (selectedDay !== UI_TEXT.allDays) chips.push({ label: UI_TEXT.filterByDay, value: getDayLabel(selectedDay, dayConfig) });
    if (selectedMeal !== UI_TEXT.allMeals) chips.push({ label: UI_TEXT.filterByMeal, value: getMealLabel(selectedMeal as MealType) });
    if (selectedService !== UI_TEXT.allServices) chips.push({ label: UI_TEXT.filterByService, value: selectedService });
    if (isPaymentEnabled && selectedPaymentMode !== UI_TEXT.allPaymentModes) chips.push({ label: UI_TEXT.filterByPaymentMode, value: selectedPaymentMode });
    if (isPaymentEnabled && selectedPaymentStatus !== UI_TEXT.allPaymentStatuses) chips.push({ label: UI_TEXT.filterByPaymentStatus, value: selectedPaymentStatus });
    if (selectedPackage !== UI_TEXT.allPackages) chips.push({ label: UI_TEXT.filterByPackage, value: selectedPackage });
    return chips;
  }, [
    selectedBlock,
    selectedFlat,
    selectedPersonType,
    selectedDiet,
    selectedDay,
    selectedMeal,
    selectedService,
    selectedPaymentMode,
    selectedPaymentStatus,
    selectedPackage,
    dayConfig,
    isPaymentEnabled,
  ]);

  // Filter and compute matching subscription records & portions using calculatePassMealBreakdown
  const filteredData = useMemo(() => {
    let result = subscriptions;

    if (selectedBlock !== UI_TEXT.allBlocks && selectedBlock) {
      result = result.filter((s) => s.block === selectedBlock);
    }
    if (selectedFlat !== UI_TEXT.allFlats && selectedFlat) {
      result = result.filter((s) => s.flat === selectedFlat);
    }

    // Payment mode filter
    if (isPaymentEnabled && selectedPaymentMode !== UI_TEXT.allPaymentModes) {
      result = result.filter((s) =>
        s.payments?.some((p) => p.mode === selectedPaymentMode && parseFloat(p.amount || "0") > 0)
      );
    }

    // Payment status filter
    if (isPaymentEnabled && selectedPaymentStatus !== UI_TEXT.allPaymentStatuses) {
      if (selectedPaymentStatus === UI_TEXT.paidPasses) {
        result = result.filter((s) => parseFloat(s.amount || "0") > 0 || (s.payments && s.payments.some((p) => parseFloat(p.amount || "0") > 0)));
      } else if (selectedPaymentStatus === UI_TEXT.unpaidPasses) {
        result = result.filter((s) => !s.amount || parseFloat(s.amount || "0") === 0);
      }
    }

    // Package opted filter
    if (selectedPackage !== UI_TEXT.allPackages) {
      if (selectedPackage === UI_TEXT.anyPackage) {
        result = result.filter((s) => s.isPackageApplied || (s.appliedPackages && Object.keys(s.appliedPackages).length > 0));
      } else {
        const targetPkg = pkgList.find((p) => p.name === selectedPackage);
        if (targetPkg) {
          result = result.filter((s) => {
            const applied = s.appliedPackages || {};
            return Object.values(applied).some((info: any) => info.packageId === targetPkg.id || info.packageName === targetPkg.name);
          });
        }
      }
    }

    return result.map((sub) => {
      const passMeals = calculatePassMealBreakdown(sub, foodMenu, dayConfig, kidsEnabled, guestsEnabled, pkgList);

      let matchingPortions = 0;
      let servedPortions = 0;
      let dineInCount = 0;
      let dineInCountTaken = 0;
      let parcelCount = 0;
      let parcelCountTaken = 0;
      let vegPortions = 0;
      let vegPortionsTaken = 0;
      let nonVegPortions = 0;
      let nonVegPortionsTaken = 0;
      let menuPriceSum = 0;
      let parcelPriceSum = 0;
      let packageDiscountSum = 0;
      let excessDeficientSum = 0;

      passMeals.forEach((item) => {
        // Person type check
        if (selectedPersonType !== UI_TEXT.allPersons) {
          if (selectedPersonType === UI_TEXT.adults && item.category !== "adult") return;
          if (selectedPersonType === UI_TEXT.kids && item.category !== "kid") return;
          if (selectedPersonType === UI_TEXT.guests && item.category !== "guest") return;
          if (selectedPersonType === UI_TEXT.freeMeal && parseFloat(sub.amount || "0") !== 0) return;
        }

        // Day check
        if (selectedDay !== UI_TEXT.allDays && item.dayId !== selectedDay) return;

        // Meal check
        if (selectedMeal !== UI_TEXT.allMeals && item.mealType !== selectedMeal) return;

        const dayConf = dayConfig.find((d) => d.id === item.dayId);
        const mConf = dayConf ? dayConf[item.mealType] : undefined;
        const diet = getDietTypeForChoice(item.choice, getMealVarieties(mConf));

        // Diet check
        if (selectedDiet !== UI_TEXT.allDiets) {
          if (selectedDiet === UI_TEXT.veg && diet !== DietType.VEG) return;
          if (selectedDiet === UI_TEXT.nonVeg && diet !== DietType.NON_VEG) return;
        }

        // Service check (Dine-In vs Parcel)
        if (selectedService !== UI_TEXT.allServices) {
          if (selectedService === UI_TEXT.dineIn && item.isParcelOpted) return;
          if (selectedService === UI_TEXT.parcel && !item.isParcelOpted) return;
        }

        if (item.isAbsent) return;

        matchingPortions++;
        const isTaken = item.isParcelOpted ? item.isParcelTaken : item.isMealTaken;
        if (isTaken) servedPortions++;

        if (item.isParcelOpted) {
          parcelCount++;
          if (item.isParcelTaken) parcelCountTaken++;
        } else {
          dineInCount++;
          if (item.isMealTaken) dineInCountTaken++;
        }

        if (diet === DietType.VEG) {
          vegPortions++;
          if (isTaken) vegPortionsTaken++;
        } else if (diet === DietType.NON_VEG) {
          nonVegPortions++;
          if (isTaken) nonVegPortionsTaken++;
        }

        menuPriceSum += item.menuPrice;
        parcelPriceSum += item.parcelPrice;
        packageDiscountSum += item.pkgDiscount;
        excessDeficientSum += item.excessDeficient;
      });

      return {
        ...sub,
        matchingPortions,
        servedPortions,
        dineInCount,
        dineInCountTaken,
        parcelCount,
        parcelCountTaken,
        vegPortions,
        vegPortionsTaken,
        nonVegPortions,
        nonVegPortionsTaken,
        menuPriceSum,
        parcelPriceSum,
        packageDiscountSum,
        excessDeficientSum,
      };
    }).filter((sub) => {
      const hasStrictFilters =
        selectedDay !== UI_TEXT.allDays ||
        selectedMeal !== UI_TEXT.allMeals ||
        selectedPersonType !== UI_TEXT.allPersons ||
        selectedDiet !== UI_TEXT.allDiets ||
        selectedService !== UI_TEXT.allServices;
      return hasStrictFilters ? sub.matchingPortions > 0 : true;
    });
  }, [
    subscriptions,
    selectedBlock,
    selectedFlat,
    selectedPersonType,
    selectedDiet,
    selectedDay,
    selectedMeal,
    selectedService,
    selectedPaymentMode,
    selectedPaymentStatus,
    selectedPackage,
    kidsEnabled,
    guestsEnabled,
    dayConfig,
    foodMenu,
    pkgList,
    isPaymentEnabled,
  ]);

  // Aggregate summary calculations
  const aggregateSummary = useMemo(() => {
    let totalPasses = filteredData.length;
    let totalPortions = 0;
    let servedPortions = 0;
    let dineInCount = 0;
    let dineInCountTaken = 0;
    let parcelCount = 0;
    let parcelCountTaken = 0;
    let vegPortions = 0;
    let vegPortionsTaken = 0;
    let nonVegPortions = 0;
    let nonVegPortionsTaken = 0;
    let totalAdultsCount = 0;
    let totalKidsCount = 0;
    let totalGuestsCount = 0;
    let menuPrice = 0;
    let parcelPrice = 0;
    let packageDiscount = 0;
    let excessDeficient = 0;
    let netPayment = 0;
    let packagedMembersCount = 0;
    const packageCounts: Record<string, { packageName: string; count: number }> = {};
    const paymentModeTotals: Record<string, number> = {};

    filteredData.forEach((item) => {
      totalPortions += item.matchingPortions;
      servedPortions += item.servedPortions;
      dineInCount += item.dineInCount;
      dineInCountTaken += item.dineInCountTaken;
      parcelCount += item.parcelCount;
      parcelCountTaken += item.parcelCountTaken;
      vegPortions += item.vegPortions;
      vegPortionsTaken += item.vegPortionsTaken;
      nonVegPortions += item.nonVegPortions;
      nonVegPortionsTaken += item.nonVegPortionsTaken;

      const aCount = item.peopleCount || 0;
      const kCount = kidsEnabled ? (item.kidsCount || 0) : 0;
      const gCount = guestsEnabled ? (item.guestsCount || 0) : 0;

      // Filter headcounts if person type filter is active
      if (selectedPersonType === UI_TEXT.allPersons) {
        totalAdultsCount += aCount;
        totalKidsCount += kCount;
        totalGuestsCount += gCount;
      } else if (selectedPersonType === UI_TEXT.adults) {
        totalAdultsCount += aCount;
      } else if (selectedPersonType === UI_TEXT.kids) {
        totalKidsCount += kCount;
      } else if (selectedPersonType === UI_TEXT.guests) {
        totalGuestsCount += gCount;
      } else if (selectedPersonType === UI_TEXT.freeMeal) {
        totalAdultsCount += aCount;
        totalKidsCount += kCount;
        totalGuestsCount += gCount;
      }

      menuPrice += item.menuPriceSum;
      parcelPrice += item.parcelPriceSum;
      packageDiscount += item.packageDiscountSum;
      excessDeficient += item.excessDeficientSum;
      const subNet = Number(item.amount || 0);
      netPayment += subNet;

      // Payment channels accumulation
      const pList = item.payments && item.payments.length > 0
        ? item.payments
        : [{ amount: item.amount || "0", mode: item.paymentMode || PaymentMode.CASH }];

      pList.forEach((p: any) => {
        const amt = parseFloat(p.amount) || 0;
        const mode = p.mode || PaymentMode.CASH;
        if (amt > 0) {
          if (!paymentModeTotals[mode]) {
            paymentModeTotals[mode] = 0;
          }
          paymentModeTotals[mode] += amt;
        }
      });

      // Package breakdown calculation
      const applied = item.appliedPackages || {};

      Object.entries(applied).forEach(([pIdxStr, appliedInfo]: [string, any]) => {
        const pIdx = Number(pIdxStr);
        const isKid = kidsEnabled && pIdx >= aCount && pIdx < aCount + kCount;
        const isGuest = guestsEnabled && pIdx >= aCount + kCount;

        // Respect person type filter if set
        if (selectedPersonType !== UI_TEXT.allPersons) {
          if (selectedPersonType === UI_TEXT.adults && (isKid || isGuest)) return;
          if (selectedPersonType === UI_TEXT.kids && !isKid) return;
          if (selectedPersonType === UI_TEXT.guests && !isGuest) return;
        }

        const pkgId = appliedInfo.packageId || "unknown";
        const pkgName = appliedInfo.packageName || pkgList.find((p) => p.id === pkgId)?.name || pkgId;

        if (!packageCounts[pkgId]) {
          packageCounts[pkgId] = { packageName: pkgName, count: 0 };
        }
        packageCounts[pkgId].count++;
        packagedMembersCount++;
      });
    });

    const totalMembersCount = totalAdultsCount + totalKidsCount + totalGuestsCount;

    return {
      seasonTotalPasses: totalPasses,
      totalPortions,
      servedPortions,
      dineInCount,
      dineInCountTaken,
      parcelCount,
      parcelCountTaken,
      vegPortions,
      vegPortionsTaken,
      nonVegPortions,
      nonVegPortionsTaken,
      totalMembersCount,
      totalAdultsCount,
      totalKidsCount,
      totalGuestsCount,
      menuPrice,
      parcelPrice,
      packageDiscount,
      excessDeficient,
      netPayment,
      packagedMembersCount,
      packageCounts,
      paymentModeTotals,
    };
  }, [filteredData, kidsEnabled, guestsEnabled, selectedPersonType, pkgList]);

  return (
    <View style={{ gap: 16 }}>
      {/* 1. Filter Permutation Controls Card (Hidden during capture/sharing) */}
      {!isCapturing && (
        <View style={[styles.card, { padding: 16, borderRadius: 16 }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="filter-outline" size={18} color={theme.colors.primary} />
              <Text style={{ fontWeight: "900", fontSize: 16, color: theme.colors.textPrimary }}>
                {UI_TEXT.filters} ({activeFiltersCount} active)
              </Text>
            </View>
            {activeFiltersCount > 0 && (
              <Pressable
                onPress={handleResetFilters}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.resetAllFilters}
                style={{ paddingHorizontal: 10, paddingVertical: 4, backgroundColor: theme.colors.primary + "20", borderRadius: 8 }}
              >
                <Text style={{ color: theme.colors.primary, fontWeight: "800", fontSize: 12 }}>
                  {UI_TEXT.resetAllFilters}
                </Text>
              </Pressable>
            )}
          </View>

          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
              <View style={{ flex: 1, minWidth: 150 }}>
                <Dropdown label={UI_TEXT.filterByBlock} value={selectedBlock} options={blocks} onChange={setSelectedBlock} />
              </View>
              <View style={{ flex: 1, minWidth: 150 }}>
                <Dropdown label={UI_TEXT.filterByFlat} value={selectedFlat} options={flats} onChange={setSelectedFlat} />
              </View>
            </View>

            {(personTypes.length > 1 || diets.length > 1) && (
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                {personTypes.length > 1 && (
                  <View style={{ flex: 1, minWidth: 150 }}>
                    <Dropdown label={UI_TEXT.filterByPersonType} value={selectedPersonType} options={personTypes} onChange={setSelectedPersonType} />
                  </View>
                )}
                {diets.length > 1 && (
                  <View style={{ flex: 1, minWidth: 150 }}>
                    <Dropdown label={UI_TEXT.filterByDiet} value={selectedDiet} options={diets} onChange={setSelectedDiet} />
                  </View>
                )}
              </View>
            )}

            {(days.length > 1 || meals.length > 1) && (
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                {days.length > 1 && (
                  <View style={{ flex: 1, minWidth: 150 }}>
                    <Dropdown
                      label={UI_TEXT.filterByDay}
                      value={selectedDay === UI_TEXT.allDays ? UI_TEXT.allDays : getDayLabel(selectedDay, dayConfig)}
                      options={days.map((d) => (d === UI_TEXT.allDays ? UI_TEXT.allDays : getDayLabel(d, dayConfig)))}
                      onChange={(val) => {
                        if (val === UI_TEXT.allDays) {
                          setSelectedDay(UI_TEXT.allDays);
                        } else {
                          const found = dayConfig.find((d) => d.label === val || d.id === val);
                          setSelectedDay(found ? found.id : val);
                        }
                      }}
                    />
                  </View>
                )}
                {meals.length > 1 && (
                  <View style={{ flex: 1, minWidth: 150 }}>
                    <Dropdown
                      label={UI_TEXT.filterByMeal}
                      value={selectedMeal === UI_TEXT.allMeals ? UI_TEXT.allMeals : getMealLabel(selectedMeal as MealType)}
                      options={meals.map((m) => (m === UI_TEXT.allMeals ? UI_TEXT.allMeals : getMealLabel(m as MealType)))}
                      onChange={(val) => {
                        if (val === UI_TEXT.allMeals) {
                          setSelectedMeal(UI_TEXT.allMeals);
                        } else {
                          const foundObj = Object.values(MealType).find((m) => getMealLabel(m) === val);
                          setSelectedMeal(foundObj || val);
                        }
                      }}
                    />
                  </View>
                )}
              </View>
            )}

            {(services.length > 1 || (isPaymentEnabled && paymentModes.length > 1)) && (
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                {services.length > 1 && (
                  <View style={{ flex: 1, minWidth: 150 }}>
                    <Dropdown label={UI_TEXT.filterByService} value={selectedService} options={services} onChange={setSelectedService} />
                  </View>
                )}
                {isPaymentEnabled && paymentModes.length > 1 && (
                  <View style={{ flex: 1, minWidth: 150 }}>
                    <Dropdown label={UI_TEXT.filterByPaymentMode} value={selectedPaymentMode} options={paymentModes} onChange={setSelectedPaymentMode} />
                  </View>
                )}
              </View>
            )}

            {((isPaymentEnabled && paymentStatuses.length > 1) || packageOptions.length > 1) && (
              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                {isPaymentEnabled && paymentStatuses.length > 1 && (
                  <View style={{ flex: 1, minWidth: 150 }}>
                    <Dropdown label={UI_TEXT.filterByPaymentStatus} value={selectedPaymentStatus} options={paymentStatuses} onChange={setSelectedPaymentStatus} />
                  </View>
                )}
                {packageOptions.length > 1 && (
                  <View style={{ flex: 1, minWidth: 150 }}>
                    <Dropdown label={UI_TEXT.filterByPackage} value={selectedPackage} options={packageOptions} onChange={setSelectedPackage} />
                  </View>
                )}
              </View>
            )}
          </View>
        </View>
      )}

      {/* 2. Summary Card */}
      <ReportSummaryCard
        title={seasonName ? `${seasonName} - ${UI_TEXT.aggregateReport}` : UI_TEXT.aggregateReport}
        iconName="options-outline"
        activeFilterChips={activeFilterChips}
        summary={aggregateSummary}
      />

      {/* 3. Matching Results Header */}
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 4 }}>
        <Text style={{ fontWeight: "900", fontSize: 16, color: theme.colors.textPrimary }}>
          {UI_TEXT.matchingRecords}: {filteredData.length}
        </Text>
      </View>

      {/* Matching Passes List */}
      {filteredData.length === 0 ? (
        <View style={[styles.card, { padding: 24, alignItems: "center", borderRadius: 16 }]}>
          <Ionicons name="search-outline" size={32} color={theme.colors.textSecondary} style={{ marginBottom: 8 }} />
          <Text style={{ color: theme.colors.textSecondary, fontWeight: "700", textAlign: "center" }}>
            {UI_TEXT.noMatchingRecords}
          </Text>
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          {filteredData.map((item, index) => {
            const colorScheme = theme.cardColors[index % theme.cardColors.length];
            const isSpecificDayMealSelected = selectedDay !== UI_TEXT.allDays && selectedMeal !== UI_TEXT.allMeals;

            const passMealsForBadge = calculatePassMealBreakdown(item, foodMenu, dayConfig, kidsEnabled, guestsEnabled, pkgList);
            const matchingPassMeals = passMealsForBadge.filter(m =>
              (selectedDay === UI_TEXT.allDays || m.dayId === selectedDay) &&
              (selectedMeal === UI_TEXT.allMeals || m.mealType === selectedMeal)
            );
            const hasAnySubscribed = matchingPassMeals.length > 0;
            const hasAnyNonAbsent = matchingPassMeals.some(m => !m.isAbsent);
            const isAbsent = isSpecificDayMealSelected && hasAnySubscribed && !hasAnyNonAbsent;

            const isMissed = isSpecificDayMealSelected && !isAbsent && item.servedPortions === 0;
            const isComplete = isSpecificDayMealSelected && !isAbsent && item.servedPortions >= item.matchingPortions && item.matchingPortions > 0;
            const isPartial = isSpecificDayMealSelected && !isAbsent && item.servedPortions > 0 && item.servedPortions < item.matchingPortions;

            const badgeColor = isAbsent
              ? "#f97316"
              : isMissed
              ? theme.colors.error
              : isComplete
              ? theme.colors.success
              : theme.colors.warning || theme.colors.primary;

            const badgeBg = isAbsent
              ? "#ffedd5"
              : isMissed
              ? theme.colors.errorLight
              : isComplete
              ? theme.colors.successLight
              : theme.colors.warningLight || theme.colors.primary + "20";

            const badgeText = isAbsent
              ? UI_TEXT.absent
              : isMissed
              ? UI_TEXT.missedCheckoutBadgeLabel
              : isComplete
              ? UI_TEXT.completedCheckoutBadgeLabel
              : UI_TEXT.partialCheckoutBadgeLabel;

            const memberCheckouts = isSpecificDayMealSelected ? (() => {
              const aCount = item.peopleCount || 0;
              const kCount = kidsEnabled ? (item.kidsCount || 0) : 0;
              const gCount = guestsEnabled ? (item.guestsCount || 0) : 0;
              const totalPeople = aCount + kCount + gCount;
              const takenList = item.takenByPerson?.[selectedDay] || [];
              const slotsList = item.mealSlots?.[selectedDay] || [];
              const list: { label: string; isTaken: boolean; isAbsent?: boolean; actualServiceType?: string; timeDisplay: string; userName?: string }[] = [];

              for (let i = 0; i < totalPeople; i++) {
                const sSlot = (slotsList[i] || {}) as any;
                const choice = sSlot[selectedMeal];
                const dayConf = dayConfig.find((d) => d.id === selectedDay);
                const mConf = dayConf ? dayConf[selectedMeal as MealType] : undefined;
                const varieties = getMealVarieties(mConf);
                const diet = getDietTypeForChoice(choice, varieties);

                // Only include members who have subscribed to the selected meal
                if (!diet || choice === DietaryOption.NONE || !isDietaryEnabled(selectedDay, selectedMeal as MealType, diet, dayConfig)) continue;

                const isKid = kidsEnabled && i >= aCount && i < aCount + kCount;
                const isGuest = guestsEnabled && i >= aCount + kCount;

                if (isKid && !kidsEnabled) continue;
                if (isGuest && !guestsEnabled) continue;

                const category = isGuest ? UI_TEXT.guest : isKid ? UI_TEXT.kid : UI_TEXT.adult;
                const memberNum = isGuest ? i - aCount - kCount + 1 : isKid ? i - aCount + 1 : i + 1;
                const label = `${category} ${memberNum}`;

                const tState = (takenList[i] || {}) as TakenState;
                const isAbsent = isMealSlotAbsent(tState, selectedMeal as MealType);
                const isParcelAllowed = sSlot ? !!sSlot[`${selectedMeal}Parcel`] : false;
                const isParcelTaken = !isAbsent && !!tState[`${selectedMeal}Parcel` as keyof TakenState];
                const isDineInTaken = !isAbsent && !!tState[selectedMeal as MealType];
                const isTaken = isDineInTaken || isParcelTaken;
                const rawTime = isAbsent
                  ? tState[`${selectedMeal}AbsentTime` as keyof TakenState]
                  : (tState[`${selectedMeal}Time` as keyof TakenState] || tState[`${selectedMeal}ParcelTime` as keyof TakenState]);
                const rawUser = isAbsent
                  ? tState[`${selectedMeal}AbsentUser` as keyof TakenState]
                  : isParcelTaken
                  ? (tState[`${selectedMeal}ParcelUser` as keyof TakenState] || tState[`${selectedMeal}User` as keyof TakenState])
                  : (tState[`${selectedMeal}User` as keyof TakenState] || tState[`${selectedMeal}ParcelUser` as keyof TakenState]);
                const userStr = rawUser && typeof rawUser === "string" && !/^\d{10,}$/.test(rawUser.trim()) ? rawUser.trim() : undefined;

                const actualServiceType = isAbsent
                  ? UI_TEXT.absent
                  : isParcelTaken
                  ? UI_TEXT.parcel
                  : isDineInTaken
                  ? (isParcelAllowed ? UI_TEXT.optedDineIn : UI_TEXT.dineIn)
                  : undefined;

                let timeDisplay = "-";
                if (isAbsent) {
                  timeDisplay = rawTime ? (typeof rawTime === "number" ? formatTimestamp(rawTime) : String(rawTime)) : UI_TEXT.absent;
                } else if (isTaken) {
                  if (rawTime) {
                    timeDisplay = typeof rawTime === "number" ? formatTimestamp(rawTime) : String(rawTime);
                  } else {
                    timeDisplay = "Checked In";
                  }
                }

                list.push({ label, isTaken, isAbsent, actualServiceType, timeDisplay, userName: userStr });
              }
              return list;
            })() : [];

            return (
              <Pressable
                key={item.id}
                onPress={() => onSelectFlat(item.id)}
                style={[
                  styles.dashboardCard,
                  { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5, padding: 14 },
                ]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${UI_TEXT.block} ${item.block}, ${UI_TEXT.flatUpper} ${item.flat}, ${item.matchingPortions} ${UI_TEXT.plates}`}
                accessibilityHint={UI_TEXT.viewPassHint}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <View style={{ flex: 1, minWidth: 140 }}>
                    <Text style={[styles.flatLabel, { color: colorScheme.accent }]}>
                      {UI_TEXT.block} {item.block}
                    </Text>
                    <Text style={[styles.dashboardDay, { fontSize: 20, color: theme.colors.textPrimary }]}>
                      {UI_TEXT.flatUpper} {item.flat}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600", marginTop: 2 }}>
                      {item.peopleCount} {UI_TEXT.adultAbbrLabel}
                      {kidsEnabled && item.kidsCount ? `, ${item.kidsCount}${UI_TEXT.kidsAbbrLabel}` : ""}
                      {guestsEnabled && item.guestsCount ? `, ${item.guestsCount}${UI_TEXT.guestAbbrLabel}` : ""}
                      {item.payments && item.payments.length > 0 ? ` | ${item.payments.map((p) => p.mode).join(", ")}` : ""}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    {isSpecificDayMealSelected && (
                      <View style={{
                        backgroundColor: badgeBg,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: badgeColor,
                        marginBottom: 4,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: badgeColor }}>
                          {badgeText}
                        </Text>
                      </View>
                    )}
                    <Text style={{ color: colorScheme.accent, fontSize: 18, fontWeight: "900" }}>
                      {item.amount}
                    </Text>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.primary, marginTop: 4 }}>
                      {item.servedPortions} / {item.matchingPortions} {UI_TEXT.plates} {UI_TEXT.servedLabel.toLowerCase()}
                    </Text>
                    {(item.vegPortions > 0 || item.nonVegPortions > 0) && (
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary, marginTop: 2 }}>
                        {item.vegPortions > 0 ? `${UI_TEXT.veg}: ${item.vegPortionsTaken}/${item.vegPortions}` : ""}
                        {item.vegPortions > 0 && item.nonVegPortions > 0 ? " | " : ""}
                        {item.nonVegPortions > 0 ? `${UI_TEXT.nonVeg}: ${item.nonVegPortionsTaken}/${item.nonVegPortions}` : ""}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Individual Member Checkouts list when specific day and meal are selected */}
                {isSpecificDayMealSelected && memberCheckouts.length > 0 && (
                  <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: colorScheme.border, paddingTop: 10, marginTop: 10 }}>
                    {memberCheckouts.map((mem, mIdx) => (
                      <View key={mIdx} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" }}>
                          <Ionicons
                            name={mem.isAbsent ? "person-remove" : mem.isTaken ? "checkmark-circle" : "ellipse-outline"}
                            size={14}
                            color={mem.isAbsent ? "#f97316" : mem.isTaken ? theme.colors.success : theme.colors.textMuted}
                          />
                          <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textPrimary }}>
                            {mem.label}
                          </Text>
                          {mem.actualServiceType && (
                            <View style={{
                              backgroundColor: mem.isAbsent ? "#ffedd5" : theme.colors.primary + "18",
                              paddingHorizontal: 6,
                              paddingVertical: 1,
                              borderRadius: 4,
                              borderWidth: 0.8,
                              borderColor: mem.isAbsent ? "#f97316" : theme.colors.primary + "40"
                            }}>
                              <Text style={{ fontSize: 10, fontWeight: "800", color: mem.isAbsent ? "#c2410c" : theme.colors.primary }}>
                                {mem.actualServiceType}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ alignItems: "flex-end" }}>
                          <Text style={{ fontSize: 12, fontWeight: "700", color: mem.isAbsent ? "#c2410c" : mem.isTaken ? colorScheme.accent : theme.colors.textMuted }}>
                            {mem.timeDisplay}
                          </Text>
                          {(mem.isTaken || mem.isAbsent) && mem.userName ? (
                            <Text style={{ fontSize: 10, fontWeight: "600", color: theme.colors.textSecondary, marginTop: 1 }}>
                              {UI_TEXT.byPrefix} {mem.userName}
                            </Text>
                          ) : null}
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
