/**
 * Form screen for adding or editing a flat's subscription.
 * Handles headcounts, daily meal choices, and payment information.
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
} from "react-native";
import { Contact, requestPermissionsAsync } from "expo-contacts";
import { useStyles, useScaling } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import {
  getActiveDays,
  blockOptions,
  mealsFromChoices,
  resizeMealSlots,
  resizeTaken,
  getDayLabel,
  isMealEnabled,
  getValidSlotChoice,
  isParcelValidForSlot,
  isMealDone,
  isMealInFuture,
  getEnabledPaymentMethods,
  isDietaryEnabled,
  isParcelEnabled,
  isKidsParcelEnabled,
  isVegOnlyDay,
  isMealCurrent,
  getMemberLegend,
  getMealLabel,
  getDietaryOptionLabel,
  getDayAbbr,
  generateUniquePasscode,
  formatTakenTime,
  getMealVarieties,
  getDietTypeForChoice,
  isSpecialMeal,
  isSpecialOnlySubscribed,
  formatTimestamp,
} from "../constants";
import {
  MealChoice,
  MealSlot,
  UserRole,
  MealType,
  DietType,
  DietaryOption,
  normalizeChoice,
  normalizeSlot,
  toBool,
  PaymentEntry,
  AppScreen,
  PaymentMode,
  AppThemeMode,
  ActivityModule,
  ActivityAction,
  TakenState,
  getPassDisplayLabel,
  FoodPackage,
  AppliedPackageInfo,
  PackageApplicability,
} from "../domain";
import { ActionLabel } from "../components/common/ActionLabel";
import { PaymentScannerModal } from "../components/common/PaymentScannerModal";
import { Dropdown } from "../components/common/Dropdown";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { UserGreeting } from "../components/common/UserGreeting";
import { CounterInput } from "../components/common/CounterInput";
import { Ionicons } from "@expo/vector-icons";
import { SubscriptionBasicInfoSection } from "../features/subscriptions/components/SubscriptionBasicInfoSection";
import { SubscriptionPaymentSection } from "../features/subscriptions/components/SubscriptionPaymentSection";

import { useAuth } from "../context/AuthContext";
import { useCoreDatabase, useActivityLogs, useFoodPackages } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";
import { Day, Subscription } from "../types";
import {
  calculateSubscriptionAmount,
  findApplicablePackagesForPerson,
  calculatePassTotalWithPackages,
} from "../utils/paymentUtils";

export { calculateSubscriptionAmount };

export function SubscriptionForm() {
  const { userRole, handleLogout } = useAuth();
  const {
    dayConfig, paymentConfig, seasonEnabled, foodPriceEnabled, foodMenu, mobileEnabled,
    upsertSubscription, deleteSubscription, kidsEnabled, subscriptions
  } = useCoreDatabase();
  const { addActivityLog } = useActivityLogs();
  const { showAlert: showGlobalAlert } = useUI();
  const {
    editing: value, navigate, goBack, setSelectedId, setSelectedRecord
  } = useAppNavigation();

  const { foodPackages } = useFoodPackages();
  const [appliedPackages, setAppliedPackages] = useState<Record<number, AppliedPackageInfo>>(() => value?.appliedPackages || {});
  const [showApplyPackageModal, setShowApplyPackageModal] = useState(false);
  const [viewingPackage, setViewingPackage] = useState<FoodPackage | null>(null);

  if (!value) return null;

  const styles = useStyles();
  const { s } = useScaling();
  const { theme, themeType } = useAppTheme();
  const isAdmin = userRole === UserRole.ADMIN;
  const canEdit = seasonEnabled;
  const activeDays = getActiveDays(dayConfig);

  const lockIdentity = Boolean(value.flat);
  const sortedActiveDays = activeDays;

  const currentDayId = activeDays.find(day =>
    [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(day, m, dayConfig))
  );

  const onCancel = () => {
    goBack();
  };
  const onHome = () => navigate(AppScreen.HOME);

  const currentMealInfo = useMemo(() => {
    for (const d of dayConfig) {
      if (!d.enabled) continue;
      for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
        if (d[mType].enabled && d[mType].current) {
          return { dayId: d.id, type: mType };
        }
      }
    }
    return null;
  }, [dayConfig]);

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
    if (!kidsEnabled && (initialValue.kidsCount ?? 0) > 0) {
      initialValue.peopleCount = initialValue.peopleCount + (initialValue.kidsCount ?? 0);
      initialValue.kidsCount = 0;
    }

    const totalPeople = initialValue.peopleCount + (initialValue.kidsCount || 0);

    // Normalize mealSlots & takenByPerson matrix for all active days
    const normalizedSlots: Record<string, MealSlot[]> = {};
    const normalizedTaken: Record<string, TakenState[]> = {};

    activeDays.forEach((dayId) => {
      const existingSlots = (initialValue.mealSlots?.[dayId] || []) as MealSlot[];
      const existingTaken = (initialValue.takenByPerson?.[dayId] || []) as TakenState[];

      normalizedSlots[dayId] = Array.from({ length: totalPeople }, (_, i) =>
        normalizeSlot(existingSlots[i])
      );

      normalizedTaken[dayId] = Array.from({ length: totalPeople }, (_, i) => {
        const t = existingTaken[i];
        return {
          [MealType.BREAKFAST]: toBool(t?.[MealType.BREAKFAST]),
          [MealType.LUNCH]: toBool(t?.[MealType.LUNCH]),
          [MealType.DINNER]: toBool(t?.[MealType.DINNER]),
          breakfastParcel: toBool(t?.breakfastParcel),
          lunchParcel: toBool(t?.lunchParcel),
          dinnerParcel: toBool(t?.dinnerParcel),
          breakfastTime: t?.breakfastTime ? String(t.breakfastTime) : undefined,
          lunchTime: t?.lunchTime ? String(t.lunchTime) : undefined,
          dinnerTime: t?.dinnerTime ? String(t.dinnerTime) : undefined,
          breakfastParcelTime: t?.breakfastParcelTime ? String(t.breakfastParcelTime) : undefined,
          lunchParcelTime: t?.lunchParcelTime ? String(t.lunchParcelTime) : undefined,
          dinnerParcelTime: t?.dinnerParcelTime ? String(t.dinnerParcelTime) : undefined,
        };
      });
    });

    initialValue.mealSlots = normalizedSlots;
    initialValue.takenByPerson = normalizedTaken;

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

  const totalPeopleCount = form.peopleCount + (form.kidsCount || 0);

  const perPersonApplicablePackages = useMemo(() => {
    const map: Record<number, ReturnType<typeof findApplicablePackagesForPerson>> = {};
    for (let i = 0; i < totalPeopleCount; i++) {
      const isKid = !!kidsEnabled && i >= form.peopleCount;
      map[i] = findApplicablePackagesForPerson(
        i,
        form.mealSlots,
        isKid,
        foodPackages,
        foodMenu,
        dayConfig,
        !!kidsEnabled
      );
    }
    return map;
  }, [totalPeopleCount, form.mealSlots, foodPackages, foodMenu, dayConfig, kidsEnabled, form.peopleCount]);

  const hasAnyApplicablePackage = useMemo(() => {
    return Object.values(perPersonApplicablePackages).some((list) => list && list.length > 0);
  }, [perPersonApplicablePackages]);

  const isPackageApplied = useMemo(() => {
    return Object.keys(appliedPackages).length > 0;
  }, [appliedPackages]);

  const isSpecialOnly = useMemo(() => {
    return isSpecialOnlySubscribed({ mealSlots: form.mealSlots }, dayConfig);
  }, [form.mealSlots, dayConfig]);

  const previewTimestamps = useMemo(() => {
    const now = Date.now();
    let createdTs = Number(value?.createdAt) || Number(value?.timestamp) || now;
    let updatedTs = lockIdentity ? now : (Number(value?.updatedAt) || createdTs);
    if (createdTs > updatedTs) createdTs = updatedTs;
    return { createdTs, updatedTs };
  }, [value, lockIdentity]);

  const checkParcelInconsistency = (sub: Subscription): boolean => {
    if (!lockIdentity || !currentMealInfo) return false;
    const { dayId, type } = currentMealInfo;
    const personSlots = sub.mealSlots[dayId] || [];
    const takenDays = sub.takenByPerson[dayId] || [];

    return personSlots.some((slot: MealSlot, pIdx: number) => {
      const t = takenDays[pIdx];
      if (!t) return false;
      const optedParcel = !!slot[`${type}Parcel` as keyof MealSlot];
      const takenFood = !!t[type];
      const takenParcel = !!t[`${type}Parcel` as keyof TakenState];
      return optedParcel && takenFood && !takenParcel;
    });
  };

  const parcelAlertFiredRef = useRef<string | null>(null);

  // Initial load check for pending parcel alert (fires ONCE on initial form load, never during user edits)
  useEffect(() => {
    if (lockIdentity && currentMealInfo && value) {
      const passId = value.id;
      if (parcelAlertFiredRef.current === passId) return;

      const { dayId, type } = currentMealInfo;
      const dayConf = dayConfig.find(d => d.id === dayId);
      const mealConf = dayConf ? dayConf[type] : null;

      if (mealConf?.enabled && mealConf.parcel && mealConf.parcelAlert) {
         const personSlots = value.mealSlots?.[dayId] || [];
         const takenDays = value.takenByPerson?.[dayId] || [];

         const hasPendingParcel = personSlots.some((slot: MealSlot, pIdx: number) => {
            const t = takenDays[pIdx];
            if (!t) return false;
            const optedParcel = !!slot[`${type}Parcel` as keyof MealSlot];
            const takenParcel = !!t[`${type}Parcel` as keyof TakenState];
            const takenFood = !!t[type];
            return optedParcel && !takenFood && !takenParcel;
         });

         parcelAlertFiredRef.current = passId;

         if (hasPendingParcel) {
            showGlobalAlert(UI_TEXT.appName, UI_TEXT.parcelAlertActive);
         }
      }
    }
  }, [lockIdentity, currentMealInfo, dayConfig, value?.id, showGlobalAlert]);

  const getLogDetails = (sub: Subscription, isEdit: boolean) => {
    const activeDaysLog = getActiveDays(dayConfig);

    // 1. Build Demand Breakdown (Choices)
    const daySummaries = activeDaysLog.map(dayId => {
      const slots = sub.mealSlots[dayId] || [];
      const abbr = getDayAbbr(dayId, dayConfig);

      let bV = 0, bN = 0, bP = 0;
      let lV = 0, lN = 0, lP = 0;
      let dV = 0, dN = 0, dP = 0;

      const dConfig = dayConfig.find(d => d.id === dayId);
      slots.forEach((s) => {
        const bConf = dConfig ? dConfig[MealType.BREAKFAST] : undefined;
        const lConf = dConfig ? dConfig[MealType.LUNCH] : undefined;
        const dConf = dConfig ? dConfig[MealType.DINNER] : undefined;

        const bDiet = getDietTypeForChoice(s[MealType.BREAKFAST], getMealVarieties(bConf));
        const lDiet = getDietTypeForChoice(s[MealType.LUNCH], getMealVarieties(lConf));
        const dDiet = getDietTypeForChoice(s[MealType.DINNER], getMealVarieties(dConf));

        if (bDiet === DietType.VEG) bV++;
        if (bDiet === DietType.NON_VEG) bN++;
        if (s.breakfastParcel) bP++;

        if (lDiet === DietType.VEG) lV++;
        if (lDiet === DietType.NON_VEG) lN++;
        if (s.lunchParcel) lP++;

        if (dDiet === DietType.VEG) dV++;
        if (dDiet === DietType.NON_VEG) dN++;
        if (s.dinnerParcel) dP++;
      });

      const parts = [];
      if (bV+bN > 0) parts.push(`B:${bV}${UI_TEXT.vegAbbr}${bN}${UI_TEXT.nonVegAbbr}${bP > 0 ? `(${bP}${UI_TEXT.parcelAbbr})` : ''}`);
      if (lV+lN > 0) parts.push(`L:${lV}${UI_TEXT.vegAbbr}${lN}${UI_TEXT.nonVegAbbr}${lP > 0 ? `(${lP}${UI_TEXT.parcelAbbr})` : ''}`);
      if (dV+dN > 0) parts.push(`D:${dV}${UI_TEXT.vegAbbr}${dN}${UI_TEXT.nonVegAbbr}${dP > 0 ? `(${dP}${UI_TEXT.parcelAbbr})` : ''}`);

      return parts.length > 0 ? `${abbr}: ${parts.join(' ')}` : null;
    }).filter(Boolean);

    // 2. Calculate Collection Counts
    const getCounts = (s: Subscription) => {
      let ft = 0, pt = 0;
      Object.values(s.takenByPerson || {}).forEach(dayList => {
        dayList.forEach((t: TakenState) => {
          if (t.breakfast) ft++;
          if (t.lunch) ft++;
          if (t.dinner) ft++;
          if (t.breakfastParcel) pt++;
          if (t.lunchParcel) pt++;
          if (t.dinnerParcel) pt++;
        });
      });
      return { ft, pt };
    };

    const oldCounts = getCounts(value);
    const newCounts = getCounts(sub);

    const passLabel = getPassDisplayLabel(sub);
    let detailedDesc = (isEdit ? UI_TEXT.logEditPass : UI_TEXT.logAddPass)
      .replace("{id}", passLabel)
      .replace("{adults}", String(sub.peopleCount))
      .replace("{kids}", String(sub.kidsCount || 0))
      .replace("{amount}", sub.amount);

    detailedDesc += ` | ${daySummaries.join(' | ')}`;
    if (sub.isPackageApplied) {
      detailedDesc += ` | ${UI_TEXT.packageAppliedMarker}`;
    }
    detailedDesc += ` | Taken: ${newCounts.ft} (was ${oldCounts.ft})`;
    if (newCounts.pt > 0 || oldCounts.pt > 0) {
      detailedDesc += `, P-Taken: ${newCounts.pt} (was ${oldCounts.pt})`;
    }

    return detailedDesc;
  };

  const onSave = async (next: Subscription, acknowledgedMissedParcel = false) => {
    try {
      if (await upsertSubscription(next)) {
        addActivityLog({
          module: ActivityModule.SUBSCRIPTION,
          action: lockIdentity ? ActivityAction.UPDATE : ActivityAction.CREATE,
          targetId: next.id,
          description: getLogDetails(next, lockIdentity)
        });
        if (acknowledgedMissedParcel && currentMealInfo) {
          const passLabel = getPassDisplayLabel(next);
          addActivityLog({
            module: ActivityModule.SUBSCRIPTION,
            action: ActivityAction.MISSED_PARCEL,
            targetId: next.id,
            description: UI_TEXT.logMissedParcel.replace("{flatId}", passLabel).replace("{meal}", getMealLabel(currentMealInfo.type))
          });
        }
        setSelectedId(next.id);
        setSelectedRecord(next);
        navigate(AppScreen.DETAILS);
      }
    } catch (err: any) {
      console.error("Save error:", err);
    }
  };

  const onSaveQr = async (next: Subscription, acknowledgedMissedParcel = false) => {
    try {
      if (await upsertSubscription(next)) {
        addActivityLog({
          module: ActivityModule.SUBSCRIPTION,
          action: lockIdentity ? ActivityAction.UPDATE : ActivityAction.CREATE,
          targetId: next.id,
          description: getLogDetails(next, lockIdentity) + " (QR)"
        });
        if (acknowledgedMissedParcel && currentMealInfo) {
          const passLabel = getPassDisplayLabel(next);
          addActivityLog({
            module: ActivityModule.SUBSCRIPTION,
            action: ActivityAction.MISSED_PARCEL,
            targetId: next.id,
            description: UI_TEXT.logMissedParcel.replace("{flatId}", passLabel).replace("{meal}", getMealLabel(currentMealInfo.type))
          });
        }
        setSelectedId(next.id);
        setSelectedRecord(next);
        navigate(AppScreen.QR);
      }
    } catch (err: any) {
      console.error("Save QR error:", err);
    }
  };

  const hasNonZeroPayment = paymentConfig.enabled && (parseFloat(value.amount) > 0 || (value.payments && value.payments.some((p: PaymentEntry) => parseFloat(p.amount) > 0)));

  const hasAnyMealTaken = useMemo(() => {
    // Check explicit 'taken' flags (food taken/served)
    return Object.values(form.takenByPerson || {}).some(dayList =>
      dayList.some((t: any) => t.breakfast || t.lunch || t.dinner || t.breakfastParcel || t.lunchParcel || t.dinnerParcel)
    );
  }, [form.takenByPerson]);

  const canDeletePass = !hasAnyMealTaken;

  const onDelete = lockIdentity ? () => showGlobalAlert(UI_TEXT.deleteConfirmTitle, `${UI_TEXT.deleteConfirmMessage}${getPassDisplayLabel(value) || value.id}${UI_TEXT.deleteConfirmMessageSuffix}`, [
    { text: UI_TEXT.cancel, style: "cancel" },
    { text: UI_TEXT.deleteButton, style: "destructive", onPress: () => {
        if (!canDeletePass) return;
        const passLabel = getPassDisplayLabel(value);
        void deleteSubscription(value.id).then(() => {
          addActivityLog({
            module: ActivityModule.SUBSCRIPTION,
            action: ActivityAction.DELETE,
            targetId: passLabel,
            description: UI_TEXT.logDeletePass.replace("{id}", passLabel)
          });
          setSelectedId("");
          setSelectedRecord(null);
          navigate(AppScreen.HOME);
        });
    } },
  ]) : undefined;

  const dayScrollRef = useRef<ScrollView>(null);
  const dayOffsets = useRef<Record<string, number>>({});

  useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedDay && dayOffsets.current[selectedDay] !== undefined) {
        dayScrollRef.current?.scrollTo({ x: dayOffsets.current[selectedDay] - s(20), animated: true });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedDay, s]);

  // Payment State (supporting up to 3 payments)
  const [payments, setPayments] = useState<PaymentEntry[]>(() => {
    if (form.payments && form.payments.length > 0) {
      return form.payments.map((p) => ({
        ...p,
        amount: (p.amount !== undefined && p.amount !== null && String(p.amount).trim() !== "")
          ? String(p.amount)
          : UI_TEXT.zero,
      }));
    }
    const rawAmt = form.amount !== undefined && form.amount !== null ? String(form.amount).trim() : "";
    const fallback = [{
      amount: rawAmt !== "" ? rawAmt : UI_TEXT.zero,
      mode: form.paymentMode || enabledMethods[0],
      transactionId: form.transactionId
    }];
    return fallback;
  });

  // Capture initial meal state snapshot for Edit Pass to detect meal/parcel choice variations
  const initialMealSnapshot = useRef({
    mealSlots: value.mealSlots,
    peopleCount: value.peopleCount,
    kidsCount: value.kidsCount || 0,
  });

  const hasMealOrParcelChoicesChanged = useMemo(() => {
    if (!lockIdentity) return true;
    if (form.peopleCount !== initialMealSnapshot.current.peopleCount) return true;
    if ((form.kidsCount || 0) !== initialMealSnapshot.current.kidsCount) return true;

    const initSlots = initialMealSnapshot.current.mealSlots || {};
    const currSlots = form.mealSlots || {};

    const allDayIds = new Set([...Object.keys(initSlots), ...Object.keys(currSlots)]);

    for (const dayId of allDayIds) {
      const initDayList = (initSlots[dayId] || []) as MealSlot[];
      const currDayList = (currSlots[dayId] || []) as MealSlot[];

      if (initDayList.length !== currDayList.length) return true;

      for (let i = 0; i < currDayList.length; i++) {
        const initSlot = initDayList[i] || {};
        const currSlot = currDayList[i] || {};

        if (currSlot[MealType.BREAKFAST] !== initSlot[MealType.BREAKFAST]) return true;
        if (currSlot[MealType.LUNCH] !== initSlot[MealType.LUNCH]) return true;
        if (currSlot[MealType.DINNER] !== initSlot[MealType.DINNER]) return true;

        if (!!currSlot.breakfastParcel !== !!initSlot.breakfastParcel) return true;
        if (!!currSlot.lunchParcel !== !!initSlot.lunchParcel) return true;
        if (!!currSlot.dinnerParcel !== !!initSlot.dinnerParcel) return true;
      }
    }

    return false;
  }, [lockIdentity, form.peopleCount, form.kidsCount, form.mealSlots]);

  const sanitizeAmountText = useCallback((text: string): string => {
    let sanitized = text.replace(/[^0-9.]/g, "");
    const parts = sanitized.split(".");
    if (parts.length > 2) {
      sanitized = parts[0] + "." + parts.slice(1).join("");
    }
    return sanitized;
  }, []);

  // Helper to ensure stable and normalized JSON comparison.
  // This removes undefined/null values and trims strings.
  const normalizeForComparison = useCallback((obj: any) => {
    return JSON.stringify(obj, (_key, value) => {
      if (value === undefined || value === null) return undefined;
      if (typeof value === 'string') return value.trim();
      return value;
    });
  }, []);

  // Capture the truly initial state after all state initializers have run.
  // We use a ref to ensure this "snapshot" never changes during the component lifecycle.
  const pristine = useRef({
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
   * Opens the device contact picker and populates the mobile field using Expo SDK 57 Contact class API.
   */
  const pickContact = async () => {
    try {
      let status: string | undefined;
      if (typeof requestPermissionsAsync === 'function') {
        const res = await requestPermissionsAsync();
        status = res?.status;
      } else {
        const legacyContacts = await import("expo-contacts/legacy");
        const res = await legacyContacts.requestPermissionsAsync();
        status = res?.status;
      }

      if (status === 'granted') {
        let contact: any = null;
        if (typeof Contact !== 'undefined' && typeof (Contact as any).presentPicker === 'function') {
          contact = await (Contact as any).presentPicker();
        } else {
          const legacyContacts = await import("expo-contacts/legacy");
          contact = await legacyContacts.presentContactPickerAsync();
        }

        if (!contact) return;

        let phoneList: any[] = [];
        if (typeof contact.getPhones === 'function') {
          phoneList = await contact.getPhones();
        } else if (Array.isArray(contact.phones)) {
          phoneList = contact.phones;
        } else if (Array.isArray(contact.phoneNumbers)) {
          phoneList = contact.phoneNumbers;
        }

        if (phoneList && phoneList.length > 0) {
          const mobileNum = phoneList.find((p: any) => p.label === 'mobile' || p.label === 'cell') || phoneList[0];
          const rawNumber = mobileNum?.number || mobileNum?.digits || (typeof mobileNum === 'string' ? mobileNum : '');
          if (rawNumber) {
            let digits = String(rawNumber).replace(/[^0-9]/g, "");
            if (digits.length > 10) {
              if (digits.length === 12 && digits.startsWith('91')) {
                digits = digits.slice(2);
              } else {
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
  const passId = lockIdentity
    ? value.id
    : `${form.block}-${form.flat.trim().toUpperCase()}`;

  const saveTime = formatTakenTime(new Date());
  const stampedTakenByPerson = { ...form.takenByPerson };
  Object.keys(stampedTakenByPerson).forEach((dayId) => {
    if (Array.isArray(stampedTakenByPerson[dayId])) {
      stampedTakenByPerson[dayId] = stampedTakenByPerson[dayId].map((t) => {
        const updated = { ...t };
        if (updated.breakfast && !updated.breakfastTime) updated.breakfastTime = saveTime;
        if (updated.lunch && !updated.lunchTime) updated.lunchTime = saveTime;
        if (updated.dinner && !updated.dinnerTime) updated.dinnerTime = saveTime;
        if (updated.breakfastParcel && !updated.breakfastParcelTime) updated.breakfastParcelTime = saveTime;
        if (updated.lunchParcel && !updated.lunchParcelTime) updated.lunchParcelTime = saveTime;
        if (updated.dinnerParcel && !updated.dinnerParcelTime) updated.dinnerParcelTime = saveTime;
        return updated;
      });
    }
  });

  const sanitizedMealSlots: Record<string, MealSlot[]> = {};
  Object.keys(form.mealSlots || {}).forEach((dayId) => {
    const slots = form.mealSlots[dayId] || [];
    sanitizedMealSlots[dayId] = slots.map((personSlot, pIdx) => {
      const isKid = kidsEnabled && pIdx >= form.peopleCount;
      const cleanSlot: MealSlot = {
        [MealType.BREAKFAST]: DietaryOption.NONE,
        [MealType.LUNCH]: DietaryOption.NONE,
        [MealType.DINNER]: DietaryOption.NONE,
        breakfastParcel: false,
        lunchParcel: false,
        dinnerParcel: false,
      };

      const meals = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];
      meals.forEach((m) => {
        if (!isMealEnabled(dayId, m, dayConfig)) return;

        const choice = getValidSlotChoice(dayId, m, personSlot[m], dayConfig);
        if (choice === DietaryOption.NONE) return;

        cleanSlot[m] = choice;

        const parcelKey = `${m}Parcel` as const;
        const parcelValid = isParcelValidForSlot(dayId, m, choice, personSlot[parcelKey], dayConfig, isKid, !!kidsEnabled);

        if (parcelValid) {
          cleanSlot[parcelKey] = true;
        }
      });

      return cleanSlot;
    });
  });

  const prepared: Subscription = {
    ...form,
    mealSlots: sanitizedMealSlots,
    takenByPerson: stampedTakenByPerson,
    mobile: mobileInput ? Number(mobileInput) : undefined,
    flat: form.flat.trim().toUpperCase(),
    id: passId,
    meals: mealsFromChoices(sanitizedMealSlots, dayConfig, form.peopleCount, !!kidsEnabled),
    payments: payments,
    amount: totalAmount.toFixed(0),
    paymentMode: payments[0]?.mode || PaymentMode.CASH,
    transactionId: payments[0]?.transactionId || "",
    passcode: form.passcode || generateUniquePasscode(subscriptions, passId, passId),
  };

  if (prepared.mobile === undefined) {
    delete prepared.mobile;
  }

  const defaultSlot: MealSlot = {
    [MealType.BREAKFAST]: DietaryOption.NONE,
    [MealType.LUNCH]: DietaryOption.NONE,
    [MealType.DINNER]: DietaryOption.NONE,
    breakfastParcel: false,
    lunchParcel: false,
    dinnerParcel: false,
  };

  const getEnsureSlots = (dayId: string) => {
    const totalPeople = form.peopleCount + (form.kidsCount || 0);
    const existing = (form.mealSlots?.[dayId] as MealSlot[]) || [];
    if (existing.length >= totalPeople) return existing;
    const filled = [...existing];
    for (let i = existing.length; i < totalPeople; i++) {
      filled.push({ ...defaultSlot });
    }
    return filled;
  };

  const getEnsureTaken = (dayId: string) => {
    const totalPeople = form.peopleCount + (form.kidsCount || 0);
    const defaultTaken: TakenState = {
      [MealType.BREAKFAST]: false,
      [MealType.LUNCH]: false,
      [MealType.DINNER]: false,
      breakfastParcel: false,
      lunchParcel: false,
      dinnerParcel: false,
    };
    const existing = (form.takenByPerson?.[dayId] as TakenState[]) || [];
    if (existing.length >= totalPeople) return existing;
    const filled = [...existing];
    for (let i = existing.length; i < totalPeople; i++) {
      filled.push({ ...defaultTaken });
    }
    return filled;
  };

  /**
   * Sets the dietary choice for a specific meal slot.
   * Domain Invariant: If choice is set to NONE, parcel option MUST be forced to false!
   */
  const setMealSlotChoice = (
    slot: MealType,
    choice: MealChoice
  ) => {
    const currentSlots = getEnsureSlots(selectedDay);
    const isNone = choice === DietaryOption.NONE;
    const parcelKey = `${slot}Parcel` as keyof MealSlot;

    setForm({
      ...form,
      mealSlots: {
        ...form.mealSlots,
        [selectedDay]: currentSlots.map((item, index) => {
          if (index !== selectedPerson) return item;
          return {
            ...item,
            [slot]: choice,
            [parcelKey]: isNone ? false : item[parcelKey],
          };
        }),
      },
    });
    setIsManualAmount(false);
  };

  /**
   * Toggles a specific meal slot parcel for a person.
   * Domain Invariant: Parcel option CAN ONLY be enabled if a meal is selected (not DietaryOption.NONE).
   */
  const setMealParcel = (slot: MealType, enabled: boolean) => {
    const isSelectedPersonKid = kidsEnabled && selectedPerson >= form.peopleCount;
    if (isSelectedPersonKid && !isKidsParcelEnabled(selectedDay, slot, dayConfig, kidsEnabled)) {
      return;
    }

    const currentSlots = getEnsureSlots(selectedDay);
    const currentChoice = normalizeChoice(currentSlots[selectedPerson]?.[slot]);

    // Domain Invariant: Parcel CAN ONLY be enabled if meal choice is NOT DietaryOption.NONE!
    if (currentChoice === DietaryOption.NONE) {
      return;
    }

    const parcelKey = `${slot}Parcel` as keyof MealSlot;
    setForm({
      ...form,
      mealSlots: {
        ...form.mealSlots,
        [selectedDay]: currentSlots.map((item, index) =>
          index === selectedPerson ? { ...item, [parcelKey]: enabled } : item
        ),
      },
    });
    setIsManualAmount(false);
  };

  /**
   * Toggles whether a specific meal has been 'taken' (collected) by the person.
   */
  const setTakenChoice = (slot: string, taken: boolean) => {
    const isParcel = slot.includes("Parcel");
    const mealKey = isParcel ? slot.replace("Parcel", "") : slot;
    const parcelKey = `${mealKey}Parcel`;
    const timeKey = `${slot}Time`;
    const parcelTimeKey = `${parcelKey}Time`;
    const currentTaken = getEnsureTaken(selectedDay);
    const nowTime = formatTakenTime(new Date());

    set("takenByPerson", {
      ...form.takenByPerson,
      [selectedDay]: currentTaken.map((item, index) => {
        if (index === selectedPerson) {
          const existingTime = item[timeKey as keyof TakenState] as string | undefined;
          const existingParcelTime = item[parcelTimeKey as keyof TakenState] as string | undefined;
          const optedParcel = !!form.mealSlots[selectedDay]?.[selectedPerson]?.[parcelKey as keyof MealSlot];

          const updated: any = {
            ...item,
            [slot]: taken,
            [timeKey]: taken ? (existingTime || nowTime) : undefined,
          };
          // Rule: If food taken is toggled ON, and person opted for parcel for this meal, auto select parcel taken!
          if (!isParcel && taken && optedParcel) {
            updated[parcelKey] = true;
            updated[parcelTimeKey] = existingParcelTime || nowTime;
          }
          // Rule: If food taken is toggled OFF, also force parcel taken to OFF
          if (!isParcel && !taken) {
            updated[parcelKey] = false;
            updated[parcelTimeKey] = undefined;
          }
          return updated;
        }
        return item;
      }),
    });
  };

  const addPayment = () => {
    if (payments.length < 3) {
      setPayments([...payments, { amount: UI_TEXT.zero, mode: (enabledMethods[0] as any) || PaymentMode.CASH }]);
    }
  };

  const removePayment = (index: number) => {
    if (payments.length > 1) {
      setPayments(payments.filter((_, i) => i !== index));
    }
  };

  const updatePayment = useCallback((index: number, next: Partial<PaymentEntry>, isManual = false) => {
    const updated = [...payments];
    updated[index] = { ...updated[index], ...next };
    setPayments(updated);
    if (isManual) setIsManualAmount(true);
  }, [payments]);

  const [scannerTargetIdx, setScannerTargetIdx] = useState<number | null>(null);

  const handleScanTransactionId = useCallback((paymentIdx: number) => {
    setScannerTargetIdx(paymentIdx);
  }, []);

  const handleTxnDetailsExtracted = useCallback((txnId: string | null, scannedAmount: number | null) => {
    if (scannerTargetIdx !== null) {
      const targetIdx = scannerTargetIdx;
      const updates: Partial<PaymentEntry> = {};
      let isManualAmount = false;

      const detailLines: string[] = [];

      if (txnId) {
        updates.transactionId = txnId;
        detailLines.push(`• ${UI_TEXT.transactionIdLabel}: ${txnId}`);
      }

      const hasAmount = scannedAmount !== null && scannedAmount > 0;
      if (hasAmount) {
        updates.amount = String(scannedAmount);
        isManualAmount = true;
        detailLines.push(`• ${UI_TEXT.amount}: ${scannedAmount.toLocaleString()}`);
      }

      if (Object.keys(updates).length > 0) {
        const msg = UI_TEXT.confirmExtractedDetailsMsg.replace("{details}", detailLines.join("\n"));

        showGlobalAlert(
          UI_TEXT.confirmExtractedDetails,
          msg,
          [
            {
              text: UI_TEXT.applyDetails,
              onPress: () => {
                updatePayment(targetIdx, updates, isManualAmount);
              }
            },
            {
              text: UI_TEXT.cancel,
              style: "cancel"
            }
          ]
        );
      }
    }
  }, [scannerTargetIdx, updatePayment, showGlobalAlert]);

  // Auto-calculation of total based on food prices
  useEffect(() => {
    if (!foodPriceEnabled || !paymentConfig.enabled) return;

    const total = calculatePassTotalWithPackages(
      form.mealSlots,
      form.peopleCount,
      form.kidsCount || 0,
      appliedPackages,
      foodPackages,
      foodMenu,
      dayConfig,
      !!kidsEnabled
    );

    // Only update if we have a single payment entry and it's either a new pass
    // or the user hasn't manually edited the price yet.
    if (payments.length === 1 && (!lockIdentity && !isManualAmount)) {
      const currentVal = payments[0].amount || UI_TEXT.zero;
      if (currentVal !== String(total)) {
        setPayments([{ ...payments[0], amount: String(total) }]);
      }
    }
  }, [
    form.mealSlots,
    foodPriceEnabled,
    dayConfig,
    isManualAmount,
    paymentConfig.enabled,
    payments.length,
    foodMenu,
    kidsEnabled,
    form.peopleCount,
    form.kidsCount,
    lockIdentity,
    appliedPackages,
    foodPackages
  ]);

  const handleSaveWithValidation = (
    saveAction: (next: Subscription, acknowledgedMissedParcel?: boolean) => void
  ) => {
    if (!prepared.flat.trim()) {
      showGlobalAlert(UI_TEXT.error, UI_TEXT.flatNoRequired);
      return;
    }
    if (mobileInput && mobileInput.trim().length !== 10) {
      showGlobalAlert(UI_TEXT.error, UI_TEXT.mobileInvalid);
      return;
    }

    // Sanitize payment amounts (fill empty/invalid amounts with "0")
    const sanitizedPayments = payments.map((p) => {
      const amtStr = p.amount !== undefined && p.amount !== null ? String(p.amount).trim() : "";
      const validNum = parseFloat(amtStr);
      return {
        ...p,
        amount: !isNaN(validNum) ? String(validNum) : UI_TEXT.zero,
      };
    });

    const currentTotalAmount = sanitizedPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    const now = Date.now();
    let createdTs = Number(value?.createdAt) || Number(value?.timestamp) || now;
    let updatedTs = now;
    if (createdTs > updatedTs) createdTs = updatedTs;

    const updatedPrepared: Subscription = {
      ...prepared,
      createdAt: createdTs,
      updatedAt: updatedTs,
      payments: sanitizedPayments,
      amount: currentTotalAmount.toFixed(0),
      paymentMode: sanitizedPayments[0]?.mode || PaymentMode.CASH,
      transactionId: sanitizedPayments[0]?.transactionId || "",
      isPackageApplied,
      appliedPackages: isPackageApplied ? appliedPackages : undefined,
    };

    const calculatedExpectedAmount = calculatePassTotalWithPackages(
      form.mealSlots,
      form.peopleCount,
      form.kidsCount || 0,
      appliedPackages,
      foodPackages,
      foodMenu,
      dayConfig,
      !!kidsEnabled
    );

    const shouldCheckDiscrepancy = paymentConfig.enabled && !isPackageApplied && (!lockIdentity || hasMealOrParcelChoicesChanged);
    const isDiscrepancy = shouldCheckDiscrepancy && Math.abs(currentTotalAmount - calculatedExpectedAmount) > 0.01;

    const proceedToSave = () => {
      if (checkParcelInconsistency(updatedPrepared)) {
        showGlobalAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.parcelMissedConfirm, [
          { text: UI_TEXT.no, style: "cancel" },
          { text: UI_TEXT.yes, style: "destructive", onPress: () => saveAction(updatedPrepared, true) },
        ]);
      } else {
        saveAction(updatedPrepared);
      }
    };

    if (isDiscrepancy) {
      const formatAmount = (num: number) => (num % 1 !== 0 ? num.toFixed(2) : num.toFixed(0));
      const msg = UI_TEXT.amountMismatchMsg
        .replaceAll("{entered}", formatAmount(currentTotalAmount))
        .replace("{calculated}", formatAmount(calculatedExpectedAmount));

      showGlobalAlert(UI_TEXT.amountMismatchTitle, msg, [
        { text: UI_TEXT.no, style: "cancel" },
        { text: UI_TEXT.yes, onPress: () => proceedToSave() },
      ]);
    } else {
      proceedToSave();
    }
  };

  const summaryPassId = lockIdentity
    ? value.id
    : (form.flat ? `${form.block ? `${form.block}-` : ""}${form.flat}` : value?.id);
  const summaryPasscode = form.passcode || (summaryPassId ? generateUniquePasscode(subscriptions, summaryPassId, summaryPassId) : undefined);

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <BackButton onPress={onCancel} />
            <HomeButton onPress={onHome} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <UserGreeting />
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
        <View style={[styles.card, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, overflow: "hidden" }]}>
          <View style={[styles.previewTop, { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }]}>
            <View style={{ flex: 1, minWidth: 150, flexShrink: 1 }}>
              <Text style={[styles.previewLabel, { color: theme.colors.white, opacity: 0.7 }]}>{UI_TEXT.livePreview}</Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                <Text style={[styles.previewTitle, { color: theme.colors.white, fontSize: 28 }]}>
                  {form.block || UI_TEXT.hyphen}{UI_TEXT.hyphen}{form.flat || UI_TEXT.hyphen}
                </Text>
                {isPackageApplied && (
                  <View
                    style={{
                      backgroundColor: theme.colors.white,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons name="pricetag" size={12} color={theme.colors.primary} />
                    <Text style={{ fontSize: 11, fontWeight: "900", color: theme.colors.primary }}>
                      {UI_TEXT.packageAppliedMarker}
                    </Text>
                  </View>
                )}

                {isSpecialOnly && (
                  <View
                    style={{
                      backgroundColor: theme.colors.specialMealBg,
                      borderColor: theme.colors.specialMealBorder,
                      borderWidth: 1,
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 10,
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Ionicons name="star" size={12} color={theme.colors.specialMealBorder} />
                    <Text style={{ fontSize: 11, fontWeight: "900", color: theme.colors.specialMealText }}>
                      {UI_TEXT.specialMeal}
                    </Text>
                  </View>
                )}
              </View>
              {summaryPasscode ? (
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.white, opacity: 0.9, marginTop: 4 }}>
                  {UI_TEXT.passCodeLabel}: {summaryPasscode}
                </Text>
              ) : null}
              <View style={{ flexDirection: "row", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.white, opacity: 0.85 }}>
                  {UI_TEXT.createdTime}: {formatTimestamp(previewTimestamps.createdTs)}
                </Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.white, opacity: 0.85 }}>
                  {UI_TEXT.editedTime}: {formatTimestamp(previewTimestamps.updatedTs)}
                </Text>
              </View>
            </View>
            {paymentConfig.enabled && (
              <View style={{ flexShrink: 0, alignSelf: "flex-start" }}>
                <Text style={[styles.previewAmount, { color: theme.colors.white, fontSize: 22 }]}>
                  {totalAmount.toFixed(0)}
                </Text>
              </View>
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
        <SubscriptionBasicInfoSection
          block={form.block}
          setBlock={(block) => set("block", block)}
          blockOptions={blockOptions}
          flat={form.flat}
          setFlat={(flat) => set("flat", flat.toUpperCase())}
          phone={mobileInput}
          setPhone={setMobileInput}
          peopleCount={form.peopleCount}
          setPeopleCount={(count) => {
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
          kidsCount={form.kidsCount || 0}
          setKidsCount={(count) => {
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
          kidsEnabled={kidsEnabled}
          mobileEnabled={mobileEnabled}
          isAdmin={isAdmin}
          canEdit={canEdit}
          lockIdentity={lockIdentity}
          hasAnyMealTaken={hasAnyMealTaken}
          minPeople={lockIdentity && hasAnyMealTaken ? value.peopleCount : 1}
          minKids={lockIdentity && hasAnyMealTaken ? (value.kidsCount || 0) : 0}
          pickContact={pickContact}
          theme={theme}
          styles={styles}
          s={s}
        />

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
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={getMemberLegend(index, form.peopleCount, kidsEnabled)}
                  accessibilityState={{ selected: selectedPerson === index }}
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
          <ScrollView
            ref={dayScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ marginBottom: 12 }}
          >
            <View style={styles.selectorRow}>
              {sortedActiveDays.map((day) => (
                <Pressable
                  key={day}
                  onLayout={(e) => { dayOffsets.current[day] = e.nativeEvent.layout.x; }}
                  onPress={() => setSelectedDay(day)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={getDayLabel(day, dayConfig)}
                  accessibilityState={{ selected: selectedDay === day }}
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

            {[MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
              .filter((slot) => isMealEnabled(selectedDay, slot, dayConfig))
              .map((slot) => {
                const label = getMealLabel(slot);
                const currentSlotChoice =
                  getValidSlotChoice(selectedDay, slot, form.mealSlots[selectedDay]?.[selectedPerson]?.[slot], dayConfig);
                const isVegOnly = isVegOnlyDay(selectedDay, dayConfig);
                const isDone = isMealDone(selectedDay, slot, dayConfig);
                const isCurrent = isMealCurrent(selectedDay, slot, dayConfig);
                const isFuture = isMealInFuture(selectedDay, slot, dayConfig);
                const isPast = !!currentDayId && !isCurrent && !isFuture;
                const isLocked = isDone || (!lockIdentity && isPast);
                const isSpecial = isSpecialMeal(selectedDay, slot, dayConfig);

                const dayConf = (dayConfig || []).find((d) => d.id === selectedDay);
                const mConf = dayConf ? dayConf[slot] : undefined;
                const varieties = getMealVarieties(mConf);

                return (
                  <View key={slot} style={[{ marginBottom: 16 }, isLocked && { opacity: 0.5 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                      <Text style={[styles.label, { marginTop: 0, marginBottom: 0, fontSize: 14, color: isSpecial ? theme.colors.specialMealText : theme.colors.textPrimary }]}>
                        {label} {isDone ? `(${UI_TEXT.mealDoneLabel})` : (!lockIdentity && isPast) ? `(${UI_TEXT.resSuffix})` : ""}
                      </Text>
                      {isSpecial && (
                        <View style={{ backgroundColor: theme.colors.specialMealBorder, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                          <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.specialMealBadge}</Text>
                        </View>
                      )}
                    </View>
                    <View style={[styles.choiceRow, { flexWrap: "wrap", gap: 8 }]}>
                      {/* Option: None */}
                      <Pressable
                        onPress={() => isAdmin && canEdit && !isLocked && setMealSlotChoice(slot, DietaryOption.NONE)}
                        style={[
                          styles.choice,
                          currentSlotChoice === DietaryOption.NONE
                            ? { backgroundColor: theme.colors.surfaceDark, borderColor: isSpecial ? theme.colors.specialMealBorder : theme.colors.primary, borderWidth: 2, borderStyle: isSpecial ? "dashed" : "solid" }
                            : [styles.noneChoice, isSpecial && { borderColor: theme.colors.specialMealBorder, borderWidth: 1.5, borderStyle: "dashed" }],
                          (!isAdmin || isLocked) && { opacity: currentSlotChoice === DietaryOption.NONE ? 1 : 0.3 },
                          { paddingVertical: 10, paddingHorizontal: 10, flex: 1, minWidth: 70 }
                        ]}
                        disabled={!isAdmin || !canEdit || isLocked}
                      >
                        <Text
                          style={[
                            styles.choiceText,
                            currentSlotChoice === DietaryOption.NONE && { color: theme.colors.textPrimary, fontWeight: "900" },
                            { fontSize: 12 }
                          ]}
                        >
                          {getDietaryOptionLabel(DietaryOption.NONE)}
                        </Text>
                      </Pressable>

                      {/* Options: All Active Varieties / Sub-Categories */}
                      {varieties.map((v) => {
                        if (isVegOnly && v.type === DietType.NON_VEG) return null;
                        if (!isDietaryEnabled(selectedDay, slot, v.type, dayConfig)) return null;

                        const isVegMatch =
                          (currentSlotChoice === DietaryOption.VEG || currentSlotChoice === "veg" || currentSlotChoice === "veg_default") &&
                          v.type === DietType.VEG &&
                          (v.id === "veg_default" || v.isDefault || varieties.find(x => x.type === DietType.VEG)?.id === v.id);

                        const isNonVegMatch =
                          (currentSlotChoice === DietaryOption.NON_VEG || currentSlotChoice === "nonVeg" || currentSlotChoice === "nonVeg_default") &&
                          v.type === DietType.NON_VEG &&
                          (v.id === "nonVeg_default" || v.isDefault || varieties.find(x => x.type === DietType.NON_VEG)?.id === v.id);

                        const isSelected = currentSlotChoice === v.id || isVegMatch || isNonVegMatch;

                        const vColor = v.color || (v.type === DietType.VEG ? theme.colors.veg : theme.colors.nonVeg);

                        return (
                          <Pressable
                            key={v.id}
                            onPress={() => isAdmin && canEdit && !isLocked && setMealSlotChoice(slot, v.id)}
                            style={[
                              styles.choice,
                              isSelected
                                ? { backgroundColor: vColor, borderColor: isSpecial ? theme.colors.specialMealBorder : vColor, borderWidth: 2, borderStyle: isSpecial ? "dashed" : "solid" }
                                : { backgroundColor: theme.colors.surfaceDark, borderColor: isSpecial ? theme.colors.specialMealBorder : theme.colors.border, borderWidth: isSpecial ? 1.5 : 1, borderStyle: isSpecial ? "dashed" : "solid" },
                              (!isAdmin || isLocked) && { opacity: isSelected ? 1 : 0.3 },
                              { paddingVertical: 10, paddingHorizontal: 10, flex: 1, minWidth: 90 }
                            ]}
                            disabled={!isAdmin || !canEdit || isLocked}
                          >
                            <Text
                              style={[
                                styles.choiceText,
                                isSelected ? { color: theme.colors.white, fontWeight: "900" } : { color: theme.colors.textSecondary },
                                { fontSize: 12 }
                              ]}
                              numberOfLines={1}
                            >
                              {v.name}
                            </Text>
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                );
              })}
          </View>

          {/* SECTION 2: Parcels */}
          {(() => {
            const isKidSlot = kidsEnabled && selectedPerson >= form.peopleCount;
            const checkParcelActive = (slot: MealType) =>
              isMealEnabled(selectedDay, slot, dayConfig) &&
              (isKidSlot
                ? isKidsParcelEnabled(selectedDay, slot, dayConfig, kidsEnabled)
                : isParcelEnabled(selectedDay, slot, dayConfig));

            const parcelSlots = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].filter(checkParcelActive);

            if (parcelSlots.length === 0) return null;

            return (
              <View style={{ marginTop: 8 }}>
                <View style={{ marginBottom: 12 }}>
                  <Text style={[styles.currentChoice, { marginTop: 0, fontSize: 16, marginBottom: 8 }]}>{UI_TEXT.parcels}</Text>
                </View>

                <View style={styles.choiceRow}>
                  {[MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
                    .filter(checkParcelActive)
                    .map((slot) => {
                      const isKidSlot = kidsEnabled && selectedPerson >= form.peopleCount;
                      const currentChoice = getValidSlotChoice(selectedDay, slot, form.mealSlots[selectedDay]?.[selectedPerson]?.[slot], dayConfig);
                      const isParcel = isParcelValidForSlot(selectedDay, slot, currentChoice, form.mealSlots[selectedDay]?.[selectedPerson]?.[`${slot}Parcel` as keyof MealSlot], dayConfig, isKidSlot, !!kidsEnabled);
                    const label = getMealLabel(slot);
                    const isDone = isMealDone(selectedDay, slot, dayConfig);
                    const isCurrent = isMealCurrent(selectedDay, slot, dayConfig);
                    const isFuture = isMealInFuture(selectedDay, slot, dayConfig);
                    const isPast = !!currentDayId && !isCurrent && !isFuture;
                    const isLocked = isDone || (!lockIdentity && isPast);
                    const isSpecial = isSpecialMeal(selectedDay, slot, dayConfig);

                    const dayConf = (dayConfig || []).find((d) => d.id === selectedDay);
                    const mConf = dayConf ? dayConf[slot] : undefined;
                    const varieties = getMealVarieties(mConf);
                    const dietKey = getDietTypeForChoice(currentChoice, varieties);
                    const variety = varieties.find(v => v.id === currentChoice) || varieties.find(v => v.type === dietKey);
                    const parcelColorStyle = variety?.color ? { backgroundColor: variety.color, borderColor: variety.color } : (dietKey === DietType.NON_VEG ? styles.nonVegChoice : styles.vegChoice);

                    return (
                      <Pressable
                        key={slot}
                        disabled={currentChoice === DietaryOption.NONE || isLocked || !isAdmin}
                        onPress={() => isAdmin && canEdit && !isLocked && setMealParcel(slot, !isParcel)}
                        style={[
                          styles.choice,
                          isParcel
                            ? parcelColorStyle
                            : styles.noneChoice,
                          isSpecial && {
                            borderStyle: "dashed",
                            borderWidth: 2,
                            borderColor: theme.colors.specialMealBorder,
                          },
                          (currentChoice === DietaryOption.NONE || isLocked || !isAdmin) && { opacity: 0.2 },
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
            const dayConf = (dayConfig || []).find((d) => d.id === selectedDay);
            const mConf = dayConf ? dayConf[s] : undefined;
            const varieties = getMealVarieties(mConf);
            const dietKey = getDietTypeForChoice(choice, varieties);
            return choice && choice !== DietaryOption.NONE && dietKey && isDietaryEnabled(selectedDay, s, dietKey, dayConfig);
          }) && (
            <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 16 }}>
              <View style={{ marginBottom: 12 }}>
                <Text style={[styles.currentChoice, { marginTop: 0, fontSize: 16, marginBottom: 8 }]}>{UI_TEXT.foodTakenByPerson}</Text>
              </View>
              <View style={styles.choiceRow}>
                {[MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
                  .filter((slot) => {
                    const choice = form.mealSlots[selectedDay]?.[selectedPerson]?.[slot];
                    return isMealEnabled(selectedDay, slot, dayConfig) && choice !== DietaryOption.NONE;
                  })
                  .map((slot) => {
                    const choice =
                      form.mealSlots[selectedDay]?.[selectedPerson]?.[slot];
                    if (!choice || choice === DietaryOption.NONE) return null;

                    const dayConf = (dayConfig || []).find((d) => d.id === selectedDay);
                    const mConf = dayConf ? dayConf[slot] : undefined;
                    const varieties = getMealVarieties(mConf);
                    const dietKey = getDietTypeForChoice(choice, varieties);
                    if (!dietKey || !isDietaryEnabled(selectedDay, slot, dietKey, dayConfig))
                      return null;

                    const isTaken =
                      !!form.takenByPerson[selectedDay]?.[selectedPerson]?.[slot];
                    const variety = varieties.find(v => v.id === choice) || varieties.find(v => v.type === dietKey);
                    const slotColorStyle = variety?.color ? { backgroundColor: variety.color, borderColor: variety.color } : (dietKey === DietType.NON_VEG ? styles.nonVegChoice : styles.vegChoice);

                    const label = getMealLabel(slot);
                    const isDone = isMealDone(selectedDay, slot, dayConfig);
                    const isFuture = isMealInFuture(selectedDay, slot, dayConfig);
                    const isDisabled = isDone || isFuture;

                    return (
                      <Pressable
                        key={slot}
                        onPress={() => canEdit && !isDisabled && setTakenChoice(slot, !isTaken)}
                        style={[
                          styles.choice,
                          isTaken ? slotColorStyle : styles.noneChoice,
                          isDisabled && { opacity: 0.5 },
                          { paddingVertical: 12, paddingHorizontal: 4 }
                        ]}
                        disabled={isDisabled}
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
                const isKidSlot = kidsEnabled && selectedPerson >= form.peopleCount;
                const checkParcelActive = (slot: MealType) =>
                  isMealEnabled(selectedDay, slot, dayConfig) &&
                  (isKidSlot
                    ? isKidsParcelEnabled(selectedDay, slot, dayConfig, kidsEnabled)
                    : isParcelEnabled(selectedDay, slot, dayConfig));

                const parcelTakenSlots = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].filter(
                  (slot) => {
                    const choice = form.mealSlots[selectedDay]?.[selectedPerson]?.[slot];
                    const isParcelRegistered = !!form.mealSlots[selectedDay]?.[selectedPerson]?.[`${slot}Parcel` as keyof MealSlot];
                    const isFoodTaken = !!form.takenByPerson[selectedDay]?.[selectedPerson]?.[slot];
                    return checkParcelActive(slot) && choice !== DietaryOption.NONE && isParcelRegistered && isFoodTaken;
                  }
                );

                if (parcelTakenSlots.length === 0) return null;

                return (
                  <View style={{ marginTop: 20 }}>
                    <View style={{ marginBottom: 12 }}>
                      <Text style={[styles.currentChoice, { marginTop: 0, fontSize: 16, marginBottom: 8 }]}>{UI_TEXT.parcelTakenByMember}</Text>
                    </View>
                    <View style={styles.choiceRow}>
                      {[MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
                        .filter((slot) => {
                           const isParcelRegistered = !!form.mealSlots[selectedDay]?.[selectedPerson]?.[`${slot}Parcel` as keyof MealSlot];
                           const isFoodTaken = !!form.takenByPerson[selectedDay]?.[selectedPerson]?.[slot];
                           return checkParcelActive(slot) && isParcelRegistered && isFoodTaken;
                        })
                        .map((slot) => {
                          const choice = form.mealSlots[selectedDay]?.[selectedPerson]?.[slot];
                          const parcelTakenKey = `${slot}Parcel`;
                          const isParcelTaken = !!form.takenByPerson[selectedDay]?.[selectedPerson]?.[parcelTakenKey as keyof TakenState];

                          const dayConf = (dayConfig || []).find((d) => d.id === selectedDay);
                          const mConf = dayConf ? dayConf[slot] : undefined;
                          const varieties = getMealVarieties(mConf);
                          const dietKey = getDietTypeForChoice(choice, varieties);
                          const variety = varieties.find(v => v.id === choice) || varieties.find(v => v.type === dietKey);
                          const slotColorStyle = variety?.color ? { backgroundColor: variety.color, borderColor: variety.color } : (dietKey === DietType.NON_VEG ? styles.nonVegChoice : styles.vegChoice);

                          const label = getMealLabel(slot);
                          const isDone = isMealDone(selectedDay, slot, dayConfig);
                          const isFuture = isMealInFuture(selectedDay, slot, dayConfig);
                          const isDisabled = isDone || isFuture;

                          return (
                            <Pressable
                              key={slot}
                              onPress={() => canEdit && !isDisabled && setTakenChoice(parcelTakenKey, !isParcelTaken)}
                              style={[
                                styles.choice,
                                isParcelTaken ? slotColorStyle : styles.noneChoice,
                                isDisabled && { opacity: 0.5 },
                                { paddingVertical: 12, paddingHorizontal: 4 }
                              ]}
                              disabled={isDisabled}
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
          <SubscriptionPaymentSection
            payments={payments}
            totalAmount={totalAmount}
            updatePayment={updatePayment}
            removePayment={removePayment}
            addPayment={addPayment}
            isAdmin={isAdmin}
            canEdit={canEdit}
            enabledMethods={enabledMethods}
            scannerTargetIdx={scannerTargetIdx}
            handleScanTransactionId={handleScanTransactionId}
            sanitizeAmountText={sanitizeAmountText}
            theme={theme}
            styles={styles}
            s={s}
            onOpenApplyPackageModal={() => setShowApplyPackageModal(true)}
            hasApplicablePackages={hasAnyApplicablePackage}
            isPackageApplied={isPackageApplied}
            appliedPackages={appliedPackages}
            lockIdentity={lockIdentity}
            onViewAppliedPackage={(pkgId) => {
              const pkg = foodPackages.find((p) => p.id === pkgId);
              if (pkg) setViewingPackage(pkg);
            }}
            getPersonLabel={(idx) => getMemberLegend(idx, form.peopleCount, !!kidsEnabled)}
          />
        )}

        {/* Actions */}
        <View style={{ marginBottom: 40 }}>
          {canEdit && (
            <Pressable
              onPress={() => handleSaveWithValidation(onSave)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.saveChanges}
              accessibilityState={{ disabled: !canSave }}
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
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.saveGenerateQr}
              accessibilityState={{ disabled: !canSave }}
              onPress={() => handleSaveWithValidation(onSaveQr)}
              style={[
                styles.primary,
                {
                  marginTop: s(16),
                  backgroundColor: theme.colors.primary,
                  ...Platform.select({
                    ios: {
                      shadowOpacity: 0,
                      shadowRadius: 0,
                      shadowOffset: { width: 0, height: 0 }
                    },
                    android: {
                      elevation: 0,
                    },
                    web: {
                      boxShadow: 'none',
                    }
                  })
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

          <Pressable
            onPress={onCancel}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={UI_TEXT.cancel}
            style={[styles.secondary, { marginTop: 16, backgroundColor: theme.colors.surfaceDark, borderColor: theme.colors.textSecondary }]}
          >
             <ActionLabel icon="close-outline" label={UI_TEXT.cancel} color={theme.colors.textSecondary} />
          </Pressable>

          {isAdmin && canEdit && onDelete ? (
            <Pressable
              disabled={!canDeletePass}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.deleteFlatRecord}
              accessibilityState={{ disabled: !canDeletePass }}
              onPress={onDelete}
              style={[styles.deleteButton, { marginTop: 24 }, !canDeletePass && { opacity: 0.4 }]}
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

      <PaymentScannerModal
        visible={scannerTargetIdx !== null}
        onClose={() => setScannerTargetIdx(null)}
        onExtracted={handleTxnDetailsExtracted}
      />

      {/* Apply Package Modal */}
      <Modal
        visible={showApplyPackageModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowApplyPackageModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: theme.colors.shadow + "80", justifyContent: "center", alignItems: "center" }}
        >
          <View style={[styles.card, { width: "94%", maxHeight: "88%", padding: s(20), backgroundColor: theme.colors.surface }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: s(16) }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: s(8) }}>
                <Ionicons name="pricetag-outline" size={s(22)} color={theme.colors.primary} />
                <Text style={{ fontSize: s(18), fontWeight: "900", color: theme.colors.textPrimary }}>
                  {UI_TEXT.applyPackage}
                </Text>
              </View>
              <Pressable onPress={() => setShowApplyPackageModal(false)}>
                <Ionicons name="close-outline" size={s(24)} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: s(16) }}>
              {Array.from({ length: totalPeopleCount }).map((_, pIdx) => {
                const personLabel = getMemberLegend(pIdx, form.peopleCount, !!kidsEnabled);
                const applicableList = perPersonApplicablePackages[pIdx] || [];
                const currentApplied = appliedPackages[pIdx];

                return (
                  <View
                    key={pIdx}
                    style={{
                      backgroundColor: theme.colors.surfaceDark,
                      padding: s(14),
                      borderRadius: s(14),
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      gap: s(10),
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: s(15), fontWeight: "900", color: theme.colors.primary }}>
                        {personLabel}
                      </Text>
                      {currentApplied && (
                        <View
                          style={{
                            backgroundColor: theme.colors.successLight,
                            paddingHorizontal: s(8),
                            paddingVertical: s(3),
                            borderRadius: s(6),
                            borderWidth: 1,
                            borderColor: theme.colors.success,
                          }}
                        >
                          <Text style={{ fontSize: s(11), fontWeight: "800", color: theme.colors.success }}>
                            {UI_TEXT.packageAppliedMarker}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Currently Applied Package for this person */}
                    {currentApplied ? (
                      <View
                        style={{
                          backgroundColor: theme.colors.surface,
                          padding: s(12),
                          borderRadius: s(12),
                          borderWidth: 1.5,
                          borderColor: theme.colors.success,
                          gap: s(6),
                        }}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                          <Text style={{ fontSize: s(14), fontWeight: "900", color: theme.colors.textPrimary }}>
                            {currentApplied.packageName}
                          </Text>
                          <Text style={{ fontSize: s(14), fontWeight: "900", color: theme.colors.success }}>
                            {currentApplied.packagePrice}
                          </Text>
                        </View>
                        <Pressable
                          onPress={() => {
                            setAppliedPackages((prev) => {
                              const next = { ...prev };
                              delete next[pIdx];
                              return next;
                            });
                          }}
                          style={({ pressed }) => [
                            {
                              backgroundColor: theme.colors.errorLight,
                              paddingVertical: s(6),
                              paddingHorizontal: s(10),
                              borderRadius: s(8),
                              alignSelf: "flex-end",
                              borderWidth: 1,
                              borderColor: theme.colors.error,
                            },
                            pressed && { opacity: 0.7 },
                          ]}
                        >
                          <Text style={{ fontSize: s(12), fontWeight: "800", color: theme.colors.error }}>
                            {UI_TEXT.removePackage}
                          </Text>
                        </Pressable>
                      </View>
                    ) : null}

                    {/* Available Applicable Packages List */}
                    {applicableList.length > 0 ? (
                      <View style={{ gap: s(8) }}>
                        <Text style={{ fontSize: s(11), fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase" }}>
                          {UI_TEXT.foodPackages}
                        </Text>
                        {applicableList.map((appPkg) => {
                          const isThisApplied = currentApplied?.packageId === appPkg.packageId;
                          return (
                            <View
                              key={appPkg.packageId}
                              style={{
                                backgroundColor: theme.colors.surface,
                                padding: s(12),
                                borderRadius: s(12),
                                borderWidth: 1,
                                borderColor: theme.colors.border,
                                gap: s(6),
                              }}
                            >
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                                <Text style={{ fontSize: s(14), fontWeight: "900", color: theme.colors.textPrimary, flex: 1 }}>
                                  {appPkg.packageName}
                                </Text>
                                <View
                                  style={{
                                    backgroundColor: theme.colors.successLight,
                                    paddingHorizontal: s(6),
                                    paddingVertical: s(2),
                                    borderRadius: s(6),
                                  }}
                                >
                                  <Text style={{ fontSize: s(10), fontWeight: "900", color: theme.colors.success }}>
                                    {UI_TEXT.savings}: {appPkg.savings}
                                  </Text>
                                </View>
                              </View>

                              {!!appPkg.packageDescription && (
                                <Text style={{ fontSize: s(12), color: theme.colors.textSecondary }}>
                                  {appPkg.packageDescription}
                                </Text>
                              )}

                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: s(4) }}>
                                <View style={{ gap: s(2) }}>
                                  <Text style={{ fontSize: s(10), fontWeight: "700", color: theme.colors.textMuted }}>
                                    {UI_TEXT.normalPrice}: {appPkg.normalTotalMealPrice}
                                    {appPkg.totalParcelPrice > 0 ? ` + ${UI_TEXT.parcelPriceLabel}: ${appPkg.totalParcelPrice}` : ""}
                                  </Text>
                                  <Text style={{ fontSize: s(13), fontWeight: "900", color: theme.colors.primary }}>
                                    {UI_TEXT.priceAfterPackage}: {appPkg.priceWithPackage}
                                  </Text>
                                </View>

                                {!isThisApplied && (
                                  <Pressable
                                    onPress={() => {
                                      setAppliedPackages((prev) => ({
                                        ...prev,
                                        [pIdx]: {
                                          packageId: appPkg.packageId,
                                          packageName: appPkg.packageName,
                                          packagePrice: appPkg.packagePrice,
                                        },
                                      }));
                                    }}
                                    style={({ pressed }) => [
                                      {
                                        backgroundColor: theme.colors.primary,
                                        paddingVertical: s(6),
                                        paddingHorizontal: s(12),
                                        borderRadius: s(8),
                                      },
                                      pressed && { opacity: 0.8 },
                                    ]}
                                  >
                                    <Text style={{ fontSize: s(12), fontWeight: "900", color: theme.colors.white }}>
                                      {UI_TEXT.applyPackage}
                                    </Text>
                                  </Pressable>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    ) : (
                      !currentApplied && (
                        <Text style={{ fontSize: s(12), color: theme.colors.textMuted, fontStyle: "italic" }}>
                          {UI_TEXT.noPackageMealsFound}
                        </Text>
                      )
                    )}
                  </View>
                );
              })}
            </ScrollView>

            <Pressable
              onPress={() => setShowApplyPackageModal(false)}
              style={({ pressed }) => [
                styles.primary,
                { height: 46, marginTop: s(16), borderRadius: 12 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: s(15) }}>
                {UI_TEXT.ok}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* View-Only Package Details Modal */}
      <Modal
        visible={!!viewingPackage}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setViewingPackage(null)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: theme.colors.shadow + "80", justifyContent: "center", alignItems: "center" }}
        >
          <View style={[styles.card, { width: "90%", maxHeight: "80%", padding: s(20), backgroundColor: theme.colors.surface }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: s(16) }}>
              <Text style={{ fontSize: s(18), fontWeight: "900", color: theme.colors.textPrimary }}>
                {UI_TEXT.packageDetails}
              </Text>
              <Pressable onPress={() => setViewingPackage(null)}>
                <Ionicons name="close-outline" size={s(24)} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            {viewingPackage && (
              <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: s(12) }}>
                <Text style={{ fontSize: s(20), fontWeight: "900", color: theme.colors.primary }}>
                  {viewingPackage.name}
                </Text>

                <Text style={{ fontSize: s(14), color: theme.colors.textSecondary, lineHeight: s(20) }}>
                  {viewingPackage.description}
                </Text>

                <View style={{ flexDirection: "row", gap: s(8), alignItems: "center" }}>
                  <View style={{ backgroundColor: theme.colors.primary + "18", paddingHorizontal: s(10), paddingVertical: s(4), borderRadius: s(6) }}>
                    <Text style={{ fontSize: s(12), fontWeight: "900", color: theme.colors.primary }}>
                      {viewingPackage.applicability === "kids" ? UI_TEXT.kidsOnly : viewingPackage.applicability === "member" ? UI_TEXT.membersAll : UI_TEXT.adultsOnly}
                    </Text>
                  </View>
                  <View style={{ backgroundColor: theme.colors.successLight, paddingHorizontal: s(10), paddingVertical: s(4), borderRadius: s(6) }}>
                    <Text style={{ fontSize: s(12), fontWeight: "900", color: theme.colors.success }}>
                      {UI_TEXT.packagePrice}: {viewingPackage.packagePrice}
                    </Text>
                  </View>
                </View>

                {/* Included Meals */}
                <View style={{ backgroundColor: theme.colors.surfaceDark, padding: s(12), borderRadius: s(12), gap: s(6) }}>
                  <Text style={{ fontSize: s(11), fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase" }}>
                    {UI_TEXT.selectMealsForPackage}
                  </Text>
                  {Object.keys(viewingPackage.selectedMealItems || viewingPackage.selectedMeals || {}).map((dayId) => {
                    const dLabel = getDayLabel(dayId, dayConfig);
                    const mealItems = viewingPackage.selectedMealItems?.[dayId] || (viewingPackage.selectedMeals?.[dayId] || []).map((m: any) => ({ mealType: m, varietyId: "" }));
                    const mLabels = mealItems.map((i) => {
                      const mLabel = getMealLabel(i.mealType);
                      const dObj = dayConfig.find((d) => d.id === dayId);
                      const mealConf = dObj ? (dObj as any)[i.mealType] : null;
                      const varieties = getMealVarieties(mealConf);
                      const v = varieties.find((vr) => vr.id === i.varietyId);
                      return v ? `${mLabel} (${v.name})` : mLabel;
                    }).join(", ");
                    return (
                      <Text key={dayId} style={{ fontSize: s(13), fontWeight: "700", color: theme.colors.textPrimary }}>
                        • {dLabel}: {mLabels}
                      </Text>
                    );
                  })}
                </View>
              </ScrollView>
            )}

            <Pressable
              onPress={() => setViewingPackage(null)}
              style={({ pressed }) => [
                styles.primary,
                { height: 46, marginTop: s(16), borderRadius: 12 },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: s(15) }}>
                {UI_TEXT.ok}
              </Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </KeyboardAvoidingView>
  );
}
