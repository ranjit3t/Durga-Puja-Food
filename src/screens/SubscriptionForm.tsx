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
      <StatusBar style="dark" />
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
        <View style={[styles.card, { backgroundColor: "#E31837", borderColor: "#E31837", elevation: 6 }]}>
          <View style={styles.previewTop}>
            <View>
              <Text style={[styles.previewLabel, { color: "rgba(255,255,255,0.7)" }]}>{UI_TEXT.livePreview}</Text>
              <Text style={[styles.previewTitle, { color: "#FFF", fontSize: 28 }]}>
                {form.block || "-"}-{form.flat || "-"}
              </Text>
            </View>
            <Text style={[styles.previewAmount, { color: "#FFF", fontSize: 22 }]}>
              {form.amount ? `${UI_TEXT.rs} ${form.amount}` : ""}
            </Text>
          </View>

          <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 12 }} />

          <Text style={[styles.previewMeta, { color: "#FFF" }]}>
            {form.peopleCount}
            {form.peopleCount === 1
              ? UI_TEXT.personSuffix
              : UI_TEXT.personsSuffix}{" "}
            | {form.paymentMode || UI_TEXT.paymentModeNotSet}
          </Text>
        </View>

        {/* Identity Inputs */}
        <View style={[styles.card, { marginTop: 8 }]}>
           <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 12 }]}>{UI_TEXT.blockAndFlat}</Text>
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
                <View style={[styles.input, { backgroundColor: "#F8F9FA", justifyContent: "center" }]}>
                  <Text style={{ fontSize: 16, fontWeight: "600" }}>{form.block}</Text>
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
                style={[styles.input, !isAdmin && { backgroundColor: "#F8F9FA" }]}
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
            placeholder="e.g. 2"
            keyboardType="numeric"
            editable={isAdmin}
            selectTextOnFocus={isAdmin}
            returnKeyType="done"
            style={[styles.input, !isAdmin && { backgroundColor: "#F8F9FA" }]}
          />
        </View>

        {/* Selection Matrix */}
        <View style={styles.card}>
          <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 4 }]}>{UI_TEXT.foodChoice}</Text>
          <Text style={styles.helper}>{UI_TEXT.foodChoiceInstruction}</Text>

          <Text style={styles.selectorLabel}>{UI_TEXT.person}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
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
          </ScrollView>

          <Text style={styles.selectorLabel}>{UI_TEXT.day}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
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
          </ScrollView>

          {/* SECTION 1: Meal Plan */}
          <View style={{ marginTop: 8 }}>
            <View style={{ marginBottom: 12 }}>
              <Text style={[styles.currentChoice, { marginTop: 0, fontSize: 16, marginBottom: 8 }]}>{UI_TEXT.foodPlan}</Text>
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
                  <View key={slot} style={{ marginBottom: 16 }}>
                    <Text style={[styles.label, { marginTop: 0, marginBottom: 8, fontSize: 14, color: '#1A1C1E' }]}>{label}</Text>
                    <View style={styles.choiceRow}>
                      {/* Option: None */}
                      <Pressable
                        onPress={() => isAdmin && setMealSlotChoice(slot, "None")}
                        style={[
                          styles.choice,
                          currentSlotChoice === "None" ? styles.slotSelected : styles.noneChoice,
                          !isAdmin && { opacity: currentSlotChoice === "None" ? 1 : 0.3 },
                          { paddingVertical: 12, paddingHorizontal: 4 }
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            currentSlotChoice === "None" && styles.choiceTextOn,
                            { fontSize: 12 }
                          ]}
                        >
                          {UI_TEXT.none}
                        </Text>
                      </Pressable>

                      {/* Option: Veg */}
                      {isDietaryEnabled(selectedDay, slot, "veg", config) && (
                        <Pressable
                          onPress={() => isAdmin && setMealSlotChoice(slot, "Veg")}
                          style={[
                            styles.choice,
                            currentSlotChoice === "Veg" ? styles.vegChoice : styles.noneChoice,
                            !isAdmin && { opacity: currentSlotChoice === "Veg" ? 1 : 0.3 },
                            { paddingVertical: 12, paddingHorizontal: 4 }
                          ]}
                        >
                          <Text
                            style={[
                              styles.choiceText,
                              currentSlotChoice === "Veg" && styles.choiceTextOn,
                              { fontSize: 12 }
                            ]}
                          >
                            {UI_TEXT.veg}
                          </Text>
                        </Pressable>
                      )}

                      {/* Option: Non-veg */}
                      {!isVegOnly && isDietaryEnabled(selectedDay, slot, "nonVeg", config) && (
                        <Pressable
                          onPress={() => isAdmin && setMealSlotChoice(slot, "Non-veg")}
                          style={[
                            styles.choice,
                            currentSlotChoice === "Non-veg" ? styles.nonVegChoice : styles.noneChoice,
                            !isAdmin && { opacity: currentSlotChoice === "Non-veg" ? 1 : 0.3 },
                            { paddingVertical: 12, paddingHorizontal: 4 }
                          ]}
                        >
                          <Text
                            style={[
                              styles.choiceText,
                              currentSlotChoice === "Non-veg" && styles.choiceTextOn,
                              { fontSize: 12 }
                            ]}
                          >
                            {UI_TEXT.nonVeg}
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
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.currentChoice, { marginTop: 0, fontSize: 16, marginBottom: 8 }]}>Parcels</Text>
                </View>

                <View style={styles.choiceRow}>
                  {parcelSlots.map((slot) => {
                    const currentChoice = form.mealSlots[selectedDay]?.[selectedPerson]?.[slot] || "None";
                    const isParcel = !!form.mealSlots[selectedDay]?.[selectedPerson]?.[`${slot}Parcel` as keyof MealSlot];
                    const label = slot === "breakfast" ? UI_TEXT.breakfastTitle : slot === "lunch" ? UI_TEXT.lunchTitle : UI_TEXT.dinnerTitle;

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
                          { paddingVertical: 12, paddingHorizontal: 4 }
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            isParcel && styles.choiceTextOn,
                            { fontSize: 11 }
                          ]}
                        >
                          {label} P
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })()}

          {/* SECTION 3: Food Collection */}
          {lockIdentity && (["breakfast", "lunch", "dinner"] as const).some(s => {
            const choice = form.mealSlots[selectedDay]?.[selectedPerson]?.[s];
            return choice && choice !== "None" && isDietaryEnabled(selectedDay, s, choice === "Veg" ? "veg" : "nonVeg", config);
          }) && (
            <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: "#E9ECEF", paddingTop: 16 }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.currentChoice, { marginTop: 0, fontSize: 16, marginBottom: 8 }]}>{UI_TEXT.foodTakenByPerson}</Text>
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

                    const label =
                      slot === "breakfast"
                        ? UI_TEXT.breakfastTitle
                        : slot === "lunch"
                        ? UI_TEXT.lunchTitle
                        : UI_TEXT.dinnerTitle;
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => setTakenChoice(slot, !isTaken)}
                        style={[
                          styles.choice,
                          isTaken ? slotColorStyle : styles.noneChoice,
                          { paddingVertical: 12, paddingHorizontal: 4 }
                        ]}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            isTaken && styles.choiceTextOn,
                            { fontSize: 12 }
                          ]}
                        >
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            </View>
          )}
        </View>

        {/* Financials */}
        <View style={styles.card}>
           <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 12 }]}>Payment Details</Text>
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
                placeholder="0.00"
                style={[styles.input, !isAdmin && { backgroundColor: "#F8F9FA" }]}
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
                <View style={[styles.input, { backgroundColor: "#F8F9FA", justifyContent: "center" }]}>
                  <Text style={{ fontSize: 16, fontWeight: "600" }}>{form.paymentMode}</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={{ marginBottom: 40 }}>
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
              size={24}
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
                styles.primary,
                {
                  marginTop: 16,
                  backgroundColor: "#E31837",
                  shadowOpacity: 0,
                  elevation: 0,
                  shadowRadius: 0,
                  shadowOffset: { width: 0, height: 0 }
                },
                !prepared.flat.trim() && { opacity: 0.5 },
              ]}
            >
              <ActionLabel
                icon="qr-code-outline"
                label={UI_TEXT.saveGenerateQr}
                color="#FFF"
                size={22}
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
                color="#FFF"
              />
            </Pressable>
          ) : null}
        </View>

        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
