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
import { styles } from "../styles";
import { UI_TEXT } from "../strings";
import {
  getDayLabel,
  getDayAbbr,
  isMealEnabled,
  isDietaryEnabled,
  isDietaryEnabledForDay,
  isParcelEnabled,
  mealSummary,
} from "../constants";
import { Subscription, FoodMenu, MealMenu, UserRole, ConfigDay, MealSlot } from "../types";
import { BackButton } from "../components/common/BackButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { MealSummaryInline } from "../components/menu/MealSummaryInline";
import { AlertButton } from "../components/common/CustomAlert";

export function DetailsScreen({
  subscription,
  userRole,
  config,
  onBack,
  onEdit,
  onQr,
  onDelete,
  menu,
  showAlert,
}: {
  subscription: Subscription;
  userRole: UserRole;
  config: ConfigDay[];
  onBack: () => void;
  onEdit: () => void;
  onQr: () => void;
  onDelete: () => void;
  menu: FoodMenu;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
}) {
  const isAdmin = userRole === "admin";
  const activeDays = config.filter((d) => d.enabled).map((d) => d.id);

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <BackButton onPress={onBack} />
        <Text style={styles.eyebrow}>
          {UI_TEXT.flatIdPrefix}
          {subscription.id}
        </Text>
        <Text style={styles.title}>
          {subscription.peopleCount}
          {subscription.peopleCount === 1
            ? UI_TEXT.personSuffix
            : UI_TEXT.personsSuffix}
        </Text>
        <Text style={[styles.subtitle, { lineHeight: 20 }]}>
          {mealSummary(subscription, config) || UI_TEXT.flexibleMeals} | {subscription.paymentMode} | {UI_TEXT.rs}{" "}
          {subscription.amount}
        </Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {/* Headcount Info */}
        <Text style={styles.sectionTitle}>{UI_TEXT.peopleCountLabel}</Text>
        <View style={styles.peoplePanel}>
          <Text style={styles.person}>
            {subscription.peopleCount}
            {subscription.peopleCount === 1
              ? UI_TEXT.registeredPersonSuffix
              : UI_TEXT.registeredPersonsSuffix}
          </Text>
        </View>

        {/* Global Food Plan & Menu Items */}
        <Text style={styles.sectionTitle}>{UI_TEXT.foodPlan}</Text>
        <View style={styles.peoplePanel}>
          {activeDays.map((day) => {
            const dayMenu = menu[day];
            const hasMenu = (m: MealMenu) =>
              m && ((m.veg || []).length > 0 || (m.nonVeg || []).length > 0);

            const vegEnabled = isDietaryEnabledForDay(day, "veg", config);
            const nonVegEnabled = isDietaryEnabledForDay(day, "nonVeg", config);

            const parts = [];
            if (vegEnabled)
              parts.push(
                `${subscription.meals[day]?.veg || 0} ${UI_TEXT.veg}`
              );
            if (nonVegEnabled)
              parts.push(
                `${
                  subscription.meals[day]?.nonVeg || 0
                } ${UI_TEXT.nonVeg}`
              );

            return (
              <View key={day} style={styles.dayMenuSection}>
                <Text style={styles.person}>
                  {getDayLabel(day, config)}: {parts.join(", ")}
                </Text>
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

        {/* Individual Choice Matrix */}
        <Text style={styles.sectionTitle}>{UI_TEXT.foodChoiceByPerson}</Text>
        <Text style={styles.helper}>{UI_TEXT.foodChoiceHelper}</Text>
        {Array.from({ length: subscription.peopleCount }, (_, personIndex) => (
          <View key={personIndex} style={styles.personRow}>
            <Text style={styles.personName}>
              {UI_TEXT.person} {personIndex + 1}
            </Text>
            <View style={styles.personDays}>
              {activeDays.map((day) => {
                const slots = subscription.mealSlots[day]?.[personIndex];

                const bEnabled = isMealEnabled(day, "breakfast", config);
                const lEnabled = isMealEnabled(day, "lunch", config);
                const dEnabled = isMealEnabled(day, "dinner", config);

                const getMealText = (
                  slot: "breakfast" | "lunch" | "dinner",
                  abbr: string
                ) => {
                  const choice = slots?.[slot];
                  if (!choice || choice === "None") return UI_TEXT.emptyAbbr;
                  if (!isMealEnabled(day, slot, config)) return UI_TEXT.emptyAbbr;

                  const dietKey = choice === "Veg" ? "veg" : "nonVeg";
                  if (!isDietaryEnabled(day, slot, dietKey, config))
                    return UI_TEXT.emptyAbbr;

                  const parcel =
                    isParcelEnabled(day, slot, config) &&
                    slots?.[(`${slot}Parcel` as keyof MealSlot)]
                      ? "ᴾ"
                      : "";
                  const diet =
                    choice === "Veg" ? UI_TEXT.vegAbbr : UI_TEXT.nonVegAbbr;
                  return `${abbr}${diet}${parcel}`;
                };

                const bStatus = bEnabled ? getMealText("breakfast", UI_TEXT.breakfastAbbr) : "";
                const lStatus = lEnabled ? getMealText("lunch", UI_TEXT.lunchAbbr) : "";
                const dStatus = dEnabled ? getMealText("dinner", UI_TEXT.dinnerAbbr) : "";

                const slotText = slots ? `${bStatus} ${lStatus} ${dStatus}`.trim() : "---";
                const isAnyMeal = slots && (slots.breakfast !== "None" || slots.lunch !== "None" || slots.dinner !== "None");

                return (
                  <View
                    key={day}
                    style={[
                      styles.personDay,
                      isAnyMeal && styles.slotSelected,
                    ]}
                  >
                    <Text
                      style={[
                        styles.personDayText,
                        isAnyMeal && styles.personDayTextOn,
                      ]}
                    >
                      {getDayAbbr(day, config)}
                    </Text>
                    <Text
                      style={[
                        styles.slotText,
                        isAnyMeal && styles.personDayTextOn,
                        { fontSize: 10 }
                      ]}
                    >
                      {slotText}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Collection/Taken Matrix */}
        <Text style={styles.sectionTitle}>{UI_TEXT.foodTakenByPerson}</Text>
        <Text style={styles.helper}>{UI_TEXT.foodTakenHelper}</Text>
        {Array.from({ length: subscription.peopleCount }, (_, personIndex) => (
          <View key={personIndex} style={styles.personRow}>
            <Text style={styles.personName}>
              {UI_TEXT.person} {personIndex + 1}
            </Text>
            <View style={styles.personDays}>
              {activeDays.map((day) => {
                const taken = subscription.takenByPerson[day]?.[personIndex];
                const slots = subscription.mealSlots[day]?.[personIndex];

                const bEnabled = isMealEnabled(day, "breakfast", config);
                const lEnabled = isMealEnabled(day, "lunch", config);
                const dEnabled = isMealEnabled(day, "dinner", config);

                const getTakenText = (
                  slot: "breakfast" | "lunch" | "dinner",
                  abbr: string
                ) => {
                  const choice = slots?.[slot];
                  if (!choice || choice === "None") return "";
                  if (!isMealEnabled(day, slot, config)) return "";

                  const dietKey = choice === "Veg" ? "veg" : "nonVeg";
                  if (!isDietaryEnabled(day, slot, dietKey, config)) return "";

                  return taken?.[slot] ? abbr : UI_TEXT.emptyAbbr;
                };

                const bStatus = bEnabled ? getTakenText("breakfast", UI_TEXT.breakfastAbbr) : "";
                const lStatus = lEnabled ? getTakenText("lunch", UI_TEXT.lunchAbbr) : "";
                const dStatus = dEnabled ? getTakenText("dinner", UI_TEXT.dinnerAbbr) : "";

                const takenText = taken ? `${bStatus}${lStatus}${dStatus}`.trim() : "---";
                const isAnyTaken =
                  taken &&
                  ((bEnabled && taken.breakfast) ||
                    (lEnabled && taken.lunch) ||
                    (dEnabled && taken.dinner));

                return (
                  <View
                    key={day}
                    style={[styles.personDay, isAnyTaken && styles.checkOn]}
                  >
                    <Text
                      style={[
                        styles.personDayText,
                        isAnyTaken && styles.personDayTextOn,
                      ]}
                    >
                      {getDayAbbr(day, config)}
                    </Text>
                    <Text
                      style={[
                        styles.slotText,
                        isAnyTaken && styles.personDayTextOn,
                      ]}
                    >
                      {takenText}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ))}

        {/* Actions Section */}
        <View style={styles.actions}>
          <Pressable onPress={onEdit} style={styles.secondary}>
            <ActionLabel icon="create-outline" label={UI_TEXT.editPass} />
          </Pressable>
          <Pressable onPress={onQr} style={styles.secondary}>
            <ActionLabel icon="qr-code-outline" label={UI_TEXT.showQr} />
          </Pressable>
          {isAdmin && (
            <Pressable
              onPress={() =>
                showAlert(
                  UI_TEXT.deleteConfirmTitle,
                  `${UI_TEXT.deleteConfirmMessage}${subscription.id}${UI_TEXT.deleteConfirmMessageSuffix}`,
                  [
                    { text: UI_TEXT.cancel, style: "cancel" },
                    {
                      text: UI_TEXT.deleteButton,
                      style: "destructive",
                      onPress: onDelete,
                    },
                  ]
                )
              }
              style={[styles.secondary, { borderColor: "#b34e45" }]}
            >
              <ActionLabel
                icon="trash-outline"
                label={UI_TEXT.deleteButton}
                color="#b34e45"
              />
            </Pressable>
          )}
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}
