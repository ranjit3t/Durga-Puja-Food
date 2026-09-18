/**
 * Form screen for adding or editing a flat's subscription.
 * Handles headcounts, daily meal choices, and payment information.
 */
import React, { useState, useEffect, useMemo } from "react";
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
import * as Contacts from "expo-contacts/legacy";
import { useStyles } from "../styles";
import { StatusBarStyleMode, useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import {
  getActiveDays,
  blockOptions,
  mealsFromChoices,
  resizeMealChoices,
  resizeMealSlots,
  resizeTaken,
  getDayLabel,
  isMealEnabled,
  isMealDone,
  getSortedMealKeys,
  getEnabledPaymentMethods,
  isDietaryEnabled,
  isParcelEnabled,
  isVegOnlyDay,
  isMealCurrent,
  getMemberLegend,
  getMealLabel,
  getDietaryOptionLabel,
} from "../constants";
import {
  Subscription,
  Day,
  MealChoice,
  MealSlot,
  UserRole,
  MealType,
  DietType,
  DietaryOption,
  PaymentEntry,
  AppScreen,
  PaymentMode,
  AppThemeMode,
} from "../types";
import { ActionLabel } from "../components/common/ActionLabel";
import { Dropdown } from "../components/common/Dropdown";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { CounterInput } from "../components/common/CounterInput";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";

export function SubscriptionForm() {
  const { userRole, handleLogout } = useAuth();
  const {
    dayConfig, paymentConfig, seasonEnabled, foodPriceEnabled, foodMenu, mobileEnabled,
    upsertSubscription, deleteSubscription, kidsEnabled
  } = useDatabase();
  const { showAlert: showGlobalAlert } = useUI();
  const {
    editing: value, navigate, goBack, setSelectedId, setSelectedRecord
  } = useAppNavigation();

  if (!value) return null;

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const isAdmin = userRole === UserRole.ADMIN;
  const canEdit = seasonEnabled;
  const activeDays = getActiveDays(dayConfig);

  const sortedActiveDays = useMemo(() => {
    return [...activeDays].sort((a, b) => {
      const aHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(a, m, dayConfig));
      const bHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(b, m, dayConfig));
      if (aHasCurrent && !bHasCurrent) return -1;
      if (!aHasCurrent && bHasCurrent) return 1;
      return 0;
    });
  }, [activeDays, dayConfig]);

  const currentDayId = activeDays.find(day =>
    [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(day, m, dayConfig))
  );

  const onCancel = () => {
    if (lockIdentity) {
      navigate(AppScreen.DETAILS);
    } else {
      goBack();
    }
  };
  const onHome = () => navigate(AppScreen.HOME);
  const onSave = async (next: Subscription) => {
    try {
      if (await upsertSubscription(next)) {
        setSelectedId(next.id);
        setSelectedRecord(next);
        navigate(AppScreen.DETAILS);
      }
    } catch (err) {
      console.error("Save error:", err);
    }
  };
  const lockIdentity = Boolean(value.flat);

  const onSaveQr = async (next: Subscription) => {
    try {
      if (await upsertSubscription(next)) {
        setSelectedId(next.id);
        setSelectedRecord(next);
        navigate(AppScreen.QR);
      }
    } catch (err) {
      console.error("Save QR error:", err);
    }
  };

  const onDelete = lockIdentity ? () => showGlobalAlert(UI_TEXT.deleteConfirmTitle, `${UI_TEXT.deleteConfirmMessage}${value.id}${UI_TEXT.deleteConfirmMessageSuffix}`, [
    { text: UI_TEXT.cancel, style: "cancel" },
    { text: UI_TEXT.deleteButton, style: "destructive", onPress: () => void deleteSubscription(value.id).then(() => navigate(AppScreen.HOME)) },
  ]) : undefined;

  const enabledMethods = getEnabledPaymentMethods({
    seasonName: "",
    days: dayConfig,
    payment: paymentConfig,
    guestEnabled: true,
    mobileEnabled: true,
    seasonEnabled: true
  });

  const [form, setForm] = useState(() => {
    let initialValue = { ...value };

    // If kids support is disabled, merge kids into adults to prevent data hidden/split confusion
    if (!kidsEnabled && initialValue.kidsCount > 0) {
      initialValue.peopleCount = initialValue.peopleCount + initialValue.kidsCount;
      initialValue.kidsCount = 0;
    }

    // If we're editing an existing record, ensure the payment mode is still valid/enabled
    if (enabledMethods.length > 0 && !enabledMethods.includes(initialValue.paymentMode)) {
      initialValue.paymentMode = enabledMethods[0] as any;
    }
    return initialValue;
  });

  const [mobileInput, setMobileInput] = useState(form.mobile ? String(form.mobile) : "");
  const [selectedPerson, setSelectedPerson] = useState(0);
  const [selectedDay, setSelectedDay] = useState<Day>(currentDayId || activeDays[0]);
  const [isManualAmount, setIsManualAmount] = useState(lockIdentity);

  // Payment State (supporting up to 3 payments)
  const [payments, setPayments] = useState<PaymentEntry[]>(() => {
    if (form.payments && form.payments.length > 0) return form.payments;
    const fallback = [{ amount: form.amount || UI_TEXT.zero, mode: form.paymentMode || enabledMethods[0], transactionId: form.transactionId }];
    return fallback;
  });

  // Helper to ensure stable and normalized JSON comparison.
  // This removes undefined/null values and trims strings.
  const normalizeForComparison = React.useCallback((obj: any) => {
    return JSON.stringify(obj, (key, value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'string') return value.trim();
      return value;
    });
  }, []);

  // Capture the truly initial state after all state initializers have run.
  // We use a ref to ensure this "snapshot" never changes during the component lifecycle.
  const pristine = React.useRef({
    block: form.block,
    flat: form.flat.trim(),
    mobile: mobileInput.trim(),
    peopleCount: form.peopleCount,
    kidsCount: form.kidsCount || 0,
    mealSlots: normalizeForComparison(form.mealSlots),
    takenByPerson: normalizeForComparison(form.takenByPerson),
    payments: normalizeForComparison(payments)
  });

  const hasChanged = useMemo(() => {
    // 1. Basic Identity & Headcount
    if (form.block !== pristine.current.block) return true;
    if (form.flat.trim() !== pristine.current.flat) return true;
    if (mobileInput.trim() !== pristine.current.mobile) return true;
    if (form.peopleCount !== pristine.current.peopleCount) return true;
    if ((form.kidsCount || 0) !== pristine.current.kidsCount) return true;

    // 2. Complex Matrices
    if (normalizeForComparison(form.mealSlots) !== pristine.current.mealSlots) return true;
    if (normalizeForComparison(form.takenByPerson) !== pristine.current.takenByPerson) return true;

    // 3. Payments
    if (normalizeForComparison(payments) !== pristine.current.payments) return true;

    return false;
  }, [form.block, form.flat, form.peopleCount, form.kidsCount, form.mealSlots, form.takenByPerson, mobileInput, payments, normalizeForComparison]);

  const hasAnyMealSelected = useMemo(() => {
    return Object.values(form.mealSlots).some(personSlots =>
      personSlots.some(slot =>
        slot[MealType.BREAKFAST] !== DietaryOption.NONE ||
        slot[MealType.LUNCH] !== DietaryOption.NONE ||
        slot[MealType.DINNER] !== DietaryOption.NONE
      )
    );
  }, [form.mealSlots]);

  const canSave = useMemo(() => {
    const hasFlat = !!form.flat.trim();
    // If adding a new pass, we don't strictly require "hasChanged" because it's a new record.
    // If editing, we want to prevent saving if nothing changed.
    return hasFlat && hasAnyMealSelected && (!lockIdentity || hasChanged);
  }, [form.flat, hasAnyMealSelected, hasChanged, lockIdentity]);

  const totalAmount = payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

  const set = <K extends keyof Subscription>(key: K, next: Subscription[K]) =>
    setForm({ ...form, [key]: next });

  /**
   * Opens the device contact picker and populates the mobile field.
   */
  const pickContact = async () => {
    try {
      const { status } = await Contacts.requestPermissionsAsync();
      if (status === 'granted') {
        const contact = await Contacts.presentContactPickerAsync();
        if (contact && contact.phoneNumbers && contact.phoneNumbers.length > 0) {
          // Find the first mobile number or just the first number available
          const mobileNum = contact.phoneNumbers.find(p => p.label === 'mobile') || contact.phoneNumbers[0];
          if (mobileNum && mobileNum.number) {
            // Strip non-digits and cap at 10 digits (handling +91 etc)
            let digits = mobileNum.number.replace(/[^0-9]/g, "");
            if (digits.length > 10) {
              // If it starts with 91 and is 12 digits, strip the 91
              if (digits.length === 12 && digits.startsWith('91')) {
                digits = digits.slice(2);
              } else {
                // Otherwise just take the last 10
                digits = digits.slice(-10);
              }
            }
            setMobileInput(digits);
          }
        }
      } else {
        showGlobalAlert(UI_TEXT.error, UI_TEXT.contactPermissionError);
      }
    } catch (err) {
      console.error("Contact picker error:", err);
      showGlobalAlert(UI_TEXT.error, UI_TEXT.contactPickerError);
    }
  };

  // Prepare data for saving, ensuring normalized IDs and aggregated counts
  // We filter out undefined values because Firebase set() does not allow them
  const prepared: Subscription = {
    ...form,
    mobile: mobileInput ? Number(mobileInput) : undefined,
    flat: form.flat.trim().toUpperCase(),
    id: lockIdentity
      ? value.id
      : `${form.block}-${form.flat.trim().toUpperCase()}`,
    meals: mealsFromChoices(form.mealSlots, dayConfig, form.peopleCount, !!kidsEnabled),
    payments: payments,
    amount: totalAmount.toFixed(0),
    paymentMode: payments[0]?.mode || PaymentMode.CASH,
    transactionId: payments[0]?.transactionId || "",
  };

  if (prepared.mobile === undefined) {
    delete prepared.mobile;
  }

  /**
   * Sets the dietary choice for a specific meal slot.
   */
  const setMealSlotChoice = (
    slot: MealType,
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
    setIsManualAmount(false);
  };

  /**
   * Toggles a specific meal slot parcel for a person.
   */
  const setMealParcel = (slot: MealType, enabled: boolean) => {
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
    setIsManualAmount(false);
  };

  /**
   * Toggles whether a specific meal has been 'taken' (collected) by the person.
   */
  const setTakenChoice = (slot: string, taken: boolean) =>
    set("takenByPerson", {
      ...form.takenByPerson,
      [selectedDay]: form.takenByPerson[selectedDay].map((item, index) =>
        index === selectedPerson ? { ...item, [slot]: taken } : item
      ),
    });

  const addPayment = () => {
    if (payments.length < 3) {
      setPayments([...payments, { amount: UI_TEXT.zero, mode: enabledMethods[0] as any }]);
    }
  };

  const removePayment = (index: number) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index));
    }
  };

  const updatePayment = (index: number, next: Partial<PaymentEntry>, isManual = false) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], ...next };
    setPayments(updated);
    if (isManual) setIsManualAmount(true);
  };

  // Auto-calculation of total based on food prices
  useEffect(() => {
    if (!foodPriceEnabled || !paymentConfig.enabled) return;

    let total = 0;
    const dayIds = Object.keys(form.mealSlots);

    dayIds.forEach((dayId) => {
      const dayConf = dayConfig.find((d) => d.id === dayId);
      if (!dayConf || !dayConf.enabled) return;

      const dayMenu = foodMenu[dayId];

      const slots = form.mealSlots[dayId] || [];
      slots.forEach((personSlot, index) => {
        const isKid = kidsEnabled && index >= form.peopleCount;

        // Breakfast
        if (personSlot[MealType.BREAKFAST] === DietaryOption.VEG) {
          total += Number((isKid ? dayMenu?.[MealType.BREAKFAST]?.kidsVegPrice : dayMenu?.[MealType.BREAKFAST]?.vegPrice) || dayConf[MealType.BREAKFAST]?.vegPrice || 0);
          if (personSlot.breakfastParcel) {
            total += Number((isKid ? dayMenu?.[MealType.BREAKFAST]?.kidsVegParcelPrice : dayMenu?.[MealType.BREAKFAST]?.vegParcelPrice) || dayConf[MealType.BREAKFAST]?.vegParcelPrice || 0);
          }
        } else if (personSlot[MealType.BREAKFAST] === DietaryOption.NON_VEG) {
          total += Number((isKid ? dayMenu?.[MealType.BREAKFAST]?.kidsNonVegPrice : dayMenu?.[MealType.BREAKFAST]?.nonVegPrice) || dayConf[MealType.BREAKFAST]?.nonVegPrice || 0);
          if (personSlot.breakfastParcel) {
            total += Number((isKid ? dayMenu?.[MealType.BREAKFAST]?.kidsNonVegParcelPrice : dayMenu?.[MealType.BREAKFAST]?.nonVegParcelPrice) || dayConf[MealType.BREAKFAST]?.nonVegParcelPrice || 0);
          }
        }

        // Lunch
        if (personSlot[MealType.LUNCH] === DietaryOption.VEG) {
          total += Number((isKid ? dayMenu?.[MealType.LUNCH]?.kidsVegPrice : dayMenu?.[MealType.LUNCH]?.vegPrice) || dayConf[MealType.LUNCH]?.vegPrice || 0);
          if (personSlot.lunchParcel) {
            total += Number((isKid ? dayMenu?.[MealType.LUNCH]?.kidsVegParcelPrice : dayMenu?.[MealType.LUNCH]?.vegParcelPrice) || dayConf[MealType.LUNCH]?.vegParcelPrice || 0);
          }
        } else if (personSlot[MealType.LUNCH] === DietaryOption.NON_VEG) {
          total += Number((isKid ? dayMenu?.[MealType.LUNCH]?.kidsNonVegPrice : dayMenu?.[MealType.LUNCH]?.nonVegPrice) || dayConf[MealType.LUNCH]?.nonVegPrice || 0);
          if (personSlot.lunchParcel) {
            total += Number((isKid ? dayMenu?.[MealType.LUNCH]?.kidsNonVegParcelPrice : dayMenu?.[MealType.LUNCH]?.nonVegParcelPrice) || dayConf[MealType.LUNCH]?.nonVegParcelPrice || 0);
          }
        }

        // Dinner
        if (personSlot[MealType.DINNER] === DietaryOption.VEG) {
          total += Number((isKid ? dayMenu?.[MealType.DINNER]?.kidsVegPrice : dayMenu?.[MealType.DINNER]?.vegPrice) || dayConf[MealType.DINNER]?.vegPrice || 0);
          if (personSlot.dinnerParcel) {
            total += Number((isKid ? dayMenu?.[MealType.DINNER]?.kidsVegParcelPrice : dayMenu?.[MealType.DINNER]?.vegParcelPrice) || dayConf[MealType.DINNER]?.vegParcelPrice || 0);
          }
        } else if (personSlot[MealType.DINNER] === DietaryOption.NON_VEG) {
          total += Number((isKid ? dayMenu?.[MealType.DINNER]?.kidsNonVegPrice : dayMenu?.[MealType.DINNER]?.nonVegPrice) || dayConf[MealType.DINNER]?.nonVegPrice || 0);
          if (personSlot.dinnerParcel) {
            total += Number((isKid ? dayMenu?.[MealType.DINNER]?.kidsNonVegParcelPrice : dayMenu?.[MealType.DINNER]?.nonVegParcelPrice) || dayConf[MealType.DINNER]?.nonVegParcelPrice || 0);
          }
        }
      });
    });

    // Only update if we have a single payment entry and it's either a new pass
    // or the user hasn't manually edited the price yet.
    if (payments.length === 1 && (!lockIdentity && !isManualAmount)) {
      const currentVal = payments[0].amount || UI_TEXT.zero;
      if (currentVal !== String(total)) {
        // Direct set to ensure immediate UI update
        setPayments([{ ...payments[0], amount: String(total) }]);
      }
    }
  }, [form.mealSlots, foodPriceEnabled, dayConfig, isManualAmount, paymentConfig.enabled, payments.length]);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style={themeType === AppThemeMode.DARK ? StatusBarStyleMode.LIGHT : StatusBarStyleMode.DARK} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={onCancel} />
            <HomeButton onPress={onHome} />
          </View>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <Text style={styles.title}>
          {lockIdentity ? UI_TEXT.editFlat : UI_TEXT.addFlatTitle}
        </Text>
        <Text style={styles.subtitle}>
          {lockIdentity ? UI_TEXT.editSubtitle : UI_TEXT.addSubtitle}
        </Text>
      </View>
      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Real-time Summary Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, elevation: 6 }]}>
          <View style={styles.previewTop}>
            <View>
              <Text style={[styles.previewLabel, { color: theme.colors.white, opacity: 0.7 }]}>{UI_TEXT.livePreview}</Text>
              <Text style={[styles.previewTitle, { color: theme.colors.white, fontSize: 28 }]}>
                {form.block || UI_TEXT.hyphen}{UI_TEXT.hyphen}{form.flat || UI_TEXT.hyphen}
              </Text>
            </View>
            {paymentConfig.enabled && (
              <Text style={[styles.previewAmount, { color: theme.colors.white, fontSize: 22 }]}>
                {`${UI_TEXT.rs}${UI_TEXT.space}${totalAmount.toFixed(0)}`}
              </Text>
            )}
          </View>

          <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2, marginVertical: 12 }} />

          <Text style={[styles.previewMeta, { color: theme.colors.white }]}>
            {form.peopleCount}
            {kidsEnabled ? `${UI_TEXT.space}${form.peopleCount === 1 ? UI_TEXT.adult : UI_TEXT.adults}` : (form.peopleCount === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix)}
            {kidsEnabled && `${UI_TEXT.pipe}${form.kidsCount || 0}${UI_TEXT.space}${form.kidsCount === 1 ? UI_TEXT.kid : UI_TEXT.kids}`}
            {paymentConfig.enabled && `${UI_TEXT.pipe}${payments[0]?.mode || UI_TEXT.paymentModeNotSet}`}
          </Text>
        </View>

        {/* Identity Inputs */}
        <View style={[styles.card, { marginTop: 8, backgroundColor: theme.cardColors[1].bg, borderColor: theme.cardColors[1].border }]}>
           <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 12, color: theme.cardColors[1].accent }]}>{UI_TEXT.blockAndFlat}</Text>
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
                <View style={[styles.input, { backgroundColor: theme.colors.surface, justifyContent: "center" }]}>
                  <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary }}>{form.block}</Text>
                </View>
              )}
            </View>
            <View style={styles.fieldHalf}>
              <Text style={styles.label}>{UI_TEXT.flatNo}</Text>
              <TextInput
                value={form.flat}
                onChangeText={(flat) => set("flat", flat.toUpperCase())}
                placeholder={UI_TEXT.flatNoPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                keyboardType="default"
                autoCapitalize="characters"
                editable={isAdmin && !lockIdentity}
                selectTextOnFocus={isAdmin && !lockIdentity}
                style={[styles.input, !isAdmin && { backgroundColor: theme.colors.surface }]}
              />
            </View>
          </View>

          {mobileEnabled && (
            <>
              <Text style={styles.label}>{UI_TEXT.mobileNo}</Text>
              <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                <TextInput
                  value={mobileInput}
                  onChangeText={(text) => {
                    const digits = text.replace(/[^0-9]/g, "").slice(0, 10);
                    setMobileInput(digits);
                  }}
                  placeholder={UI_TEXT.mobileNoPlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="phone-pad"
                  editable={isAdmin && canEdit}
                  selectTextOnFocus={isAdmin && canEdit}
                  style={[styles.input, { flex: 1 }, !isAdmin && { backgroundColor: theme.colors.surface }]}
                />
                {Platform.OS !== 'web' && isAdmin && canEdit && (
                  <Pressable
                    onPress={pickContact}
                    style={{
                      backgroundColor: theme.colors.surfaceDark,
                      height: 56,
                      width: 56,
                      borderRadius: 14,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: 1,
                      borderColor: theme.colors.border
                    }}
                  >
                    <Ionicons name="person-add-outline" size={24} color={theme.colors.primary} />
                  </Pressable>
                )}
              </View>
            </>
          )}

          <View style={{ marginTop: 12 }}>
            <CounterInput
              label={kidsEnabled ? UI_TEXT.adultCount : UI_TEXT.peopleCount}
              value={form.peopleCount}
              min={1}
              onChange={(count) => {
                const oldPeople = form.peopleCount;
                const kids = form.kidsCount || 0;
                setSelectedPerson((current) =>
                  Math.min(current, Math.max(0, count + kids - 1))
                );
                setForm({
                  ...form,
                  peopleCount: count,
                  mealSlots: resizeMealSlots(form.mealSlots, oldPeople, count, kids, kids, dayConfig),
                  takenByPerson: resizeTaken(form.takenByPerson, oldPeople, count, kids, kids, dayConfig),
                });
                setIsManualAmount(false);
              }}
              disabled={!isAdmin || !canEdit}
            />
          </View>

          {kidsEnabled && (
            <CounterInput
              label={UI_TEXT.kidsCount}
              value={form.kidsCount || 0}
              min={0}
              onChange={(count) => {
                const adults = form.peopleCount;
                const oldKids = form.kidsCount || 0;
                setSelectedPerson((current) =>
                  Math.min(current, Math.max(0, adults + count - 1))
                );
                setForm({
                  ...form,
                  kidsCount: count,
                  mealSlots: resizeMealSlots(form.mealSlots, adults, adults, oldKids, count, dayConfig),
                  takenByPerson: resizeTaken(form.takenByPerson, adults, adults, oldKids, count, dayConfig),
                });
                setIsManualAmount(false);
              }}
              disabled={!isAdmin || !canEdit}
            />
          )}
        </View>

        {/* Selection Matrix */}
        <View style={[styles.card, { backgroundColor: theme.cardColors[2].bg, borderColor: theme.cardColors[2].border }]}>
          <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 4, color: theme.cardColors[2].accent }]}>{UI_TEXT.foodChoice}</Text>
          <Text style={styles.helper}>{UI_TEXT.foodChoiceInstruction}</Text>

          <Text style={styles.selectorLabel}>{UI_TEXT.person}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={styles.selectorRow}>
              {Array.from({ length: form.peopleCount + (form.kidsCount || 0) }, (_, index) => (
                <Pressable
                  key={index}
                  onPress={() => setSelectedPerson(index)}
                  style={[
                    styles.selector,
                    selectedPerson === index && styles.selectorOn,
                    { minWidth: 50, paddingHorizontal: 12 }
                  ]}
                >
                  <Text
                    style={[
                      styles.selectorText,
                      selectedPerson === index && styles.selectorTextOn,
                    ]}
                  >
                    {getMemberLegend(index, form.peopleCount, kidsEnabled)}
                  </Text>
                </Pressable>
              ))}
            </View>
          </ScrollView>

          <Text style={styles.selectorLabel}>{UI_TEXT.day}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={styles.selectorRow}>
              {sortedActiveDays.map((day) => (
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
                    {getDayLabel(day, dayConfig)}
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

            {getSortedMealKeys(selectedDay, dayConfig)
              .filter((slot) => isMealEnabled(selectedDay, slot, dayConfig))
              .map((slot) => {
                const label = getMealLabel(slot);
                const currentSlotChoice =
                  form.mealSlots[selectedDay]?.[selectedPerson]?.[slot] || DietaryOption.NONE;
                const isVegOnly = isVegOnlyDay(selectedDay, dayConfig);
                const isDone = isMealDone(selectedDay, slot, dayConfig);

                return (
                  <View key={slot} style={[{ marginBottom: 16 }, isDone && { opacity: 0.5 }]}>
                    <Text style={[styles.label, { marginTop: 0, marginBottom: 8, fontSize: 14, color: theme.colors.textPrimary }]}>
                      {label} {isDone && `(${UI_TEXT.mealDoneLabel})`}
                    </Text>
                    <View style={styles.choiceRow}>
                      {/* Option: None */}
                      <Pressable
                        onPress={() => isAdmin && canEdit && !isDone && setMealSlotChoice(slot, DietaryOption.NONE)}
                        style={[
                          styles.choice,
                          currentSlotChoice === DietaryOption.NONE ? styles.slotSelected : styles.noneChoice,
                          (!isAdmin || isDone) && { opacity: currentSlotChoice === DietaryOption.NONE ? 1 : 0.3 },
                          { paddingVertical: 12, paddingHorizontal: 4 }
                        ]}
                        disabled={!isAdmin || !canEdit || isDone}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            currentSlotChoice === DietaryOption.NONE && styles.choiceTextOn,
                            { fontSize: 12 }
                          ]}
                        >
                          {getDietaryOptionLabel(DietaryOption.NONE)}
                        </Text>
                      </Pressable>

                      {/* Option: Veg */}
                      {isDietaryEnabled(selectedDay, slot, DietType.VEG, dayConfig) && (
                        <Pressable
                          onPress={() => isAdmin && canEdit && !isDone && setMealSlotChoice(slot, DietaryOption.VEG)}
                          style={[
                            styles.choice,
                            currentSlotChoice === DietaryOption.VEG ? styles.vegChoice : styles.noneChoice,
                            (!isAdmin || isDone) && { opacity: currentSlotChoice === DietaryOption.VEG ? 1 : 0.3 },
                            { paddingVertical: 12, paddingHorizontal: 4 }
                          ]}
                          disabled={!isAdmin || !canEdit || isDone}
                        >
                          <Text
                            style={[
                              styles.choiceText,
                              currentSlotChoice === DietaryOption.VEG && styles.choiceTextOn,
                              { fontSize: 12 }
                            ]}
                          >
                            {getDietaryOptionLabel(DietaryOption.VEG)}
                          </Text>
                        </Pressable>
                      )}

                      {/* Option: Non-Veg */}
                      {!isVegOnly && isDietaryEnabled(selectedDay, slot, DietType.NON_VEG, dayConfig) && (
                        <Pressable
                          onPress={() => isAdmin && canEdit && !isDone && setMealSlotChoice(slot, DietaryOption.NON_VEG)}
                          style={[
                            styles.choice,
                            currentSlotChoice === DietaryOption.NON_VEG ? styles.nonVegChoice : styles.noneChoice,
                            (!isAdmin || isDone) && { opacity: currentSlotChoice === DietaryOption.NON_VEG ? 1 : 0.3 },
                            { paddingVertical: 12, paddingHorizontal: 4 }
                          ]}
                          disabled={!isAdmin || !canEdit || isDone}
                        >
                          <Text
                            style={[
                              styles.choiceText,
                              currentSlotChoice === DietaryOption.NON_VEG && styles.choiceTextOn,
                              { fontSize: 12 }
                            ]}
                          >
                            {getDietaryOptionLabel(DietaryOption.NON_VEG)}
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
            const parcelSlots = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].filter(
              (slot) => isMealEnabled(selectedDay, slot, dayConfig) && isParcelEnabled(selectedDay, slot, dayConfig)
            );

            if (parcelSlots.length === 0) return null;

            return (
              <View style={{ marginTop: 8 }}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.currentChoice, { marginTop: 0, fontSize: 16, marginBottom: 8 }]}>{UI_TEXT.parcels}</Text>
                </View>

                <View style={styles.choiceRow}>
                  {getSortedMealKeys(selectedDay, dayConfig)
                    .filter((slot) => isMealEnabled(selectedDay, slot, dayConfig) && isParcelEnabled(selectedDay, slot, dayConfig))
                    .map((slot) => {
                      const currentChoice = form.mealSlots[selectedDay]?.[selectedPerson]?.[slot] || DietaryOption.NONE;
                    const isParcel = !!form.mealSlots[selectedDay]?.[selectedPerson]?.[`${slot}Parcel` as keyof MealSlot];
                    const label = getMealLabel(slot);
                    const isDone = isMealDone(selectedDay, slot, dayConfig);

                    return (
                      <Pressable
                        key={slot}
                        disabled={currentChoice === DietaryOption.NONE || isDone || !isAdmin}
                        onPress={() => isAdmin && canEdit && !isDone && setMealParcel(slot, !isParcel)}
                        style={[
                          styles.choice,
                          isParcel
                            ? (currentChoice === DietaryOption.NON_VEG ? styles.nonVegChoice : styles.vegChoice)
                            : styles.noneChoice,
                          (currentChoice === DietaryOption.NONE || isDone || !isAdmin) && { opacity: 0.2 },
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
                          {label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })()}

          {/* SECTION 3: Food Collection */}
          {lockIdentity && [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(s => {
            const choice = form.mealSlots[selectedDay]?.[selectedPerson]?.[s];
            return choice && choice !== DietaryOption.NONE && isDietaryEnabled(selectedDay, s, choice === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG, dayConfig);
          }) && (
            <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16 }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.currentChoice, { marginTop: 0, fontSize: 16, marginBottom: 8 }]}>{UI_TEXT.foodTakenByPerson}</Text>
              </View>
              <View style={styles.choiceRow}>
                {getSortedMealKeys(selectedDay, dayConfig)
                  .filter((slot) => {
                    const choice = form.mealSlots[selectedDay]?.[selectedPerson]?.[slot];
                    return isMealEnabled(selectedDay, slot, dayConfig) && choice !== DietaryOption.NONE;
                  })
                  .map((slot) => {
                    const choice =
                      form.mealSlots[selectedDay]?.[selectedPerson]?.[slot];
                    if (!choice || choice === DietaryOption.NONE) return null;

                    const dietKey = choice === DietaryOption.VEG ? DietType.VEG : DietType.NON_VEG;
                    if (!isDietaryEnabled(selectedDay, slot, dietKey, dayConfig))
                      return null;

                    const isTaken =
                      !!form.takenByPerson[selectedDay]?.[selectedPerson]?.[slot];
                    const slotColorStyle =
                      choice === DietaryOption.VEG
                        ? styles.vegChoice
                        : styles.nonVegChoice;

                    const label = getMealLabel(slot);
                    const isDone = isMealDone(selectedDay, slot, dayConfig);
                    return (
                      <Pressable
                        key={slot}
                        onPress={() => canEdit && !isDone && setTakenChoice(slot, !isTaken)}
                        style={[
                          styles.choice,
                          isTaken ? slotColorStyle : styles.noneChoice,
                          isDone && { opacity: 0.5 },
                          { paddingVertical: 12, paddingHorizontal: 4 }
                        ]}
                        disabled={isDone}
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

              {/* SECTION 4: Parcel Collection */}
              {(() => {
                const parcelTakenSlots = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].filter(
                  (slot) => {
                    const choice = form.mealSlots[selectedDay]?.[selectedPerson]?.[slot];
                    const isParcelRegistered = !!form.mealSlots[selectedDay]?.[selectedPerson]?.[`${slot}Parcel` as keyof MealSlot];
                    const isFoodTaken = !!form.takenByPerson[selectedDay]?.[selectedPerson]?.[slot];
                    return isMealEnabled(selectedDay, slot, dayConfig) && isParcelEnabled(selectedDay, slot, dayConfig) && choice !== DietaryOption.NONE && isParcelRegistered && isFoodTaken;
                  }
                );

                if (parcelTakenSlots.length === 0) return null;

                return (
                  <View style={{ marginTop: 20 }}>
                    <View style={{ marginBottom: 12 }}>
                      <Text style={[styles.currentChoice, { marginTop: 0, fontSize: 16, marginBottom: 8 }]}>{UI_TEXT.parcelCollection || "Parcel taken by member"}</Text>
                    </View>
                    <View style={styles.choiceRow}>
                      {getSortedMealKeys(selectedDay, dayConfig)
                        .filter((slot) => {
                           const isParcelRegistered = !!form.mealSlots[selectedDay]?.[selectedPerson]?.[`${slot}Parcel` as keyof MealSlot];
                           const isFoodTaken = !!form.takenByPerson[selectedDay]?.[selectedPerson]?.[slot];
                           return isMealEnabled(selectedDay, slot, dayConfig) && isParcelEnabled(selectedDay, slot, dayConfig) && isParcelRegistered && isFoodTaken;
                        })
                        .map((slot) => {
                          const choice = form.mealSlots[selectedDay]?.[selectedPerson]?.[slot];
                          const parcelTakenKey = `${slot}Parcel`;
                          const isParcelTaken = !!form.takenByPerson[selectedDay]?.[selectedPerson]?.[parcelTakenKey as keyof TakenState];
                          const slotColorStyle = choice === DietaryOption.NON_VEG ? styles.nonVegChoice : styles.vegChoice;
                          const label = getMealLabel(slot);
                          const isDone = isMealDone(selectedDay, slot, dayConfig);

                          return (
                            <Pressable
                              key={slot}
                              onPress={() => canEdit && !isDone && setTakenChoice(parcelTakenKey, !isParcelTaken)}
                              style={[
                                styles.choice,
                                isParcelTaken ? slotColorStyle : styles.noneChoice,
                                isDone && { opacity: 0.5 },
                                { paddingVertical: 12, paddingHorizontal: 4 }
                              ]}
                              disabled={isDone}
                            >
                              <Text
                                style={[
                                  styles.choiceText,
                                  isParcelTaken && styles.choiceTextOn,
                                  { fontSize: 11 }
                                ]}
                              >
                                {label}
                              </Text>
                            </Pressable>
                          );
                        })}
                    </View>
                  </View>
                );
              })()}
            </View>
          )}
        </View>

        {/* Financials */}
        {paymentConfig.enabled && (
          <View style={[styles.card, { backgroundColor: theme.cardColors[3].bg, borderColor: theme.cardColors[3].border }]}>
             <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Text style={[styles.sectionTitle, { fontSize: 18, marginBottom: 0, color: theme.cardColors[3].accent }]}>{UI_TEXT.paymentDetails}</Text>
                <View style={[styles.pill, { backgroundColor: theme.cardColors[3].accentLight }]}>
                   <Text style={[styles.pillText, { color: theme.cardColors[3].accent }]}>{UI_TEXT.rs} {totalAmount.toFixed(0)}</Text>
                </View>
             </View>

             {payments.map((p, idx) => (
               <View key={idx} style={{ marginBottom: idx === payments.length - 1 ? 0 : 24, borderTopWidth: idx === 0 ? 0 : 1, borderTopColor: theme.colors.border, paddingTop: idx === 0 ? 0 : 20 }}>
                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary }}>{UI_TEXT.paymentNumber}{idx + 1}</Text>
                    {idx > 0 && isAdmin && canEdit && (
                      <Pressable onPress={() => removePayment(idx)}>
                        <Ionicons name="trash-outline" size={18} color={theme.colors.error} />
                      </Pressable>
                    )}
                 </View>

                 <View style={styles.row}>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.label}>{UI_TEXT.amount}</Text>
                      <TextInput
                        value={p.amount}
                        onChangeText={(amount) => updatePayment(idx, { amount }, true)}
                        keyboardType="decimal-pad"
                        inputMode="decimal"
                        editable={isAdmin && canEdit}
                        returnKeyType="done"
                        placeholder={UI_TEXT.zero}
                        placeholderTextColor={theme.colors.textMuted}
                        style={[styles.input, !isAdmin && { backgroundColor: theme.colors.surface }]}
                      />
                    </View>
                    <View style={styles.fieldHalf}>
                      <Text style={styles.label}>{UI_TEXT.paymentMode}</Text>
                      {isAdmin ? (
                        <Dropdown
                          value={p.mode}
                          options={enabledMethods}
                          onChange={(mode) => updatePayment(idx, { mode: mode as any })}
                        />
                      ) : (
                        <View style={[styles.input, { backgroundColor: theme.colors.surface, justifyContent: "center" }]}>
                          <Text style={{ fontSize: 16, fontWeight: "600", color: theme.colors.textPrimary }}>{p.mode}</Text>
                        </View>
                      )}
                    </View>
                  </View>

                  {(p.mode === PaymentMode.UPI || p.mode === PaymentMode.BANK_TRANSFER) && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.label}>{UI_TEXT.transactionIdLabel}</Text>
                      <TextInput
                        value={p.transactionId || ""}
                        onChangeText={(txnId) => updatePayment(idx, { transactionId: txnId })}
                        placeholder={UI_TEXT.transactionIdPlaceholder}
                        placeholderTextColor={theme.colors.textMuted}
                        editable={isAdmin && canEdit}
                        autoCapitalize="characters"
                        style={[styles.input, !isAdmin && { backgroundColor: theme.colors.surface }]}
                      />
                    </View>
                  )}

                  {p.mode === PaymentMode.CASH && (
                    <View style={{ marginTop: 16 }}>
                      <Text style={styles.label}>{UI_TEXT.receivedByLabel}</Text>
                      <TextInput
                        value={p.receivedBy || ""}
                        onChangeText={(name) => updatePayment(idx, { receivedBy: name })}
                        placeholder={UI_TEXT.receivedByPlaceholder}
                        placeholderTextColor={theme.colors.textMuted}
                        editable={isAdmin && canEdit}
                        style={[styles.input, !isAdmin && { backgroundColor: theme.colors.surface }]}
                      />
                    </View>
                  )}
               </View>
             ))}

             {isAdmin && canEdit && payments.length < 3 && (
               <Pressable
                 onPress={addPayment}
                 style={[styles.secondary, { borderStyle: 'dashed', marginTop: 20, height: 48, borderColor: theme.cardColors[3].accent }]}
               >
                 <ActionLabel icon="add-circle-outline" label={UI_TEXT.addAnotherPayment} color={theme.cardColors[3].accent} />
               </Pressable>
             )}
          </View>
        )}

        {/* Actions */}
        <View style={{ marginBottom: 40 }}>
          {canEdit && (
            <Pressable
              onPress={() => {
                if (!prepared.flat.trim()) {
                  showGlobalAlert(UI_TEXT.error, UI_TEXT.flatNoRequired);
                  return;
                }
                if (mobileInput && mobileInput.length !== 10) {
                  showGlobalAlert(UI_TEXT.error, UI_TEXT.mobileInvalid);
                  return;
                }
                onSave(prepared);
              }}
              style={[styles.primary, !canSave && { opacity: 0.5 }]}
              disabled={!canSave}
            >
              <ActionLabel
                icon="checkmark-circle-outline"
                label={UI_TEXT.saveChanges}
                color={theme.colors.white}
                size={24}
              />
            </Pressable>
          )}

          {isAdmin && canEdit && onSaveQr ? (
            <Pressable
              accessibilityLabel={UI_TEXT.saveGenerateQr}
              onPress={() => {
                if (!prepared.flat.trim()) {
                  showGlobalAlert(UI_TEXT.error, UI_TEXT.flatNoRequired);
                  return;
                }
                if (mobileInput && mobileInput.length !== 10) {
                  showGlobalAlert(UI_TEXT.error, UI_TEXT.mobileInvalid);
                  return;
                }
                onSaveQr(prepared);
              }}
              style={[
                styles.primary,
                {
                  marginTop: 16,
                  backgroundColor: theme.colors.primary,
                  shadowOpacity: 0,
                  elevation: 0,
                  shadowRadius: 0,
                  shadowOffset: { width: 0, height: 0 }
                },
                !canSave && { opacity: 0.5 },
              ]}
              disabled={!canSave}
            >
              <ActionLabel
                icon="qr-code-outline"
                label={UI_TEXT.saveGenerateQr}
                color={theme.colors.white}
                size={22}
              />
            </Pressable>
          ) : null}

          <Pressable onPress={onCancel} style={[styles.secondary, { marginTop: 16, backgroundColor: theme.colors.surfaceDark, borderColor: theme.colors.textSecondary }]}>
             <ActionLabel icon="close-outline" label={UI_TEXT.cancel} color={theme.colors.textSecondary} />
          </Pressable>

          {isAdmin && canEdit && onDelete ? (
            <Pressable
              accessibilityLabel={UI_TEXT.deleteFlatRecord}
              onPress={onDelete}
              style={[styles.deleteButton, { marginTop: 24 }]}
            >
              <ActionLabel
                icon="trash-outline"
                label={UI_TEXT.deleteFlatRecord}
                color={theme.colors.white}
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
