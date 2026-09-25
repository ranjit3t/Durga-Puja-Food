/**
 * Detailed view for a single flat subscription.
 * Displays headcount, daily dietary choices, and food collection status.
 */
import React from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  Linking,
  Platform,
} from "react-native";
import { useStyles, useScaling } from "../styles";
import { useAppTheme, StatusBarStyleMode } from "../theme";
import { UI_TEXT } from "../strings";
import {
  getActiveDays,
  isSeasonDone,
  getDayLabel,
  getDayAbbr,
  isMealEnabled,
  isMealCurrent,
  isDietaryEnabledForDay,
  getPaymentModeLabel,
  getMemberLegend,
  getMealLabel,
  isParcelEnabled,
} from "../constants";
import { MealMenu, MealType, DietType, DietaryOption, AppScreen, UserRole, PaymentMode, ReportType, AppThemeMode, ActivityModule, ActivityAction, CheckoutSource } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { MealSummaryInline } from "../components/menu/MealSummaryInline";
import { QuickCheckoutModal } from "../components/common/QuickCheckoutModal";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { useCoreDatabase, useActivityLogs } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";

export function DetailsScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    subscriptions, dayConfig, paymentConfig, seasonEnabled, foodMenu, mobileEnabled,
    deleteSubscription, whatsappCountryCode, kidsEnabled
  } = useCoreDatabase();
  const { addActivityLog } = useActivityLogs();
  const { showAlert: showGlobalAlert } = useUI();
  const {
    selectedId, selectedRecord, setSelectedId, setSelectedRecord, navigate, setEditing, setReportType, goBack
  } = useAppNavigation();

  const subscription = subscriptions.find(s => s.id === selectedId) || selectedRecord;
  if (!subscription) return null;

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const isAdmin = userRole === UserRole.ADMIN;
  const canEdit = seasonEnabled && !isSeasonDone(dayConfig);
  const activeDays = getActiveDays(dayConfig);

  const [showQuickCheckoutModal, setShowQuickCheckoutModal] = React.useState(false);

  const currentMealInfo = React.useMemo(() => {
    const active = getActiveDays(dayConfig);
    for (const dId of active) {
      for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
        if (isMealCurrent(dId, mType, dayConfig) && isMealEnabled(dId, mType, dayConfig)) {
          return {
            dayId: dId,
            mealType: mType,
            dayLabel: getDayLabel(dId, dayConfig),
            mealLabel: getMealLabel(mType)
          };
        }
      }
    }
    return null;
  }, [dayConfig]);

  const hasUnservedFoodForCurrentMeal = React.useMemo(() => {
    if (!currentMealInfo || !subscription) return false;

    const { dayId, mealType } = currentMealInfo;
    const mealKey = mealType;

    const headcount = subscription.peopleCount + (kidsEnabled ? (subscription.kidsCount || 0) : 0);
    const slots = subscription.mealSlots?.[dayId] || [];
    const taken = subscription.takenByPerson?.[dayId] || [];

    for (let i = 0; i < headcount; i++) {
      const isSubscribed = slots[i]?.[mealKey] && slots[i][mealKey] !== DietaryOption.NONE;
      const isFoodTaken = !!taken[i]?.[mealKey];
      if (isSubscribed && !isFoodTaken) {
        return true;
      }
    }

    return false;
  }, [currentMealInfo, subscription, kidsEnabled]);

  const handleQuickCheckoutClick = () => {
    if (!currentMealInfo) {
      showGlobalAlert(UI_TEXT.currentMealClosedTitle, UI_TEXT.currentMealClosed, [
        {
          text: UI_TEXT.ok,
          onPress: () => navigate(AppScreen.HOME)
        }
      ]);
      return;
    }
    if (!hasUnservedFoodForCurrentMeal || !subscription) return;
    addActivityLog({
      module: ActivityModule.SCANNER,
      action: ActivityAction.UPDATE,
      targetId: subscription.id,
      description: UI_TEXT.logQuickCheckoutOpened.replace("{id}", subscription.id).replace("{source}", CheckoutSource.DETAILS)
    });
    setShowQuickCheckoutModal(true);
  };

  React.useEffect(() => {
    if (showQuickCheckoutModal && !currentMealInfo) {
      setShowQuickCheckoutModal(false);
      showGlobalAlert(UI_TEXT.currentMealClosedTitle, UI_TEXT.currentMealClosed, [
        {
          text: UI_TEXT.ok,
          onPress: () => navigate(AppScreen.HOME)
        }
      ]);
    }
  }, [showQuickCheckoutModal, currentMealInfo, navigate, showGlobalAlert]);

  const onBack = () => goBack();
  const onHome = () => navigate(AppScreen.HOME);
  const onEdit = () => {
    addActivityLog({
      module: ActivityModule.SUBSCRIPTION,
      action: ActivityAction.VIEW,
      targetId: subscription.id,
      description: UI_TEXT.logViewPass.replace("{id}", subscription.id)
    });
    setEditing(subscription);
    navigate(AppScreen.FORM);
  };
  const onQr = () => navigate(AppScreen.QR);

  const hasNonZeroPayment = paymentConfig.enabled && (parseFloat(subscription.amount) > 0 || (subscription.payments && subscription.payments.some(p => parseFloat(p.amount) > 0)));
  const hasAnyMealTaken = Object.values(subscription.takenByPerson || {}).some(dayList =>
    dayList.some(t => t.breakfast || t.lunch || t.dinner || t.breakfastParcel || t.lunchParcel || t.dinnerParcel)
  );

  const canDeletePass = !hasNonZeroPayment && !hasAnyMealTaken;

  const onDelete = () => deleteSubscription(subscription.id).then(() => {
    addActivityLog({
      module: ActivityModule.SUBSCRIPTION,
      action: ActivityAction.DELETE,
      targetId: subscription.id,
      description: UI_TEXT.logDeletePass.replace("{id}", subscription.id)
    });
    setSelectedId("");
    setSelectedRecord(null);
    navigate(AppScreen.HOME);
  });

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={onBack} />
            <HomeButton onPress={onHome} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <Text style={styles.title}>{UI_TEXT.foodPass}</Text>
      </View>

      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={styles.content}
      >
        {/* Pass Identity Card */}
        <View style={[
          styles.card,
          {
            backgroundColor: theme.colors.primary,
            borderColor: theme.colors.primary,
            ...Platform.select({
              ios: {
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 6,
              },
              android: {
                elevation: 6,
              },
              web: {
                boxShadow: `0 4px 12px ${theme.colors.primary}40`,
              }
            })
          }
        ]}>
          <View style={styles.previewTop}>
            <View>
              <Text style={[styles.previewLabel, { color: theme.colors.white, opacity: 0.7 }]}>{UI_TEXT.passIdentity}</Text>
              <Text style={[styles.previewTitle, { color: theme.colors.white, fontSize: 28 }]}>
                {subscription.id}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              {paymentConfig.enabled && (
                <Text style={[styles.previewAmount, { color: theme.colors.white, fontSize: 22 }]}>
                  {UI_TEXT.rs}{UI_TEXT.space}{subscription.amount || UI_TEXT.zero}
                </Text>
              )}
              {hasUnservedFoodForCurrentMeal && (
                <Pressable
                  accessibilityLabel={UI_TEXT.quickCheckout}
                  onPress={handleQuickCheckoutClick}
                  style={({ pressed }) => [
                    { padding: 6, borderRadius: 20, backgroundColor: theme.colors.white + "33" },
                    pressed && { opacity: 0.7 }
                  ]}
                >
                  <Ionicons name="flash" size={18} color={theme.colors.white} />
                </Pressable>
              )}
              {canEdit && (
                <Pressable
                  onPress={onEdit}
                  style={({ pressed }) => [
                    { padding: 6, borderRadius: 20, backgroundColor: theme.colors.white + "33" },
                    pressed && { opacity: 0.7 }
                  ]}
                >
                  <Ionicons name="pencil" size={18} color={theme.colors.white} />
                </Pressable>
              )}
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2, marginVertical: 12 }} />

          <Text style={[styles.previewMeta, { color: theme.colors.white }]}>
            {kidsEnabled ? (
               `${subscription.peopleCount}${UI_TEXT.space}${subscription.peopleCount === 1 ? UI_TEXT.adult : UI_TEXT.adults}${subscription.kidsCount ? `${UI_TEXT.plus}${subscription.kidsCount}${UI_TEXT.space}${subscription.kidsCount === 1 ? UI_TEXT.kid : UI_TEXT.kids}` : ""}`
            ) : (
               `${subscription.peopleCount + (subscription.kidsCount || 0)}${subscription.peopleCount + (subscription.kidsCount || 0) === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}`
            )}
            {paymentConfig.enabled && `${UI_TEXT.pipe}${UI_TEXT.rs}${UI_TEXT.space}${subscription.amount || UI_TEXT.zero}`}
            {mobileEnabled && subscription.mobile && `${UI_TEXT.pipe}${subscription.mobile}`}
          </Text>

          {subscription.mobile && (
            <>
              <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2, marginVertical: 12 }} />
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Pressable
                  onPress={() => {
                    addActivityLog({
                      module: ActivityModule.SUBSCRIPTION,
                      action: ActivityAction.CHAT,
                      targetId: subscription.id,
                      description: UI_TEXT.logChat.replace("{id}", subscription.id)
                    });
                    Linking.openURL(`https://wa.me/${whatsappCountryCode || UI_TEXT.defaultCountryCode}${subscription.mobile}`);
                  }}
                  style={({ pressed }) => [
                    { padding: 8, borderRadius: 20, backgroundColor: theme.colors.white + "20" },
                    pressed && { opacity: 0.7 }
                  ]}
                >
                  <Ionicons name="logo-whatsapp" size={22} color={theme.colors.white} />
                </Pressable>

                <Pressable
                  onPress={() => {
                    addActivityLog({
                      module: ActivityModule.SUBSCRIPTION,
                      action: ActivityAction.CALL,
                      targetId: subscription.id,
                      description: UI_TEXT.logCall.replace("{id}", subscription.id)
                    });
                    Linking.openURL(`tel:${subscription.mobile}`);
                  }}
                  style={({ pressed }) => [
                    { padding: 8, borderRadius: 20, backgroundColor: theme.colors.white + "20" },
                    pressed && { opacity: 0.7 }
                  ]}
                >
                  <Ionicons name="call" size={22} color={theme.colors.white} />
                </Pressable>
              </View>
            </>
          )}
        </View>
        {/* Quick Overview Card */}
        {paymentConfig.enabled && (
          <Pressable
            onPress={() => {
              setReportType(ReportType.PAYMENT);
              navigate(AppScreen.REPORT);
            }}
            style={({ pressed }) => [
              styles.card,
              { backgroundColor: theme.cardColors[4].bg, borderColor: theme.cardColors[4].border },
              pressed && { opacity: 0.8 }
            ]}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={[styles.sectionTitle, { marginBottom: 0, color: theme.cardColors[4].accent }]}>{UI_TEXT.subscriptionSummary}</Text>
                <View style={[styles.pill, { backgroundColor: theme.cardColors[4].accentLight }]}>
                    <Text style={[styles.pillText, { color: theme.cardColors[4].accent }]}>{UI_TEXT.rs} {subscription.amount || UI_TEXT.zero}</Text>
                </View>
            </View>
            <View style={{ height: 1, backgroundColor: theme.cardColors[4].border, marginVertical: 16 }} />

              {subscription.payments && subscription.payments.length > 0 ? (
              <View style={{ gap: 8 }}>
                  {subscription.payments.map((p, idx) => (
                    <View key={idx} style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, idx > 0 && { marginTop: 12 }]}>
                        <View style={{ flex: 1 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.textPrimary }}>
                            {getPaymentModeLabel(p.mode || PaymentMode.CASH)}
                          </Text>
                          {p.mode === PaymentMode.CASH && p.receivedBy ? (
                            <Text style={{ fontSize: 11, color: theme.colors.primary, fontWeight: '700', marginTop: 2 }}>
                              {UI_TEXT.receivedByLabel}{UI_TEXT.colon}{UI_TEXT.space}{p.receivedBy}
                            </Text>
                          ) : (p.mode !== PaymentMode.CASH && p.transactionId) ? (
                            <Text style={{ fontSize: 11, color: theme.colors.primary, fontWeight: '700', marginTop: 2 }}>
                              {UI_TEXT.transactionIdLabel}{UI_TEXT.colon}{UI_TEXT.space}{p.transactionId}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={{ fontSize: 14, fontWeight: '900', color: theme.cardColors[4].accent }}>{UI_TEXT.rs}{UI_TEXT.space}{p.amount || UI_TEXT.zero}</Text>
                    </View>
                  ))}
              </View>
            ) : null}
          </Pressable>
        )}

        {/* Global Food Plan */}
        <Pressable
          onPress={() => navigate(AppScreen.VIEW_MENU)}
          style={({ pressed }) => [
            styles.card,
            { backgroundColor: theme.cardColors[5].bg, borderColor: theme.cardColors[5].border },
            pressed && { opacity: 0.8 }
          ]}
        >
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0, color: theme.cardColors[5].accent }]}>{UI_TEXT.foodPlan}</Text>
              <Ionicons name="restaurant-outline" size={20} color={theme.cardColors[5].accent} />
          </View>
          <View style={{ height: 1, backgroundColor: theme.cardColors[5].border, marginVertical: 16 }} />

          {activeDays.map((day, idx) => {
            const dayMenu = foodMenu[day];
            const hasMenu = (m: MealMenu) =>
              m && ((m.veg || []).length > 0 || (m.nonVeg || []).length > 0);

            const vegEnabled = isDietaryEnabledForDay(day, DietType.VEG, dayConfig);
            const nonVegEnabled = isDietaryEnabledForDay(day, DietType.NON_VEG, dayConfig);

            const parts = [];
            const vCount = subscription.meals[day]?.[DietType.VEG] || 0;
            const nvCount = subscription.meals[day]?.[DietType.NON_VEG] || 0;

            // Calculate aggregate parcel count for this day
            let pCount = 0;
            (subscription.mealSlots[day] || []).forEach(slot => {
              if (slot.breakfastParcel) pCount++;
              if (slot.lunchParcel) pCount++;
              if (slot.dinnerParcel) pCount++;
            });

            if (vegEnabled && vCount > 0)
              parts.push(`${vCount} ${UI_TEXT.veg}`);
            if (nonVegEnabled && nvCount > 0)
              parts.push(`${nvCount} ${UI_TEXT.nonVeg}`);
            if (pCount > 0)
              parts.push(`${pCount}${UI_TEXT.parcelAbbr}`);

            const planSummary = parts.length > 0 ? parts.join(", ") : UI_TEXT.none;

            if (planSummary === UI_TEXT.none) return null;

            const isSubscribedTo = (slot: MealType) => {
              return (subscription.mealSlots[day] || []).some(personSlot =>
                personSlot[slot] !== DietaryOption.NONE
              );
            };

            return (
              <View key={day} style={[styles.dayMenuSection, idx === activeDays.length - 1 && { borderBottomWidth: 0, marginBottom: 0 }, { borderBottomColor: theme.cardColors[5].border, paddingVertical: 12 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontSize: 16, fontWeight: "900", color: theme.colors.textPrimary }}>{getDayLabel(day, dayConfig)}</Text>
                  <View style={{ backgroundColor: theme.cardColors[5].accentLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: theme.cardColors[5].accent }}>{planSummary.toUpperCase()}</Text>
                  </View>
                </View>

                {dayMenu &&
                  (hasMenu(dayMenu[MealType.BREAKFAST]) ||
                    hasMenu(dayMenu[MealType.LUNCH]) ||
                    hasMenu(dayMenu[MealType.DINNER])) && (
                    <View style={{ gap: 6, marginTop: 4 }}>
                      {isMealEnabled(day, MealType.BREAKFAST, dayConfig) &&
                        isSubscribedTo(MealType.BREAKFAST) &&
                        hasMenu(dayMenu[MealType.BREAKFAST]) && (
                          <MealSummaryInline
                            label={UI_TEXT.breakfast}
                            mealKey={MealType.BREAKFAST}
                            dayId={day}
                            config={dayConfig}
                            menu={dayMenu[MealType.BREAKFAST]}
                          />
                        )}
                      {isMealEnabled(day, MealType.LUNCH, dayConfig) &&
                        isSubscribedTo(MealType.LUNCH) &&
                        hasMenu(dayMenu[MealType.LUNCH]) && (
                          <MealSummaryInline
                            label={UI_TEXT.lunch}
                            mealKey={MealType.LUNCH}
                            dayId={day}
                            config={dayConfig}
                            menu={dayMenu[MealType.LUNCH]}
                          />
                        )}
                      {isMealEnabled(day, MealType.DINNER, dayConfig) &&
                        isSubscribedTo(MealType.DINNER) &&
                        hasMenu(dayMenu[MealType.DINNER]) && (
                          <MealSummaryInline
                            label={UI_TEXT.dinner}
                            mealKey={MealType.DINNER}
                            dayId={day}
                            config={dayConfig}
                            menu={dayMenu[MealType.DINNER]}
                          />
                        )}
                    </View>
                  )}
              </View>
            );
          })}
        </Pressable>

        {/* Choice Matrix */}
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>{UI_TEXT.foodChoiceByPerson}</Text>
        <Text style={styles.helper}>{UI_TEXT.foodChoiceInstruction || UI_TEXT.foodChoiceHelper}</Text>
        {Array.from({ length: subscription.peopleCount + (kidsEnabled ? (subscription.kidsCount || 0) : 0) }, (_, personIndex) => (
          <View key={personIndex} style={[styles.card, { backgroundColor: theme.cardColors[2].bg, borderColor: theme.cardColors[2].border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
               <Ionicons name="person-outline" size={18} color={theme.cardColors[2].accent} />
               <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 16, color: theme.cardColors[2].accent }]}>{getMemberLegend(personIndex, subscription.peopleCount, !!kidsEnabled)}</Text>
            </View>
            <View style={styles.personDays}>
              {activeDays.map((day) => {
                const slots = subscription.mealSlots[day]?.[personIndex];
                const isAnyMeal = slots && (slots[MealType.BREAKFAST] !== DietaryOption.NONE || slots[MealType.LUNCH] !== DietaryOption.NONE || slots[MealType.DINNER] !== DietaryOption.NONE);

                const getMealParts = () => {
                   if (!slots) return [];
                   const res = [];
                   if (slots[MealType.BREAKFAST] !== DietaryOption.NONE) res.push({ label: UI_TEXT.breakfastAbbr, parcel: slots.breakfastParcel });
                   if (slots[MealType.LUNCH] !== DietaryOption.NONE) res.push({ label: UI_TEXT.lunchAbbr, parcel: slots.lunchParcel });
                   if (slots[MealType.DINNER] !== DietaryOption.NONE) res.push({ label: UI_TEXT.dinnerAbbr, parcel: slots.dinnerParcel });
                   return res;
                };

                const mealParts = getMealParts();

                return (
                  <View
                    key={day}
                    style={[
                      styles.personDay,
                      isAnyMeal && { backgroundColor: theme.colors.background, borderColor: theme.cardColors[2].accent },
                      { flexDirection: "row", gap: 8, minWidth: 80, justifyContent: 'space-between' }
                    ]}
                  >
                    <Text style={[styles.personDayText, isAnyMeal && { color: theme.cardColors[2].accent }]}>{getDayAbbr(day, dayConfig)}</Text>
                    <View style={{ flexDirection: "row", gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                       {mealParts.map((p, i) => (
                          <View key={i} style={{ position: 'relative' }}>
                             <View style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: theme.cardColors[2].accent, alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{p.label}</Text>
                             </View>
                             {p.parcel && (
                                <View style={{ position: 'absolute', top: -6, right: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.secondary, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: theme.colors.white, zIndex: 1, elevation: 2 }}>
                                   <Text style={{ color: theme.colors.white, fontSize: 7, fontWeight: "900" }}>{UI_TEXT.parcelAbbr}</Text>
                                </View>
                             )}
                          </View>
                       ))}
                       {mealParts.length === 0 && <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>{UI_TEXT.hyphen}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Collection Matrix */}
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>{UI_TEXT.foodTakenByPerson}</Text>
        <Text style={styles.helper}>{UI_TEXT.foodTakenHelper}</Text>
        {Array.from({ length: subscription.peopleCount + (kidsEnabled ? (subscription.kidsCount || 0) : 0) }, (_, personIndex) => (
          <View key={personIndex} style={[styles.card, { backgroundColor: theme.cardColors[0].bg, borderColor: theme.cardColors[0].border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
               <Ionicons name="checkmark-circle-outline" size={18} color={theme.cardColors[0].accent} />
               <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 16, color: theme.cardColors[0].accent }]}>{getMemberLegend(personIndex, subscription.peopleCount, !!kidsEnabled)}</Text>
            </View>
            <View style={styles.personDays}>
              {activeDays.map((day) => {
                const taken = subscription.takenByPerson[day]?.[personIndex];
                const slots = subscription.mealSlots[day]?.[personIndex];
                const isAnyTaken = taken && (taken[MealType.BREAKFAST] || taken[MealType.LUNCH] || taken[MealType.DINNER]);

                const getTakenParts = () => {
                   if (!taken) return [];
                   const res = [];
                   if (taken[MealType.BREAKFAST]) res.push({ label: UI_TEXT.breakfastAbbr, parcel: taken?.breakfastParcel, time: taken?.breakfastTime });
                   if (taken[MealType.LUNCH]) res.push({ label: UI_TEXT.lunchAbbr, parcel: taken?.lunchParcel, time: taken?.lunchTime });
                   if (taken[MealType.DINNER]) res.push({ label: UI_TEXT.dinnerAbbr, parcel: taken?.dinnerParcel, time: taken?.dinnerTime });
                   return res;
                };

                const takenParts = getTakenParts();

                return (
                  <View
                    key={day}
                    style={[
                      styles.personDay,
                      isAnyTaken && { backgroundColor: theme.colors.background, borderColor: theme.cardColors[0].accent },
                      {
                        flexDirection: "row",
                        flexWrap: "wrap",
                        gap: 8,
                        paddingVertical: 8,
                        paddingHorizontal: 10,
                        borderRadius: 12,
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flex: 1,
                        minWidth: 120,
                        maxWidth: "100%"
                      }
                    ]}
                  >
                    <Text style={[styles.personDayText, isAnyTaken && { color: theme.cardColors[0].accent }]}>{getDayAbbr(day, dayConfig)}</Text>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end', alignItems: 'center', flex: 1, minWidth: 0 }}>
                       {takenParts.map((p, i) => (
                          <View key={i} style={{ alignItems: 'center', gap: 2, paddingVertical: 2 }}>
                             <View style={{ position: 'relative' }}>
                                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: theme.cardColors[0].accent, alignItems: "center", justifyContent: "center" }}>
                                   <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{p.label}</Text>
                                </View>
                                {p.parcel && (
                                   <View style={{ position: 'absolute', top: -6, right: -6, width: 12, height: 12, borderRadius: 6, backgroundColor: theme.colors.secondary, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: theme.colors.white, zIndex: 1, elevation: 2 }}>
                                      <Text style={{ color: theme.colors.white, fontSize: 7, fontWeight: "900" }}>{UI_TEXT.parcelAbbr}</Text>
                                   </View>
                                )}
                             </View>
                             {p.time ? (
                                <View style={{
                                  backgroundColor: theme.colors.surfaceDark,
                                  paddingHorizontal: 4,
                                  paddingVertical: 1,
                                  borderRadius: 4,
                                  marginTop: 1
                                }}>
                                  <Text style={{ fontSize: 9, fontWeight: "800", color: theme.colors.textSecondary }}>
                                     {p.time}
                                  </Text>
                                </View>
                             ) : null}
                          </View>
                       ))}
                       {takenParts.length === 0 && <Text style={{ color: theme.colors.textMuted, fontSize: 10 }}>{UI_TEXT.hyphen}</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Actions */}
        <View style={{ gap: 16, marginBottom: 40 }}>
          {hasUnservedFoodForCurrentMeal && (
            <Pressable
              onPress={handleQuickCheckoutClick}
              style={[styles.primary, { backgroundColor: theme.colors.primary, marginTop: 0, height: 52, borderRadius: 16 }]}
            >
              <ActionLabel icon="flash-outline" label={UI_TEXT.quickCheckout} color={theme.colors.white} />
            </Pressable>
          )}
          {canEdit && (
            <Pressable
              onPress={onEdit}
              style={[styles.primary, getActiveDays(dayConfig).length === 0 && { opacity: 0.5 }]}
              disabled={getActiveDays(dayConfig).length === 0}
            >
              <ActionLabel icon="create-outline" label={UI_TEXT.editPass} color={theme.colors.white} />
            </Pressable>
          )}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={onQr}
              style={[styles.primary, { flex: 1, backgroundColor: theme.colors.primary, marginTop: 0, height: 52, borderRadius: 16 }]}
            >
               <ActionLabel icon="qr-code-outline" label={UI_TEXT.showQr} color={theme.colors.white} />
            </Pressable>
            {isAdmin && canEdit && (
               <Pressable
                  disabled={!canDeletePass}
                  onPress={() =>
                  showGlobalAlert(
                     UI_TEXT.deleteConfirmTitle,
                     `${UI_TEXT.deleteConfirmMessage}${subscription.id}${UI_TEXT.deleteConfirmMessageSuffix}`,
                     [
                        { text: UI_TEXT.cancel, style: "cancel" },
                        {
                           text: UI_TEXT.deleteRecord,
                           style: "destructive",
                           onPress: onDelete,
                        },
                     ]
                  )
                  }
                  style={[styles.deleteButton, { flex: 1, marginTop: 0, height: 52, borderRadius: 16 }, !canDeletePass && { opacity: 0.4 }]}
               >
                  <ActionLabel
                  icon="trash-outline"
                  label={UI_TEXT.deleteButton}
                  color={theme.colors.white}
                  />
               </Pressable>
            )}
          </View>
        </View>

        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>

      {/* Quick Checkout Modal */}
      <QuickCheckoutModal
        visible={showQuickCheckoutModal}
        subscription={subscription}
        currentMealInfo={currentMealInfo}
        source={CheckoutSource.DETAILS}
        onClose={() => setShowQuickCheckoutModal(false)}
        onSuccess={() => {
          setShowQuickCheckoutModal(false);
        }}
      />
    </View>
  );
}
