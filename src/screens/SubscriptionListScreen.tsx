/**
 * Subscription List Screen.
 * Displays all flat records with search and filtering capabilities.
 */
import React, { useState, useMemo, useCallback, useEffect } from "react";
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
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { useAuth } from "../context/AuthContext";
import { useCoreDatabase, useActivityLogs } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";
import {
  getActiveDays,
  getPaymentModeLabel,
  isMealCurrent,
  isMealEnabled,
  isParcelEnabled,
  isKidsParcelEnabled,
  getDayLabel,
  getMealLabel,
  getDietaryOptionLabel,
  getMemberLegend,
  getDietTypeForChoice,
  getMealVarieties,
  getVarietyForChoice,
  hasSpecialMealSubscribed,
  isSpecialOnlySubscribed,
  hasPackageApplied,
  formatTimestamp,
  isGuestsParcelEnabled,
} from "../constants";
import {
  AppScreen,
  Subscription,
  PaymentMode,
  UserRole,
  MealType,
  DietType,
  DietaryOption,
  FilterMode,
  AppThemeMode,
  ActivityModule,
  ActivityAction,
  PaymentConfig,
  TakenState,
  MealSlot,
  CheckoutSource,
  getPassDisplayLabel,
} from "../types";
import { calculatePaidAmount } from "../utils/paymentUtils";
import { DirectorySortMode } from "../domain";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { UserGreeting } from "../components/common/UserGreeting";
import { QuickCheckoutModal } from "../components/common/QuickCheckoutModal";

const SubscriptionCard = React.memo(({
  item,
  index,
  theme,
  styles,
  s,
  kidsEnabled,
  guestsEnabled,
  paymentConfig,
  whatsappCountryCode,
  hasCurrentMeal,
  hasParcel,
  isVegOnly,
  hasSpecialMeal,
  hasPackage,
  onSelect,
  onOpenQuickCheckout,
  addActivityLog,
  missedCount
}: {
  item: Subscription;
  index: number;
  theme: any;
  styles: any;
  s: (n: number) => number;
  kidsEnabled: boolean;
  guestsEnabled: boolean;
  paymentConfig: PaymentConfig;
  whatsappCountryCode: string;
  hasCurrentMeal: boolean;
  hasParcel: boolean;
  isVegOnly: boolean;
  hasSpecialMeal?: boolean;
  hasPackage?: boolean;
  onSelect: (sub: Subscription) => void;
  onOpenQuickCheckout?: (sub: Subscription) => void;
  addActivityLog: any;
  missedCount?: number;
}) => {
  const colorScheme = theme.cardColors[index % theme.cardColors.length];

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colorScheme.bg,
          borderColor: colorScheme.border,
          borderWidth: 1.5,
          position: 'relative'
        }
      ]}
    >
      {missedCount ? (
        <Pressable
          onPress={(e) => {
            e.stopPropagation();
            if (onOpenQuickCheckout) {
              onOpenQuickCheckout(item);
            }
          }}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${UI_TEXT.quickCheckout} (${missedCount})`}
          style={({ pressed }) => [
            {
              position: 'absolute',
              top: -s(10),
              right: -s(10),
              width: s(32),
              height: s(32),
              borderRadius: s(16),
              backgroundColor: theme.colors.error,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 20,
              elevation: 6,
              borderWidth: 2,
              borderColor: theme.colors.white,
            },
            pressed && { opacity: 0.8, transform: [{ scale: 1.1 }] }
          ]}
        >
           <Text style={{ color: theme.colors.white, fontSize: s(13), fontWeight: '900' }}>{missedCount}</Text>
        </Pressable>
      ) : null}

      <Pressable
        onPress={() => onSelect(item)}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={`${UI_TEXT.flatUpper} ${item.flat}, ${UI_TEXT.block} ${item.block}`}
      >
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
                {hasSpecialMeal && (
                  <View style={{ backgroundColor: theme.colors.specialMealBg, padding: s(6), borderRadius: s(12), borderWidth: 1, borderColor: theme.colors.specialMealBorder }}>
                    <Ionicons name="star" size={s(14)} color={theme.colors.specialMealBorder} />
                  </View>
                )}
                {hasPackage && (
                  <View style={{ backgroundColor: theme.colors.primary + "20", padding: s(6), borderRadius: s(12), borderWidth: 1, borderColor: theme.colors.primary + "40" }}>
                    <Ionicons name="cube" size={s(14)} color={theme.colors.primary} />
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
              {(() => {
                if (kidsEnabled || guestsEnabled) {
                  const parts = [];
                  parts.push(`${item.peopleCount}${UI_TEXT.space}${item.peopleCount === 1 ? UI_TEXT.adult : UI_TEXT.adults}`);
                  if (kidsEnabled && item.kidsCount) parts.push(`${item.kidsCount}${UI_TEXT.space}${item.kidsCount === 1 ? UI_TEXT.kid : UI_TEXT.kids}`);
                  if (guestsEnabled && item.guestsCount) parts.push(`${item.guestsCount}${UI_TEXT.space}${item.guestsCount === 1 ? UI_TEXT.guest : UI_TEXT.guests}`);
                  return parts.join(UI_TEXT.plus);
                }
                const total = item.peopleCount + (item.kidsCount || 0) + (item.guestsCount || 0);
                return `${total}${total === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}`;
              })()}
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

        {(() => {
          const now = Date.now();
          let createdTs = Number(item.createdAt) || Number(item.timestamp) || now;
          let updatedTs = Number(item.updatedAt) || createdTs || now;
          if (createdTs > updatedTs) createdTs = updatedTs;
          return (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: s(10), paddingTop: s(8), borderTopWidth: 1, borderTopColor: colorScheme.border + "66", flexWrap: "wrap", gap: s(4) }}>
              <Text style={{ fontSize: s(11), color: theme.colors.textMuted, fontWeight: "600" }}>
                {UI_TEXT.createdTime}: {formatTimestamp(createdTs)}
              </Text>
              <Text style={{ fontSize: s(11), color: theme.colors.textMuted, fontWeight: "600" }}>
                {UI_TEXT.editedTime}: {formatTimestamp(updatedTs)}
              </Text>
            </View>
          );
        })()}
      </Pressable>

      {item.mobile && (
        <>
          <View style={{ height: 1, backgroundColor: colorScheme.border, marginVertical: s(12), opacity: 0.5 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Pressable
              onPress={() => {
                const passLabel = getPassDisplayLabel(item);
                addActivityLog({
                  module: ActivityModule.SUBSCRIPTION,
                  action: ActivityAction.CHAT,
                  targetId: item.id,
                  description: UI_TEXT.logChat.replace("{id}", passLabel)
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
                const passLabel = getPassDisplayLabel(item);
                addActivityLog({
                  module: ActivityModule.SUBSCRIPTION,
                  action: ActivityAction.CALL,
                  targetId: item.id,
                  description: UI_TEXT.logCall.replace("{id}", passLabel)
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
    </View>
  );
});

export function SubscriptionListScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    subscriptions, dayConfig, paymentConfig, seasonEnabled, whatsappCountryCode, kidsEnabled, guestsEnabled, refreshAllData
  } = useCoreDatabase();
  const { addActivityLog } = useActivityLogs();

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
          return {
            dayId: dId,
            type: mType,
            mealType: mType,
            dayLabel: getDayLabel(dId, dayConfig),
            mealLabel: getMealLabel(mType)
          };
        }
      }
    }
    return null;
  }, [dayConfig]);

  const [quickCheckoutSub, setQuickCheckoutSub] = useState<Subscription | null>(null);
  const [quickCheckoutVisible, setQuickCheckoutVisible] = useState(false);

  const onOpenQuickCheckout = useCallback((sub: Subscription) => {
    const passLabel = getPassDisplayLabel(sub);
    addActivityLog({
      module: ActivityModule.SCANNER,
      action: ActivityAction.UPDATE,
      targetId: sub.id,
      description: UI_TEXT.logQuickCheckoutOpened.replace("{id}", passLabel).replace("{source}", CheckoutSource.SUBSCRIPTION_LIST)
    });
    setQuickCheckoutSub(sub);
    setQuickCheckoutVisible(true);
  }, [addActivityLog]);

  const [activeFilters, setActiveFilters] = useState<FilterMode[]>([FilterMode.ALL]);
  const [isAscending, setIsAscending] = useState(true);
  const [sortBy, setSortBy] = useState<DirectorySortMode>(DirectorySortMode.BLOCK_FLAT);

  const toggleFilter = useCallback((mode: FilterMode) => {
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
  }, []);

  const passesWithKidsCount = useMemo(() => {
    return subscriptions.filter(sub => {
      if ((sub.kidsCount || 0) <= 0) return false;
      const adultCount = sub.peopleCount || 0;
      const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
      return Object.values(sub.mealSlots || {}).some(daySlots => {
        return daySlots.some((slot, idx) => {
          if (idx < adultCount || idx >= adultCount + kCount) return false;
          const bDiet = getDietTypeForChoice(slot[MealType.BREAKFAST]);
          const lDiet = getDietTypeForChoice(slot[MealType.LUNCH]);
          const dDiet = getDietTypeForChoice(slot[MealType.DINNER]);
          return bDiet !== undefined || lDiet !== undefined || dDiet !== undefined;
        });
      });
    }).length;
  }, [subscriptions, kidsEnabled]);

  const hasAnyKids = passesWithKidsCount > 0;

  const passesWithGuestsCount = useMemo(() => {
    return subscriptions.filter(sub => {
      if ((sub.guestsCount || 0) <= 0) return false;
      const adultCount = sub.peopleCount || 0;
      const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
      return Object.values(sub.mealSlots || {}).some(daySlots => {
        return daySlots.some((slot, idx) => {
          if (idx < adultCount + kCount) return false;
          const bDiet = getDietTypeForChoice(slot[MealType.BREAKFAST]);
          const lDiet = getDietTypeForChoice(slot[MealType.LUNCH]);
          const dDiet = getDietTypeForChoice(slot[MealType.DINNER]);
          return bDiet !== undefined || lDiet !== undefined || dDiet !== undefined;
        });
      });
    }).length;
  }, [subscriptions, kidsEnabled]);

  const hasAnyGuests = passesWithGuestsCount > 0;

  const passesWithParcelCount = useMemo(() => {
    return subscriptions.filter(sub =>
      Object.keys(sub.mealSlots || {}).some(dayId => {
        const daySlots = sub.mealSlots[dayId] || [];
        const adultCount = sub.peopleCount || 0;
        return daySlots.some((slot, idx) => {
          const isKid = kidsEnabled && idx >= adultCount;
          const isB = slot.breakfastParcel && (isKid ? isKidsParcelEnabled(dayId, MealType.BREAKFAST, dayConfig, kidsEnabled) : isParcelEnabled(dayId, MealType.BREAKFAST, dayConfig));
          const isL = slot.lunchParcel && (isKid ? isKidsParcelEnabled(dayId, MealType.LUNCH, dayConfig, kidsEnabled) : isParcelEnabled(dayId, MealType.LUNCH, dayConfig));
          const isD = slot.dinnerParcel && (isKid ? isKidsParcelEnabled(dayId, MealType.DINNER, dayConfig, kidsEnabled) : isParcelEnabled(dayId, MealType.DINNER, dayConfig));
          return isB || isL || isD;
        });
      })
    ).length;
  }, [subscriptions, dayConfig, kidsEnabled]);

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
          const bDiet = getDietTypeForChoice(slot[MealType.BREAKFAST]);
          const lDiet = getDietTypeForChoice(slot[MealType.LUNCH]);
          const dDiet = getDietTypeForChoice(slot[MealType.DINNER]);
          if (bDiet === DietType.VEG) hasVeg = true;
          if (lDiet === DietType.VEG) hasVeg = true;
          if (dDiet === DietType.VEG) hasVeg = true;
          if (bDiet === DietType.NON_VEG) hasNonVeg = true;
          if (lDiet === DietType.NON_VEG) hasNonVeg = true;
          if (dDiet === DietType.NON_VEG) hasNonVeg = true;
        });
      });
      return hasVeg && !hasNonVeg;
    }).length;
  }, [subscriptions, isNonVegSeason]);

  const hasAnyVegOnly = passesWithVegOnlyCount > 0;

  const passesWithSpecialOnlyCount = useMemo(() => {
    return subscriptions.filter(sub => isSpecialOnlySubscribed(sub, dayConfig)).length;
  }, [subscriptions, dayConfig]);

  const hasAnySpecialOnly = passesWithSpecialOnlyCount > 0;

  const passesWithPackageCount = useMemo(() => {
    return subscriptions.filter(sub => hasPackageApplied(sub)).length;
  }, [subscriptions]);

  const hasAnyPackage = passesWithPackageCount > 0;

  const subscribedCount = useMemo(() => {
    if (!currentMealInfo) return 0;
    return subscriptions.filter((sub) =>
      (sub.mealSlots?.[currentMealInfo.dayId] || []).some(
        (slot) => getDietTypeForChoice(slot[currentMealInfo.type]) !== undefined
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
        const hasChoice = getDietTypeForChoice(s[currentMealInfo.type]) !== undefined;
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

  // Auto-deselect filters when their selection count drops to 0 (e.g., after quick checkout clears the last missed pass)
  useEffect(() => {
    setActiveFilters(prev => {
      if (prev.includes(FilterMode.ALL)) return prev;

      let next = [...prev];

      if (next.includes(FilterMode.MISSED) && (!currentMealInfo || !hasAnyMissed)) {
        next = next.filter(m => m !== FilterMode.MISSED);
      }
      if (next.includes(FilterMode.SUBSCRIBED) && (!currentMealInfo || !hasAnySubscribed)) {
        next = next.filter(m => m !== FilterMode.SUBSCRIBED);
      }
      if (next.includes(FilterMode.KIDS) && (!kidsEnabled || !hasAnyKids)) {
        next = next.filter(m => m !== FilterMode.KIDS);
      }
      if (next.includes(FilterMode.PARCEL) && !hasAnyParcel) {
        next = next.filter(m => m !== FilterMode.PARCEL);
      }
      if (next.includes(FilterMode.VEG_ONLY) && !hasAnyVegOnly) {
        next = next.filter(m => m !== FilterMode.VEG_ONLY);
      }
      if (next.includes(FilterMode.SPECIAL_ONLY) && !hasAnySpecialOnly) {
        next = next.filter(m => m !== FilterMode.SPECIAL_ONLY);
      }
      if (next.includes(FilterMode.PACKAGE) && !hasAnyPackage) {
        next = next.filter(m => m !== FilterMode.PACKAGE);
      }

      if (next.length === 0) {
        return [FilterMode.ALL];
      }
      return next.length === prev.length ? prev : next;
    });
  }, [currentMealInfo, hasAnyMissed, hasAnySubscribed, kidsEnabled, hasAnyKids, hasAnyParcel, hasAnyVegOnly, hasAnySpecialOnly, hasAnyPackage]);

  const visibleSubscriptions = useMemo(() => {
    let filtered = subscriptions;

    if (!activeFilters.includes(FilterMode.ALL)) {
      if (activeFilters.includes(FilterMode.SUBSCRIBED) && currentMealInfo) {
        filtered = filtered.filter((sub) =>
          (sub.mealSlots?.[currentMealInfo.dayId] || []).some(
            (slot) => getDietTypeForChoice(slot[currentMealInfo.type]) !== undefined
          )
        );
      }

      if (activeFilters.includes(FilterMode.MISSED) && currentMealInfo) {
        const missedIds = missedData.list.map(m => m.id);
        filtered = filtered.filter(sub => missedIds.includes(sub.id));
      }

      if (activeFilters.includes(FilterMode.KIDS) && kidsEnabled) {
        filtered = filtered.filter(sub => {
          if ((sub.kidsCount || 0) <= 0) return false;
          const adultCount = sub.peopleCount || 0;
          const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
          return Object.values(sub.mealSlots || {}).some(daySlots => {
            return daySlots.some((slot, idx) => {
              if (idx < adultCount || idx >= adultCount + kCount) return false;
              const bDiet = getDietTypeForChoice(slot[MealType.BREAKFAST]);
              const lDiet = getDietTypeForChoice(slot[MealType.LUNCH]);
              const dDiet = getDietTypeForChoice(slot[MealType.DINNER]);
              return bDiet !== undefined || lDiet !== undefined || dDiet !== undefined;
            });
          });
        });
      }

      if (activeFilters.includes(FilterMode.GUESTS) && guestsEnabled) {
        filtered = filtered.filter(sub => {
          if ((sub.guestsCount || 0) <= 0) return false;
          const adultCount = sub.peopleCount || 0;
          const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
          return Object.values(sub.mealSlots || {}).some(daySlots => {
            return daySlots.some((slot, idx) => {
              if (idx < adultCount + kCount) return false;
              const bDiet = getDietTypeForChoice(slot[MealType.BREAKFAST]);
              const lDiet = getDietTypeForChoice(slot[MealType.LUNCH]);
              const dDiet = getDietTypeForChoice(slot[MealType.DINNER]);
              return bDiet !== undefined || lDiet !== undefined || dDiet !== undefined;
            });
          });
        });
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
              const bDiet = getDietTypeForChoice(slot[MealType.BREAKFAST]);
              const lDiet = getDietTypeForChoice(slot[MealType.LUNCH]);
              const dDiet = getDietTypeForChoice(slot[MealType.DINNER]);
              if (bDiet === DietType.VEG) hasVeg = true;
              if (lDiet === DietType.VEG) hasVeg = true;
              if (dDiet === DietType.VEG) hasVeg = true;
              if (bDiet === DietType.NON_VEG) hasNonVeg = true;
              if (lDiet === DietType.NON_VEG) hasNonVeg = true;
              if (dDiet === DietType.NON_VEG) hasNonVeg = true;
            });
          });
          return hasVeg && !hasNonVeg;
        });
      }

      if (activeFilters.includes(FilterMode.SPECIAL_ONLY)) {
        filtered = filtered.filter(sub => isSpecialOnlySubscribed(sub, dayConfig));
      }

      if (activeFilters.includes(FilterMode.PACKAGE)) {
        filtered = filtered.filter(sub => hasPackageApplied(sub));
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

    // Sort based on sortBy and isAscending
    const sorted = [...filtered].sort((a, b) => {
      const now = Date.now();
      if (sortBy === DirectorySortMode.AMOUNT) {
        let amountA = calculatePaidAmount(a);
        let amountB = calculatePaidAmount(b);
        if (amountA !== amountB) {
          return isAscending ? amountA - amountB : amountB - amountA;
        }
      } else if (sortBy === DirectorySortMode.CREATED_AT) {
        let createdA = Number(a.createdAt) || Number(a.timestamp) || now;
        let createdB = Number(b.createdAt) || Number(b.timestamp) || now;
        if (createdA !== createdB) {
          return isAscending ? createdA - createdB : createdB - createdA;
        }
      } else if (sortBy === DirectorySortMode.UPDATED_AT) {
        let createdA = Number(a.createdAt) || Number(a.timestamp) || now;
        let createdB = Number(b.createdAt) || Number(b.timestamp) || now;
        let updatedA = Number(a.updatedAt) || createdA || now;
        let updatedB = Number(b.updatedAt) || createdB || now;
        if (updatedA !== updatedB) {
          return isAscending ? updatedA - updatedB : updatedB - updatedA;
        }
      }

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
        getDietTypeForChoice(personSlots[currentMealInfo.type]) !== undefined
      );
      const hasParcel = Object.keys(item.mealSlots || {}).some(dayId => {
        const daySlots = item.mealSlots[dayId] || [];
        const adultCount = item.peopleCount || 0;
        return daySlots.some((slot, idx) => {
          const isKid = kidsEnabled && idx >= adultCount;
          const isB = slot.breakfastParcel && (isKid ? isKidsParcelEnabled(dayId, MealType.BREAKFAST, dayConfig, kidsEnabled) : isParcelEnabled(dayId, MealType.BREAKFAST, dayConfig));
          const isL = slot.lunchParcel && (isKid ? isKidsParcelEnabled(dayId, MealType.LUNCH, dayConfig, kidsEnabled) : isParcelEnabled(dayId, MealType.LUNCH, dayConfig));
          const isD = slot.dinnerParcel && (isKid ? isKidsParcelEnabled(dayId, MealType.DINNER, dayConfig, kidsEnabled) : isParcelEnabled(dayId, MealType.DINNER, dayConfig));
          return isB || isL || isD;
        });
      });
      let hasVeg = false;
      let hasNonVeg = false;
      Object.values(item.mealSlots || {}).forEach(daySlots => {
        daySlots.forEach(slot => {
          const bDiet = getDietTypeForChoice(slot[MealType.BREAKFAST]);
          const lDiet = getDietTypeForChoice(slot[MealType.LUNCH]);
          const dDiet = getDietTypeForChoice(slot[MealType.DINNER]);
          if (bDiet === DietType.VEG) hasVeg = true;
          if (lDiet === DietType.VEG) hasVeg = true;
          if (dDiet === DietType.VEG) hasVeg = true;
          if (bDiet === DietType.NON_VEG) hasNonVeg = true;
          if (lDiet === DietType.NON_VEG) hasNonVeg = true;
          if (dDiet === DietType.NON_VEG) hasNonVeg = true;
        });
      });
      const isVegOnly = hasVeg && !hasNonVeg;
      const hasSpecialMeal = isSpecialOnlySubscribed(item, dayConfig);
      const hasPackage = hasPackageApplied(item);
      const missedItem = missedData.list.find(m => m.id === item.id);

      return { ...item, _hasCurrentMeal: hasCurrentMeal, _hasParcel: hasParcel, _isVegOnly: isVegOnly, _hasSpecialMeal: hasSpecialMeal, _hasPackage: hasPackage, _missedCount: missedItem?.missed };
    });
  }, [subscriptions, subscriptionSearch, activeFilters, currentMealInfo, kidsEnabled, missedData, isAscending, sortBy, dayConfig, hasPackageApplied]);

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
      UI_TEXT.guestsCountColumn,
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
    let grandGuests = 0;
    let grandTotalPeople = 0;
    let grandTotalAmount = 0;

    const grandDailyTotals: Record<string, { veg: number; nonVeg: number; parcels: number }> = {};
    activeDaysList.forEach((dayId) => {
      grandDailyTotals[dayId] = { veg: 0, nonVeg: 0, parcels: 0 };
    });

    const rows: string[][] = sortedSubscriptions.map((sub) => {
      const adults = sub.peopleCount || 0;
      const kids = sub.kidsCount || 0;
      const guests = sub.guestsCount || 0;
      const totalPeople = adults + kids + guests;

      grandAdults += adults;
      grandKids += kids;
      grandGuests += guests;
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
        String(guests),
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
              const memberLabel = getMemberLegend(i, adults, !!kidsEnabled, kids, !!guestsEnabled);
              const slot = slots[i];
              const takenItem = takenList[i];

              const choice = slot ? slot[mType] : DietaryOption.NONE;
              const dayConf = (dayConfig || []).find((d) => d.id === dayId);
              const mConf = dayConf ? dayConf[mType] : undefined;
              const varieties = getMealVarieties(mConf);
              const diet = getDietTypeForChoice(choice, varieties);
              const variety = getVarietyForChoice(choice, varieties);

              const parcelKey = `${mType}Parcel` as keyof MealSlot;
              const isParcelOpted = slot ? !!slot[parcelKey] : false;

              const isKidMember = kidsEnabled && i >= adults && i < adults + kids;
              const isGuestMember = guestsEnabled && i >= adults + kids;
              const isParcelAllowed = isGuestMember
                ? isGuestsParcelEnabled(dayId, mType, dayConfig, guestsEnabled)
                : isKidMember
                ? isKidsParcelEnabled(dayId, mType, dayConfig, kidsEnabled)
                : isParcelEnabled(dayId, mType, dayConfig);

              if (diet === DietType.VEG) rowDayVeg++;
              else if (diet === DietType.NON_VEG) rowDayNonVeg++;
              if (isParcelOpted && isParcelAllowed) rowDayParcels++;

              if (choice === DietaryOption.NONE) {
                choiceParts.push(`${memberLabel}: ${UI_TEXT.none}`);
                takenParts.push(`${memberLabel}: ${UI_TEXT.notApplicable}`);
              } else {
                const choiceLabel = variety ? variety.name : getDietaryOptionLabel(choice as DietaryOption);
                choiceParts.push(`${memberLabel}: ${choiceLabel}${isParcelOpted ? ` (${UI_TEXT.parcels})` : ""}`);

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

  const renderItem = useCallback(({ item, index }: { item: Subscription & { _hasCurrentMeal?: boolean; _hasParcel?: boolean; _isVegOnly?: boolean; _hasSpecialMeal?: boolean; _hasPackage?: boolean; _missedCount?: number }; index: number }) => {
    return (
      <SubscriptionCard
        item={item}
        index={index}
        theme={theme}
        styles={styles}
        s={s}
        kidsEnabled={!!kidsEnabled}
        guestsEnabled={!!guestsEnabled}
        paymentConfig={paymentConfig}
        whatsappCountryCode={whatsappCountryCode}
        hasCurrentMeal={!!item._hasCurrentMeal}
        hasParcel={!!item._hasParcel}
        isVegOnly={!!item._isVegOnly}
        hasSpecialMeal={!!item._hasSpecialMeal}
        hasPackage={!!item._hasPackage}
        onSelect={onSelect}
        onOpenQuickCheckout={onOpenQuickCheckout}
        addActivityLog={addActivityLog}
        missedCount={item._missedCount}
      />
    );
  }, [theme, styles, s, kidsEnabled, paymentConfig, whatsappCountryCode, onSelect, onOpenQuickCheckout, addActivityLog]);

  const showFilters = (currentMealInfo && hasAnySubscribed) || (kidsEnabled && hasAnyKids) || hasAnyParcel || (isNonVegSeason && hasAnyVegOnly) || (currentMealInfo && hasAnyMissed) || hasAnySpecialOnly || hasAnyPackage;

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar barStyle={theme.themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
        <View style={styles.header}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <BackButton onPress={goBack} />
              <HomeButton onPress={() => navigate(AppScreen.HOME)} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              <ThemeToggleButton />
              <LogoutButton onLogout={handleLogout} />
            </View>
          </View>
          <UserGreeting />
          <Text style={styles.title}>{UI_TEXT.subscriptions}</Text>
          <Text style={styles.subtitle}>
            {UI_TEXT.activePasses}: {subscriptions.length}
            {(activeFilters.length > 1 || !!subscriptionSearch) && visibleSubscriptions.length !== subscriptions.length && (
              ` • ${UI_TEXT.showingMatches}: ${visibleSubscriptions.length}`
            )}
          </Text>
        </View>

        {showFilters && (
          <View style={[styles.maxWidthWrapper, { marginTop: 10 }]}>
            <View style={{ flexDirection: 'row', gap: s(4), flexWrap: 'wrap' }}>
            <Pressable
              onPress={() => toggleFilter(FilterMode.ALL)}
              accessible={true}
              accessibilityRole="button"
              accessibilityState={{ selected: activeFilters.includes(FilterMode.ALL) }}
              accessibilityLabel={`${UI_TEXT.all} (${subscriptions.length})`}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: s(4),
                  paddingHorizontal: s(8),
                  paddingVertical: s(4),
                  borderRadius: s(12),
                  borderWidth: 1,
                  borderColor: activeFilters.includes(FilterMode.ALL) ? theme.colors.primary : theme.colors.border,
                  backgroundColor: activeFilters.includes(FilterMode.ALL) ? theme.colors.surfaceDark : theme.colors.surface,
                  marginBottom: s(4)
                },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons
                name={activeFilters.includes(FilterMode.ALL) ? "layers" : "layers-outline"}
                size={s(13)}
                color={activeFilters.includes(FilterMode.ALL) ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={{
                fontSize: s(11),
                fontWeight: "700",
                color: activeFilters.includes(FilterMode.ALL) ? theme.colors.primary : theme.colors.textSecondary
              }}>
                {UI_TEXT.all} ({subscriptions.length})
              </Text>
            </Pressable>

            {currentMealInfo && hasAnySubscribed && (
              <Pressable
                onPress={() => toggleFilter(FilterMode.SUBSCRIBED)}
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilters.includes(FilterMode.SUBSCRIBED) }}
                accessibilityLabel={`${UI_TEXT.mealSubscriberMarker} (${subscribedCount})`}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(4),
                    paddingHorizontal: s(8),
                    paddingVertical: s(4),
                    borderRadius: s(12),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.SUBSCRIBED) ? theme.colors.success : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.SUBSCRIBED) ? theme.colors.successLight : theme.colors.surface,
                    marginBottom: s(4)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.SUBSCRIBED) ? "restaurant" : "restaurant-outline"}
                  size={s(13)}
                  color={activeFilters.includes(FilterMode.SUBSCRIBED) ? theme.colors.success : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(11),
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
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilters.includes(FilterMode.MISSED) }}
                accessibilityLabel={`${UI_TEXT.mealMissedMarker} (${missedData.count})`}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(4),
                    paddingHorizontal: s(8),
                    paddingVertical: s(4),
                    borderRadius: s(12),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.MISSED) ? theme.colors.error : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.MISSED) ? theme.colors.errorLight : theme.colors.surface,
                    marginBottom: s(4)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.MISSED) ? "alert-circle" : "alert-circle-outline"}
                  size={s(13)}
                  color={activeFilters.includes(FilterMode.MISSED) ? theme.colors.error : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(11),
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
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilters.includes(FilterMode.KIDS) }}
                accessibilityLabel={`${UI_TEXT.kids} (${passesWithKidsCount})`}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(4),
                    paddingHorizontal: s(8),
                    paddingVertical: s(4),
                    borderRadius: s(12),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.KIDS) ? theme.colors.nonVeg : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.KIDS) ? theme.colors.errorLight : theme.colors.surface,
                    marginBottom: s(4)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.KIDS) ? "happy" : "happy-outline"}
                  size={s(13)}
                  color={activeFilters.includes(FilterMode.KIDS) ? theme.colors.nonVeg : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(11),
                  fontWeight: "700",
                  color: activeFilters.includes(FilterMode.KIDS) ? theme.colors.nonVeg : theme.colors.textSecondary
                }}>
                  {UI_TEXT.kids} ({passesWithKidsCount})
                </Text>
              </Pressable>
            )}

            {guestsEnabled && hasAnyGuests && (
              <Pressable
                onPress={() => toggleFilter(FilterMode.GUESTS)}
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilters.includes(FilterMode.GUESTS) }}
                accessibilityLabel={`${UI_TEXT.guests} (${passesWithGuestsCount})`}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(4),
                    paddingHorizontal: s(8),
                    paddingVertical: s(4),
                    borderRadius: s(12),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.GUESTS) ? theme.colors.primary : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.GUESTS) ? theme.colors.primary + "22" : theme.colors.surface,
                    marginBottom: s(4)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.GUESTS) ? "people" : "people-outline"}
                  size={s(13)}
                  color={activeFilters.includes(FilterMode.GUESTS) ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(11),
                  fontWeight: "700",
                  color: activeFilters.includes(FilterMode.GUESTS) ? theme.colors.primary : theme.colors.textSecondary
                }}>
                  {UI_TEXT.guests} ({passesWithGuestsCount})
                </Text>
              </Pressable>
            )}

            {hasAnyParcel && (
              <Pressable
                onPress={() => toggleFilter(FilterMode.PARCEL)}
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilters.includes(FilterMode.PARCEL) }}
                accessibilityLabel={`${UI_TEXT.parcels} (${passesWithParcelCount})`}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(4),
                    paddingHorizontal: s(8),
                    paddingVertical: s(4),
                    borderRadius: s(12),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.PARCEL) ? theme.colors.secondary : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.PARCEL) ? theme.colors.surfaceDark : theme.colors.surface,
                    marginBottom: s(4)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.PARCEL) ? "briefcase" : "briefcase-outline"}
                  size={s(13)}
                  color={activeFilters.includes(FilterMode.PARCEL) ? theme.colors.secondary : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(11),
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
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilters.includes(FilterMode.VEG_ONLY) }}
                accessibilityLabel={`${UI_TEXT.vegOnly} (${passesWithVegOnlyCount})`}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(4),
                    paddingHorizontal: s(8),
                    paddingVertical: s(4),
                    borderRadius: s(12),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.VEG_ONLY) ? theme.colors.veg : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.VEG_ONLY) ? theme.colors.veg + "10" : theme.colors.surface,
                    marginBottom: s(4)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.VEG_ONLY) ? "leaf" : "leaf-outline"}
                  size={s(13)}
                  color={activeFilters.includes(FilterMode.VEG_ONLY) ? theme.colors.veg : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(11),
                  fontWeight: "700",
                  color: activeFilters.includes(FilterMode.VEG_ONLY) ? theme.colors.veg : theme.colors.textSecondary
                }}>
                  {UI_TEXT.vegOnly} ({passesWithVegOnlyCount})
                </Text>
              </Pressable>
            )}

            {hasAnySpecialOnly && (
              <Pressable
                onPress={() => toggleFilter(FilterMode.SPECIAL_ONLY)}
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilters.includes(FilterMode.SPECIAL_ONLY) }}
                accessibilityLabel={`${UI_TEXT.specialMeals} (${passesWithSpecialOnlyCount})`}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(4),
                    paddingHorizontal: s(8),
                    paddingVertical: s(4),
                    borderRadius: s(12),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.SPECIAL_ONLY) ? theme.colors.specialMealBorder : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.SPECIAL_ONLY) ? theme.colors.specialMealBg : theme.colors.surface,
                    marginBottom: s(4)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.SPECIAL_ONLY) ? "star" : "star-outline"}
                  size={s(13)}
                  color={activeFilters.includes(FilterMode.SPECIAL_ONLY) ? theme.colors.specialMealBorder : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(11),
                  fontWeight: "700",
                  color: activeFilters.includes(FilterMode.SPECIAL_ONLY) ? theme.colors.specialMealBorder : theme.colors.textSecondary
                }}>
                  {UI_TEXT.specialMeals} ({passesWithSpecialOnlyCount})
                </Text>
              </Pressable>
            )}

            {hasAnyPackage && (
              <Pressable
                onPress={() => toggleFilter(FilterMode.PACKAGE)}
                accessible={true}
                accessibilityRole="button"
                accessibilityState={{ selected: activeFilters.includes(FilterMode.PACKAGE) }}
                accessibilityLabel={`${UI_TEXT.packages} (${passesWithPackageCount})`}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(4),
                    paddingHorizontal: s(8),
                    paddingVertical: s(4),
                    borderRadius: s(12),
                    borderWidth: 1,
                    borderColor: activeFilters.includes(FilterMode.PACKAGE) ? theme.colors.primary : theme.colors.border,
                    backgroundColor: activeFilters.includes(FilterMode.PACKAGE) ? theme.colors.surfaceDark : theme.colors.surface,
                    marginBottom: s(4)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={activeFilters.includes(FilterMode.PACKAGE) ? "cube" : "cube-outline"}
                  size={s(13)}
                  color={activeFilters.includes(FilterMode.PACKAGE) ? theme.colors.primary : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(11),
                  fontWeight: "700",
                  color: activeFilters.includes(FilterMode.PACKAGE) ? theme.colors.primary : theme.colors.textSecondary
                }}>
                  {UI_TEXT.packages} ({passesWithPackageCount})
                </Text>
              </Pressable>
            )}

            {activeFilters.length > 1 && !activeFilters.includes(FilterMode.ALL) && (
              <Pressable
                onPress={() => {
                  setActiveFilters([FilterMode.ALL]);
                  setSubscriptionSearch("");
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.clearFilters}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(4),
                    paddingHorizontal: s(8),
                    paddingVertical: s(4),
                    borderRadius: s(12),
                    borderWidth: 1,
                    borderColor: theme.colors.primary,
                    backgroundColor: theme.colors.primary + "20",
                    marginBottom: s(4)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name="close-circle"
                  size={s(13)}
                  color={theme.colors.primary}
                />
                <Text style={{
                  fontSize: s(11),
                  fontWeight: "800",
                  color: theme.colors.primary
                }}>
                  {UI_TEXT.clearFilters} ({visibleSubscriptions.length})
                </Text>
              </Pressable>
            )}
            </View>
          </View>
        )}

        <View style={[styles.maxWidthWrapper, { marginTop: showFilters ? 4 : 20 }]}>
          <View style={{ flexDirection: 'row', gap: s(6), alignItems: 'center', flexWrap: 'nowrap' }}>
            <View style={[styles.searchBox, { flex: 1, minWidth: 90, height: s(40), marginBottom: 0, maxWidth: undefined, paddingHorizontal: s(8) }]}>
              <Ionicons name="search-outline" size={s(18)} color={theme.colors.textSecondary} />
              <TextInput
                value={subscriptionSearch}
                onChangeText={setSubscriptionSearch}
                placeholder={UI_TEXT.searchPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                style={[styles.searchInput, { fontSize: s(13) }]}
                autoCapitalize="characters"
                clearButtonMode="while-editing"
                accessible={true}
                accessibilityLabel={UI_TEXT.searchPlaceholder}
              />
            </View>
            <View style={{ flexDirection: 'row', gap: s(6), alignItems: 'center', flexShrink: 0 }}>
              <Pressable
                onPress={() => {
                  setSortBy(prev => {
                    if (prev === DirectorySortMode.BLOCK_FLAT) return DirectorySortMode.CREATED_AT;
                    if (prev === DirectorySortMode.CREATED_AT) return DirectorySortMode.UPDATED_AT;
                    if (prev === DirectorySortMode.UPDATED_AT) return DirectorySortMode.AMOUNT;
                    return DirectorySortMode.BLOCK_FLAT;
                  });
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${UI_TEXT.sortByBlockFlat}: ${sortBy === DirectorySortMode.BLOCK_FLAT ? UI_TEXT.block : (sortBy === DirectorySortMode.CREATED_AT ? UI_TEXT.createdTime : (sortBy === DirectorySortMode.UPDATED_AT ? UI_TEXT.editedTime : UI_TEXT.paidAmount))}`}
                style={({ pressed }) => [
                  {
                    height: s(40),
                    paddingHorizontal: s(8),
                    borderRadius: s(10),
                    backgroundColor: theme.colors.surfaceDark,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(4),
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons name="swap-vertical-outline" size={s(15)} color={theme.colors.primary} />
                <Text style={{ fontSize: s(11), fontWeight: "800", color: theme.colors.textPrimary }}>
                  {sortBy === DirectorySortMode.BLOCK_FLAT ? UI_TEXT.block : (sortBy === DirectorySortMode.CREATED_AT ? UI_TEXT.createdTime : (sortBy === DirectorySortMode.UPDATED_AT ? UI_TEXT.editedTime : UI_TEXT.paidAmount))}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => setIsAscending(!isAscending)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.activePasses}
                style={({ pressed }) => [
                  {
                    width: s(40),
                    height: s(40),
                    borderRadius: s(10),
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
                  size={s(18)}
                  color={theme.colors.primary}
                />
              </Pressable>
              {visibleSubscriptions.length >= 1 && (
                <Pressable
                  onPress={handleExportExcel}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={UI_TEXT.exportExcel}
                  style={({ pressed }) => [
                    {
                      height: s(40),
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: s(4),
                      backgroundColor: theme.colors.primary,
                      paddingHorizontal: s(10),
                      borderRadius: s(10),
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
                    size={s(16)}
                    color={theme.colors.white}
                  />
                  <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: s(12) }}>
                    {UI_TEXT.exportExcel}
                  </Text>
                </Pressable>
              )}
            </View>
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
          style={({ pressed }) => [
            styles.fab,
            { bottom: Platform.OS === 'web' ? s(100) : s(140) },
            !canAdd && { opacity: 0.4 },
            pressed && { opacity: 0.8 }
          ]}
          onPress={onAdd}
          disabled={!canAdd}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={UI_TEXT.addFlat}
        >
          <Ionicons name="add" size={s(32)} color={theme.colors.white} />
        </Pressable>
      ) : null}

      <QuickCheckoutModal
        visible={quickCheckoutVisible && !!quickCheckoutSub}
        subscription={quickCheckoutSub}
        currentMealInfo={currentMealInfo}
        source={CheckoutSource.SUBSCRIPTION_LIST}
        onClose={() => {
          setQuickCheckoutVisible(false);
          setQuickCheckoutSub(null);
        }}
        onSuccess={() => {
          setQuickCheckoutVisible(false);
          setQuickCheckoutSub(null);
          void refreshAllData(true);
        }}
      />
    </View>
  );
}
