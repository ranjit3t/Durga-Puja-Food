import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Platform, Modal, ScrollView, useWindowDimensions, Animated, AccessibilityInfo, Vibration, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { useDatabase } from "../../context/DatabaseContext";
import { useUI } from "../../context/UIContext";
import { useAppNavigation } from "../../context/NavigationContext";
import { useChat } from "../../context/ChatContext";
import { Subscription, MealType, DietaryOption, DietType, normalizeChoice, toBool, ActivityModule, ActivityAction, AppThemeMode, AppScreen, TakenState, CheckoutSource, MealSlot } from "../../types";
import { isParcelEnabled, isKidsParcelEnabled, isDineInFallbackParcelEnabled, isMealCurrent, isMealDone, getMealLabel, formatTakenTime, isVegOnlyDay, isDietaryEnabled, isMealEnabled, getValidSlotChoice, isParcelValidForSlot, getMealVarieties, getVarietyForChoice, getDietTypeForChoice, isSpecialMeal } from "../../constants";
import { QuickCheckoutHeader } from "../../features/checkout/components/QuickCheckoutHeader";
import { QuickCheckoutItemCard } from "../../features/checkout/components/QuickCheckoutItemCard";

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

export enum SectionType {
  ADULTS = "adults",
  KIDS = "kids",
}

export interface CategoryInfo {
  key: string;
  varietyId?: string;
  varietyName?: string;
  varietyColor?: string;
  section: SectionType;
  subSection: DietType;
  label: string;
  plannedCount: number;
  servedCount: number;
  remMealCount: number;
  parcelPlannedCount: number;
  parcelServedCount: number;
  remParcelCount: number;
  dineInPlannedCount: number;
  dineInServedCount: number;
  remDineInCount: number;
}

export type CategoryInputs = Record<string, { parcel: number; dineIn: number }>;

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
    varietyColor?: string;
    dineIn: number;
    parcel: number;
  }>;
  totalPlates: number;
  timestamp: string;
  countsText: string;
  totalsText: string;
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
  const { registerModalOpen, unregisterModalOpen } = useChat();

  useEffect(() => {
    if (visible) {
      registerModalOpen("quick_checkout");
      return () => unregisterModalOpen("quick_checkout");
    }
  }, [visible, registerModalOpen, unregisterModalOpen]);

  const activeSubscription = useMemo(() => {
    if (!subscription) return null;
    return subscriptions.find(s => s.id === subscription.id) || subscription;
  }, [subscription, subscriptions]);

  const isSpecial = currentMealInfo ? isSpecialMeal(currentMealInfo.dayId, currentMealInfo.mealType, dayConfig) : false;

  const [inputs, setInputs] = useState<CategoryInputs>({});

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
    if (!isMealEnabled(dayId, mealType, dayConfig)) return null;

    const mealKey = mealType;
    const parcelKey = `${mealType}Parcel`;

    const peopleCount = activeSubscription.peopleCount || 0;
    const kidsCount = kidsEnabled ? (activeSubscription.kidsCount || 0) : 0;
    const headcount = peopleCount + kidsCount;

    const slots = activeSubscription.mealSlots?.[dayId] || [];
    const taken = activeSubscription.takenByPerson?.[dayId] || [];

    const parcelSupported = isParcelEnabled(dayId, mealType, dayConfig);

    const dayConf = (dayConfig || []).find((d) => d.id === dayId);
    const mConf = dayConf ? dayConf[mealType] : undefined;
    const varieties = getMealVarieties(mConf);

    const categories: Record<string, CategoryInfo> = {};

    let totalFoodRegistered = 0;
    let totalFoodAlreadyServed = 0;
    let totalParcelPlanned = 0;
    let totalParcelTaken = 0;

    for (let i = 0; i < headcount; i++) {
      const isKid = kidsEnabled && i >= peopleCount;
      const slot = slots[i];
      const takenRecord = taken[i];

      const choice = getValidSlotChoice(dayId, mealType, slot?.[mealKey], dayConfig);
      if (choice === DietaryOption.NONE) continue;

      const variety = getVarietyForChoice(choice, varieties);
      const diet = getDietTypeForChoice(choice, varieties) || DietType.VEG;

      const varId = variety ? variety.id : (choice === DietaryOption.NON_VEG ? "nonVeg_default" : "veg_default");
      const varName = variety ? variety.name : (choice === DietaryOption.NON_VEG ? "Non-Veg" : "Veg");
      const varColor = variety?.color || (diet === DietType.VEG ? theme.colors.veg : theme.colors.nonVeg);

      const catKey = `${isKid ? "kids" : "adult"}_${varId}`;

      if (!categories[catKey]) {
        categories[catKey] = {
          key: catKey,
          varietyId: varId,
          varietyName: varName,
          varietyColor: varColor,
          section: isKid ? SectionType.KIDS : SectionType.ADULTS,
          subSection: diet,
          label: `${varName}${kidsEnabled ? (isKid ? " (Kid)" : " (Adult)") : ""}`,
          plannedCount: 0,
          servedCount: 0,
          remMealCount: 0,
          parcelPlannedCount: 0,
          parcelServedCount: 0,
          remParcelCount: 0,
          dineInPlannedCount: 0,
          dineInServedCount: 0,
          remDineInCount: 0,
        };
      }

      const cat = categories[catKey];
      cat.plannedCount++;
      totalFoodRegistered++;

      const isMealTaken = toBool(takenRecord?.[mealKey]);
      if (isMealTaken) {
        cat.servedCount++;
        totalFoodAlreadyServed++;
      } else {
        cat.remMealCount++;
      }

      const hasParcelOpted = isParcelValidForSlot(dayId, mealType, choice, slot?.[parcelKey as keyof MealSlot], dayConfig, isKid, !!kidsEnabled);

      if (hasParcelOpted) {
        cat.parcelPlannedCount++;
        totalParcelPlanned++;

        // A parcel is a meal, so parcel can only be taken if meal itself was taken
        const isParcelTaken = isMealTaken && toBool(takenRecord?.[parcelKey as keyof TakenState]);
        if (isParcelTaken) {
          cat.parcelServedCount++;
          totalParcelTaken++;
        } else if (!isMealTaken) {
          cat.remParcelCount++;
        }
      } else {
        cat.dineInPlannedCount++;
        if (isMealTaken) {
          cat.dineInServedCount++;
        } else {
          cat.remDineInCount++;
        }
      }
    }

    const totalFoodRemaining = totalFoodRegistered - totalFoodAlreadyServed;
    const totalParcelMax = Object.values(categories).reduce((acc, cat) => acc + cat.remParcelCount, 0);
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

  // Initialize inputs on modal open & dynamically update partial checkout & parcel pickup state on real-time data changes
  useEffect(() => {
    if (visible && activeSubscription && quickCheckoutDetails) {
      const passId = activeSubscription.id;
      if (activePassIdRef.current !== passId) {
        const initInputs: CategoryInputs = {};
        Object.keys(quickCheckoutDetails.categories).forEach((catKey) => {
          initInputs[catKey] = { parcel: 0, dineIn: 0 };
        });
        setInputs(initInputs);
        setSuccessData(null);
        activePassIdRef.current = passId;
      }

      // Update partial checkout state dynamically on real-time data changes
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

      // Update parcel pickup state dynamically on real-time data changes
      if (quickCheckoutDetails.parcelSupported && quickCheckoutDetails.totalParcelMax > 0) {
        setInitialParcelInfo({
          hasParcelRemaining: true,
          parcelMax: quickCheckoutDetails.totalParcelMax,
          parcelPlanned: quickCheckoutDetails.totalParcelPlanned,
        });
      } else {
        setInitialParcelInfo(null);
      }
    } else if (!visible) {
      activePassIdRef.current = null;
      setInitialPartialInfo(null);
      setInitialParcelInfo(null);
      setSuccessData(null);
    }
  }, [visible, activeSubscription, quickCheckoutDetails]);

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
      const isFallback = isDineInFallbackParcelEnabled(quickCheckoutDetails.dayId, quickCheckoutDetails.mealType, dayConfig);

      setInputs((prev) => {
        let changed = false;
        const nextInputs = { ...prev };

        Object.keys(quickCheckoutDetails.categories).forEach((catKey) => {
          const cat = quickCheckoutDetails.categories[catKey];
          if (!cat) return;
          const currentP = prev[catKey]?.parcel || 0;
          const currentD = prev[catKey]?.dineIn || 0;

          const maxP = cat.remParcelCount;
          const maxD = isFallback ? cat.remMealCount : cat.remDineInCount;

          const clampedP = Math.max(0, Math.min(maxP, currentP));
          let clampedD = Math.max(0, Math.min(maxD, currentD));

          if (isFallback) {
            if (clampedP + clampedD > cat.remMealCount) {
              clampedD = Math.max(0, cat.remMealCount - clampedP);
            }
          }

          if (clampedP !== currentP || clampedD !== currentD || !prev[catKey]) {
            nextInputs[catKey] = { parcel: clampedP, dineIn: clampedD };
            changed = true;
          }
        });

        return changed ? nextInputs : prev;
      });
    }
  }, [quickCheckoutDetails, dayConfig]);

  // Interdependence change handlers for Parcel & Dine-In inputs
  const handleParcelChange = (catKey: string, newVal: number) => {
    if (!quickCheckoutDetails) return;
    const cat = quickCheckoutDetails.categories[catKey];
    if (!cat) return;
    const isFallback = isDineInFallbackParcelEnabled(quickCheckoutDetails.dayId, quickCheckoutDetails.mealType, dayConfig);
    const maxP = cat.remParcelCount;

    const clampedP = Math.max(0, Math.min(maxP, newVal));

    setInputs((prev) => {
      const currDineIn = prev[catKey]?.dineIn || 0;
      let newDineIn = currDineIn;

      if (isFallback) {
        const maxMeal = cat.remMealCount;
        if (clampedP + currDineIn > maxMeal) {
          newDineIn = Math.max(0, maxMeal - clampedP);
        }
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

  const handleDineInChange = (catKey: string, newVal: number) => {
    if (!quickCheckoutDetails) return;
    const cat = quickCheckoutDetails.categories[catKey];
    if (!cat) return;
    const isFallback = isDineInFallbackParcelEnabled(quickCheckoutDetails.dayId, quickCheckoutDetails.mealType, dayConfig);
    const maxD = isFallback ? cat.remMealCount : cat.remDineInCount;

    const clampedD = Math.max(0, Math.min(maxD, newVal));

    setInputs((prev) => {
      const currParcel = prev[catKey]?.parcel || 0;
      let newParcel = currParcel;

      if (isFallback) {
        const maxMeal = cat.remMealCount;
        if (currParcel + clampedD > maxMeal) {
          newParcel = Math.max(0, maxMeal - clampedD);
        }
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
        key: string;
        label: string;
        isVeg: boolean;
        categoryInfo: CategoryInfo;
      }>;
    }> = [];

    const getSubSectionsForSection = (section: SectionType) => {
      const result: Array<{
        key: string;
        label: string;
        isVeg: boolean;
        categoryInfo: CategoryInfo;
      }> = [];

      const isFallback = isDineInFallbackParcelEnabled(quickCheckoutDetails.dayId, quickCheckoutDetails.mealType, dayConfig);

      Object.values(categories).forEach((cat) => {
        if (cat.section !== section) return;
        const dineRem = isFallback ? cat.remMealCount : cat.remDineInCount;
        if (dineRem <= 0 && (!parcelSupported || cat.remParcelCount <= 0)) return;

        result.push({
          key: cat.key,
          label: cat.label,
          isVeg: cat.subSection === DietType.VEG,
          categoryInfo: cat,
        });
      });

      return result;
    };

    const adultSubSections = getSubSectionsForSection(SectionType.ADULTS);
    if (adultSubSections.length > 0) {
      sections.push({
        key: SectionType.ADULTS,
        title: kidsEnabled ? UI_TEXT.adultsSection : UI_TEXT.membersSection,
        subSections: adultSubSections,
      });
    }

    if (kidsEnabled) {
      const kidsSubSections = getSubSectionsForSection(SectionType.KIDS);
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
      count += (inp?.parcel || 0) + (inp?.dineIn || 0);
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
    if (!isMealEnabled(dayId, mealType, dayConfig)) return;

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
      varietyColor?: string;
      dineIn: number;
      parcel: number;
    }> = [];

    let parcelDiscrepancyOccurred = false;

    const dayConf = (dayConfig || []).find((d) => d.id === dayId);
    const mConf = dayConf ? dayConf[mealType] : undefined;
    const varieties = getMealVarieties(mConf);

    const isFallback = isDineInFallbackParcelEnabled(dayId, mealType, dayConfig);

    for (const catKey of Object.keys(quickCheckoutDetails.categories)) {
      const cat = quickCheckoutDetails.categories[catKey];
      if (!cat) continue;
      const rawP = inputs[catKey]?.parcel || 0;
      const rawD = inputs[catKey]?.dineIn || 0;

      const safeParcelInput = Math.max(0, Math.min(cat.remParcelCount, rawP));
      let safeDineInInput = Math.max(0, Math.min(isFallback ? cat.remMealCount : cat.remDineInCount, rawD));
      if (isFallback) {
        if (safeParcelInput + safeDineInInput > cat.remMealCount) {
          safeDineInInput = Math.max(0, cat.remMealCount - safeParcelInput);
        }
      }

      if (safeParcelInput === 0 && safeDineInInput === 0) continue;

      categoryServedDetails.push({
        categoryLabel: cat.label,
        varietyColor: cat.varietyColor,
        dineIn: safeDineInInput,
        parcel: safeParcelInput,
      });

      let remParcelToAllocate = safeParcelInput;
      let remDineInToAllocate = safeDineInInput;

      const isKidCategory = cat.section === SectionType.KIDS;
      const targetVarId = cat.varietyId;

      const isSlotInCat = (i: number) => {
        if (!isMealEnabled(dayId, mealType, dayConfig)) return false;
        const isKidSlot = kidsEnabled && i >= peopleCount;
        if (isKidCategory !== isKidSlot) return false;

        const choice = getValidSlotChoice(dayId, mealType, updatedSub.mealSlots[dayId]?.[i]?.[mealKey], dayConfig);
        if (choice === DietaryOption.NONE) return false;

        const variety = getVarietyForChoice(choice, varieties);
        const slotVarId = variety ? variety.id : (choice === DietaryOption.NON_VEG ? "nonVeg_default" : "veg_default");

        return slotVarId === targetVarId;
      };

      const checkParcelOptedForSlot = (i: number) => {
        const isKidSlot = kidsEnabled && i >= peopleCount;
        const choice = getValidSlotChoice(dayId, mealType, updatedSub.mealSlots[dayId]?.[i]?.[mealKey], dayConfig);
        return isParcelValidForSlot(dayId, mealType, choice, updatedSub.mealSlots[dayId]?.[i]?.[parcelKey as keyof MealSlot], dayConfig, isKidSlot, !!kidsEnabled);
      };

      if (remParcelToAllocate > 0) {
        for (let i = 0; i < headcount; i++) {
          if (remParcelToAllocate <= 0) break;
          if (!isSlotInCat(i)) continue;

          const isMealUnserved = !toBool(takenList[i]?.[mealKey]);
          const hasParcelOpted = checkParcelOptedForSlot(i);
          const isParcelUnserved = !toBool(takenList[i]?.[parcelKey as keyof TakenState]);

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

      if (remDineInToAllocate > 0) {
        for (let i = 0; i < headcount; i++) {
          if (remDineInToAllocate <= 0) break;
          if (!isSlotInCat(i)) continue;

          const isMealUnserved = !toBool(takenList[i]?.[mealKey]);
          const hasParcelOpted = checkParcelOptedForSlot(i);

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

        if (isFallback && remDineInToAllocate > 0) {
          for (let i = 0; i < headcount; i++) {
            if (remDineInToAllocate <= 0) break;
            if (!isSlotInCat(i)) continue;

            const isMealUnserved = !toBool(takenList[i]?.[mealKey]);
            const hasParcelOpted = checkParcelOptedForSlot(i);

            if (isMealUnserved && hasParcelOpted) {
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

      if (isFallback) {
        const isKidCat = cat.section === SectionType.KIDS;
        const isKidParcelOpt = isKidsParcelEnabled(dayId, mealType, dayConfig, kidsEnabled);
        const isParcelCheckActive = isKidCat ? isKidParcelOpt : quickCheckoutDetails.parcelSupported;

        const catTotalCheckout = safeParcelInput + safeDineInInput;
        if (isParcelCheckActive && catTotalCheckout === cat.remMealCount && cat.remMealCount > 0) {
          let hasUncollectedParcelForServedMeal = false;
          for (let i = 0; i < headcount; i++) {
            if (!isSlotInCat(i)) continue;
            const isFoodTaken = toBool(takenList[i]?.[mealKey]);
            const hasParcelOpted = checkParcelOptedForSlot(i);
            const isParcelTaken = toBool(takenList[i]?.[parcelKey as keyof TakenState]);

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
      const choice = getValidSlotChoice(dayId, mealType, updatedSub.mealSlots[dayId]?.[i]?.[mealKey], dayConfig);
      const isSubscribed = choice !== DietaryOption.NONE;

      if (isSubscribed) {
        const isFoodTaken = toBool(takenList[i]?.[mealKey]);

        if (isFoodTaken) {
          if (!isKid) newAdultsTaken++;
          else newKidsTaken++;
        }

        const isParcelSupportedForSlot = isParcelValidForSlot(dayId, mealType, choice, updatedSub.mealSlots[dayId]?.[i]?.[parcelKey as keyof MealSlot], dayConfig, isKid, !!kidsEnabled);

        if (isParcelSupportedForSlot) {
          if (toBool(takenList[i]?.[mealKey as keyof TakenState]) && toBool(takenList[i]?.[parcelKey as keyof TakenState])) {
            newParcelsTaken++;
          }
        }
      }
    }

    const totalsParts: string[] = [];
    if (kidsEnabled) {
      let adultsPlanned = 0;
      let kidsPlanned = 0;
      Object.values(quickCheckoutDetails.categories).forEach((cat) => {
        if (cat.section === SectionType.ADULTS) {
          adultsPlanned += isFallback ? cat.plannedCount : cat.dineInPlannedCount;
        }
        if (cat.section === SectionType.KIDS) {
          kidsPlanned += isFallback ? cat.plannedCount : cat.dineInPlannedCount;
        }
      });
      if (adultsPlanned > 0) totalsParts.push(`${UI_TEXT.adults}: ${newAdultsTaken}/${adultsPlanned}`);
      if (kidsPlanned > 0) totalsParts.push(`${UI_TEXT.kids}: ${newKidsTaken}/${kidsPlanned}`);
    } else {
      let totalPlanned = 0;
      Object.values(quickCheckoutDetails.categories).forEach((cat) => {
        totalPlanned += isFallback ? cat.plannedCount : cat.dineInPlannedCount;
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
  const cardMaxWidth = Math.min(width * 0.94, Platform.OS === 'web' ? 580 : 500);
  const maxCardHeight = Math.min(height * 0.88, 620);

  if (!visible || !subscription) return null;

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

                  if (parts.length === 0) return null;

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
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: item.varietyColor || theme.colors.success }} />
                        <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary }}>
                          {item.categoryLabel}
                        </Text>
                      </View>
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
          <QuickCheckoutHeader
            subscription={activeSubscription || subscription!}
            currentMealLabel={currentMealInfo?.mealLabel || ""}
            onClose={onClose}
            theme={theme}
            s={(n: number) => n}
          />
          {isSpecial && (
            <View
              accessible={true}
              accessibilityRole="text"
              accessibilityLabel={`${UI_TEXT.specialMealBadge} - ${currentMealInfo?.dayLabel} ${currentMealInfo?.mealLabel}`}
              style={{ marginHorizontal: 14, marginBottom: 4, flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: theme.colors.specialMealBg, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1.5, borderColor: theme.colors.specialMealBorder, borderStyle: "dashed" }}
            >
              <Ionicons name="star" size={14} color={theme.colors.specialMealBorder} />
              <Text style={{ fontSize: 12, fontWeight: "900", color: theme.colors.specialMealText, letterSpacing: 0.5 }}>
                {UI_TEXT.specialMealBadge} ({currentMealInfo?.dayLabel} - {currentMealInfo?.mealLabel})
              </Text>
            </View>
          )}
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ gap: 10, paddingBottom: 6, paddingHorizontal: 14 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={true}
          >

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

                {/* Compact Category-Wise Breakdown */}
                <View style={{ gap: 3, marginTop: 2 }}>
                  {Object.values(quickCheckoutDetails.categories)
                    .filter((cat) => {
                      const isFallback = isDineInFallbackParcelEnabled(quickCheckoutDetails.dayId, quickCheckoutDetails.mealType, dayConfig);
                      const dinePlanned = isFallback ? cat.plannedCount : cat.dineInPlannedCount;
                      const dineRem = isFallback ? cat.remMealCount : cat.remDineInCount;
                      const isKidCat = cat.section === SectionType.KIDS;
                      const isKidParcelOpt = isKidsParcelEnabled(quickCheckoutDetails.dayId, quickCheckoutDetails.mealType, dayConfig, kidsEnabled);
                      const showCatParcel = quickCheckoutDetails.parcelSupported && (isKidCat ? isKidParcelOpt : true);

                      const hasDineRem = dinePlanned > 0 && dineRem > 0;
                      const hasParcelRem = showCatParcel && cat.parcelPlannedCount > 0 && cat.remParcelCount > 0;
                      return hasDineRem || hasParcelRem;
                    })
                    .map((cat) => {
                      const isFallback = isDineInFallbackParcelEnabled(quickCheckoutDetails.dayId, quickCheckoutDetails.mealType, dayConfig);
                      const isKidCat = cat.section === SectionType.KIDS;
                      const isKidParcelOpt = isKidsParcelEnabled(quickCheckoutDetails.dayId, quickCheckoutDetails.mealType, dayConfig, kidsEnabled);
                      const showCatParcel = quickCheckoutDetails.parcelSupported && (isKidCat ? isKidParcelOpt : true);

                      const parcelLabel = cat.parcelPlannedCount === 1 ? UI_TEXT.parcelSingular : UI_TEXT.parcels;
                      const dinePlanned = isFallback ? cat.plannedCount : cat.dineInPlannedCount;
                      const dineRem = isFallback ? cat.remMealCount : cat.remDineInCount;

                      const dineStr = (dinePlanned > 0 && dineRem > 0)
                        ? `${UI_TEXT.dineIn}: ${dinePlanned} (${dineRem} ${UI_TEXT.remAbbr || "rem"})`
                        : "";
                      const parcelStr = (showCatParcel && cat.parcelPlannedCount > 0 && cat.remParcelCount > 0)
                        ? `${parcelLabel}: ${cat.parcelPlannedCount} (${cat.remParcelCount} ${UI_TEXT.remAbbr || "rem"})`
                        : "";
                      const combinedStr = [dineStr, parcelStr].filter(Boolean).join(" | ");

                      return (
                        <View
                          key={cat.key}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "space-between",
                            backgroundColor: theme.colors.white + "18",
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                            borderRadius: 6,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.white }}>
                            • {cat.label}
                          </Text>
                          <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.white, opacity: 0.95 }}>
                            {combinedStr}
                          </Text>
                        </View>
                      );
                    })}
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
                      const catInputs = (cat && inputs[cat.key]) ? inputs[cat.key] : { parcel: 0, dineIn: 0 };
                      const parcelVal = catInputs?.parcel ?? 0;
                      const dineInVal = catInputs?.dineIn ?? 0;
                      const isFallback = isDineInFallbackParcelEnabled(quickCheckoutDetails.dayId, quickCheckoutDetails.mealType, dayConfig);

                      const dinePlanned = isFallback ? cat.plannedCount : cat.dineInPlannedCount;
                      const dineServed = isFallback ? cat.servedCount : cat.dineInServedCount;
                      const dineRem = isFallback ? cat.remMealCount : cat.remDineInCount;

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
                              ({UI_TEXT.pending}: {dineRem} {dineRem === 1 ? UI_TEXT.plateSingular.toLowerCase() : UI_TEXT.plates.toLowerCase()}
                              {quickCheckoutDetails.parcelSupported && cat.remParcelCount > 0 ? `, ${cat.remParcelCount} ${cat.remParcelCount === 1 ? UI_TEXT.parcelSingular.toLowerCase() : UI_TEXT.parcels.toLowerCase()}` : ""})
                            </Text>
                          </View>

                          <View style={{ flexDirection: "row", gap: 8, marginTop: 4, width: "100%", alignItems: "center" }}>
                            {quickCheckoutDetails.parcelSupported && cat.remParcelCount > 0 && (
                              <QuickCheckoutItemCard
                                label={UI_TEXT.parcels}
                                plannedCount={cat.parcelPlannedCount}
                                servedCount={cat.parcelServedCount}
                                remCount={cat.remParcelCount}
                                value={parcelVal}
                                onChange={(val) => handleParcelChange(cat.key, val)}
                                max={cat.remParcelCount}
                                disabled={!isStillCurrent || isDone}
                                theme={theme}
                                s={(n: number) => n}
                              />
                            )}
                            {dineRem > 0 && (
                              <QuickCheckoutItemCard
                                label={UI_TEXT.dineIn}
                                plannedCount={dinePlanned}
                                servedCount={dineServed}
                                remCount={dineRem}
                                value={dineInVal}
                                onChange={(val) => handleDineInChange(cat.key, val)}
                                max={dineRem}
                                disabled={!isStillCurrent || isDone}
                                theme={theme}
                                s={(n: number) => n}
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
