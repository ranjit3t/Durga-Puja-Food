/**
 * Subscription List Screen.
 * Displays all flat records with search and filtering capabilities.
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Linking,
  Share,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { StatusBarStyleMode, useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";
import {
  getActiveDays,
  getPaymentModeLabel,
  isMealCurrent,
  isMealEnabled,
  getDayLabel,
  getMealLabel,
  getDietaryOptionLabel,
  getMemberLegend,
} from "../constants";
import {
  AppScreen,
  Subscription,
  PaymentMode,
  UserRole,
  MealType,
  DietaryOption,
  FilterMode,
  AppThemeMode,
  ActivityModule,
  ActivityAction,
  PaymentConfig,
  TakenState,
  MealSlot,
  DietType,
} from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";

const SubscriptionCard = React.memo(({
  item,
  index,
  theme,
  styles,
  s,
  kidsEnabled,
  paymentConfig,
  whatsappCountryCode,
  hasCurrentMeal,
  hasParcel,
  isVegOnly,
  onSelect,
  addActivityLog,
  missedCount
}: {
  item: Subscription;
  index: number;
  theme: any;
  styles: any;
  s: (n: number) => number;
  kidsEnabled: boolean;
  paymentConfig: PaymentConfig;
  whatsappCountryCode: string;
  hasCurrentMeal: boolean;
  hasParcel: boolean;
  isVegOnly: boolean;
  onSelect: (sub: Subscription) => void;
  addActivityLog: any;
  missedCount?: number;
}) => {
  const colorScheme = theme.cardColors[index % theme.cardColors.length];

  return (
    <Pressable
      onPress={() => onSelect(item)}
      style={[
        styles.card,
        {
          backgroundColor: colorScheme.bg,
          borderColor: colorScheme.border,
          borderWidth: 1.5
        }
      ]}
    >
      {missedCount ? (
        <View style={{ position: 'absolute', top: -s(10), right: -s(10), width: s(28), height: s(28), borderRadius: s(14), backgroundColor: theme.colors.error, alignItems: 'center', justifyContent: 'center', zIndex: 10, elevation: 4, borderWidth: 2, borderColor: theme.colors.white }}>
           <Text style={{ color: theme.colors.white, fontSize: s(12), fontWeight: '900' }}>{missedCount}</Text>
        </View>
      ) : null}
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <Text style={[styles.flatLabel, { color: colorScheme.accent, opacity: 0.8 }]}>{UI_TEXT.block} {item.block}</Text>
            <View style={{ flexDirection: 'row', gap: s(6) }}>
              {kidsEnabled && item.kidsCount ? (
                <View style={{ backgroundColor: theme.colors.nonVeg + "20", padding: s(6), borderRadius: s(12), borderWidth: 1, borderColor: theme.colors.nonVeg + "40" }}>
                  <Ionicons name="happy" size={s(14)} color={theme.colors.nonVeg} />
                </View>
              ) : null}
              {hasParcel && (
                <View style={{ backgroundColor: theme.colors.secondary + "20", padding: s(6), borderRadius: s(12), borderWidth: 1, borderColor: theme.colors.secondary + "40" }}>
                  <Ionicons name="briefcase" size={s(14)} color={theme.colors.secondary} />
                </View>
              )}
              {isVegOnly && (
                <View style={{ backgroundColor: theme.colors.veg + "20", padding: s(6), borderRadius: s(12), borderWidth: 1, borderColor: theme.colors.veg + "40" }}>
                  <Ionicons name="leaf" size={s(14)} color={theme.colors.veg} />
                </View>
              )}
              {hasCurrentMeal && (
                <View style={{ backgroundColor: theme.colors.successLight, padding: s(6), borderRadius: s(12), borderWidth: 1, borderColor: theme.colors.success + "40" }}>
                  <Ionicons name="restaurant" size={s(14)} color={theme.colors.success} />
                </View>
              )}
            </View>
          </View>
          <Text style={[styles.flatTitle, { color: theme.colors.textPrimary }]}>{UI_TEXT.flatUpper} {item.flat}</Text>
          <Text style={{ color: theme.colors.textSecondary, marginTop: s(4), fontWeight: "600", fontSize: s(14) }}>
            {kidsEnabled ? (
              `${item.peopleCount}${UI_TEXT.space}${item.peopleCount === 1 ? UI_TEXT.adult : UI_TEXT.adults}${item.kidsCount ? `${UI_TEXT.plus}${item.kidsCount}${UI_TEXT.space}${item.kidsCount === 1 ? UI_TEXT.kid : UI_TEXT.kids}` : ""}`
            ) : (
              `${item.peopleCount + (item.kidsCount || 0)}${item.peopleCount + (item.kidsCount || 0) === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}`
            )}
          </Text>
        </View>
      </View>

      <View style={{ height: 1, backgroundColor: colorScheme.border, marginVertical: s(16) }} />

      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: s(6) }}>
          {paymentConfig.enabled && (
            <>
              <Ionicons name="card-outline" size={s(16)} color={colorScheme.accent} />
              <Text style={{ fontWeight: "700", color: theme.colors.textPrimary, fontSize: s(14) }}>{getPaymentModeLabel(item.payments && item.payments.length > 0 ? item.payments[0].mode : (item.paymentMode as PaymentMode || PaymentMode.CASH))}</Text>
            </>
          )}
        </View>
        {paymentConfig.enabled && (
          <Text style={{ fontSize: s(18), fontWeight: "900", color: colorScheme.accent }}>
            {UI_TEXT.rs}{UI_TEXT.space}{item.amount || (item.payments && item.payments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)) || UI_TEXT.zero}
          </Text>
        )}
      </View>

      {item.mobile && (
        <>
          <View style={{ height: 1, backgroundColor: colorScheme.border, marginVertical: s(12), opacity: 0.5 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable
              onPress={() => {
                addActivityLog({
                  module: ActivityModule.SUBSCRIPTION,
                  action: ActivityAction.CHAT,
                  targetId: item.id,
                  description: UI_TEXT.logChat.replace("{id}", item.id)
                });
                Linking.openURL(`https://wa.me/${whatsappCountryCode || UI_TEXT.defaultCountryCode}${item.mobile}`);
              }}
              style={({ pressed }) => [
                { padding: s(6), borderRadius: s(20), backgroundColor: theme.colors.successLight },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons name="logo-whatsapp" size={s(20)} color={theme.colors.success} />
            </Pressable>

            <Pressable
              onPress={() => {
                addActivityLog({
                  module: ActivityModule.SUBSCRIPTION,
                  action: ActivityAction.CALL,
                  targetId: item.id,
                  description: UI_TEXT.logCall.replace("{id}", item.id)
                });
                Linking.openURL(`tel:${item.mobile}`);
              }}
              style={({ pressed }) => [
                { padding: s(6), borderRadius: s(20), backgroundColor: theme.colors.surfaceDark },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons name="call" size={s(20)} color={theme.colors.primary} />
            </Pressable>
          </View>
        </>
      )}
    </Pressable>
  );
});

export function SubscriptionListScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    subscriptions, dayConfig, paymentConfig, seasonEnabled, whatsappCountryCode, kidsEnabled, addActivityLog
  } = useDatabase();

  const {
    subscriptionSearch, setSubscriptionSearch, navigate, goBack, startNew,
    setSelectedId, setSelectedRecord
  } = useAppNavigation();

  const onSelect = useCallback((sub: Subscription) => {
    setSelectedId(sub.id);
    setSelectedRecord(sub);
    navigate(AppScreen.DETAILS);
  }, [navigate, setSelectedId, setSelectedRecord]);

  const onAdd = () => startNew(dayConfig, "", paymentConfig, true, true, seasonEnabled);

  const styles = useStyles();
  const { s } = useScaling();
  const { theme } = useAppTheme();
  const isAdmin = userRole === UserRole.ADMIN;
  const canAdd = getActiveDays(dayConfig).length > 0 && seasonEnabled;

  const currentMealInfo = useMemo(() => {
    const active = getActiveDays(dayConfig);
    for (const dId of active) {
      for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
        if (isMealCurrent(dId, mType, dayConfig) && isMealEnabled(dId, mType, dayConfig)) {
          return { dayId: dId, type: mType };
        }
      }
    }
    return null;
  }, [dayConfig]);

  const [activeFilters, setActiveFilters] = useState<FilterMode[]>([FilterMode.ALL]);
  const [isAscending, setIsAscending] = useState(true);

  const toggleFilter = (mode: FilterMode) => {
    if (mode === FilterMode.ALL) {
      setActiveFilters([FilterMode.ALL]);
      return;
    }

    setActiveFilters(prev => {
      let next = prev.filter(m => m !== FilterMode.ALL);
      if (next.includes(mode)) {
        next = next.filter(m => m !== mode);
      } else {
        next = [...next, mode];
      }
      return next.length === 0 ? [FilterMode.ALL] : next;
    });
  };

  const passesWithKidsCount = useMemo(() => {
    return subscriptions.filter(sub => (sub.kidsCount || 0) > 0).length;
  }, [subscriptions]);

  const hasAnyKids = passesWithKidsCount > 0;

  const passesWithParcelCount = useMemo(() => {
    return subscriptions.filter(sub =>
      Object.values(sub.mealSlots || {}).some(daySlots =>
        daySlots.some(slot => slot.breakfastParcel || slot.lunchParcel || slot.dinnerParcel)
      )
    ).length;
  }, [subscriptions]);

  const hasAnyParcel = passesWithParcelCount > 0;

  const isNonVegSeason = useMemo(() => {
    return dayConfig.some(d =>
      d.enabled && !d.vegOnly && (
        (d[MealType.BREAKFAST].enabled && d[MealType.BREAKFAST].nonVeg) ||
        (d[MealType.LUNCH].enabled && d[MealType.LUNCH].nonVeg) ||
        (d[MealType.DINNER].enabled && d[MealType.DINNER].nonVeg)
      )
    );
  }, [dayConfig]);

  const passesWithVegOnlyCount = useMemo(() => {
    if (!isNonVegSeason) return 0;
    return subscriptions.filter(sub => {
      let hasVeg = false;
      let hasNonVeg = false;
      Object.values(sub.mealSlots || {}).forEach(daySlots => {
        daySlots.forEach(slot => {
          if (slot[MealType.BREAKFAST] === DietaryOption.VEG) hasVeg = true;
          if (slot[MealType.LUNCH] === DietaryOption.VEG) hasVeg = true;
          if (slot[MealType.DINNER] === DietaryOption.VEG) hasVeg = true;
          if (slot[MealType.BREAKFAST] === DietaryOption.NON_VEG) hasNonVeg = true;
          if (slot[MealType.LUNCH] === DietaryOption.NON_VEG) hasNonVeg = true;
          if (slot[MealType.DINNER] === DietaryOption.NON_VEG) hasNonVeg = true;
        });
      });
      return hasVeg && !hasNonVeg;
    }).length;
  }, [subscriptions, isNonVegSeason]);

  const hasAnyVegOnly = passesWithVegOnlyCount > 0;

  const subscribedCount = useMemo(() => {
    if (!currentMealInfo) return 0;
    return subscriptions.filter((sub) =>
      (sub.mealSlots?.[currentMealInfo.dayId] || []).some(
        (slot) =>
          slot[currentMealInfo.type] === DietaryOption.VEG ||
          slot[currentMealInfo.type] === DietaryOption.NON_VEG
      )
    ).length;
  }, [subscriptions, currentMealInfo]);

  const hasAnySubscribed = subscribedCount > 0;

  const missedData = useMemo(() => {
    if (!currentMealInfo) return { count: 0, list: [] };
    const list = subscriptions.map(sub => {
      let missed = 0;
      const slots = sub.mealSlots[currentMealInfo.dayId] || [];
      const taken = sub.takenByPerson[currentMealInfo.dayId] || [];

      slots.forEach((s, idx) => {
        const hasChoice = s[currentMealInfo.type] !== DietaryOption.NONE;
        const isTaken = !!taken[idx]?.[currentMealInfo.type] || !!taken[idx]?.[`${currentMealInfo.type}Parcel` as keyof TakenState];

        if (hasChoice && !isTaken) {
           missed++;
        }
      });
      return missed > 0 ? { id: sub.id, missed } : null;
    }).filter(Boolean) as { id: string, missed: number }[];

    return { count: list.length, list };
  }, [subscriptions, currentMealInfo]);

  const hasAnyMissed = missedData.count > 0;

  const visibleSubscriptions = useMemo(() => {
    let filtered = subscriptions;

    if (!activeFilters.includes(FilterMode.ALL)) {
      if (activeFilters.includes(FilterMode.SUBSCRIBED) && currentMealInfo) {
        filtered = filtered.filter((sub) =>
          (sub.mealSlots?.[currentMealInfo.dayId] || []).some(
            (slot) =>
              slot[currentMealInfo.type] === DietaryOption.VEG ||
              slot[currentMealInfo.type] === DietaryOption.NON_VEG
          )
        );
      }

      if (activeFilters.includes(FilterMode.MISSED) && currentMealInfo) {
        const missedIds = missedData.list.map(m => m.id);
        filtered = filtered.filter(sub => missedIds.includes(sub.id));
      }

      if (activeFilters.includes(FilterMode.KIDS) && kidsEnabled) {
        filtered = filtered.filter(sub => (sub.kidsCount || 0) > 0);
      }

      if (activeFilters.includes(FilterMode.PARCEL)) {
        filtered = filtered.filter(sub =>
          Object.values(sub.mealSlots || {}).some(daySlots =>
            daySlots.some(slot => slot.breakfastParcel || slot.lunchParcel || slot.dinnerParcel)
          )
        );
      }

      if (activeFilters.includes(FilterMode.VEG_ONLY)) {
        filtered = filtered.filter(sub => {
          let hasVeg = false;
          let hasNonVeg = false;
          Object.values(sub.mealSlots || {}).forEach(daySlots => {
            daySlots.forEach(slot => {
              if (slot[MealType.BREAKFAST] === DietaryOption.VEG) hasVeg = true;
              if (slot[MealType.LUNCH] === DietaryOption.VEG) hasVeg = true;
              if (slot[MealType.DINNER] === DietaryOption.VEG) hasVeg = true;
              if (slot[MealType.BREAKFAST] === DietaryOption.NON_VEG) hasNonVeg = true;
              if (slot[MealType.LUNCH] === DietaryOption.NON_VEG) hasNonVeg = true;
              if (slot[MealType.DINNER] === DietaryOption.NON_VEG) hasNonVeg = true;
            });
          });
          return hasVeg && !hasNonVeg;
        });
      }
    }

    if (subscriptionSearch) {
      const searchLower = subscriptionSearch.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.flat.toLowerCase().includes(searchLower) ||
          s.block.toLowerCase().includes(searchLower)
      );
    }

    // Sort by Block then Flat based on isAscending
    const sorted = [...filtered].sort((a, b) => {
      const blockA = a.block || "";
      const blockB = b.block || "";
      const blockCompare = blockA.localeCompare(blockB, undefined, { numeric: true, sensitivity: 'base' });
      if (blockCompare !== 0) return isAscending ? blockCompare : -blockCompare;
      const flatA = a.flat || "";
      const flatB = b.flat || "";
      const flatCompare = flatA.localeCompare(flatB, undefined, { numeric: true, sensitivity: 'base' });
      return isAscending ? flatCompare : -flatCompare;
    });

    return sorted.map(item => {
      const hasCurrentMeal = !!currentMealInfo && (item.mealSlots?.[currentMealInfo.dayId] || []).some(personSlots =>
        personSlots[currentMealInfo.type] === DietaryOption.VEG ||
        personSlots[currentMealInfo.type] === DietaryOption.NON_VEG
      );
      const hasParcel = Object.values(item.mealSlots || {}).some(daySlots =>
        daySlots.some(slot => slot.breakfastParcel || slot.lunchParcel || slot.dinnerParcel)
      );
      let hasVeg = false;
      let hasNonVeg = false;
      Object.values(item.mealSlots || {}).forEach(daySlots => {
        daySlots.forEach(slot => {
          if (slot[MealType.BREAKFAST] === DietaryOption.VEG) hasVeg = true;
          if (slot[MealType.LUNCH] === DietaryOption.VEG) hasVeg = true;
          if (slot[MealType.DINNER] === DietaryOption.VEG) hasVeg = true;
          if (slot[MealType.BREAKFAST] === DietaryOption.NON_VEG) hasNonVeg = true;
          if (slot[MealType.LUNCH] === DietaryOption.NON_VEG) hasNonVeg = true;
          if (slot[MealType.DINNER] === DietaryOption.NON_VEG) hasNonVeg = true;
        });
      });
      const isVegOnly = hasVeg && !hasNonVeg;
      const missedItem = missedData.list.find(m => m.id === item.id);

      return { ...item, _hasCurrentMeal: hasCurrentMeal, _hasParcel: hasParcel, _isVegOnly: isVegOnly, _missedCount: missedItem?.missed };
    });
  }, [subscriptions, subscriptionSearch, activeFilters, currentMealInfo, kidsEnabled, missedData, isAscending]);

  const handleExportExcel = useCallback(async () => {
    if (visibleSubscriptions.length === 0) return;

    const sortedSubscriptions = [...visibleSubscriptions].sort((a, b) => {
      const blockA = a.block || "";
      const blockB = b.block || "";
      const blockCompare = blockA.localeCompare(blockB, undefined, { numeric: true, sensitivity: 'base' });
      if (blockCompare !== 0) return blockCompare;
      const flatA = a.flat || "";
      const flatB = b.flat || "";
      return flatA.localeCompare(flatB, undefined, { numeric: true, sensitivity: 'base' });
    });

    const activeDaysList = getActiveDays(dayConfig);

    const headers: string[] = [
      UI_TEXT.blockNoColumn,
      UI_TEXT.flatNoColumn,
      UI_TEXT.passCodeColumn,
      UI_TEXT.mobileNoColumn,
      UI_TEXT.adultsCountColumn,
      UI_TEXT.kidsCountColumn,
      UI_TEXT.totalMembersColumn,
      UI_TEXT.totalAmountColumn,
      UI_TEXT.paymentModeColumn,
      UI_TEXT.transactionIdColumn,
      UI_TEXT.paymentDetailsColumn,
    ];

    activeDaysList.forEach((dayId) => {
      const dayLabel = getDayLabel(dayId, dayConfig);

      const meals: MealType[] = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];
      meals.forEach((mType) => {
        if (isMealEnabled(dayId, mType, dayConfig)) {
          const mealLabel = getMealLabel(mType);
          headers.push(`${dayLabel} - ${mealLabel} ${UI_TEXT.mealChoicesSuffix}`);
          headers.push(`${dayLabel} - ${mealLabel} ${UI_TEXT.mealTakenStatusSuffix}`);
        }
      });

      headers.push(`${dayLabel} - ${UI_TEXT.totalVegMealsSuffix}`);
      headers.push(`${dayLabel} - ${UI_TEXT.totalNonVegMealsSuffix}`);
      headers.push(`${dayLabel} - ${UI_TEXT.totalParcelsSuffix}`);
    });

    const escapeCell = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    let grandAdults = 0;
    let grandKids = 0;
    let grandTotalPeople = 0;
    let grandTotalAmount = 0;

    const grandDailyTotals: Record<string, { veg: number; nonVeg: number; parcels: number }> = {};
    activeDaysList.forEach((dayId) => {
      grandDailyTotals[dayId] = { veg: 0, nonVeg: 0, parcels: 0 };
    });

    const rows: string[][] = sortedSubscriptions.map((sub) => {
      const adults = sub.peopleCount || 0;
      const kids = sub.kidsCount || 0;
      const totalPeople = adults + kids;

      grandAdults += adults;
      grandKids += kids;
      grandTotalPeople += totalPeople;

      let totalAmt = sub.amount || "0";
      if (sub.payments && sub.payments.length > 0) {
        const sum = sub.payments.reduce((acc, p) => acc + (parseFloat(p.amount) || 0), 0);
        if (sum > 0) totalAmt = String(sum);
      }
      grandTotalAmount += parseFloat(totalAmt) || 0;

      // Payment modes
      let paymentModeStr = "";
      if (sub.payments && sub.payments.length > 0) {
        paymentModeStr = sub.payments
          .map((p) => getPaymentModeLabel(p.mode || PaymentMode.CASH))
          .filter((v, i, a) => a.indexOf(v) === i)
          .join(", ");
      } else {
        paymentModeStr = getPaymentModeLabel((sub.paymentMode as PaymentMode) || PaymentMode.CASH);
      }

      // Transaction IDs with channel details, comma separated for multiple transactions
      let transactionIdStr = "";
      if (sub.payments && sub.payments.length > 0) {
        transactionIdStr = sub.payments
          .map((p) => {
            const modeLabel = getPaymentModeLabel(p.mode || PaymentMode.CASH);
            if (p.transactionId) {
              return `${modeLabel}: ${p.transactionId}`;
            } else if (p.mode === PaymentMode.CASH && p.receivedBy) {
              return `${modeLabel} (${UI_TEXT.recdByPrefix}: ${p.receivedBy})`;
            } else {
              return modeLabel;
            }
          })
          .join(", ");
      } else if (sub.transactionId) {
        transactionIdStr = `${paymentModeStr}: ${sub.transactionId}`;
      } else {
        transactionIdStr = paymentModeStr;
      }

      let paymentDetailsStr = "";
      if (sub.payments && sub.payments.length > 0) {
        paymentDetailsStr = sub.payments
          .map((p, i) => {
            const modeLabel = getPaymentModeLabel(p.mode || PaymentMode.CASH);
            let extra = "";
            if (p.mode === PaymentMode.CASH && p.receivedBy) {
              extra = ` (${UI_TEXT.recdByPrefix}: ${p.receivedBy})`;
            } else if (p.transactionId) {
              extra = ` (${UI_TEXT.txnIdPrefix}: ${p.transactionId})`;
            }
            return `${UI_TEXT.paymentIndexPrefix} ${i + 1}: ${UI_TEXT.rs} ${p.amount || 0} ${UI_TEXT.viaLabel} ${modeLabel}${extra}`;
          })
          .join(" | ");
      } else {
        paymentDetailsStr = `${UI_TEXT.rs} ${totalAmt} ${UI_TEXT.viaLabel} ${paymentModeStr}${transactionIdStr ? ` (${transactionIdStr})` : ""}`;
      }

      const row: string[] = [
        sub.block || "",
        sub.flat || "",
        sub.passcode || sub.id || "",
        sub.mobile ? String(sub.mobile) : "",
        String(adults),
        String(kids),
        String(totalPeople),
        totalAmt,
        paymentModeStr,
        transactionIdStr,
        paymentDetailsStr,
      ];

      activeDaysList.forEach((dayId) => {
        const slots: MealSlot[] = sub.mealSlots?.[dayId] || [];
        const takenList: TakenState[] = sub.takenByPerson?.[dayId] || [];

        const meals: MealType[] = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];

        let rowDayVeg = 0;
        let rowDayNonVeg = 0;
        let rowDayParcels = 0;

        meals.forEach((mType) => {
          const isEnabled = isMealEnabled(dayId, mType, dayConfig);

          if (isEnabled) {
            const choiceParts: string[] = [];
            const takenParts: string[] = [];

            for (let i = 0; i < totalPeople; i++) {
              const memberLabel = getMemberLegend(i, adults, !!kidsEnabled);
              const slot = slots[i];
              const takenItem = takenList[i];

              const choice: DietaryOption = slot ? slot[mType] : DietaryOption.NONE;
              const parcelKey = `${mType}Parcel` as keyof MealSlot;
              const isParcelOpted = slot ? !!slot[parcelKey] : false;

              if (choice === DietaryOption.VEG) rowDayVeg++;
              else if (choice === DietaryOption.NON_VEG) rowDayNonVeg++;
              if (isParcelOpted) rowDayParcels++;

              if (choice === DietaryOption.NONE) {
                choiceParts.push(`${memberLabel}: ${UI_TEXT.none}`);
                takenParts.push(`${memberLabel}: ${UI_TEXT.notApplicable}`);
              } else {
                choiceParts.push(`${memberLabel}: ${getDietaryOptionLabel(choice)}${isParcelOpted ? ` (${UI_TEXT.parcels})` : ""}`);

                const isMealTaken = takenItem ? !!takenItem[mType] : false;
                const takenParcelKey = `${mType}Parcel` as keyof TakenState;
                const isParcelTaken = takenItem ? !!takenItem[takenParcelKey] : false;
                const mealTime = takenItem ? (takenItem[`${mType}Time` as keyof TakenState] as string | undefined) : undefined;
                const parcelTime = takenItem ? (takenItem[`${mType}ParcelTime` as keyof TakenState] as string | undefined) : undefined;

                let takenStatusStr = `${memberLabel}: `;
                if (isParcelTaken) {
                  const displayTime = parcelTime || mealTime;
                  takenStatusStr += `${UI_TEXT.parcelTakenLabel}${displayTime ? ` (${displayTime})` : ""}`;
                } else if (isMealTaken) {
                  takenStatusStr += `${UI_TEXT.foodTakenLabel}${mealTime ? ` (${mealTime})` : ""}`;
                } else {
                  takenStatusStr += `${UI_TEXT.foodNotTakenLabel}`;
                }

                takenParts.push(takenStatusStr);
              }
            }

            row.push(choiceParts.length > 0 ? choiceParts.join(" | ") : UI_TEXT.none);
            row.push(takenParts.length > 0 ? takenParts.join(" | ") : UI_TEXT.foodNotTakenLabel);
          }
        });

        if (grandDailyTotals[dayId]) {
          grandDailyTotals[dayId].veg += rowDayVeg;
          grandDailyTotals[dayId].nonVeg += rowDayNonVeg;
          grandDailyTotals[dayId].parcels += rowDayParcels;
        }

        row.push(String(rowDayVeg));
        row.push(String(rowDayNonVeg));
        row.push(String(rowDayParcels));
      });

      return row;
    });

    // Build GRAND TOTAL row
    const grandTotalRow: string[] = [
      UI_TEXT.grandTotal,
      "",
      "",
      "",
      String(grandAdults),
      String(grandKids),
      String(grandTotalPeople),
      String(grandTotalAmount),
      "",
      "",
      "",
    ];

    activeDaysList.forEach((dayId) => {
      const meals: MealType[] = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];
      meals.forEach((mType) => {
        if (isMealEnabled(dayId, mType, dayConfig)) {
          grandTotalRow.push(""); // Meal Choices
          grandTotalRow.push(""); // Meal Taken Status
        }
      });

      grandTotalRow.push(String(grandDailyTotals[dayId]?.veg || 0));
      grandTotalRow.push(String(grandDailyTotals[dayId]?.nonVeg || 0));
      grandTotalRow.push(String(grandDailyTotals[dayId]?.parcels || 0));
    });

    rows.push(grandTotalRow);

    const csvLines = [
      headers.map(escapeCell).join(","),
      ...rows.map((r) => r.map(escapeCell).join(",")),
    ];
    const csvContent = csvLines.join("\n");

    const fileName = UI_TEXT.exportSubscriptionFileName.replace("{date}", new Date().toISOString().slice(0, 10));

    addActivityLog({
      module: ActivityModule.SUBSCRIPTION,
      action: Platform.OS === "web" ? ActivityAction.DOWNLOAD : ActivityAction.SHARE,
      description: UI_TEXT.logExportSubscription.replace("{count}", String(sortedSubscriptions.length)),
    });

    try {
      if (Platform.OS === "web") {
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: csvContent,
          title: fileName,
        });
      }
    } catch (err) {
      console.error("Export error:", err);
    }
  }, [visibleSubscriptions, dayConfig, kidsEnabled, addActivityLog]);

  const renderItem = useCallback(({ item, index }: { item: Subscription & { _hasCurrentMeal?: boolean; _hasParcel?: boolean; _isVegOnly?: boolean; _missedCount?: number }; index: number }) => {
    return (
      <SubscriptionCard
        item={item}
        index={index}
        theme={theme}
        styles={styles}
        s={s}
        kidsEnabled={!!kidsEnabled}
        paymentConfig={paymentConfig}
        whatsappCountryCode={whatsappCountryCode}
        hasCurrentMeal={!!item._hasCurrentMeal}
        hasParcel={!!item._hasParcel}
        isVegOnly={!!item._isVegOnly}
        onSelect={onSelect}
        addActivityLog={addActivityLog}
        missedCount={item._missedCount}
      />
    );
  }, [theme, styles, s, kidsEnabled, paymentConfig, whatsappCountryCode, onSelect]);

  const showFilters = (currentMealInfo && hasAnySubscribed) || (kidsEnabled && hasAnyKids) || hasAnyParcel || (isNonVegSeason && hasAnyVegOnly) || (currentMealInfo && hasAnyMissed);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar barStyle={theme.themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
        <View style={styles.header}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BackButton onPress={goBack} />
              <HomeButton onPress={() => navigate(AppScreen.HOME)} />
            </View>
            <LogoutButton onLogout={handleLogout} />
          </View>
          <Text style={styles.title}>{UI_TEXT.subscriptions}</Text>
          <Text style={styles.subtitle}>{UI_TEXT.activePasses}: {subscriptions.length}</Text>
        </View>

        {showFilters && (
          <View style={[styles.maxWidthWrapper, { marginTop: 20 }]}>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => toggleFilter(FilterMode.ALL)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: s(6),
                  paddingHorizontal: s(12),
                  paddingVertical: s(8),
                  borderRadius: s(20),
                  borderWidth: 1,
                  borderColor: activeFilters.includes(FilterMode.ALL) ? theme.colors.primary : theme.colors.border,
                  backgroundColor: activeFilters.includes(FilterMode.ALL) ? theme.colors.surfaceDark : theme.colors.surface,
                  marginBottom: s(8)
                },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons
                name={activeFilters.includes(FilterMode.ALL) ? "layers" : "layers-outline"}
                size={s(16)}
                color={activeFilters.includes(FilterMode.ALL) ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={{
                fontSize: s(13),
                fontWeight: "700",
                color: activeFilters.includes(FilterMode.ALL) ? theme.colors.primary : theme.colors.textSecondary
              }}>
                {UI_TEXT.all} ({subscriptions.length})
              </Text>
            </Pressable>

            {currentMealInfo && hasAnySubscribed && (
              <Pressable
                onPress={() => toggleFilter(FilterMode.SUBSCRIBED)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(6),
                    paddingHorizontal: s(12),
                    paddingVertical: s(8),
                    borderRadius: s(20),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.SUBSCRIBED) ? theme.colors.success : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.SUBSCRIBED) ? theme.colors.successLight : theme.colors.surface,
                    marginBottom: s(8)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.SUBSCRIBED) ? "restaurant" : "restaurant-outline"}
                  size={s(14)}
                  color={activeFilters.includes(FilterMode.SUBSCRIBED) ? theme.colors.success : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(13),
                  fontWeight: "700",
                  color: activeFilters.includes(FilterMode.SUBSCRIBED) ? theme.colors.primary : theme.colors.textSecondary
                }}>
                  {UI_TEXT.mealSubscriberMarker} ({subscribedCount})
                </Text>
              </Pressable>
            )}

            {currentMealInfo && hasAnyMissed && (
              <Pressable
                onPress={() => toggleFilter(FilterMode.MISSED)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(6),
                    paddingHorizontal: s(12),
                    paddingVertical: s(8),
                    borderRadius: s(20),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.MISSED) ? theme.colors.error : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.MISSED) ? theme.colors.errorLight : theme.colors.surface,
                    marginBottom: s(8)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.MISSED) ? "alert-circle" : "alert-circle-outline"}
                  size={s(16)}
                  color={activeFilters.includes(FilterMode.MISSED) ? theme.colors.error : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(13),
                  fontWeight: "700",
                  color: activeFilters.includes(FilterMode.MISSED) ? theme.colors.error : theme.colors.textSecondary
                }}>
                  {UI_TEXT.mealMissedMarker} ({missedData.count})
                </Text>
              </Pressable>
            )}

            {kidsEnabled && hasAnyKids && (
              <Pressable
                onPress={() => toggleFilter(FilterMode.KIDS)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(6),
                    paddingHorizontal: s(12),
                    paddingVertical: s(8),
                    borderRadius: s(20),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.KIDS) ? theme.colors.nonVeg : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.KIDS) ? theme.colors.errorLight : theme.colors.surface,
                    marginBottom: s(8)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.KIDS) ? "happy" : "happy-outline"}
                  size={s(16)}
                  color={activeFilters.includes(FilterMode.KIDS) ? theme.colors.nonVeg : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(13),
                  fontWeight: "700",
                  color: activeFilters.includes(FilterMode.KIDS) ? theme.colors.nonVeg : theme.colors.textSecondary
                }}>
                  {UI_TEXT.kids} ({passesWithKidsCount})
                </Text>
              </Pressable>
            )}

            {hasAnyParcel && (
              <Pressable
                onPress={() => toggleFilter(FilterMode.PARCEL)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(6),
                    paddingHorizontal: s(12),
                    paddingVertical: s(8),
                    borderRadius: s(20),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.PARCEL) ? theme.colors.secondary : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.PARCEL) ? theme.colors.surfaceDark : theme.colors.surface,
                    marginBottom: s(8)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.PARCEL) ? "briefcase" : "briefcase-outline"}
                  size={s(16)}
                  color={activeFilters.includes(FilterMode.PARCEL) ? theme.colors.secondary : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(13),
                  fontWeight: "700",
                  color: activeFilters.includes(FilterMode.PARCEL) ? theme.colors.secondary : theme.colors.textSecondary
                }}>
                  {UI_TEXT.parcels} ({passesWithParcelCount})
                </Text>
              </Pressable>
            )}

            {isNonVegSeason && hasAnyVegOnly && (
              <Pressable
                onPress={() => toggleFilter(FilterMode.VEG_ONLY)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(6),
                    paddingHorizontal: s(12),
                    paddingVertical: s(8),
                    borderRadius: s(20),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.VEG_ONLY) ? theme.colors.veg : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.VEG_ONLY) ? theme.colors.veg + "10" : theme.colors.surface,
                    marginBottom: s(8)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.VEG_ONLY) ? "leaf" : "leaf-outline"}
                  size={s(16)}
                  color={activeFilters.includes(FilterMode.VEG_ONLY) ? theme.colors.veg : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(13),
                  fontWeight: "700",
                  color: activeFilters.includes(FilterMode.VEG_ONLY) ? theme.colors.veg : theme.colors.textSecondary
                }}>
                  {UI_TEXT.vegOnly} ({passesWithVegOnlyCount})
                </Text>
              </Pressable>
            )}
            </View>
          </View>
        )}

        <View style={[styles.maxWidthWrapper, { marginTop: showFilters ? 4 : 20 }]}>
          <View style={{ flexDirection: 'row', gap: s(8), alignItems: 'center' }}>
            <View style={[styles.searchBox, { flex: 1, marginBottom: 0, maxWidth: undefined }]}>
              <Ionicons name="search-outline" size={22} color={theme.colors.textSecondary} />
              <TextInput
                value={subscriptionSearch}
                onChangeText={setSubscriptionSearch}
                placeholder={UI_TEXT.searchPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                style={styles.searchInput}
                autoCapitalize="characters"
                clearButtonMode="while-editing"
              />
            </View>
            <Pressable
              onPress={() => setIsAscending(!isAscending)}
              style={({ pressed }) => [
                {
                  width: s(44),
                  height: s(44),
                  borderRadius: s(12),
                  backgroundColor: theme.colors.surfaceDark,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons
                name={isAscending ? "arrow-up-outline" : "arrow-down-outline"}
                size={s(20)}
                color={theme.colors.primary}
              />
            </Pressable>
            {visibleSubscriptions.length >= 1 && (
              <Pressable
                onPress={handleExportExcel}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(6),
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: s(12),
                    paddingVertical: s(10),
                    borderRadius: s(12),
                    elevation: 2,
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                  },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <Ionicons
                  name={Platform.OS === 'web' ? "download-outline" : "share-outline"}
                  size={s(18)}
                  color={theme.colors.white}
                />
                <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: s(13) }}>
                  {UI_TEXT.exportExcel}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <FlatList
          style={{ flex: 1, width: "100%" }}
          data={visibleSubscriptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.content, { paddingTop: 10 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={12}
          maxToRenderPerBatch={10}
          windowSize={5}
          updateCellsBatchingPeriod={50}
          removeClippedSubviews={Platform.OS === 'android'}
          ListEmptyComponent={
            <Text style={styles.emptyState}>
              {subscriptions.length === 0
                ? UI_TEXT.noRecords
                : UI_TEXT.noMatches}
            </Text>
          }
          ListFooterComponent={
            <View style={styles.footer}>
               <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
            </View>
          }
          renderItem={renderItem}
        />
      </KeyboardAvoidingView>

      {isAdmin && seasonEnabled ? (
        <Pressable
          style={[styles.fab, !canAdd && { opacity: 0.4 }]}
          onPress={onAdd}
          disabled={!canAdd}
        >
          <Ionicons name="add" size={32} color={theme.colors.white} />
        </Pressable>
      ) : null}
    </View>
  );
}
