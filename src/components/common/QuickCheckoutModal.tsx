import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Platform, Modal, ScrollView, useWindowDimensions, Animated, AccessibilityInfo, Vibration, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { useDatabase } from "../../context/DatabaseContext";
import { useUI } from "../../context/UIContext";
import { useAppNavigation } from "../../context/NavigationContext";
import { Subscription, MealType, DietaryOption, DietType, ActivityModule, ActivityAction, AppThemeMode, AppScreen, TakenState, CheckoutSource, MealSlot } from "../../types";
import { isParcelEnabled, isMealCurrent, isMealDone, getMealLabel, formatTakenTime, isVegOnlyDay, isDietaryEnabled } from "../../constants";

/**
 * Universal fail-safe audio sound player for assets/checkout.mp3.
 * Uses modern expo-audio in Expo SDK 57 with safe fallbacks for Web & Synthesizer.
 */
async function playCheckoutSound() {
  try {
    if (Platform.OS !== "web") {
      try {
        const ExpoAudio = await import("expo-audio");
        if (ExpoAudio && typeof ExpoAudio.createAudioPlayer === "function") {
          const checkoutAsset = require("../../../assets/checkout.mp3");
          const player = ExpoAudio.createAudioPlayer(checkoutAsset);
          player.play();
          return;
        }
      } catch (err) {
        console.warn("expo-audio playback notice:", err);
      }
    }

    const checkoutAsset = require("../../../assets/checkout.mp3");
    const audioUri = typeof checkoutAsset === "string" ? checkoutAsset : (checkoutAsset?.default || checkoutAsset?.uri);
    if (typeof Audio !== "undefined") {
      const audio = new Audio(audioUri || checkoutAsset);
      audio.volume = 1.0;
      await audio.play().catch(() => playSynthesizedChime());
      return;
    }
  } catch (err) {
    // Silent catch
  }

  playSynthesizedChime();
}

function playSynthesizedChime() {
  try {
    const AudioCtx = typeof window !== "undefined" ? (window.AudioContext || (window as any).webkitAudioContext) : null;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Tone 1: D5 (587.33 Hz)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Tone 2: A5 (880.00 Hz)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880.00, now + 0.1);
      gain2.gain.setValueAtTime(0.4, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.55);
    }
  } catch (err) {
    // Silent fallback
  }
}

export enum CategoryKey {
  ADULT_VEG = "adultVeg",
  ADULT_NON_VEG = "adultNonVeg",
  KIDS_VEG = "kidsVeg",
  KIDS_NON_VEG = "kidsNonVeg",
}

export enum SectionType {
  ADULTS = "adults",
  KIDS = "kids",
}

export interface CategoryInfo {
  key: CategoryKey;
  section: SectionType;
  subSection: DietType;
  label: string;
  plannedCount: number;
  servedCount: number;
  remMealCount: number;
  parcelPlannedCount: number;
  parcelServedCount: number;
  remParcelCount: number;
}

export type CategoryInputs = Record<CategoryKey, { parcel: number; dineIn: number }>;

interface QuickCheckoutModalProps {
  visible: boolean;
  subscription: Subscription | null;
  currentMealInfo: {
    dayId: string;
    mealType: MealType;
    dayLabel: string;
    mealLabel: string;
  } | null;
  source?: CheckoutSource | string;
  onClose: () => void;
  onSuccess: () => void;
}

interface SuccessData {
  passId: string;
  block: string;
  flat: string;
  dayLabel: string;
  mealLabel: string;
  categoryDetails: Array<{
    categoryLabel: string;
    dineIn: number;
    parcel: number;
  }>;
  totalPlates: number;
  timestamp: string;
  countsText: string;
  totalsText: string;
}

/**
 * Compact, accessible counter widget for side-by-side Parcel & Dine-In inputs.
 */
function SubsectionCounterWidget({
  label,
  max,
  value,
  disabled,
  onChange,
  accentColor,
  iconName,
}: {
  label: string;
  max: number;
  value: number;
  disabled?: boolean;
  onChange: (val: number) => void;
  accentColor?: string;
  iconName?: keyof typeof Ionicons.glyphMap;
}) {
  const { theme } = useAppTheme();

  return (
    <View style={{ flex: 1, minWidth: 0, flexShrink: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flex: 1, minWidth: 0 }}>
          {iconName && <Ionicons name={iconName} size={12} color={accentColor || theme.colors.textSecondary} />}
          <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.textPrimary }} numberOfLines={1}>
            {label}
          </Text>
        </View>
        <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.primary, flexShrink: 0, marginLeft: 4 }}>
          {UI_TEXT.maxLimit}: {max}
        </Text>
      </View>

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          height: 36,
          backgroundColor: theme.colors.surfaceDark,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.border,
          overflow: "hidden",
        }}
      >
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          disabled={disabled || value <= 0}
          style={({ pressed }) => [
            {
              width: 34,
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.border + "22",
            },
            (disabled || value <= 0) && { opacity: 0.3 },
            pressed && { opacity: 0.7 },
          ]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${UI_TEXT.decrease} ${label}`}
          accessibilityHint={UI_TEXT.decrementsValue?.replace("{label}", label).replace("{value}", String(value))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="remove" size={14} color={theme.colors.textPrimary} />
        </Pressable>

        <TextInput
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "center",
            fontSize: 14,
            fontWeight: "800",
            color: theme.colors.textPrimary,
            padding: 0,
          }}
          value={String(value)}
          onChangeText={(txt) => {
            const clean = txt.replace(/[^0-9]/g, "");
            if (clean === "") {
              onChange(0);
            } else {
              const num = parseInt(clean, 10);
              onChange(Math.max(0, Math.min(max, num)));
            }
          }}
          keyboardType="numeric"
          editable={!disabled}
          selectTextOnFocus
          accessible={true}
          accessibilityLabel={`${label} ${UI_TEXT.quantity}`}
          accessibilityValue={{ min: 0, max, now: value }}
        />

        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          style={({ pressed }) => [
            {
              width: 34,
              height: "100%",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.colors.border + "22",
            },
            (disabled || value >= max) && { opacity: 0.3 },
            pressed && { opacity: 0.7 },
          ]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${UI_TEXT.increase} ${label}`}
          accessibilityHint={UI_TEXT.incrementsValue?.replace("{label}", label).replace("{value}", String(value))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={14} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

export function QuickCheckoutModal({
  visible,
  subscription,
  currentMealInfo,
  source = CheckoutSource.SCANNER,
  onClose,
  onSuccess
}: QuickCheckoutModalProps) {
  const { theme } = useAppTheme();
  const { dayConfig, kidsEnabled, addActivityLog, upsertSubscription, subscriptions, quickCheckoutAutoCloseMs, soundEnabled } = useDatabase();
  const { showAlert } = useUI();
  const { navigate } = useAppNavigation();
  const { width, height } = useWindowDimensions();

  const activeSubscription = useMemo(() => {
    if (!subscription) return null;
    return subscriptions.find(s => s.id === subscription.id) || subscription;
  }, [subscription, subscriptions]);

  const [inputs, setInputs] = useState<CategoryInputs>({
    [CategoryKey.ADULT_VEG]: { parcel: 0, dineIn: 0 },
    [CategoryKey.ADULT_NON_VEG]: { parcel: 0, dineIn: 0 },
    [CategoryKey.KIDS_VEG]: { parcel: 0, dineIn: 0 },
    [CategoryKey.KIDS_NON_VEG]: { parcel: 0, dineIn: 0 },
  });

  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  // Trigger audio sound chime & haptics ONLY when success splash window opens and soundEnabled is ON (explicitly true)
  useEffect(() => {
    if (visible && successData && soundEnabled === true) {
      void playCheckoutSound();
      try {
        Vibration.vibrate([0, 70, 40, 90]);
      } catch (_) {}
    }
  }, [visible, successData, soundEnabled]);

  // Real-Time Meal Lifecycle Checks
  const isStillCurrent = currentMealInfo
    ? isMealCurrent(currentMealInfo.dayId, currentMealInfo.mealType, dayConfig)
    : false;
  const isDone = currentMealInfo
    ? isMealDone(currentMealInfo.dayId, currentMealInfo.mealType, dayConfig)
    : false;

  const alertShownRef = useRef(false);

  // Auto-alert & Redirect to Home Screen when current meal is closed mid-checkout
  useEffect(() => {
    if (visible) {
      const isClosed = !currentMealInfo || !isStillCurrent || isDone;
      if (isClosed && !alertShownRef.current) {
        alertShownRef.current = true;
        showAlert(UI_TEXT.currentMealClosedTitle, UI_TEXT.currentMealClosed, [
          {
            text: UI_TEXT.ok,
            onPress: () => {
              onClose();
              navigate(AppScreen.HOME);
            }
          }
        ]);
      } else if (!isClosed) {
        alertShownRef.current = false;
      }
    } else {
      alertShownRef.current = false;
    }
  }, [visible, isStillCurrent, isDone, currentMealInfo, onClose, navigate, showAlert]);

  // Calculate Category-Wise Quick Checkout limits, summary & partial checkout detection
  const quickCheckoutDetails = useMemo(() => {
    if (!activeSubscription || !currentMealInfo) return null;

    const { dayId, mealType } = currentMealInfo;
    const mealKey = mealType;
    const parcelKey = `${mealType}Parcel`;

    const peopleCount = activeSubscription.peopleCount || 0;
    const kidsCount = kidsEnabled ? (activeSubscription.kidsCount || 0) : 0;
    const headcount = peopleCount + kidsCount;

    const slots = activeSubscription.mealSlots?.[dayId] || [];
    const taken = activeSubscription.takenByPerson?.[dayId] || [];

    const parcelSupported = isParcelEnabled(dayId, mealType, dayConfig);

    const categories: Record<CategoryKey, CategoryInfo> = {
      [CategoryKey.ADULT_VEG]: {
        key: CategoryKey.ADULT_VEG,
        section: SectionType.ADULTS,
        subSection: DietType.VEG,
        label: kidsEnabled ? UI_TEXT.adultVeg : UI_TEXT.memberVeg,
        plannedCount: 0,
        servedCount: 0,
        remMealCount: 0,
        parcelPlannedCount: 0,
        parcelServedCount: 0,
        remParcelCount: 0,
      },
      [CategoryKey.ADULT_NON_VEG]: {
        key: CategoryKey.ADULT_NON_VEG,
        section: SectionType.ADULTS,
        subSection: DietType.NON_VEG,
        label: kidsEnabled ? UI_TEXT.adultNonVeg : UI_TEXT.memberNonVeg,
        plannedCount: 0,
        servedCount: 0,
        remMealCount: 0,
        parcelPlannedCount: 0,
        parcelServedCount: 0,
        remParcelCount: 0,
      },
      [CategoryKey.KIDS_VEG]: {
        key: CategoryKey.KIDS_VEG,
        section: SectionType.KIDS,
        subSection: DietType.VEG,
        label: UI_TEXT.kidsVeg,
        plannedCount: 0,
        servedCount: 0,
        remMealCount: 0,
        parcelPlannedCount: 0,
        parcelServedCount: 0,
        remParcelCount: 0,
      },
      [CategoryKey.KIDS_NON_VEG]: {
        key: CategoryKey.KIDS_NON_VEG,
        section: SectionType.KIDS,
        subSection: DietType.NON_VEG,
        label: UI_TEXT.kidsNonVeg,
        plannedCount: 0,
        servedCount: 0,
        remMealCount: 0,
        parcelPlannedCount: 0,
        parcelServedCount: 0,
        remParcelCount: 0,
      },
    };

    let totalFoodRegistered = 0;
    let totalFoodAlreadyServed = 0;
    let totalParcelPlanned = 0;
    let totalParcelTaken = 0;

    const isVegOnly = isVegOnlyDay(dayId, dayConfig) || !isDietaryEnabled(dayId, mealType, DietType.NON_VEG, dayConfig);
    const isNonVegOnly = !isDietaryEnabled(dayId, mealType, DietType.VEG, dayConfig);

    for (let i = 0; i < headcount; i++) {
      const isKid = kidsEnabled && i >= peopleCount;
      const slot = slots[i];
      const takenRecord = taken[i];

      let choice = slot?.[mealKey];
      if (!choice || choice === DietaryOption.NONE) continue;

      if (isVegOnly) {
        choice = DietaryOption.VEG;
      } else if (isNonVegOnly) {
        choice = DietaryOption.NON_VEG;
      }

      const isVeg = choice === DietaryOption.VEG;
      const catKey = isKid
        ? (isVeg ? CategoryKey.KIDS_VEG : CategoryKey.KIDS_NON_VEG)
        : (isVeg ? CategoryKey.ADULT_VEG : CategoryKey.ADULT_NON_VEG);

      const cat = categories[catKey];
      cat.plannedCount++;
      totalFoodRegistered++;

      const isMealTaken = !!takenRecord?.[mealKey];
      if (isMealTaken) {
        cat.servedCount++;
        totalFoodAlreadyServed++;
      } else {
        cat.remMealCount++;
      }

      if (parcelSupported && slot?.[parcelKey as keyof MealSlot]) {
        cat.parcelPlannedCount++;
        totalParcelPlanned++;

        // A parcel is a meal, so parcel can only be taken if meal itself was taken
        const isParcelTaken = isMealTaken && !!takenRecord?.[parcelKey as keyof TakenState];
        if (isParcelTaken) {
          cat.parcelServedCount++;
          totalParcelTaken++;
        } else if (!isMealTaken) {
          cat.remParcelCount++;
        }
      }
    }

    const totalFoodRemaining = totalFoodRegistered - totalFoodAlreadyServed;
    const totalParcelMax = totalParcelPlanned - totalParcelTaken;
    const isPartialCheckoutEarlier = totalFoodAlreadyServed > 0 && totalFoodRemaining > 0;

    return {
      dayId,
      mealType,
      categories,
      parcelSupported,
      totalFoodRegistered,
      totalFoodAlreadyServed,
      totalFoodRemaining,
      totalParcelPlanned,
      totalParcelTaken,
      totalParcelMax,
      isPartialCheckoutEarlier
    };
  }, [activeSubscription, currentMealInfo, kidsEnabled, dayConfig]);

  // Snapshot initial load partial checkout & parcel pickup state so alerts ONLY show if present PRIOR to opening modal
  const [initialPartialInfo, setInitialPartialInfo] = useState<{
    isPartial: boolean;
    served: number;
    total: number;
    remaining: number;
  } | null>(null);

  const [initialParcelInfo, setInitialParcelInfo] = useState<{
    hasParcelRemaining: boolean;
    parcelMax: number;
    parcelPlanned: number;
  } | null>(null);

  const activePassIdRef = useRef<string | null>(null);

  // Initialize inputs & snapshot initial partial checkout & parcel pickup status ONLY when modal first opens or pass ID changes
  useEffect(() => {
    if (visible && activeSubscription && quickCheckoutDetails) {
      const passId = activeSubscription.id;
      if (activePassIdRef.current !== passId) {
        setInputs({
          [CategoryKey.ADULT_VEG]: { parcel: 0, dineIn: 0 },
          [CategoryKey.ADULT_NON_VEG]: { parcel: 0, dineIn: 0 },
          [CategoryKey.KIDS_VEG]: { parcel: 0, dineIn: 0 },
          [CategoryKey.KIDS_NON_VEG]: { parcel: 0, dineIn: 0 },
        });
        setSuccessData(null);
        activePassIdRef.current = passId;

        // Snapshot initial partial checkout state on modal open
        if (quickCheckoutDetails.isPartialCheckoutEarlier) {
          setInitialPartialInfo({
            isPartial: true,
            served: quickCheckoutDetails.totalFoodAlreadyServed,
            total: quickCheckoutDetails.totalFoodRegistered,
            remaining: quickCheckoutDetails.totalFoodRemaining,
          });
        } else {
          setInitialPartialInfo(null);
        }

        // Snapshot initial parcel pickup state on modal open
        if (quickCheckoutDetails.parcelSupported && quickCheckoutDetails.totalParcelMax > 0) {
          setInitialParcelInfo({
            hasParcelRemaining: true,
            parcelMax: quickCheckoutDetails.totalParcelMax,
            parcelPlanned: quickCheckoutDetails.totalParcelPlanned,
          });
        } else {
          setInitialParcelInfo(null);
        }
      }
    } else if (!visible) {
      activePassIdRef.current = null;
      setInitialPartialInfo(null);
      setInitialParcelInfo(null);
      setSuccessData(null);
    }
  }, [visible, activeSubscription?.id, quickCheckoutDetails]);

  // Animated opacity value for blinking alert banners
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const isBlinkingAlertActive = !!initialPartialInfo?.isPartial || !!initialParcelInfo?.hasParcelRemaining;

  useEffect(() => {
    if (visible && isBlinkingAlertActive) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityAnim, {
            toValue: 0.25,
            duration: 650,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 650,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      opacityAnim.setValue(1);
    }
  }, [visible, isBlinkingAlertActive, opacityAnim]);

  // Auto-clamp inputs state if category limits or subscription status change
  useEffect(() => {
    if (quickCheckoutDetails) {
      setInputs((prev) => {
        let changed = false;
        const nextInputs = { ...prev };

        Object.values(CategoryKey).forEach((catKey) => {
          const cat = quickCheckoutDetails.categories[catKey];
          const currentP = prev[catKey]?.parcel || 0;
          const currentD = prev[catKey]?.dineIn || 0;

          const maxP = cat.remParcelCount;
          const maxMeal = cat.remMealCount;

          const clampedP = Math.max(0, Math.min(maxP, currentP));
          let clampedD = Math.max(0, Math.min(maxMeal, currentD));

          if (clampedP + clampedD > maxMeal) {
            clampedD = Math.max(0, maxMeal - clampedP);
          }

          if (clampedP !== currentP || clampedD !== currentD) {
            nextInputs[catKey] = { parcel: clampedP, dineIn: clampedD };
            changed = true;
          }
        });

        return changed ? nextInputs : prev;
      });
    }
  }, [quickCheckoutDetails]);

  // Interdependence change handlers for Parcel & Dine-In inputs
  const handleParcelChange = (catKey: CategoryKey, newVal: number) => {
    if (!quickCheckoutDetails) return;
    const cat = quickCheckoutDetails.categories[catKey];
    const maxP = cat.remParcelCount;
    const maxMeal = cat.remMealCount;

    const clampedP = Math.max(0, Math.min(maxP, newVal));

    setInputs((prev) => {
      const currDineIn = prev[catKey].dineIn;
      let newDineIn = currDineIn;

      // Summation constraint: P + D <= remMeal
      if (clampedP + currDineIn > maxMeal) {
        newDineIn = Math.max(0, maxMeal - clampedP);
      }

      return {
        ...prev,
        [catKey]: {
          parcel: clampedP,
          dineIn: newDineIn,
        },
      };
    });
  };

  const handleDineInChange = (catKey: CategoryKey, newVal: number) => {
    if (!quickCheckoutDetails) return;
    const cat = quickCheckoutDetails.categories[catKey];
    const maxMeal = cat.remMealCount;

    const clampedD = Math.max(0, Math.min(maxMeal, newVal));

    setInputs((prev) => {
      const currParcel = prev[catKey].parcel;
      let newParcel = currParcel;

      // Summation constraint: P + D <= remMeal
      if (currParcel + clampedD > maxMeal) {
        newParcel = Math.max(0, maxMeal - clampedD);
      }

      return {
        ...prev,
        [catKey]: {
          parcel: newParcel,
          dineIn: clampedD,
        },
      };
    });
  };

  // Filter sections & subsections for rendering (Omits empty subsections and empty sections)
  const sectionsToRender = useMemo(() => {
    if (!quickCheckoutDetails) return [];

    const { categories, parcelSupported } = quickCheckoutDetails;

    const sections: Array<{
      key: SectionType;
      title: string;
      subSections: Array<{
        key: DietType;
        label: string;
        isVeg: boolean;
        categoryInfo: CategoryInfo;
      }>;
    }> = [];

    // 1. Adults / Members Section
    const adultSubSections = [];
    const adultVeg = categories[CategoryKey.ADULT_VEG];
    const adultNonVeg = categories[CategoryKey.ADULT_NON_VEG];

    if (adultVeg.remMealCount > 0 || (parcelSupported && adultVeg.remParcelCount > 0)) {
      adultSubSections.push({
        key: DietType.VEG,
        label: UI_TEXT.vegSubsection,
        isVeg: true,
        categoryInfo: adultVeg,
      });
    }

    if (adultNonVeg.remMealCount > 0 || (parcelSupported && adultNonVeg.remParcelCount > 0)) {
      adultSubSections.push({
        key: DietType.NON_VEG,
        label: UI_TEXT.nonVegSubsection,
        isVeg: false,
        categoryInfo: adultNonVeg,
      });
    }

    if (adultSubSections.length > 0) {
      sections.push({
        key: SectionType.ADULTS,
        title: kidsEnabled ? UI_TEXT.adultsSection : UI_TEXT.membersSection,
        subSections: adultSubSections,
      });
    }

    // 2. Kids Section (Only if kidsEnabled)
    if (kidsEnabled) {
      const kidsSubSections = [];
      const kidsVeg = categories[CategoryKey.KIDS_VEG];
      const kidsNonVeg = categories[CategoryKey.KIDS_NON_VEG];

      if (kidsVeg.remMealCount > 0 || (parcelSupported && kidsVeg.remParcelCount > 0)) {
        kidsSubSections.push({
          key: DietType.VEG,
          label: UI_TEXT.vegSubsection,
          isVeg: true,
          categoryInfo: kidsVeg,
        });
      }

      if (kidsNonVeg.remMealCount > 0 || (parcelSupported && kidsNonVeg.remParcelCount > 0)) {
        kidsSubSections.push({
          key: DietType.NON_VEG,
          label: UI_TEXT.nonVegSubsection,
          isVeg: false,
          categoryInfo: kidsNonVeg,
        });
      }

      if (kidsSubSections.length > 0) {
        sections.push({
          key: SectionType.KIDS,
          title: UI_TEXT.kidsSection,
          subSections: kidsSubSections,
        });
      }
    }

    return sections;
  }, [quickCheckoutDetails, kidsEnabled]);

  const totalSelectedItems = useMemo(() => {
    let count = 0;
    Object.values(inputs).forEach((inp) => {
      count += inp.parcel + inp.dineIn;
    });
    return count;
  }, [inputs]);

  const handleCheckoutSubmit = async () => {
    if (!activeSubscription || !currentMealInfo || !quickCheckoutDetails) return;

    if (!isStillCurrent || isDone) {
      showAlert(UI_TEXT.currentMealClosedTitle, UI_TEXT.currentMealClosed, [
        {
          text: UI_TEXT.ok,
          onPress: () => {
            onClose();
            navigate(AppScreen.HOME);
          }
        }
      ]);
      return;
    }

    const { dayId, mealType } = currentMealInfo;
    const mealKey = mealType;
    const parcelKey = `${mealType}Parcel`;

    const updatedSub: Subscription = JSON.parse(JSON.stringify(activeSubscription));
    const takenList = [...(updatedSub.takenByPerson[dayId] || [])];

    const peopleCount = activeSubscription.peopleCount || 0;
    const kidsCount = kidsEnabled ? (activeSubscription.kidsCount || 0) : 0;
    const headcount = peopleCount + kidsCount;

    const nowTime = formatTakenTime(new Date());
    const timeKey = `${mealKey}Time`;
    const parcelTimeKey = `${parcelKey}Time`;

    const categoryServedDetails: Array<{
      categoryLabel: string;
      dineIn: number;
      parcel: number;
    }> = [];

    let parcelDiscrepancyOccurred = false;

    // Process each of the 4 categories
    const categoryOrder = [
      CategoryKey.ADULT_VEG,
      CategoryKey.ADULT_NON_VEG,
      CategoryKey.KIDS_VEG,
      CategoryKey.KIDS_NON_VEG,
    ];

    const isVegOnly = isVegOnlyDay(dayId, dayConfig) || !isDietaryEnabled(dayId, mealType, DietType.NON_VEG, dayConfig);
    const isNonVegOnly = !isDietaryEnabled(dayId, mealType, DietType.VEG, dayConfig);

    for (const catKey of categoryOrder) {
      const cat = quickCheckoutDetails.categories[catKey];
      const rawP = inputs[catKey]?.parcel || 0;
      const rawD = inputs[catKey]?.dineIn || 0;

      // Mathematical invariant protection:
      // 1. Parcel taken <= remaining parcel subscribed for category
      const safeParcelInput = Math.max(0, Math.min(cat.remParcelCount, rawP));
      // 2. Dine-In taken <= remaining meal subscribed for category
      let safeDineInInput = Math.max(0, Math.min(cat.remMealCount, rawD));
      // 3. Dine-In + Parcel <= remaining meal subscribed for category
      if (safeParcelInput + safeDineInInput > cat.remMealCount) {
        safeDineInInput = Math.max(0, cat.remMealCount - safeParcelInput);
      }

      if (safeParcelInput === 0 && safeDineInInput === 0) continue;

      categoryServedDetails.push({
        categoryLabel: cat.label,
        dineIn: safeDineInInput,
        parcel: safeParcelInput,
      });

      let remParcelToAllocate = safeParcelInput;
      let remDineInToAllocate = safeDineInInput;

      const isKidCategory = cat.section === SectionType.KIDS;
      const isVegCategory = cat.subSection === DietType.VEG;

      // Helper to test if slot index i belongs to this category
      const isSlotInCat = (i: number) => {
        const isKidSlot = kidsEnabled && i >= peopleCount;
        if (isKidCategory !== isKidSlot) return false;

        let choice = updatedSub.mealSlots[dayId]?.[i]?.[mealKey];
        if (!choice || choice === DietaryOption.NONE) return false;

        if (isVegOnly) {
          choice = DietaryOption.VEG;
        } else if (isNonVegOnly) {
          choice = DietaryOption.NON_VEG;
        }

        const isVegSlot = choice === DietaryOption.VEG;
        return isVegSlot === isVegCategory;
      };

      // Step 1: Allocate Parcel inputs ONLY to slots in this category where slot opted for parcel & parcel/meal pending
      if (remParcelToAllocate > 0) {
        for (let i = 0; i < headcount; i++) {
          if (remParcelToAllocate <= 0) break;
          if (!isSlotInCat(i)) continue;

          const isMealUnserved = !takenList[i]?.[mealKey];
          const hasParcelOpted = updatedSub.mealSlots[dayId]?.[i]?.[parcelKey as keyof MealSlot] === true;
          const isParcelUnserved = !takenList[i]?.[parcelKey as keyof TakenState];

          if (isMealUnserved && hasParcelOpted && isParcelUnserved) {
            takenList[i] = {
              ...takenList[i],
              [mealKey]: true,
              [timeKey]: nowTime,
              [parcelKey]: true,
              [parcelTimeKey]: nowTime,
            };
            remParcelToAllocate--;
          }
        }
      }

      // Step 2: Allocate Dine-In inputs to remaining unserved slots in this category
      if (remDineInToAllocate > 0) {
        // Priority 1: Unserved slots that did NOT opt for parcel
        for (let i = 0; i < headcount; i++) {
          if (remDineInToAllocate <= 0) break;
          if (!isSlotInCat(i)) continue;

          const isMealUnserved = !takenList[i]?.[mealKey];
          const hasParcelOpted = updatedSub.mealSlots[dayId]?.[i]?.[parcelKey as keyof MealSlot] === true;

          if (isMealUnserved && !hasParcelOpted) {
            takenList[i] = {
              ...takenList[i],
              [mealKey]: true,
              [timeKey]: nowTime,
              [parcelKey]: false,
            };
            remDineInToAllocate--;
          }
        }

        // Priority 2: Unserved slots that DID opt for parcel (marks meal served, explicitly setting parcel taken false -> creates missed parcel condition)
        if (remDineInToAllocate > 0) {
          for (let i = 0; i < headcount; i++) {
            if (remDineInToAllocate <= 0) break;
            if (!isSlotInCat(i)) continue;

            const isMealUnserved = !takenList[i]?.[mealKey];
            if (isMealUnserved) {
              takenList[i] = {
                ...takenList[i],
                [mealKey]: true,
                [timeKey]: nowTime,
                [parcelKey]: false,
              };
              remDineInToAllocate--;
            }
          }
        }
      }

      // Step 3: Check Parcel Discrepancy rule for this category
      // Rule: "If during checkout Dine-In + Parcel = remMealCount for category and still in some parcel opted meal parcel taken has not been marked true but food taken marked true - it mean less parcel has gone than expected"
      const catTotalCheckout = safeParcelInput + safeDineInInput;
      if (catTotalCheckout === cat.remMealCount && cat.remMealCount > 0) {
        let hasUncollectedParcelForServedMeal = false;
        for (let i = 0; i < headcount; i++) {
          if (!isSlotInCat(i)) continue;
          const isFoodTaken = !!takenList[i]?.[mealKey];
          const hasParcelOpted = updatedSub.mealSlots[dayId]?.[i]?.[parcelKey as keyof MealSlot] === true;
          const isParcelTaken = !!takenList[i]?.[parcelKey as keyof TakenState];

          if (isFoodTaken && hasParcelOpted && !isParcelTaken) {
            hasUncollectedParcelForServedMeal = true;
            break;
          }
        }

        if (hasUncollectedParcelForServedMeal) {
          parcelDiscrepancyOccurred = true;
        }
      }
    }

    updatedSub.takenByPerson[dayId] = takenList;
    await upsertSubscription(updatedSub);

    // Build transaction log text & success summary strings
    const countsParts: string[] = [];
    categoryServedDetails.forEach((d) => {
      const items: string[] = [];
      if (d.dineIn > 0) {
        const plateStr = d.dineIn === 1 ? UI_TEXT.plateSingular : UI_TEXT.plates;
        items.push(`${d.dineIn} ${plateStr}`);
      }
      if (d.parcel > 0) {
        const parcelStr = d.parcel === 1 ? UI_TEXT.parcelSingular : UI_TEXT.parcels;
        items.push(`${d.parcel} ${parcelStr}`);
      }
      countsParts.push(`${d.categoryLabel}: ${items.join(", ")}`);
    });

    let newAdultsTaken = 0;
    let newKidsTaken = 0;
    let newParcelsTaken = 0;

    for (let i = 0; i < headcount; i++) {
      const isKid = kidsEnabled && i >= peopleCount;
      const isSubscribed = updatedSub.mealSlots[dayId]?.[i]?.[mealKey] !== DietaryOption.NONE;
      const isFoodTaken = !!takenList[i]?.[mealKey];

      if (isSubscribed && isFoodTaken) {
        if (!isKid) newAdultsTaken++;
        else newKidsTaken++;
      }

      if (
        quickCheckoutDetails.parcelSupported &&
        updatedSub.mealSlots[dayId]?.[i]?.[parcelKey as keyof MealSlot] === true
      ) {
        if (takenList[i]?.[mealKey as keyof TakenState] === true && takenList[i]?.[parcelKey as keyof TakenState] === true) {
          newParcelsTaken++;
        }
      }
    }

    const totalsParts: string[] = [];
    if (kidsEnabled) {
      let adultsPlanned = 0;
      let kidsPlanned = 0;
      Object.values(quickCheckoutDetails.categories).forEach((cat) => {
        if (cat.section === SectionType.ADULTS) adultsPlanned += cat.plannedCount;
        if (cat.section === SectionType.KIDS) kidsPlanned += cat.plannedCount;
      });
      if (adultsPlanned > 0) totalsParts.push(`${UI_TEXT.adults}: ${newAdultsTaken}/${adultsPlanned}`);
      if (kidsPlanned > 0) totalsParts.push(`${UI_TEXT.kids}: ${newKidsTaken}/${kidsPlanned}`);
    } else {
      let totalPlanned = 0;
      Object.values(quickCheckoutDetails.categories).forEach((cat) => {
        totalPlanned += cat.plannedCount;
      });
      if (totalPlanned > 0) totalsParts.push(`${UI_TEXT.members}: ${newAdultsTaken}/${totalPlanned}`);
    }

    if (quickCheckoutDetails.parcelSupported && quickCheckoutDetails.totalParcelPlanned > 0) {
      const parcelUnit = quickCheckoutDetails.totalParcelPlanned === 1 ? UI_TEXT.parcelSingular : UI_TEXT.parcels;
      totalsParts.push(`${parcelUnit}: ${newParcelsTaken}/${quickCheckoutDetails.totalParcelPlanned}`);
    }

    addActivityLog({
      module: ActivityModule.SCANNER,
      action: ActivityAction.UPDATE,
      targetId: activeSubscription.id,
      description: UI_TEXT.logQuickCheckout
        .replace("{flatId}", activeSubscription.id)
        .replace("{source}", source || CheckoutSource.SCANNER)
        .replace("{meal}", getMealLabel(mealType))
        .replace("{counts}", countsParts.join(" | "))
        .replace("{totals}", totalsParts.join(", ")),
    });

    if (parcelDiscrepancyOccurred) {
      addActivityLog({
        module: ActivityModule.SUBSCRIPTION,
        action: ActivityAction.MISSED_PARCEL,
        targetId: activeSubscription.id,
        description: UI_TEXT.logMissedParcel
          .replace("{flatId}", activeSubscription.id)
          .replace("{meal}", getMealLabel(mealType)),
      });
    }

    AccessibilityInfo.announceForAccessibility(
      UI_TEXT.checkoutSuccessAnnounce.replace("{flatNo}", activeSubscription.flat || activeSubscription.id)
    );

    const totalPlatesServedInTx = totalSelectedItems;

    setSuccessData({
      passId: activeSubscription.id,
      block: activeSubscription.block || "",
      flat: activeSubscription.flat || activeSubscription.id,
      dayLabel: currentMealInfo.dayLabel,
      mealLabel: currentMealInfo.mealLabel,
      categoryDetails: categoryServedDetails,
      totalPlates: totalPlatesServedInTx,
      timestamp: nowTime,
      countsText: countsParts.join(" | "),
      totalsText: totalsParts.join(" | "),
    });

    const autoCloseDuration = quickCheckoutAutoCloseMs ?? 3000;

    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setSuccessData(null);
      onSuccess();
      onClose();
    }, autoCloseDuration);
  };

  const isCheckoutDisabled = totalSelectedItems === 0 || !isStillCurrent || isDone;
  const cardMaxWidth = Math.min(width * 0.94, 500);
  const maxCardHeight = Math.min(height * 0.88, 620);

  // Full-Height Theme-Driven Success Overlay Window (Works on Mobile & Web)
  if (visible && successData) {
    const successA11yLabel = `${UI_TEXT.checkoutSuccessful}. ${UI_TEXT.block} ${successData.block} ${UI_TEXT.flatUpper} ${successData.flat}. ${successData.mealLabel}. ${UI_TEXT.served} ${successData.countsText}. ${UI_TEXT.total} ${successData.totalPlates} ${successData.totalPlates === 1 ? UI_TEXT.plateSingular : UI_TEXT.plates}. ${successData.timestamp}.`;

    return (
      <Modal
        visible={visible}
        transparent={false}
        animationType="fade"
        onRequestClose={() => {
          if (successTimerRef.current) clearTimeout(successTimerRef.current);
          setSuccessData(null);
          onSuccess();
          onClose();
        }}
      >
        <View
          accessibilityViewIsModal={true}
          accessibilityRole="alert"
          accessibilityLiveRegion="assertive"
          accessible={true}
          accessibilityLabel={successA11yLabel}
          style={{
            flex: 1,
            width: "100%",
            height: "100%",
            backgroundColor: theme.colors.successLight,
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <ScrollView
            style={{ width: "100%", flex: 1 }}
            contentContainerStyle={{
              flexGrow: 1,
              alignItems: "center",
              justifyContent: "center",
              paddingVertical: 24,
              width: "100%",
            }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Theme-Driven Glowing Green Checkmark Badge */}
            <View
              style={[
                {
                  width: 96,
                  height: 96,
                  borderRadius: 48,
                  backgroundColor: theme.colors.success,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 18,
                  borderWidth: 4,
                  borderColor: theme.colors.surface,
                },
                Platform.select({
                  ios: {
                    shadowColor: theme.colors.success,
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.4,
                    shadowRadius: 12,
                  },
                  android: { elevation: 8 },
                  default: {
                    boxShadow: `0px 6px 20px ${theme.colors.success}66`,
                  },
                }),
              ]}
            >
              <Ionicons name="checkmark-done" size={62} color={theme.colors.white} />
            </View>

            <Text
              style={{
                fontSize: 26,
                fontWeight: "900",
                color: theme.colors.success,
                textAlign: "center",
                letterSpacing: 1.2,
                textTransform: "uppercase",
              }}
            >
              {UI_TEXT.checkoutSuccessful}
            </Text>

            <View style={{ height: 2, backgroundColor: theme.colors.success, width: 80, marginVertical: 18, opacity: 0.4 }} />

            {/* Complete Checkout Details Card */}
            <View
              style={[
                {
                  width: "100%",
                  maxWidth: cardMaxWidth,
                  backgroundColor: theme.colors.surface,
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 2,
                  borderColor: theme.colors.success,
                  gap: 12,
                },
                Platform.select({
                  ios: {
                    shadowColor: theme.colors.shadow,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.15,
                    shadowRadius: 8,
                  },
                  android: { elevation: 4 },
                  default: {
                    boxShadow: `0px 4px 16px ${theme.colors.shadow}22`,
                  },
                }),
              ]}
            >
              {/* Resident Pass / Block & Flat */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {UI_TEXT.flatUpper}
                </Text>
                <Text style={{ fontSize: 22, fontWeight: "900", color: theme.colors.textPrimary }}>
                  {UI_TEXT.block} {successData.block} - {UI_TEXT.flatUpper} {successData.flat}
                </Text>
              </View>

              {/* Meal & Day */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {UI_TEXT.meal}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "800", color: theme.colors.textPrimary }}>
                  {successData.dayLabel} - {successData.mealLabel}
                </Text>
              </View>

              {/* Served Category Items Breakdown */}
              <View style={{ gap: 6 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {UI_TEXT.served}
                </Text>

                {successData.categoryDetails.map((item, idx) => {
                  const parts: string[] = [];
                  if (item.dineIn > 0) {
                    const plateStr = item.dineIn === 1 ? UI_TEXT.plateSingular : UI_TEXT.plates;
                    parts.push(`${item.dineIn} ${plateStr}`);
                  }
                  if (item.parcel > 0) {
                    const parcelStr = item.parcel === 1 ? UI_TEXT.parcelSingular : UI_TEXT.parcels;
                    parts.push(`${item.parcel} ${parcelStr}`);
                  }

                  return (
                    <View
                      key={idx}
                      style={{
                        flexDirection: "row",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: theme.colors.surfaceDark,
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                      }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary }}>
                        {item.categoryLabel}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.success }}>
                        {parts.join(", ")}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Total Plates */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {UI_TEXT.total}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.success }}>
                  {successData.totalPlates} {(successData.totalPlates === 1 ? UI_TEXT.plateSingular : UI_TEXT.plates).toUpperCase()}
                </Text>
              </View>

              {/* Overall Progress Totals */}
              {successData.totalsText ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {UI_TEXT.overallStatus}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.textSecondary }}>
                    {successData.totalsText}
                  </Text>
                </View>
              ) : null}

              {/* Timestamp */}
              <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 4 }} />
              <View style={{ flexDirection: "row", justifyContent: "center", alignItems: "center", gap: 6 }}>
                <Ionicons name="time-outline" size={16} color={theme.colors.textMuted} />
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.textMuted }}>
                  {successData.timestamp}
                </Text>
              </View>

              {/* Done / Dismiss Button */}
              <Pressable
                onPress={() => {
                  if (successTimerRef.current) clearTimeout(successTimerRef.current);
                  setSuccessData(null);
                  onSuccess();
                  onClose();
                }}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.ok}
                style={({ pressed }) => [
                  {
                    marginTop: 6,
                    height: 42,
                    borderRadius: 12,
                    backgroundColor: theme.colors.success,
                    alignItems: "center",
                    justifyContent: "center",
                    flexDirection: "row",
                    gap: 6,
                  },
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
                ]}
              >
                <Ionicons name="checkmark-circle" size={18} color={theme.colors.white} />
                <Text style={{ fontSize: 14, fontWeight: "900", color: theme.colors.white }}>
                  {UI_TEXT.ok}
                </Text>
              </Pressable>
            </View>
          </ScrollView>
        </View>
      </Modal>
    );
  }

  const showParcelAlert = !!(initialParcelInfo && initialParcelInfo.hasParcelRemaining);
  const showPartialAlert = !!(initialPartialInfo && initialPartialInfo.isPartial);

  return (
    <Modal
      visible={visible && !!subscription}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        accessibilityViewIsModal={true}
        style={{
          flex: 1,
          backgroundColor: theme.colors.shadow + "CC",
          justifyContent: "center",
          alignItems: "center",
          padding: 12
        }}
      >
        <View
          accessible={true}
          accessibilityLabel={UI_TEXT.quickCheckoutForFlat.replace("{flatNo}", activeSubscription?.flat || activeSubscription?.id || "")}
          style={{
            width: "100%",
            maxWidth: cardMaxWidth,
            maxHeight: maxCardHeight,
            backgroundColor: theme.colors.surface,
            borderRadius: 20,
            padding: 14,
            borderWidth: 1,
            borderColor: theme.colors.border,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
            ...Platform.select({
              ios: {
                shadowColor: theme.colors.shadow,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8
              },
              android: { elevation: 8 },
              web: { boxShadow: `0 4px 16px ${theme.colors.shadow}66` }
            })
          }}
        >
          {/* Main Scrollable Content */}
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ gap: 10, paddingBottom: 6 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >
            {/* Header Title */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, fontWeight: "900", color: theme.colors.textPrimary }}>
                  {UI_TEXT.quickCheckout}
                </Text>
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.primary, marginTop: 1 }}>
                  {UI_TEXT.pass}{UI_TEXT.space}{subscription?.id}
                </Text>
              </View>

              <Pressable
                onPress={onClose}
                accessibilityLabel={UI_TEXT.close}
                style={({ pressed }) => [
                  {
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    backgroundColor: theme.colors.surfaceDark,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons name="close" size={20} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            {/* Consolidated Banners (Compact & Combined when both alerts are present) */}
            {showParcelAlert && showPartialAlert ? (
              <Animated.View
                style={{
                  opacity: opacityAnim,
                  backgroundColor: theme.colors.warningLight,
                  borderColor: theme.colors.warning,
                  borderWidth: 1.5,
                  borderRadius: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  gap: 4,
                }}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="warning-outline" size={18} color={theme.colors.warning} />
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "900",
                      color: theme.themeType === AppThemeMode.DARK ? theme.colors.warning : theme.colors.textPrimary,
                    }}
                  >
                    {UI_TEXT.importantReminders}
                  </Text>
                </View>
                <View style={{ gap: 2, paddingLeft: 22 }}>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: theme.themeType === AppThemeMode.DARK ? theme.colors.secondary : theme.colors.textPrimary, lineHeight: 15 }}>
                    • {UI_TEXT.parcelPickupAlert.replace("{count}", String(initialParcelInfo!.parcelMax))}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: theme.themeType === AppThemeMode.DARK ? theme.colors.warning : theme.colors.textPrimary, lineHeight: 15 }}>
                    • {UI_TEXT.partialCheckoutAlert
                      .replace("{served}", String(initialPartialInfo!.served))
                      .replace("{total}", String(initialPartialInfo!.total))
                      .replace("{remaining}", String(initialPartialInfo!.remaining))}
                  </Text>
                </View>
              </Animated.View>
            ) : showParcelAlert ? (
              <Animated.View
                style={{
                  opacity: opacityAnim,
                  backgroundColor: theme.colors.warningLight,
                  borderColor: theme.colors.secondary,
                  borderWidth: 1.5,
                  borderRadius: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="cube-outline" size={18} color={theme.colors.secondary} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 11,
                    fontWeight: "800",
                    color: theme.themeType === AppThemeMode.DARK ? theme.colors.secondary : theme.colors.textPrimary,
                    lineHeight: 15,
                  }}
                >
                  {UI_TEXT.parcelPickupAlert.replace("{count}", String(initialParcelInfo!.parcelMax))}
                </Text>
              </Animated.View>
            ) : showPartialAlert ? (
              <Animated.View
                style={{
                  opacity: opacityAnim,
                  backgroundColor: theme.colors.warningLight,
                  borderColor: theme.colors.warning,
                  borderWidth: 1.5,
                  borderRadius: 12,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <Ionicons name="warning-outline" size={18} color={theme.colors.warning} />
                <Text
                  style={{
                    flex: 1,
                    fontSize: 11,
                    fontWeight: "800",
                    color: theme.themeType === AppThemeMode.DARK ? theme.colors.warning : theme.colors.textPrimary,
                    lineHeight: 15,
                  }}
                >
                  {UI_TEXT.partialCheckoutAlert
                    .replace("{served}", String(initialPartialInfo!.served))
                    .replace("{total}", String(initialPartialInfo!.total))
                    .replace("{remaining}", String(initialPartialInfo!.remaining))}
                </Text>
              </Animated.View>
            ) : null}

            {/* Operational Summary Box */}
            {quickCheckoutDetails && currentMealInfo && (
              <View style={{
                padding: 10,
                borderRadius: 14,
                backgroundColor: (isStillCurrent && !isDone) ? theme.colors.primary : theme.colors.textMuted,
                borderColor: (isStillCurrent && !isDone) ? theme.colors.primary : theme.colors.textMuted,
                borderWidth: 1,
                gap: 5,
                ...Platform.select({
                  ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.25,
                    shadowRadius: 6,
                  },
                  android: { elevation: 3 },
                  web: { boxShadow: `0 3px 10px ${theme.colors.primary}33` }
                })
              }}>
                {/* Heading: Saptami - Lunch */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                    <Ionicons name="restaurant" size={15} color={theme.colors.white} />
                    <Text style={{ fontSize: 12, fontWeight: "900", color: theme.colors.white, textTransform: "uppercase", letterSpacing: 0.8, flex: 1 }} numberOfLines={1}>
                      {currentMealInfo.dayLabel}{UI_TEXT.space}{UI_TEXT.hyphen}{UI_TEXT.space}{currentMealInfo.mealLabel}
                    </Text>
                  </View>

                  <View style={{ backgroundColor: theme.colors.white + "33", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, flexShrink: 0 }}>
                    <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.white }}>
                      {(isStillCurrent && !isDone) ? UI_TEXT.live.toUpperCase() : (isDone ? UI_TEXT.mealDoneLabel.toUpperCase() : UI_TEXT.disabledLabel.toUpperCase())}
                    </Text>
                  </View>
                </View>

                {/* Headcount Breakdown */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.white }}>
                    {(() => {
                      if (!subscription) return "";
                      if (kidsEnabled) {
                        const adults = subscription.peopleCount || 0;
                        const kids = subscription.kidsCount || 0;
                        const adultLabel = adults === 1 ? UI_TEXT.adult : UI_TEXT.adults;
                        const adultStr = `${adults} ${adultLabel}`;
                        if (kids > 0) {
                          const kidLabel = kids === 1 ? UI_TEXT.kid : UI_TEXT.kids;
                          return `${adultStr}, ${kids} ${kidLabel}`;
                        }
                        return adultStr;
                      } else {
                        const total = (subscription.peopleCount || 0) + (subscription.kidsCount || 0);
                        const memberLabel = total === 1 ? UI_TEXT.generalMember : UI_TEXT.generalMembers;
                        return `${total} ${memberLabel}`;
                      }
                    })()}
                  </Text>

                  <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.white, opacity: 0.9 }}>
                    {quickCheckoutDetails.totalFoodRegistered} {UI_TEXT.planned.toLowerCase()}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2, marginVertical: 1 }} />

                {/* Food Demand & Serving Status */}
                <View style={{ gap: 2 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.white }}>
                      {UI_TEXT.food}{UI_TEXT.colon}{UI_TEXT.space}
                      {UI_TEXT.planned}{UI_TEXT.space}{quickCheckoutDetails.totalFoodRegistered}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.white, opacity: 0.85 }}>
                      ({UI_TEXT.served}{UI_TEXT.colon}{UI_TEXT.space}{quickCheckoutDetails.totalFoodAlreadyServed}{UI_TEXT.comma}{UI_TEXT.space}{UI_TEXT.pending}{UI_TEXT.colon}{UI_TEXT.space}{quickCheckoutDetails.totalFoodRemaining})
                    </Text>
                  </View>

                  {/* Parcel Demand & Serving Status */}
                  {quickCheckoutDetails.parcelSupported && quickCheckoutDetails.totalParcelPlanned > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.white }}>
                        {UI_TEXT.parcels}{UI_TEXT.colon}{UI_TEXT.space}
                        {UI_TEXT.planned}{UI_TEXT.space}{quickCheckoutDetails.totalParcelPlanned}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.white, opacity: 0.85 }}>
                        ({UI_TEXT.served}{UI_TEXT.colon}{UI_TEXT.space}{quickCheckoutDetails.totalParcelTaken}{UI_TEXT.comma}{UI_TEXT.space}{UI_TEXT.pending}{UI_TEXT.colon}{UI_TEXT.space}{quickCheckoutDetails.totalParcelMax})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Sections & Subsections Counter Input Cards */}
            {quickCheckoutDetails && (
              <View style={{ gap: 10 }}>
                {sectionsToRender.map((section) => (
                  <View
                    key={section.key}
                    style={{
                      padding: 10,
                      borderRadius: 14,
                      backgroundColor: theme.cardColors[2].accentLight,
                      borderColor: theme.cardColors[2].border,
                      borderWidth: 1.5,
                      gap: 8,
                    }}
                  >
                    {/* Section Header */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                      <Ionicons
                        name={section.key === SectionType.ADULTS ? "people" : "happy"}
                        size={16}
                        color={theme.cardColors[2].accent}
                      />
                      <Text
                        style={{
                          fontSize: 12,
                          fontWeight: "900",
                          color: theme.cardColors[2].accent,
                          textTransform: "uppercase",
                          letterSpacing: 0.6,
                        }}
                      >
                        {section.title}
                      </Text>
                    </View>

                    {/* Subsections (Veg / Non-Veg) */}
                    {section.subSections.map((sub) => {
                      const cat = sub.categoryInfo;
                      const catInputs = inputs[cat.key];

                      return (
                        <View key={sub.key} style={{ gap: 4 }}>
                          {/* Subsection Badge / Label */}
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <View
                              style={{
                                backgroundColor: sub.isVeg ? theme.colors.success + "22" : theme.colors.error + "22",
                                paddingHorizontal: 6,
                                paddingVertical: 2,
                                borderRadius: 4,
                                borderWidth: 1,
                                borderColor: sub.isVeg ? theme.colors.success : theme.colors.error,
                              }}
                            >
                              <Text
                                style={{
                                  fontSize: 10,
                                  fontWeight: "900",
                                  color: sub.isVeg ? theme.colors.success : theme.colors.error,
                                }}
                              >
                                {sub.label}
                              </Text>
                            </View>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary }}>
                              ({UI_TEXT.pending}: {cat.remMealCount} {UI_TEXT.plates.toLowerCase()}
                              {quickCheckoutDetails.parcelSupported && cat.remParcelCount > 0 ? `, ${cat.remParcelCount} ${UI_TEXT.parcels.toLowerCase()}` : ""})
                            </Text>
                          </View>

                          {/* Side-by-side Counter Input Row */}
                          <View style={{ flexDirection: "row", gap: 8, marginTop: 2, width: "100%" }}>
                            {quickCheckoutDetails.parcelSupported && cat.remParcelCount > 0 && (
                              <SubsectionCounterWidget
                                label={UI_TEXT.parcels}
                                max={cat.remParcelCount}
                                value={catInputs.parcel}
                                disabled={!isStillCurrent || isDone}
                                onChange={(val) => handleParcelChange(cat.key, val)}
                                accentColor={theme.colors.secondary}
                                iconName="cube-outline"
                              />
                            )}
                            {cat.remMealCount > 0 && (
                              <SubsectionCounterWidget
                                label={UI_TEXT.dineIn}
                                max={cat.remMealCount}
                                value={catInputs.dineIn}
                                disabled={!isStillCurrent || isDone}
                                onChange={(val) => handleDineInChange(cat.key, val)}
                                accentColor={theme.colors.primary}
                                iconName="restaurant-outline"
                              />
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                ))}

                {/* If ALL categories have 0 remaining meals */}
                {sectionsToRender.length === 0 && (
                  <View
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      backgroundColor: theme.colors.surfaceDark,
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <Ionicons name="checkmark-done-circle-outline" size={36} color={theme.colors.success} />
                    <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary, textAlign: "center" }}>
                      {UI_TEXT.quickCheckoutAllServed}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* Action Buttons Row (Pinned at bottom of modal container for guaranteed viewport visibility) */}
          <View style={[modalStyles.actionRow, { borderTopColor: theme.colors.border }]}>
            <Pressable
              onPress={onClose}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.close}
              accessibilityHint={UI_TEXT.close}
              style={({ pressed }) => [
                modalStyles.cancelButton,
                {
                  backgroundColor: theme.colors.surfaceDark,
                  borderColor: theme.colors.border,
                },
                pressed && { opacity: 0.75, transform: [{ scale: 0.98 }] }
              ]}
            >
              <Text style={[modalStyles.cancelText, { color: theme.colors.textPrimary }]}>
                {UI_TEXT.close}
              </Text>
            </Pressable>

            <Pressable
              onPress={handleCheckoutSubmit}
              disabled={isCheckoutDisabled}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.checkout}
              accessibilityState={{ disabled: isCheckoutDisabled }}
              style={({ pressed }) => [
                modalStyles.checkoutButton,
                {
                  backgroundColor: isCheckoutDisabled ? theme.colors.border : theme.colors.primary,
                },
                !isCheckoutDisabled && Platform.select({
                  ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                  },
                  android: { elevation: 4 },
                  web: { boxShadow: `0 4px 12px ${theme.colors.primary}40` }
                }),
                pressed && !isCheckoutDisabled && { opacity: 0.85, transform: [{ scale: 0.98 }] }
              ]}
            >
              <Ionicons
                name="checkmark-circle-outline"
                size={18}
                color={isCheckoutDisabled ? theme.colors.textMuted : theme.colors.white}
              />
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                style={[
                  modalStyles.checkoutText,
                  { color: isCheckoutDisabled ? theme.colors.textMuted : theme.colors.white }
                ]}
              >
                {UI_TEXT.checkout}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const modalStyles = StyleSheet.create({
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
  },
  cancelButton: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  cancelText: {
    fontSize: 14,
    fontWeight: "800",
  },
  checkoutButton: {
    flex: 1.4,
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  checkoutText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
