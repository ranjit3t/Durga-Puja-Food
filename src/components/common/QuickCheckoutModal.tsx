import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Platform, Modal, ScrollView, useWindowDimensions, Animated, AccessibilityInfo, Vibration, NativeModules } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { CounterInput } from "./CounterInput";
import { useDatabase } from "../../context/DatabaseContext";
import { useUI } from "../../context/UIContext";
import { useAppNavigation } from "../../context/NavigationContext";
import { Subscription, MealType, DietaryOption, ActivityModule, ActivityAction, AppThemeMode, AppScreen, TakenState, CheckoutSource } from "../../types";
import { isParcelEnabled, isMealCurrent, isMealDone, getMealLabel, formatTakenTime } from "../../constants";

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
  adultsCount: number;
  kidsCount: number;
  parcelsCount: number;
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
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { dayConfig, kidsEnabled, addActivityLog, upsertSubscription, subscriptions, quickCheckoutAutoCloseMs, soundEnabled } = useDatabase();
  const { showAlert } = useUI();
  const { navigate } = useAppNavigation();
  const { width, height } = useWindowDimensions();

  const activeSubscription = useMemo(() => {
    if (!subscription) return null;
    return subscriptions.find(s => s.id === subscription.id) || subscription;
  }, [subscription, subscriptions]);

  const [adultInput, setAdultInput] = useState(0);
  const [kidInput, setKidInput] = useState(0);
  const [parcelInput, setParcelInput] = useState(0);

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

  // Calculate Quick Checkout limits, summary & partial checkout detection
  const quickCheckoutDetails = useMemo(() => {
    if (!activeSubscription || !currentMealInfo) return null;

    const { dayId, mealType } = currentMealInfo;
    const mealKey = mealType;
    const parcelKey = `${mealType}Parcel`;

    const peopleCount = activeSubscription.peopleCount;
    const kidsCount = kidsEnabled ? (activeSubscription.kidsCount || 0) : 0;
    const headcount = peopleCount + kidsCount;

    const slots = activeSubscription.mealSlots?.[dayId] || [];
    const taken = activeSubscription.takenByPerson?.[dayId] || [];

    let adultsPlanned = 0;
    let adultsTaken = 0;
    let kidsPlanned = 0;
    let kidsTaken = 0;
    let parcelPlanned = 0;
    let parcelTaken = 0;
    let vegCount = 0;
    let nonVegCount = 0;

    const parcelSupported = isParcelEnabled(dayId, mealType, dayConfig);

    for (let i = 0; i < headcount; i++) {
      const isKid = kidsEnabled && i >= peopleCount;
      const isSubscribed = slots[i]?.[mealKey] && slots[i][mealKey] !== DietaryOption.NONE;
      const isMealTaken = !!taken[i]?.[mealKey];

      if (isSubscribed) {
        if (slots[i][mealKey] === DietaryOption.VEG) vegCount++;
        if (slots[i][mealKey] === DietaryOption.NON_VEG) nonVegCount++;

        if (!isKid) {
          adultsPlanned++;
          if (isMealTaken) adultsTaken++;
        } else {
          kidsPlanned++;
          if (isMealTaken) kidsTaken++;
        }
      }

      if (parcelSupported && slots[i]?.[parcelKey as keyof typeof slots[0]]) {
        parcelPlanned++;
        if (taken[i]?.[parcelKey as keyof typeof taken[0]]) {
          parcelTaken++;
        }
      }
    }

    const adultsMax = Math.max(0, adultsPlanned - adultsTaken);
    const kidsMax = Math.max(0, kidsPlanned - kidsTaken);
    const parcelMax = Math.max(0, parcelPlanned - parcelTaken);

    const totalFoodRegistered = adultsPlanned + kidsPlanned;
    const totalFoodAlreadyServed = adultsTaken + kidsTaken;
    const totalFoodRemaining = adultsMax + kidsMax;

    // Detect if a partial checkout occurred previously
    const isPartialCheckoutEarlier = totalFoodAlreadyServed > 0 && totalFoodRemaining > 0;

    return {
      dayId,
      mealType,
      adultsPlanned,
      adultsTaken,
      adultsMax,
      kidsPlanned,
      kidsTaken,
      kidsMax,
      parcelPlanned,
      parcelTaken,
      parcelMax,
      parcelSupported,
      vegCount,
      nonVegCount,
      totalFoodRegistered,
      totalFoodAlreadyServed,
      totalFoodRemaining,
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
        setAdultInput(0);
        setKidInput(0);
        setParcelInput(0);
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
        if (quickCheckoutDetails.parcelSupported && quickCheckoutDetails.parcelMax > 0) {
          setInitialParcelInfo({
            hasParcelRemaining: true,
            parcelMax: quickCheckoutDetails.parcelMax,
            parcelPlanned: quickCheckoutDetails.parcelPlanned,
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

  // Rule: Parcel max limit cannot exceed current summation of food meals (adults + kids) being checked out
  const currentFoodSum = adultInput + kidInput;
  const effectiveParcelMax = quickCheckoutDetails ? Math.min(quickCheckoutDetails.parcelMax, currentFoodSum) : 0;

  // Clamp inputs if max limits change dynamically during background sync or when food sum changes
  useEffect(() => {
    if (quickCheckoutDetails) {
      setAdultInput(prev => Math.min(prev, quickCheckoutDetails.adultsMax));
      setKidInput(prev => Math.min(prev, quickCheckoutDetails.kidsMax));
    }
  }, [quickCheckoutDetails?.adultsMax, quickCheckoutDetails?.kidsMax]);

  useEffect(() => {
    if (parcelInput > effectiveParcelMax) {
      setParcelInput(effectiveParcelMax);
    }
  }, [effectiveParcelMax, parcelInput]);

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

    const peopleCount = activeSubscription.peopleCount;
    const kidsCount = kidsEnabled ? (activeSubscription.kidsCount || 0) : 0;
    const headcount = peopleCount + kidsCount;

    const safeAdultInput = Math.min(Math.max(0, adultInput), quickCheckoutDetails.adultsMax);
    const safeKidInput = Math.min(Math.max(0, kidInput), quickCheckoutDetails.kidsMax);
    const currentSafeFoodSum = safeAdultInput + safeKidInput;
    const safeParcelInput = Math.min(Math.max(0, parcelInput), currentSafeFoodSum, quickCheckoutDetails.parcelMax);

    const nowTime = formatTakenTime(new Date());
    const timeKey = `${mealKey}Time`;
    const parcelTimeKey = `${parcelKey}Time`;

    // 1. Adult Allocation
    let remAdults = safeAdultInput;
    for (let i = 0; i < peopleCount; i++) {
      if (remAdults <= 0) break;
      const isSubscribed = updatedSub.mealSlots[dayId]?.[i]?.[mealKey] !== DietaryOption.NONE;
      const isUnserved = !takenList[i]?.[mealKey];
      if (isSubscribed && isUnserved) {
        takenList[i] = {
          ...takenList[i],
          [mealKey]: true,
          [timeKey]: takenList[i]?.[timeKey as keyof TakenState] || nowTime
        };
        remAdults--;
      }
    }

    // 2. Kids Allocation
    let remKids = safeKidInput;
    if (kidsEnabled && kidsCount > 0) {
      for (let i = peopleCount; i < headcount; i++) {
        if (remKids <= 0) break;
        const isSubscribed = updatedSub.mealSlots[dayId]?.[i]?.[mealKey] !== DietaryOption.NONE;
        const isUnserved = !takenList[i]?.[mealKey];
        if (isSubscribed && isUnserved) {
          takenList[i] = {
            ...takenList[i],
            [mealKey]: true,
            [timeKey]: takenList[i]?.[timeKey as keyof TakenState] || nowTime
          };
          remKids--;
        }
      }
    }

    // 3. Parcel Allocation
    let remParcel = safeParcelInput;
    if (remParcel > 0) {
      for (let i = 0; i < headcount; i++) {
        if (remParcel <= 0) break;
        const isParcelOpted = updatedSub.mealSlots[dayId]?.[i]?.[parcelKey as keyof typeof updatedSub.mealSlots[typeof dayId][0]] === true;
        const isParcelUnserved = !takenList[i]?.[parcelKey as keyof typeof takenList[0]];
        if (isParcelOpted && isParcelUnserved) {
          takenList[i] = {
            ...takenList[i],
            [parcelKey]: true,
            [parcelTimeKey]: takenList[i]?.[parcelTimeKey as keyof TakenState] || nowTime
          };
          remParcel--;
        }
      }
    }

    updatedSub.takenByPerson[dayId] = takenList;

    await upsertSubscription(updatedSub);

    const counts: string[] = [];
    if (kidsEnabled) {
      counts.push(`${safeAdultInput} ${UI_TEXT.adults}`);
      if (quickCheckoutDetails.kidsMax > 0 || safeKidInput > 0) {
        counts.push(`${safeKidInput} ${UI_TEXT.kids}`);
      }
    } else {
      counts.push(`${safeAdultInput} ${UI_TEXT.members}`);
    }

    if (quickCheckoutDetails.parcelSupported && (quickCheckoutDetails.parcelMax > 0 || safeParcelInput > 0)) {
      counts.push(`${safeParcelInput} ${UI_TEXT.parcels}`);
    }

    let newAdultsTaken = 0;
    let newKidsTaken = 0;
    let newMembersTaken = 0;
    let newParcelsTaken = 0;

    for (let i = 0; i < headcount; i++) {
      const isKid = kidsEnabled && i >= peopleCount;
      const isSubscribed = updatedSub.mealSlots[dayId]?.[i]?.[mealKey] !== DietaryOption.NONE;
      const isFoodTaken = !!takenList[i]?.[mealKey];

      if (isSubscribed && isFoodTaken) {
        if (kidsEnabled) {
          if (!isKid) newAdultsTaken++;
          else newKidsTaken++;
        } else {
          newMembersTaken++;
        }
      }

      if (quickCheckoutDetails.parcelSupported && updatedSub.mealSlots[dayId]?.[i]?.[parcelKey as keyof typeof updatedSub.mealSlots[typeof dayId][0]] === true) {
        if (takenList[i]?.[parcelKey as keyof typeof takenList[0]] === true) {
          newParcelsTaken++;
        }
      }
    }

    const totalsParts: string[] = [];
    if (kidsEnabled) {
      if (quickCheckoutDetails.adultsPlanned > 0) {
        totalsParts.push(`${UI_TEXT.adults}${UI_TEXT.space}${newAdultsTaken}/${quickCheckoutDetails.adultsPlanned}`);
      }
      if (quickCheckoutDetails.kidsPlanned > 0) {
        totalsParts.push(`${UI_TEXT.kids}${UI_TEXT.space}${newKidsTaken}/${quickCheckoutDetails.kidsPlanned}`);
      }
    } else {
      const totalPlannedMembers = quickCheckoutDetails.adultsPlanned + quickCheckoutDetails.kidsPlanned;
      if (totalPlannedMembers > 0) {
        totalsParts.push(`${UI_TEXT.members}${UI_TEXT.space}${newMembersTaken}/${totalPlannedMembers}`);
      }
    }

    if (quickCheckoutDetails.parcelSupported && quickCheckoutDetails.parcelPlanned > 0) {
      totalsParts.push(`${UI_TEXT.parcels}${UI_TEXT.space}${newParcelsTaken}/${quickCheckoutDetails.parcelPlanned}`);
    }

    addActivityLog({
      module: ActivityModule.SCANNER,
      action: ActivityAction.UPDATE,
      targetId: activeSubscription.id,
      description: UI_TEXT.logQuickCheckout
        .replace("{flatId}", activeSubscription.id)
        .replace("{source}", source || CheckoutSource.SCANNER)
        .replace("{meal}", getMealLabel(mealType))
        .replace("{counts}", counts.join(", "))
        .replace("{totals}", totalsParts.join(", "))
    });

    let allMealsTaken = true;
    for (let i = 0; i < headcount; i++) {
      const isSubscribed = updatedSub.mealSlots[dayId]?.[i]?.[mealKey] !== DietaryOption.NONE;
      if (isSubscribed) {
        const isFoodTaken = !!takenList[i]?.[mealKey];
        if (!isFoodTaken) {
          allMealsTaken = false;
          break;
        }
      }
    }

    const targetParcelCount = quickCheckoutDetails.parcelPlanned;
    const actualParcelTakenCount = takenList.filter((t, i) =>
      updatedSub.mealSlots[dayId]?.[i]?.[parcelKey as keyof typeof updatedSub.mealSlots[typeof dayId][0]] === true &&
      t?.[parcelKey as keyof typeof t] === true
    ).length;

    if (allMealsTaken && targetParcelCount > 0 && actualParcelTakenCount < targetParcelCount) {
      addActivityLog({
        module: ActivityModule.SUBSCRIPTION,
        action: ActivityAction.MISSED_PARCEL,
        targetId: activeSubscription.id,
        description: UI_TEXT.logMissedParcel.replace("{flatId}", activeSubscription.id).replace("{meal}", getMealLabel(mealType))
      });
    }

    AccessibilityInfo.announceForAccessibility(
      UI_TEXT.checkoutSuccessAnnounce.replace("{flatNo}", activeSubscription.flat || activeSubscription.id)
    );

    // Set success overlay state for full-screen festive checkout confirmation
    const totalPlatesServed = safeAdultInput + safeKidInput;

    setSuccessData({
      passId: activeSubscription.id,
      block: activeSubscription.block || "",
      flat: activeSubscription.flat || activeSubscription.id,
      dayLabel: currentMealInfo.dayLabel,
      mealLabel: currentMealInfo.mealLabel,
      adultsCount: safeAdultInput,
      kidsCount: safeKidInput,
      parcelsCount: safeParcelInput,
      totalPlates: totalPlatesServed,
      timestamp: nowTime,
      countsText: counts.join(", "),
      totalsText: totalsParts.join(", "),
    });

    const autoCloseDuration = quickCheckoutAutoCloseMs ?? 3000;

    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    successTimerRef.current = setTimeout(() => {
      setSuccessData(null);
      onSuccess();
      onClose();
    }, autoCloseDuration);
  };

  const isCheckoutDisabled = (adultInput + kidInput + parcelInput) === 0 || !isStillCurrent || isDone;
  const cardMaxWidth = Math.min(width * 0.94, 500);
  const maxCardHeight = Math.min(height * 0.88, 620);

  // Full-Height Theme-Driven Success Overlay Window (Works on Mobile & Web)
  if (visible && successData) {
    const successA11yLabel = `${UI_TEXT.checkoutSuccessful}. ${UI_TEXT.block} ${successData.block} ${UI_TEXT.flatUpper} ${successData.flat}. ${successData.mealLabel}. ${UI_TEXT.served} ${successData.countsText}. ${UI_TEXT.total} ${successData.totalPlates} ${UI_TEXT.plates}. ${successData.timestamp}.`;

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

              {/* Served Items Breakdown */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {UI_TEXT.served}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: "800", color: theme.colors.textPrimary }}>
                  {successData.countsText}
                </Text>
              </View>

              {/* Total Plates */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                  {UI_TEXT.total}
                </Text>
                <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.success }}>
                  {successData.totalPlates} {UI_TEXT.plates.toUpperCase()}
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
          <ScrollView
            style={{ flexShrink: 1 }}
            contentContainerStyle={{ gap: 10, paddingBottom: 2 }}
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

            {/* Intelligent Consolidated Alerts (Compact & Combined when both alerts are present) */}
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
                    {UI_TEXT.importantReminders || "Important Reminders"}
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

            {/* Header Summary Box - Exact Dashboard Summary Card Pattern (Solid Red Theme) */}
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
                {/* Heading: Saptami - Breakfast */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                    <Ionicons name="restaurant" size={15} color={theme.colors.white} />
                    <Text style={{ fontSize: 12, fontWeight: "900", color: theme.colors.white, textTransform: "uppercase", letterSpacing: 0.8, flex: 1 }} numberOfLines={1}>
                      {currentMealInfo.dayLabel}{UI_TEXT.space}{UI_TEXT.hyphen}{UI_TEXT.space}{currentMealInfo.mealLabel}
                    </Text>
                  </View>

                  <View style={{ backgroundColor: theme.colors.white + "33", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5, flexShrink: 0 }}>
                    <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.white }}>
                      {(isStillCurrent && !isDone) ? UI_TEXT.live.toUpperCase() : (isDone ? UI_TEXT.mealDoneLabel.toUpperCase() : "INACTIVE")}
                    </Text>
                  </View>
                </View>

                {/* Headcount & Dietary Breakdown */}
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
                    {quickCheckoutDetails.vegCount > 0 ? `${quickCheckoutDetails.vegCount} ${UI_TEXT.veg}` : ""}
                    {quickCheckoutDetails.vegCount > 0 && quickCheckoutDetails.nonVegCount > 0 ? `${UI_TEXT.pipe}` : ""}
                    {quickCheckoutDetails.nonVegCount > 0 ? `${quickCheckoutDetails.nonVegCount} ${UI_TEXT.nonVeg}` : ""}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2, marginVertical: 1 }} />

                {/* Food Demand & Serving Status */}
                <View style={{ gap: 2 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.white }}>
                      {UI_TEXT.food}{UI_TEXT.colon}{UI_TEXT.space}
                      {UI_TEXT.planned}{UI_TEXT.space}{quickCheckoutDetails.adultsPlanned + quickCheckoutDetails.kidsPlanned}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.white, opacity: 0.85 }}>
                      ({UI_TEXT.served}{UI_TEXT.colon}{UI_TEXT.space}{quickCheckoutDetails.adultsTaken + quickCheckoutDetails.kidsTaken}{UI_TEXT.comma}{UI_TEXT.space}{UI_TEXT.pending}{UI_TEXT.colon}{UI_TEXT.space}{quickCheckoutDetails.adultsMax + quickCheckoutDetails.kidsMax})
                    </Text>
                  </View>

                  {/* Parcel Demand & Serving Status */}
                  {quickCheckoutDetails.parcelSupported && quickCheckoutDetails.parcelPlanned > 0 && (
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.white }}>
                        {UI_TEXT.parcels}{UI_TEXT.colon}{UI_TEXT.space}
                        {UI_TEXT.planned}{UI_TEXT.space}{quickCheckoutDetails.parcelPlanned}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.white, opacity: 0.85 }}>
                        ({UI_TEXT.served}{UI_TEXT.colon}{UI_TEXT.space}{quickCheckoutDetails.parcelTaken}{UI_TEXT.comma}{UI_TEXT.space}{UI_TEXT.pending}{UI_TEXT.colon}{UI_TEXT.space}{quickCheckoutDetails.parcelMax})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            )}

            {/* Section 2: Counter Inputs Card Container */}
            {quickCheckoutDetails && currentMealInfo && (
              <View style={{
                padding: 10,
                borderRadius: 14,
                backgroundColor: theme.cardColors[2].accentLight,
                borderColor: theme.cardColors[2].border,
                borderWidth: 1.5,
                gap: 6,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                  <Ionicons name="flash-outline" size={15} color={theme.cardColors[2].accent} />
                  <Text style={{ fontSize: 11, fontWeight: "800", color: theme.cardColors[2].accent, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {UI_TEXT.quickCheckout}
                  </Text>
                </View>

                {quickCheckoutDetails.adultsMax > 0 && (
                  <CounterInput
                    compact={true}
                    label={kidsEnabled ? UI_TEXT.adults : UI_TEXT.members}
                    description={`${UI_TEXT.maxLimit}${UI_TEXT.colon}${UI_TEXT.space}${quickCheckoutDetails.adultsMax}`}
                    value={adultInput}
                    min={0}
                    max={quickCheckoutDetails.adultsMax}
                    disabled={!isStillCurrent || isDone}
                    onChange={setAdultInput}
                  />
                )}

                {kidsEnabled && quickCheckoutDetails.kidsMax > 0 && (
                  <CounterInput
                    compact={true}
                    label={UI_TEXT.kids}
                    description={`${UI_TEXT.maxLimit}${UI_TEXT.colon}${UI_TEXT.space}${quickCheckoutDetails.kidsMax}`}
                    value={kidInput}
                    min={0}
                    max={quickCheckoutDetails.kidsMax}
                    disabled={!isStillCurrent || isDone}
                    onChange={setKidInput}
                  />
                )}

                {quickCheckoutDetails.parcelSupported && effectiveParcelMax > 0 && (
                  <CounterInput
                    compact={true}
                    label={UI_TEXT.parcels}
                    description={`${UI_TEXT.maxLimit}${UI_TEXT.colon}${UI_TEXT.space}${effectiveParcelMax}`}
                    value={parcelInput}
                    min={0}
                    max={effectiveParcelMax}
                    disabled={!isStillCurrent || isDone}
                    onChange={setParcelInput}
                  />
                )}
              </View>
            )}

            {/* Action Buttons */}
            <View style={modalStyles.actionRow}>
              <Pressable
                onPress={onClose}
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
          </ScrollView>
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
    marginBottom: 4,
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
