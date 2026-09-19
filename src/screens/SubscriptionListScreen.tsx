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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { StatusBarStyleMode, useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";
import { getActiveDays, getPaymentModeLabel, isMealCurrent, isMealEnabled } from "../constants";
import { AppScreen, Subscription, PaymentMode, UserRole, MealType, DietaryOption, FilterMode, AppThemeMode, ActivityModule, ActivityAction } from "../types";
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
  addActivityLog
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

  const [filterMode, setFilterMode] = useState<FilterMode>(FilterMode.ALL);

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

  const visibleSubscriptions = useMemo(() => {
    let filtered = subscriptions;

    if (currentMealInfo && hasAnySubscribed && filterMode === FilterMode.SUBSCRIBED) {
      filtered = filtered.filter((sub) =>
        (sub.mealSlots?.[currentMealInfo.dayId] || []).some(
          (slot) =>
            slot[currentMealInfo.type] === DietaryOption.VEG ||
            slot[currentMealInfo.type] === DietaryOption.NON_VEG
        )
      );
    }

    if (kidsEnabled && hasAnyKids && filterMode === FilterMode.KIDS) {
      filtered = filtered.filter(sub => (sub.kidsCount || 0) > 0);
    }

    if (hasAnyParcel && filterMode === FilterMode.PARCEL) {
      filtered = filtered.filter(sub =>
        Object.values(sub.mealSlots || {}).some(daySlots =>
          daySlots.some(slot => slot.breakfastParcel || slot.lunchParcel || slot.dinnerParcel)
        )
      );
    }

    if (hasAnyVegOnly && filterMode === FilterMode.VEG_ONLY) {
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

    if (!subscriptionSearch) {
       return filtered.map(item => {
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

         return { ...item, _hasCurrentMeal: hasCurrentMeal, _hasParcel: hasParcel, _isVegOnly: isVegOnly };
       });
    }

    const searchLower = subscriptionSearch.toLowerCase();
    return filtered
      .filter(
        (s) =>
          s.flat.toLowerCase().includes(searchLower) ||
          s.block.toLowerCase().includes(searchLower)
      )
      .map(item => {
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
        return { ...item, _hasCurrentMeal: hasCurrentMeal, _hasParcel: hasParcel, _isVegOnly: isVegOnly };
      });
  }, [subscriptions, subscriptionSearch, filterMode, currentMealInfo, kidsEnabled, hasAnyKids, hasAnySubscribed, hasAnyParcel, hasAnyVegOnly]);


  const renderItem = useCallback(({ item, index }: { item: Subscription & { _hasCurrentMeal?: boolean; _hasParcel?: boolean; _isVegOnly?: boolean }; index: number }) => {
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
      />
    );
  }, [theme, styles, s, kidsEnabled, paymentConfig, whatsappCountryCode, onSelect]);

  const showFilters = (currentMealInfo && hasAnySubscribed) || (kidsEnabled && hasAnyKids) || hasAnyParcel || (isNonVegSeason && hasAnyVegOnly);

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar style={theme.themeType === AppThemeMode.DARK ? StatusBarStyleMode.LIGHT : StatusBarStyleMode.DARK} />
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
              onPress={() => setFilterMode(FilterMode.ALL)}
              style={({ pressed }) => [
                {
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: s(6),
                  paddingHorizontal: s(12),
                  paddingVertical: s(8),
                  borderRadius: s(20),
                  borderWidth: 1,
                  borderColor: filterMode === FilterMode.ALL ? theme.colors.primary : theme.colors.border,
                  backgroundColor: filterMode === FilterMode.ALL ? theme.colors.surfaceDark : theme.colors.surface,
                  marginBottom: s(8)
                },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons
                name={filterMode === FilterMode.ALL ? "layers" : "layers-outline"}
                size={s(16)}
                color={filterMode === FilterMode.ALL ? theme.colors.primary : theme.colors.textSecondary}
              />
              <Text style={{
                fontSize: s(13),
                fontWeight: "700",
                color: filterMode === FilterMode.ALL ? theme.colors.primary : theme.colors.textSecondary
              }}>
                {UI_TEXT.all} ({subscriptions.length})
              </Text>
            </Pressable>

            {currentMealInfo && hasAnySubscribed && (
              <Pressable
                onPress={() => setFilterMode(FilterMode.SUBSCRIBED)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(6),
                    paddingHorizontal: s(12),
                    paddingVertical: s(8),
                    borderRadius: s(20),
                    borderWidth: 1,
                    borderColor: filterMode === FilterMode.SUBSCRIBED ? theme.colors.success : theme.colors.border,
                    backgroundColor: filterMode === FilterMode.SUBSCRIBED ? theme.colors.successLight : theme.colors.surface,
                    marginBottom: s(8)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={filterMode === FilterMode.SUBSCRIBED ? "restaurant" : "restaurant-outline"}
                  size={s(14)}
                  color={filterMode === FilterMode.SUBSCRIBED ? theme.colors.success : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(13),
                  fontWeight: "700",
                  color: filterMode === FilterMode.SUBSCRIBED ? theme.colors.primary : theme.colors.textSecondary
                }}>
                  {UI_TEXT.mealSubscriberMarker} ({subscribedCount})
                </Text>
              </Pressable>
            )}

            {kidsEnabled && hasAnyKids && (
              <Pressable
                onPress={() => setFilterMode(FilterMode.KIDS)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(6),
                    paddingHorizontal: s(12),
                    paddingVertical: s(8),
                    borderRadius: s(20),
                    borderWidth: 1,
                    borderColor: filterMode === FilterMode.KIDS ? theme.colors.nonVeg : theme.colors.border,
                    backgroundColor: filterMode === FilterMode.KIDS ? theme.colors.errorLight : theme.colors.surface,
                    marginBottom: s(8)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={filterMode === FilterMode.KIDS ? "happy" : "happy-outline"}
                  size={s(16)}
                  color={filterMode === FilterMode.KIDS ? theme.colors.nonVeg : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(13),
                  fontWeight: "700",
                  color: filterMode === FilterMode.KIDS ? theme.colors.nonVeg : theme.colors.textSecondary
                }}>
                  {UI_TEXT.kids} ({passesWithKidsCount})
                </Text>
              </Pressable>
            )}

            {hasAnyParcel && (
              <Pressable
                onPress={() => setFilterMode(FilterMode.PARCEL)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(6),
                    paddingHorizontal: s(12),
                    paddingVertical: s(8),
                    borderRadius: s(20),
                    borderWidth: 1,
                    borderColor: filterMode === FilterMode.PARCEL ? theme.colors.secondary : theme.colors.border,
                    backgroundColor: filterMode === FilterMode.PARCEL ? theme.colors.surfaceDark : theme.colors.surface,
                    marginBottom: s(8)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={filterMode === FilterMode.PARCEL ? "briefcase" : "briefcase-outline"}
                  size={s(16)}
                  color={filterMode === FilterMode.PARCEL ? theme.colors.secondary : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(13),
                  fontWeight: "700",
                  color: filterMode === FilterMode.PARCEL ? theme.colors.secondary : theme.colors.textSecondary
                }}>
                  {UI_TEXT.parcels} ({passesWithParcelCount})
                </Text>
              </Pressable>
            )}

            {isNonVegSeason && hasAnyVegOnly && (
              <Pressable
                onPress={() => setFilterMode(FilterMode.VEG_ONLY)}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: s(6),
                    paddingHorizontal: s(12),
                    paddingVertical: s(8),
                    borderRadius: s(20),
                    borderWidth: 1,
                    borderColor: filterMode === FilterMode.VEG_ONLY ? theme.colors.veg : theme.colors.border,
                    backgroundColor: filterMode === FilterMode.VEG_ONLY ? theme.colors.veg + "10" : theme.colors.surface,
                    marginBottom: s(8)
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons
                  name={filterMode === FilterMode.VEG_ONLY ? "leaf" : "leaf-outline"}
                  size={s(16)}
                  color={filterMode === FilterMode.VEG_ONLY ? theme.colors.veg : theme.colors.textSecondary}
                />
                <Text style={{
                  fontSize: s(13),
                  fontWeight: "700",
                  color: filterMode === FilterMode.VEG_ONLY ? theme.colors.veg : theme.colors.textSecondary
                }}>
                  {UI_TEXT.vegOnly} ({passesWithVegOnlyCount})
                </Text>
              </Pressable>
            )}
            </View>
          </View>
        )}

        <View style={[styles.maxWidthWrapper, { marginTop: showFilters ? 4 : 20 }]}>
          <View style={[styles.searchBox, { marginBottom: 0, maxWidth: undefined }]}>
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
        </View>

        <FlatList
          style={{ flex: 1, width: "100%" }}
          data={visibleSubscriptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.content, { paddingTop: 10 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={3}
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
