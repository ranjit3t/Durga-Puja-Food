/**
 * Form screen for adding or editing a flat's subscription.
 * Handles headcounts, daily meal choices, and payment information.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from "react-native";
import { styles } from "../styles";
import { UI_TEXT } from "../strings";
import {
  getActiveDays,
  blockOptions,
  mealSummary,
  mealsFromChoices,
  resizeMealChoices,
  resizeMealSlots,
  resizeTaken,
  getDayLabel,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled,
  isVegOnlyDay,
} from "../constants";
import {
  Subscription,
  Day,
  MealChoice,
  MealSlot,
  TakenState,
  UserRole,
} from "../types";
import { ActionLabel } from "../components/common/ActionLabel";
import { Dropdown } from "../components/common/Dropdown";
import { BackButton } from "../components/common/BackButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { AlertButton } from "../components/common/CustomAlert";

export function SubscriptionForm({
  value,
  userRole,
  config,
  onCancel,
  onSave,
  onSaveQr,
  onDelete,
  onLogout,
  lockIdentity = false,
  showAlert,
}: {
  value: Subscription;
  userRole: UserRole;
  config: ConfigDay[];
  onCancel: () => void;
  onSave: (value: Subscription) => void;
  onSaveQr?: (value: Subscription) => void;
  onDelete?: () => void;
  onLogout: () => void;
  lockIdentity?: boolean;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
}) {
  const isAdmin = userRole === "admin";
  const activeDays = getActiveDays(config);

  const [form, setForm] = useState(value);
  const [peopleCountInput, setPeopleCountInput] = useState(
    String(value.peopleCount)
  );
  const [selectedPerson, setSelectedPerson] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Day>(activeDays[0]);

  const set = <K extends keyof Subscription>(key: K, next: Subscription[K]) =>
    setForm({ ...form, [key]: next });

  // Prepare data for saving, ensuring normalized IDs and aggregated counts
  const prepared = {
    ...form,
    flat: form.flat.trim().toUpperCase(),
    id: lockIdentity
      ? value.id
      : `${form.block}-${form.flat.trim().toUpperCase()}`,
    takenByPerson: resizeTaken(form.takenByPerson, form.peopleCount, config),
    mealSlots: resizeMealSlots(form.mealSlots, form.peopleCount, config),
    meals: mealsFromChoices(form.mealSlots, config),
  };

  /**
   * Sets the dietary choice for a specific meal slot.
   */
  const setMealSlotChoice = (
    slot: "breakfast" | "lunch" | "dinner",
    choice: MealChoice
  ) => {
    setForm({
      ...form,
      mealSlots: {
        ...form.mealSlots,
        [selectedDay]: form.mealSlots[selectedDay].map((item, index) =>
          index === selectedPerson ? { ...item, [slot]: choice } : item
        ),
      },
    });
  };

  /**
   * Toggles a specific meal slot parcel for a person.
   */
  const setMealParcel = (slot: "breakfast" | "lunch" | "dinner", enabled: boolean) => {
    const parcelKey = `${slot}Parcel` as keyof MealSlot;
    setForm({
      ...form,
      mealSlots: {
        ...form.mealSlots,
        [selectedDay]: form.mealSlots[selectedDay].map((item, index) =>
          index === selectedPerson ? { ...item, [parcelKey]: enabled } : item
        ),
      },
    });
  };

  /**
   * Toggles whether a specific meal has been 'taken' (collected) by the person.
   */
  const setTakenChoice = (slot: keyof TakenState, taken: boolean) =>
    set("takenByPerson", {
      ...form.takenByPerson,
      [selectedDay]: form.takenByPerson[selectedDay].map((item, index) =>
        index === selectedPerson ? { ...item, [slot]: taken } : item
      ),
    });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <BackButton onPress={onCancel} />
          <LogoutButton onLogout={onLogout} />
        </View>
        <Text style={styles.eyebrow}>
          {lockIdentity ? UI_TEXT.editSubscription : UI_TEXT.newSubscription}
        </Text>
        <Text style={styles.title}>
          {lockIdentity ? UI_TEXT.editFlat : UI_TEXT.addFlatTitle}
        </Text>
        <Text style={styles.subtitle}>
          {lockIdentity ? UI_TEXT.editSubtitle : UI_TEXT.addSubtitle}
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Real-time Summary Card */}
        <View style={styles.livePreview}>
          <View style={styles.previewTop}>
            <View>
              <Text style={styles.previewLabel}>{UI_TEXT.livePreview}</Text>
              <Text style={styles.previewTitle}>
                {form.block || "-"}-{form.flat || "-"}
              </Text>
            </View>
            <Text style={styles.previewAmount}>
              {form.amount ? `${UI_TEXT.rs} ${form.amount}` : ""}
            </Text>
          </View>
          <Text style={styles.previewMeta}>
            {form.peopleCount}
            {form.peopleCount === 1
              ? UI_TEXT.personSuffix
              : UI_TEXT.personsSuffix}{" "}
            | {form.paymentMode || UI_TEXT.paymentModeNotSet}
          </Text>
        <Text style={styles.livePreview}>
          {mealSummary(
            { ...form, meals: mealsFromChoices(form.mealSlots, config) },
            config
          ) || UI_TEXT.noFoodSelected}
        </Text>
        </View>

        {/* Identity Inputs */}
        <Text style={styles.label}>{UI_TEXT.blockAndFlat}</Text>
        <View style={styles.row}>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>{UI_TEXT.blockNo}</Text>
            {isAdmin ? (
              <Dropdown
                value={form.block}
                options={blockOptions}
                onChange={(block) => set("block", block)}
              />
            ) : (
              <View style={[styles.input, { backgroundColor: "#eee" }]}>
                <Text>{form.block}</Text>
              </View>
            )}
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>{UI_TEXT.flatNo}</Text>
            <TextInput
              value={form.flat}
              onChangeText={(flat) => set("flat", flat.toUpperCase())}
              placeholder={UI_TEXT.flatNoPlaceholder}
              keyboardType="default"
              autoCapitalize="characters"
              editable={isAdmin && !lockIdentity}
              selectTextOnFocus={isAdmin && !lockIdentity}
              style={[styles.input, !isAdmin && { backgroundColor: "#eee" }]}
            />
          </View>
        </View>

        <Text style={styles.label}>{UI_TEXT.peopleCount}</Text>
        <TextInput
          value={peopleCountInput}
          onChangeText={(peopleCount) => {
            const digits = peopleCount.replace(/[^0-9]/g, "");
            setPeopleCountInput(peopleCount);
            if (digits === "") {
              setSelectedPerson(0);
              setForm({
                ...form,
                peopleCount: 0,
                mealByPerson: resizeMealChoices(form.mealByPerson, 0, config),
                mealSlots: resizeMealSlots(form.mealSlots, 0, config),
              });
              return;
            }
            const count = Number(digits);
            setSelectedPerson((current) =>
              Math.min(current, Math.max(0, count - 1))
            );
            setForm({
              ...form,
              peopleCount: count,
              mealByPerson: resizeMealChoices(form.mealByPerson, count, config),
              mealSlots: resizeMealSlots(form.mealSlots, count, config),
            });
          }}
          placeholder="2"
          keyboardType="numeric"
          editable={isAdmin}
          selectTextOnFocus={isAdmin}
          returnKeyType="done"
          style={[styles.input, !isAdmin && { backgroundColor: "#eee" }]}
        />

        {/* Selection Matrix Selectors */}
        <Text style={styles.label}>{UI_TEXT.foodChoice}</Text>
        <Text style={styles.helper}>{UI_TEXT.foodChoiceInstruction}</Text>

        <Text style={styles.selectorLabel}>{UI_TEXT.person}</Text>
        <View style={styles.selectorRow}>
          {Array.from({ length: form.peopleCount }, (_, index) => (
            <Pressable
              key={index}
              onPress={() => setSelectedPerson(index)}
              style={[
                styles.selector,
                selectedPerson === index && styles.selectorOn,
              ]}
            >
              <Text
                style={[
                  styles.selectorText,
                  selectedPerson === index && styles.selectorTextOn,
                ]}
              >
                {UI_TEXT.person} {index + 1}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.selectorLabel}>{UI_TEXT.day}</Text>
        <View style={styles.selectorRow}>
          {activeDays.map((day) => (
            <Pressable
              key={day}
              onPress={() => setSelectedDay(day)}
              style={[
                styles.selector,
                selectedDay === day && styles.selectorOn,
              ]}
            >
              <Text
                style={[
                  styles.selectorText,
                  selectedDay === day && styles.selectorTextOn,
                ]}
              >
                {getDayLabel(day, config)}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* SECTION 1: Meal Plan */}
        <View style={{ marginTop: 12 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Text style={[styles.currentChoice, { marginTop: 0 }]}>{UI_TEXT.foodPlan}</Text>
            <Text style={[styles.helper, { marginBottom: 0, fontSize: 11 }]}>V=Veg, N=Non-Veg, -=None</Text>
          </View>

          {(["breakfast", "lunch", "dinner"] as const)
            .filter((slot) => isMealEnabled(selectedDay, slot, config))
            .map((slot) => {
              const label =
                slot === "breakfast"
                  ? UI_TEXT.breakfastTitle
                  : slot === "lunch"
                  ? UI_TEXT.lunchTitle
                  : UI_TEXT.dinnerTitle;
              const currentSlotChoice =
                form.mealSlots[selectedDay]?.[selectedPerson]?.[slot] || "None";
              const isVegOnly = isVegOnlyDay(selectedDay, config);

              return (
                <View key={slot} style={{ marginBottom: 12 }}>
                  <Text style={[styles.label, { marginTop: 0, marginBottom: 6, fontSize: 12, color: '#666' }]}>{label}</Text>
                  <View style={styles.choiceRow}>
                    {/* Option: None */}
                    <Pressable
                      onPress={() => isAdmin && setMealSlotChoice(slot, "None")}
                      style={[
                        styles.choice,
                        currentSlotChoice === "None" ? styles.slotSelected : styles.noneChoice,
                        !isAdmin && { opacity: currentSlotChoice === "None" ? 1 : 0.3 },
                      ]}
                    >
                      <Text style={[styles.choiceText, currentSlotChoice === "None" && styles.choiceTextOn]}>
                        {UI_TEXT.emptyAbbr}
                      </Text>
                    </Pressable>

                    {/* Option: Veg (Always shown if enabled in settings) */}
                    {isDietaryEnabled(selectedDay, slot, "veg", config) && (
                      <Pressable
                        onPress={() => isAdmin && setMealSlotChoice(slot, "Veg")}
                        style={[
                          styles.choice,
                          currentSlotChoice === "Veg" ? styles.vegChoice : styles.noneChoice,
                          !isAdmin && { opacity: currentSlotChoice === "Veg" ? 1 : 0.3 },
                        ]}
                      >
                        <Text style={[styles.choiceText, currentSlotChoice === "Veg" && styles.choiceTextOn]}>
                          {UI_TEXT.vegAbbr}
                        </Text>
                      </Pressable>
                    )}

                    {/* Option: Non-veg (Hidden if Veg Only day) */}
                    {!isVegOnly && isDietaryEnabled(selectedDay, slot, "nonVeg", config) && (
                      <Pressable
                        onPress={() => isAdmin && setMealSlotChoice(slot, "Non-veg")}
                        style={[
                          styles.choice,
                          currentSlotChoice === "Non-veg" ? styles.nonVegChoice : styles.noneChoice,
                          !isAdmin && { opacity: currentSlotChoice === "Non-veg" ? 1 : 0.3 },
                        ]}
                      >
                        <Text style={[styles.choiceText, currentSlotChoice === "Non-veg" && styles.choiceTextOn]}>
                          {UI_TEXT.nonVegAbbr}
                        </Text>
                      </Pressable>
                    )}
                  </View>
                </View>
              );
            })}
        </View>

        {/* SECTION 2: Parcels */}
        {(() => {
          const parcelSlots = (["breakfast", "lunch", "dinner"] as const).filter(
            (slot) => isMealEnabled(selectedDay, slot, config) && isParcelEnabled(selectedDay, slot, config)
          );

          if (parcelSlots.length === 0) return null;

          return (
            <View style={{ marginTop: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <Text style={[styles.currentChoice, { marginTop: 0 }]}>Parcels</Text>
                <Text style={[styles.helper, { marginBottom: 0, fontSize: 11 }]}>P=Parcel, -=None</Text>
              </View>

              <View style={styles.choiceRow}>
                {parcelSlots.map((slot) => {
                  const currentChoice = form.mealSlots[selectedDay]?.[selectedPerson]?.[slot] || "None";
                  const isParcel = !!form.mealSlots[selectedDay]?.[selectedPerson]?.[`${slot}Parcel` as keyof MealSlot];
                  const abbr = slot === "breakfast" ? "B" : slot === "lunch" ? "L" : "D";

                  return (
                    <Pressable
                      key={slot}
                      disabled={currentChoice === "None"}
                      onPress={() => setMealParcel(slot, !isParcel)}
                      style={[
                        styles.choice,
                        isParcel
                          ? (currentChoice === "Non-veg" ? styles.nonVegChoice : styles.vegChoice)
                          : styles.noneChoice,
                        currentChoice === "None" && { opacity: 0.2 },
                      ]}
                    >
                      <Text
                        style={[
                          styles.choiceText,
                          isParcel && styles.choiceTextOn,
                        ]}
                      >
                        {abbr}{isParcel ? "P" : "-"}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          );
        })()}

        {/* SECTION 3: Food Collection (Only shown in Edit mode) */}
        {lockIdentity && (["breakfast", "lunch", "dinner"] as const).some(s => {
          const choice = form.mealSlots[selectedDay]?.[selectedPerson]?.[s];
          return choice && choice !== "None" && isDietaryEnabled(selectedDay, s, choice === "Veg" ? "veg" : "nonVeg", config);
        }) && (
          <View style={{ marginTop: 8 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <Text style={[styles.currentChoice, { marginTop: 0 }]}>{UI_TEXT.foodTakenByPerson}</Text>
              <Text style={[styles.helper, { marginBottom: 0, fontSize: 11 }]}>B=Breakfast, L=Lunch, D=Dinner</Text>
            </View>
            <View style={styles.choiceRow}>
              {(["breakfast", "lunch", "dinner"] as const)
                .filter((slot) => isMealEnabled(selectedDay, slot, config))
                .map((slot) => {
                  const choice =
                    form.mealSlots[selectedDay]?.[selectedPerson]?.[slot];
                  if (!choice || choice === "None") return null;

                  const dietKey = choice === "Veg" ? "veg" : "nonVeg";
                  if (!isDietaryEnabled(selectedDay, slot, dietKey, config))
                    return null;

                  const isTaken =
                    !!form.takenByPerson[selectedDay]?.[selectedPerson]?.[slot];
                  const slotColorStyle =
                    choice === "Veg"
                      ? styles.vegChoice
                      : styles.nonVegChoice;

                  const abbr =
                    slot === "breakfast"
                      ? UI_TEXT.breakfastAbbr
                      : slot === "lunch"
                      ? UI_TEXT.lunchAbbr
                      : UI_TEXT.dinnerAbbr;
                  return (
                    <Pressable
                      key={slot}
                      onPress={() => setTakenChoice(slot, !isTaken)}
                      style={[
                        styles.choice,
                        isTaken ? slotColorStyle : styles.noneChoice,
                      ]}
                    >
                      <Text
                        style={[styles.choiceText, isTaken && styles.choiceTextOn]}
                      >
                        {abbr}
                        {UI_TEXT.takenLabel}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>
          </View>
        )}

        {/* Financials */}
        <View style={styles.row}>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>{UI_TEXT.amount}</Text>
            <TextInput
              value={form.amount}
              onChangeText={(amount) => set("amount", amount)}
              keyboardType="decimal-pad"
              inputMode="decimal"
              editable={isAdmin}
              returnKeyType="done"
              blurOnSubmit
              style={[styles.input, !isAdmin && { backgroundColor: "#eee" }]}
            />
          </View>
          <View style={styles.fieldHalf}>
            <Text style={styles.label}>{UI_TEXT.paymentMode}</Text>
            {isAdmin ? (
              <Dropdown
                value={form.paymentMode}
                options={["UPI", "Cash"]}
                onChange={(paymentMode) =>
                  set("paymentMode", paymentMode as any)
                }
              />
            ) : (
              <View style={[styles.input, { backgroundColor: "#eee" }]}>
                <Text>{form.paymentMode}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <Pressable
          onPress={() => {
            if (!prepared.flat.trim()) {
              showAlert(UI_TEXT.error, UI_TEXT.flatNoRequired);
              return;
            }
            onSave(prepared);
          }}
          style={[styles.primary, !prepared.flat.trim() && { opacity: 0.5 }]}
        >
          <ActionLabel
            icon="checkmark-circle-outline"
            label={UI_TEXT.saveChanges}
            color="#fff"
          />
        </Pressable>
        {isAdmin && onSaveQr ? (
          <Pressable
            accessibilityLabel={UI_TEXT.saveGenerateQr}
            onPress={() => {
              if (!prepared.flat.trim()) {
                showAlert(UI_TEXT.error, UI_TEXT.flatNoRequired);
                return;
              }
              onSaveQr(prepared);
            }}
            style={[
              styles.secondary,
              { marginTop: 12 },
              !prepared.flat.trim() && { opacity: 0.5 },
            ]}
          >
            <ActionLabel
              icon="qr-code-outline"
              label={UI_TEXT.saveGenerateQr}
            />
          </Pressable>
        ) : null}
        {isAdmin && onDelete ? (
          <Pressable
            accessibilityLabel={UI_TEXT.deleteFlatRecord}
            onPress={onDelete}
            style={styles.deleteButton}
          >
            <ActionLabel
              icon="trash-outline"
              label={UI_TEXT.deleteFlatRecord}
              color="#b34e45"
            />
          </Pressable>
        ) : null}

        <View style={styles.footer} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
