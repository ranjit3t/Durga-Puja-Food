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
} from "react-native";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import {
  getActiveDays,
  isSeasonDone,
  getDayLabel,
  getDayAbbr,
  isMealEnabled,
  isDietaryEnabledForDay,
  mealSummary,
  getPaymentModeLabel,
} from "../constants";
import { MealMenu, MealType, DietType, DietaryOption, AppScreen, UserRole, PaymentMode } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { MealSummaryInline } from "../components/menu/MealSummaryInline";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";

export function DetailsScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    subscriptions, dayConfig, paymentConfig, seasonEnabled, foodMenu, mobileEnabled,
    deleteSubscription
  } = useDatabase();
  const { showAlert: showGlobalAlert } = useUI();
  const {
    selectedId, selectedRecord, navigate, goBack, setEditing
  } = useAppNavigation();

  const subscription = subscriptions.find(s => s.id === selectedId) || selectedRecord;
  if (!subscription) return null;

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const isAdmin = userRole === UserRole.ADMIN;
  const canEdit = seasonEnabled && !isSeasonDone(dayConfig);
  const activeDays = getActiveDays(dayConfig);

  const onBack = goBack;
  const onHome = () => navigate(AppScreen.HOME);
  const onEdit = () => { setEditing(subscription); navigate(AppScreen.FORM); };
  const onQr = () => navigate(AppScreen.QR);
  const onDelete = () => deleteSubscription(subscription.id).then(() => navigate(AppScreen.HOME));

  return (
    <View style={styles.root}>
      <StatusBar style={themeType === "dark" ? "light" : "dark"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={onBack} />
            <HomeButton onPress={onHome} />
          </View>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.foodPass}</Text>
      </View>

      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={styles.content}
      >
        {/* Pass Identity Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, elevation: 6 }]}>
          <View style={styles.previewTop}>
            <View>
              <Text style={[styles.previewLabel, { color: theme.colors.white, opacity: 0.7 }]}>{UI_TEXT.passIdentity}</Text>
              <Text style={[styles.previewTitle, { color: theme.colors.white, fontSize: 28 }]}>
                {subscription.id}
              </Text>
            </View>
            {paymentConfig.enabled && (
              <Text style={[styles.previewAmount, { color: theme.colors.white, fontSize: 22 }]}>
                {UI_TEXT.rs} {subscription.amount || UI_TEXT.zero}
              </Text>
            )}
          </View>

          <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2, marginVertical: 12 }} />

          <Text style={[styles.previewMeta, { color: theme.colors.white }]}>
            {subscription.peopleCount}
            {subscription.peopleCount === 1
              ? UI_TEXT.personSuffix
              : UI_TEXT.personsSuffix}
            {paymentConfig.enabled && ` | ${UI_TEXT.rs} ${subscription.amount || UI_TEXT.zero}`}
            {mobileEnabled && subscription.mobile && ` | ${subscription.mobile}`}
          </Text>
        </View>
        {/* Quick Overview Card */}
        <View style={[styles.card, { backgroundColor: theme.cardColors[4].bg, borderColor: theme.cardColors[4].border }]}>
           <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0, color: theme.cardColors[4].accent }]}>{UI_TEXT.subscriptionSummary}</Text>
              {paymentConfig.enabled && (
                <View style={[styles.pill, { backgroundColor: theme.cardColors[4].accent + "33" }]}>
                   <Text style={[styles.pillText, { color: theme.cardColors[4].accent }]}>{UI_TEXT.rs} {subscription.amount || UI_TEXT.zero}</Text>
                </View>
              )}
           </View>
           <View style={{ height: 1, backgroundColor: theme.cardColors[4].border, marginVertical: 16 }} />

            {paymentConfig.enabled && subscription.payments && subscription.payments.length > 0 ? (
             <View style={{ marginBottom: 12, gap: 8 }}>
                {subscription.payments.map((p, idx) => (
                   <View key={idx} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                         <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.textPrimary }}>{getPaymentModeLabel(p.mode || PaymentMode.CASH)} {p.transactionId ? `(${p.transactionId})` : ''}</Text>
                         <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: '700' }}>{UI_TEXT.paymentNumber}{idx + 1}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '900', color: theme.cardColors[4].accent }}>{UI_TEXT.rs} {p.amount || UI_TEXT.zero}</Text>
                   </View>
                ))}
                <View style={{ height: 1, backgroundColor: theme.cardColors[4].border, marginVertical: 4 }} />
             </View>
           ) : null}

           <Text style={{ fontSize: 16, color: theme.colors.textPrimary, lineHeight: 24, fontWeight: "600" }}>
              {mealSummary(subscription, dayConfig) || UI_TEXT.noFoodSelected}
           </Text>
        </View>

        {/* Global Food Plan */}
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>{UI_TEXT.foodPlan}</Text>
        <View style={[styles.card, { paddingVertical: 10, backgroundColor: theme.cardColors[5].bg, borderColor: theme.cardColors[5].border }]}>
          {activeDays.map((day, idx) => {
            const dayMenu = foodMenu[day];
            const hasMenu = (m: MealMenu) =>
              m && ((m.veg || []).length > 0 || (m.nonVeg || []).length > 0);

            const vegEnabled = isDietaryEnabledForDay(day, DietType.VEG, dayConfig);
            const nonVegEnabled = isDietaryEnabledForDay(day, DietType.NON_VEG, dayConfig);

            const parts = [];
            const vCount = subscription.meals[day]?.[DietType.VEG] || 0;
            const nvCount = subscription.meals[day]?.[DietType.NON_VEG] || 0;

            if (vegEnabled && vCount > 0)
              parts.push(`${vCount} ${UI_TEXT.veg}`);
            if (nonVegEnabled && nvCount > 0)
              parts.push(`${nvCount} ${UI_TEXT.nonVeg}`);

            const planSummary = parts.length > 0 ? parts.join(", ") : UI_TEXT.none;

            return (
              <View key={day} style={[styles.dayMenuSection, idx === activeDays.length - 1 && { borderBottomWidth: 0, marginBottom: 0 }, { borderBottomColor: theme.cardColors[5].border }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: theme.colors.textPrimary }}>{getDayLabel(day, dayConfig)}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: theme.cardColors[5].accent }}>{planSummary}</Text>
                </View>
                {dayMenu &&
                  (hasMenu(dayMenu[MealType.BREAKFAST]) ||
                    hasMenu(dayMenu[MealType.LUNCH]) ||
                    hasMenu(dayMenu[MealType.DINNER])) && (
                    <View style={styles.menuSummaryInline}>
                      {isMealEnabled(day, MealType.BREAKFAST, dayConfig) &&
                        hasMenu(dayMenu[MealType.BREAKFAST]) && (
                          <MealSummaryInline
                            label={UI_TEXT.breakfastLabel}
                            mealKey={MealType.BREAKFAST}
                            dayId={day}
                            config={dayConfig}
                            menu={dayMenu[MealType.BREAKFAST]}
                          />
                        )}
                      {isMealEnabled(day, MealType.LUNCH, dayConfig) &&
                        hasMenu(dayMenu[MealType.LUNCH]) && (
                          <MealSummaryInline
                            label={UI_TEXT.lunchLabel}
                            mealKey={MealType.LUNCH}
                            dayId={day}
                            config={dayConfig}
                            menu={dayMenu[MealType.LUNCH]}
                          />
                        )}
                      {isMealEnabled(day, MealType.DINNER, dayConfig) &&
                        hasMenu(dayMenu[MealType.DINNER]) && (
                          <MealSummaryInline
                            label={UI_TEXT.dinnerLabel}
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
        </View>

        {/* Choice Matrix */}
        <Text style={[styles.sectionTitle, { marginBottom: 12 }]}>{UI_TEXT.foodChoiceByPerson}</Text>
        <Text style={styles.helper}>{UI_TEXT.foodChoiceHelper}</Text>
        {Array.from({ length: subscription.peopleCount }, (_, personIndex) => (
          <View key={personIndex} style={[styles.card, { backgroundColor: theme.cardColors[2].bg, borderColor: theme.cardColors[2].border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
               <Ionicons name="person-outline" size={18} color={theme.cardColors[2].accent} />
               <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 16, color: theme.cardColors[2].accent }]}>{UI_TEXT.personAbbr}{personIndex + 1}</Text>
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
                             <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.cardColors[2].accent, alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ color: theme.colors.white, fontSize: 8, fontWeight: "900" }}>{p.label}</Text>
                             </View>
                             {p.parcel && (
                                <View style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.secondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.white }}>
                                   <Text style={{ color: theme.colors.white, fontSize: 6, fontWeight: "900" }}>P</Text>
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
        {Array.from({ length: subscription.peopleCount }, (_, personIndex) => (
          <View key={personIndex} style={[styles.card, { backgroundColor: theme.cardColors[0].bg, borderColor: theme.cardColors[0].border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
               <Ionicons name="checkmark-circle-outline" size={18} color={theme.cardColors[0].accent} />
               <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 16, color: theme.cardColors[0].accent }]}>{UI_TEXT.personAbbr}{personIndex + 1}</Text>
            </View>
            <View style={styles.personDays}>
              {activeDays.map((day) => {
                const taken = subscription.takenByPerson[day]?.[personIndex];
                const slots = subscription.mealSlots[day]?.[personIndex];
                const isAnyTaken = taken && (taken[MealType.BREAKFAST] || taken[MealType.LUNCH] || taken[MealType.DINNER]);

                const getTakenParts = () => {
                   if (!taken) return [];
                   const res = [];
                   if (taken[MealType.BREAKFAST]) res.push({ label: UI_TEXT.breakfastAbbr, parcel: slots?.breakfastParcel });
                   if (taken[MealType.LUNCH]) res.push({ label: UI_TEXT.lunchAbbr, parcel: slots?.lunchParcel });
                   if (taken[MealType.DINNER]) res.push({ label: UI_TEXT.dinnerAbbr, parcel: slots?.dinnerParcel });
                   return res;
                };

                const takenParts = getTakenParts();

                return (
                  <View
                    key={day}
                    style={[
                      styles.personDay,
                      isAnyTaken && { backgroundColor: theme.colors.background, borderColor: theme.cardColors[0].accent },
                      { flexDirection: "row", gap: 8, minWidth: 80, justifyContent: 'space-between' }
                    ]}
                  >
                    <Text style={[styles.personDayText, isAnyTaken && { color: theme.cardColors[0].accent }]}>{getDayAbbr(day, dayConfig)}</Text>
                    <View style={{ flexDirection: "row", gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                       {takenParts.map((p, i) => (
                          <View key={i} style={{ position: 'relative' }}>
                             <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: theme.cardColors[0].accent, alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ color: theme.colors.white, fontSize: 8, fontWeight: "900" }}>{p.label}</Text>
                             </View>
                             {p.parcel && (
                                <View style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.secondary, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.colors.white }}>
                                   <Text style={{ color: theme.colors.white, fontSize: 6, fontWeight: "900" }}>P</Text>
                                </View>
                             )}
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
                  style={[styles.deleteButton, { flex: 1, marginTop: 0, height: 52, borderRadius: 16 }]}
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
    </View>
  );
}
