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
import { styles, CARD_COLORS } from "../styles";
import { UI_TEXT } from "../strings";
import {
  getActiveDays,
  getDayLabel,
  getDayAbbr,
  isMealEnabled,
  isDietaryEnabled,
  isDietaryEnabledForDay,
  isParcelEnabled,
  mealSummary,
} from "../constants";
import { Subscription, FoodMenu, MealMenu, UserRole, ConfigDay, PaymentConfig } from "../types";
import { BackButton } from "../components/common/BackButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { MealSummaryInline } from "../components/menu/MealSummaryInline";
import { AlertButton } from "../components/common/CustomAlert";
import { Ionicons } from "@expo/vector-icons";

export function DetailsScreen({
  subscription,
  userRole,
  config,
  paymentConfig,
  seasonEnabled,
  onBack,
  onEdit,
  onQr,
  onDelete,
  onLogout,
  menu,
  showAlert,
}: {
  subscription: Subscription;
  userRole: UserRole;
  config: ConfigDay[];
  paymentConfig: PaymentConfig;
  seasonEnabled: boolean;
  onBack: () => void;
  onEdit: () => void;
  onQr: () => void;
  onDelete: () => void;
  onLogout: () => void;
  menu: FoodMenu;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
}) {
  const isAdmin = userRole === "admin";
  const canEdit = seasonEnabled;
  const activeDays = config.filter((d) => d.enabled).map((d) => d.id);

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <BackButton onPress={onBack} />
          <LogoutButton onLogout={onLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.foodPass}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Pass Identity Card */}
        <View style={[styles.card, { backgroundColor: "#E31837", borderColor: "#E31837", elevation: 6 }]}>
          <View style={styles.previewTop}>
            <View>
              <Text style={[styles.previewLabel, { color: "rgba(255,255,255,0.7)" }]}>PASS IDENTITY</Text>
              <Text style={[styles.previewTitle, { color: "#FFF", fontSize: 28 }]}>
                {subscription.id}
              </Text>
            </View>
            {paymentConfig.enabled && (
              <Text style={[styles.previewAmount, { color: "#FFF", fontSize: 22 }]}>
                {UI_TEXT.rs} {subscription.amount}
              </Text>
            )}
          </View>

          <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 12 }} />

          <Text style={[styles.previewMeta, { color: "#FFF" }]}>
            {subscription.peopleCount}
            {subscription.peopleCount === 1
              ? UI_TEXT.personSuffix
              : UI_TEXT.personsSuffix}
            {paymentConfig.enabled && ` | ${subscription.paymentMode}`}
          </Text>
        </View>
        {/* Quick Overview Card */}
        <View style={[styles.card, { backgroundColor: CARD_COLORS[4].bg, borderColor: CARD_COLORS[4].border }]}>
           <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[styles.sectionTitle, { marginBottom: 0, color: CARD_COLORS[4].accent }]}>{UI_TEXT.subscriptionSummary}</Text>
              {paymentConfig.enabled && (
                <View style={[styles.pill, { backgroundColor: CARD_COLORS[4].accent + "20" }]}>
                   <Text style={[styles.pillText, { color: CARD_COLORS[4].accent }]}>{subscription.paymentMode}</Text>
                </View>
              )}
           </View>
           <View style={{ height: 1, backgroundColor: CARD_COLORS[4].border, marginVertical: 16 }} />
           <Text style={{ fontSize: 16, color: "#1A1C1E", lineHeight: 24, fontWeight: "600" }}>
              {mealSummary(subscription, config) || UI_TEXT.noFoodSelected}
           </Text>
        </View>

        {/* Global Food Plan */}
        <Text style={styles.sectionTitle}>{UI_TEXT.foodPlan}</Text>
        <View style={[styles.card, { paddingVertical: 10, backgroundColor: CARD_COLORS[5].bg, borderColor: CARD_COLORS[5].border }]}>
          {activeDays.map((day, idx) => {
            const dayMenu = menu[day];
            const hasMenu = (m: MealMenu) =>
              m && ((m.veg || []).length > 0 || (m.nonVeg || []).length > 0);

            const vegEnabled = isDietaryEnabledForDay(day, "veg", config);
            const nonVegEnabled = isDietaryEnabledForDay(day, "nonVeg", config);

            const parts = [];
            const vCount = subscription.meals[day]?.veg || 0;
            const nvCount = subscription.meals[day]?.nonVeg || 0;

            if (vegEnabled && vCount > 0)
              parts.push(`${vCount} ${UI_TEXT.veg}`);
            if (nonVegEnabled && nvCount > 0)
              parts.push(`${nvCount} ${UI_TEXT.nonVeg}`);

            const planSummary = parts.length > 0 ? parts.join(", ") : UI_TEXT.none;

            return (
              <View key={day} style={[styles.dayMenuSection, idx === activeDays.length - 1 && { borderBottomWidth: 0, marginBottom: 0 }, { borderBottomColor: CARD_COLORS[5].border }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <Text style={{ fontSize: 15, fontWeight: "800", color: "#1A1C1E" }}>{getDayLabel(day, config)}</Text>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: CARD_COLORS[5].accent }}>{planSummary}</Text>
                </View>
                {dayMenu &&
                  (hasMenu(dayMenu.breakfast) ||
                    hasMenu(dayMenu.lunch) ||
                    hasMenu(dayMenu.dinner)) && (
                    <View style={styles.menuSummaryInline}>
                      {isMealEnabled(day, "breakfast", config) &&
                        hasMenu(dayMenu.breakfast) && (
                          <MealSummaryInline
                            label={UI_TEXT.breakfastLabel}
                            mealKey="breakfast"
                            dayId={day}
                            config={config}
                            menu={dayMenu.breakfast}
                          />
                        )}
                      {isMealEnabled(day, "lunch", config) &&
                        hasMenu(dayMenu.lunch) && (
                          <MealSummaryInline
                            label={UI_TEXT.lunchLabel}
                            mealKey="lunch"
                            dayId={day}
                            config={config}
                            menu={dayMenu.lunch}
                          />
                        )}
                      {isMealEnabled(day, "dinner", config) &&
                        hasMenu(dayMenu.dinner) && (
                          <MealSummaryInline
                            label={UI_TEXT.dinnerLabel}
                            mealKey="dinner"
                            dayId={day}
                            config={config}
                            menu={dayMenu.dinner}
                          />
                        )}
                    </View>
                  )}
              </View>
            );
          })}
        </View>

        {/* Choice Matrix */}
        <Text style={styles.sectionTitle}>{UI_TEXT.foodChoiceByPerson}</Text>
        <Text style={styles.helper}>{UI_TEXT.foodChoiceHelper}</Text>
        {Array.from({ length: subscription.peopleCount }, (_, personIndex) => (
          <View key={personIndex} style={[styles.card, { backgroundColor: CARD_COLORS[2].bg, borderColor: CARD_COLORS[2].border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
               <Ionicons name="person-outline" size={18} color={CARD_COLORS[2].accent} />
               <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 16, color: CARD_COLORS[2].accent }]}>{UI_TEXT.personAbbr}{personIndex + 1}</Text>
            </View>
            <View style={styles.personDays}>
              {activeDays.map((day) => {
                const slots = subscription.mealSlots[day]?.[personIndex];
                const isAnyMeal = slots && (slots.breakfast !== "None" || slots.lunch !== "None" || slots.dinner !== "None");

                const getMealParts = () => {
                   if (!slots) return [];
                   const res = [];
                   if (slots.breakfast !== "None") res.push({ label: "B", parcel: slots.breakfastParcel });
                   if (slots.lunch !== "None") res.push({ label: "L", parcel: slots.lunchParcel });
                   if (slots.dinner !== "None") res.push({ label: "D", parcel: slots.dinnerParcel });
                   return res;
                };

                const mealParts = getMealParts();

                return (
                  <View
                    key={day}
                    style={[
                      styles.personDay,
                      isAnyMeal && { backgroundColor: "#FFFFFF", borderColor: CARD_COLORS[2].accent },
                      { flexDirection: "row", gap: 8, minWidth: 80, justifyContent: 'space-between' }
                    ]}
                  >
                    <Text style={[styles.personDayText, isAnyMeal && { color: CARD_COLORS[2].accent }]}>{getDayAbbr(day, config)}</Text>
                    <View style={{ flexDirection: "row", gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                       {mealParts.map((p, i) => (
                          <View key={i} style={{ position: 'relative' }}>
                             <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: CARD_COLORS[2].accent, alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ color: "#FFF", fontSize: 8, fontWeight: "900" }}>{p.label}</Text>
                             </View>
                             {p.parcel && (
                                <View style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFB300", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFF" }}>
                                   <Text style={{ color: "#FFF", fontSize: 6, fontWeight: "900" }}>P</Text>
                                </View>
                             )}
                          </View>
                       ))}
                       {mealParts.length === 0 && <Text style={{ color: "#ADB5BD", fontSize: 10 }}>-</Text>}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Collection Matrix */}
        <Text style={styles.sectionTitle}>{UI_TEXT.foodTakenByPerson}</Text>
        <Text style={styles.helper}>{UI_TEXT.foodTakenHelper}</Text>
        {Array.from({ length: subscription.peopleCount }, (_, personIndex) => (
          <View key={personIndex} style={[styles.card, { backgroundColor: CARD_COLORS[0].bg, borderColor: CARD_COLORS[0].border }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 }}>
               <Ionicons name="checkmark-circle-outline" size={18} color={CARD_COLORS[0].accent} />
               <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 16, color: CARD_COLORS[0].accent }]}>{UI_TEXT.personAbbr}{personIndex + 1}</Text>
            </View>
            <View style={styles.personDays}>
              {activeDays.map((day) => {
                const taken = subscription.takenByPerson[day]?.[personIndex];
                const slots = subscription.mealSlots[day]?.[personIndex];
                const isAnyTaken = taken && (taken.breakfast || taken.lunch || taken.dinner);

                const getTakenParts = () => {
                   if (!taken) return [];
                   const res = [];
                   if (taken.breakfast) res.push({ label: "B", parcel: slots?.breakfastParcel });
                   if (taken.lunch) res.push({ label: "L", parcel: slots?.lunchParcel });
                   if (taken.dinner) res.push({ label: "D", parcel: slots?.dinnerParcel });
                   return res;
                };

                const takenParts = getTakenParts();

                return (
                  <View
                    key={day}
                    style={[
                      styles.personDay,
                      isAnyTaken && { backgroundColor: "#FFFFFF", borderColor: CARD_COLORS[0].accent },
                      { flexDirection: "row", gap: 8, minWidth: 80, justifyContent: 'space-between' }
                    ]}
                  >
                    <Text style={[styles.personDayText, isAnyTaken && { color: CARD_COLORS[0].accent }]}>{getDayAbbr(day, config)}</Text>
                    <View style={{ flexDirection: "row", gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                       {takenParts.map((p, i) => (
                          <View key={i} style={{ position: 'relative' }}>
                             <View style={{ width: 14, height: 14, borderRadius: 7, backgroundColor: CARD_COLORS[0].accent, alignItems: "center", justifyContent: "center" }}>
                                <Text style={{ color: "#FFF", fontSize: 8, fontWeight: "900" }}>{p.label}</Text>
                             </View>
                             {p.parcel && (
                                <View style={{ position: 'absolute', top: -5, right: -5, width: 10, height: 10, borderRadius: 5, backgroundColor: "#FFB300", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "#FFF" }}>
                                   <Text style={{ color: "#FFF", fontSize: 6, fontWeight: "900" }}>P</Text>
                                </View>
                             )}
                          </View>
                       ))}
                       {takenParts.length === 0 && <Text style={{ color: "#ADB5BD", fontSize: 10 }}>-</Text>}
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
              style={[styles.primary, getActiveDays(config).length === 0 && { opacity: 0.5 }]}
              disabled={getActiveDays(config).length === 0}
            >
              <ActionLabel icon="create-outline" label={UI_TEXT.editPass} color="#FFF" />
            </Pressable>
          )}
          <View style={{ flexDirection: "row", gap: 12 }}>
            <Pressable
              onPress={onQr}
              style={[styles.primary, { flex: 1, backgroundColor: "#E31837", marginTop: 0, height: 52, borderRadius: 16 }]}
            >
               <ActionLabel icon="qr-code-outline" label={UI_TEXT.showQr} color="#FFF" />
            </Pressable>
            {isAdmin && canEdit && (
               <Pressable
                  onPress={() =>
                  showAlert(
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
                  color="#FFF"
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
