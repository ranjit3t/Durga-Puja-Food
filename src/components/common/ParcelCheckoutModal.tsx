import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, Pressable, Platform, Modal, ScrollView, useWindowDimensions, Vibration } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { useAuth } from "../../context/AuthContext";
import { useDatabase } from "../../context/DatabaseContext";
import { useUI } from "../../context/UIContext";
import { useAppNavigation } from "../../context/NavigationContext";
import { useChat } from "../../context/ChatContext";
import { Subscription, MealType, DietaryOption, DietType, TakenState, CheckoutSource, AppScreen, ActivityModule, ActivityAction } from "../../types";
import { isParcelEnabled, isKidsParcelEnabled, isGuestsParcelEnabled, isMealCurrent, isMealDone, formatTakenTime, getValidSlotChoice, getMealVarieties, getVarietyForChoice, getDietTypeForChoice, isMealEnabled } from "../../constants";

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
      await audio.play().catch(() => {});
      return;
    }
  } catch (err) {
    // Silent catch
  }
}

interface ParcelCheckoutModalProps {
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
    parcel: number;
  }>;
  totalParcels: number;
  timestamp: string;
  countsText: string;
  totalsText: string;
}

interface ParcelCategoryInfo {
  categoryKey: string;
  categoryLabel: string;
  varietyColor?: string;
  totalCount: number;
  servedCount: number;
  remainingCount: number;
  remParcelCount: number;
  indices: number[];
}

export function ParcelCheckoutModal({
  visible,
  subscription,
  currentMealInfo,
  source = CheckoutSource.SUBSCRIPTION_LIST,
  onClose,
  onSuccess
}: ParcelCheckoutModalProps) {
  const { theme } = useAppTheme();
  const { userName, userAccountName, userRole } = useAuth();
  const currentUser = userAccountName || userName || String(userRole || "Operator");
  const { dayConfig, kidsEnabled, guestsEnabled, addActivityLog, upsertSubscription, subscriptions, quickCheckoutAutoCloseMs, soundEnabled } = useDatabase();
  const { showAlert } = useUI();
  const { navigate } = useAppNavigation();
  const { width } = useWindowDimensions();
  const { registerModalOpen, unregisterModalOpen } = useChat();
  const hasCheckedOutRef = useRef(false);

  useEffect(() => {
    if (visible) {
      hasCheckedOutRef.current = false;
      registerModalOpen("parcel_checkout");
      return () => unregisterModalOpen("parcel_checkout");
    }
  }, [visible, registerModalOpen, unregisterModalOpen]);

  const activeSubscription = useMemo(() => {
    if (!subscription) return null;
    return subscriptions.find(s => s.id === subscription.id) || subscription;
  }, [subscription, subscriptions]);

  const [parcelInputs, setParcelInputs] = useState<Record<string, number>>({});
  const [successData, setSuccessData] = useState<SuccessData | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (visible && successData && soundEnabled === true) {
      void playCheckoutSound();
      try {
        Vibration.vibrate([0, 70, 40, 90]);
      } catch (_) {}
    }
  }, [visible, successData, soundEnabled]);

  const isStillCurrent = currentMealInfo
    ? isMealCurrent(currentMealInfo.dayId, currentMealInfo.mealType, dayConfig)
    : false;
  const isDone = currentMealInfo
    ? isMealDone(currentMealInfo.dayId, currentMealInfo.mealType, dayConfig)
    : false;

  const alertShownRef = useRef(false);

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

  // Calculate Parcel-Specific Checkout details considering adult, kids, guests applicability
  const parcelCheckoutDetails = useMemo(() => {
    if (!activeSubscription || !currentMealInfo) return null;

    const { dayId, mealType } = currentMealInfo;
    if (!isMealEnabled(dayId, mealType, dayConfig)) return null;

    const mealKey = mealType;
    const parcelKey = `${mealType}Parcel`;

    const peopleCount = activeSubscription.peopleCount || 0;
    const kidsCount = kidsEnabled ? (activeSubscription.kidsCount || 0) : 0;
    const guestsCount = guestsEnabled ? (activeSubscription.guestsCount || 0) : 0;
    const headcount = peopleCount + kidsCount + guestsCount;

    const slots = activeSubscription.mealSlots?.[dayId] || [];
    const taken = activeSubscription.takenByPerson?.[dayId] || [];

    const parcelSupported = isParcelEnabled(dayId, mealType, dayConfig);
    const kidParcelOpt = isKidsParcelEnabled(dayId, mealType, dayConfig);
    const guestParcelOpt = isGuestsParcelEnabled(dayId, mealType, dayConfig);

    const dayConf = (dayConfig || []).find((d) => d.id === dayId);
    const mConf = dayConf ? dayConf[mealType] : undefined;
    const varieties = getMealVarieties(mConf);

    const categories: Record<string, ParcelCategoryInfo> = {};

    let totalParcelPlanned = 0;
    let totalParcelAlreadyServed = 0;

    for (let i = 0; i < headcount; i++) {
      const isKid = kidsEnabled && i >= peopleCount && i < peopleCount + kidsCount;
      const isGuest = guestsEnabled && i >= peopleCount + kidsCount;

      if (isKid && !kidsEnabled) continue;
      if (isGuest && !guestsEnabled) continue;

      const slot = slots[i];
      const takenRecord = taken[i];

      const choice = getValidSlotChoice(dayId, mealType, slot?.[mealKey], dayConfig);
      if (choice === DietaryOption.NONE) continue;

      const isParcelAllowed = parcelSupported && (isGuest ? guestParcelOpt : (isKid ? kidParcelOpt : true));
      const isParcelOpted = isParcelAllowed && !!(slot && (slot as any)[parcelKey]);

      if (!isParcelOpted) continue;

      const variety = getVarietyForChoice(choice, varieties);
      const diet = getDietTypeForChoice(choice, varieties) || DietType.VEG;

      const varId = variety ? variety.id : (choice === DietaryOption.NON_VEG ? "nonVeg_default" : "veg_default");
      const varName = variety ? variety.name : (choice === DietaryOption.NON_VEG ? "Non-Veg" : "Veg");
      const varColor = variety?.color || (diet === DietType.VEG ? theme.colors.veg : theme.colors.nonVeg);

      const sectionTag = isGuest ? "guest" : (isKid ? "kids" : "adult");
      const catKey = `${sectionTag}_${varId}`;

      if (!categories[catKey]) {
        categories[catKey] = {
          categoryKey: catKey,
          categoryLabel: `${isGuest ? UI_TEXT.guest : (isKid ? UI_TEXT.kid : UI_TEXT.adult)} - ${varName}`,
          varietyColor: varColor,
          totalCount: 0,
          servedCount: 0,
          remainingCount: 0,
          remParcelCount: 0,
          indices: []
        };
      }

      categories[catKey].totalCount += 1;
      categories[catKey].remParcelCount += 1;
      categories[catKey].indices.push(i);
      totalParcelPlanned += 1;

      const isParcelCollected = !!(takenRecord && takenRecord[parcelKey as keyof TakenState]);
      const isDineInTaken = !!(takenRecord && takenRecord[mealKey as keyof TakenState]);
      if (isParcelCollected || isDineInTaken) {
        categories[catKey].servedCount += 1;
        categories[catKey].remParcelCount -= 1;
        totalParcelAlreadyServed += 1;
      }
    }

    const totalParcelRemaining = totalParcelPlanned - totalParcelAlreadyServed;

    return {
      dayId,
      mealType,
      categories,
      parcelSupported,
      totalParcelPlanned,
      totalParcelAlreadyServed,
      totalParcelRemaining
    };
  }, [activeSubscription, currentMealInfo, kidsEnabled, guestsEnabled, dayConfig, theme]);

  useEffect(() => {
    if (visible && activeSubscription && parcelCheckoutDetails) {
      const initial: Record<string, number> = {};
      Object.keys(parcelCheckoutDetails.categories).forEach((catKey) => {
        const cat = parcelCheckoutDetails.categories[catKey];
        initial[catKey] = 0;
      });
      setParcelInputs(initial);
      setSuccessData(null);
    }
  }, [visible, activeSubscription, parcelCheckoutDetails]);

  const totalSelectedParcels = useMemo(() => {
    return Object.values(parcelInputs).reduce((sum, val) => sum + (val || 0), 0);
  }, [parcelInputs]);

  const isCheckoutEnabled = totalSelectedParcels > 0;

  useEffect(() => {
    if (visible && activeSubscription && currentMealInfo && !successData && !hasCheckedOutRef.current) {
      if (!activeSubscription) {
        showAlert(UI_TEXT.error, UI_TEXT.quickCheckoutNoSubscription);
        onClose();
        return;
      }
      if (!parcelCheckoutDetails || parcelCheckoutDetails.totalParcelPlanned === 0) {
        showAlert(UI_TEXT.error, UI_TEXT.parcelCheckoutNoParcelSubscribed);
        onClose();
        return;
      }
      if (parcelCheckoutDetails.totalParcelRemaining === 0) {
        showAlert(UI_TEXT.error, UI_TEXT.parcelCheckoutAllServed);
        onClose();
        return;
      }
    }
  }, [visible, activeSubscription, currentMealInfo, parcelCheckoutDetails, successData, showAlert, onClose]);

  const handleParcelCountChange = (catKey: string, delta: number) => {
    if (!parcelCheckoutDetails) return;
    const cat = parcelCheckoutDetails.categories[catKey];
    const currentVal = parcelInputs[catKey] ?? cat.remParcelCount;
    const newVal = Math.max(0, Math.min(cat.remParcelCount, currentVal + delta));
    setParcelInputs(prev => ({ ...prev, [catKey]: newVal }));
  };

  const handleCompleteParcelCheckout = async () => {
    if (!activeSubscription || !currentMealInfo || !parcelCheckoutDetails) return;

    const { dayId, mealType, categories } = parcelCheckoutDetails;
    const mealKey = mealType;
    const parcelKey = `${mealType}Parcel`;
    const timeKey = `${mealType}Time`;
    const parcelTimeKey = `${mealType}ParcelTime`;
    const userKey = `${mealType}User`;
    const parcelUserKey = `${mealType}ParcelUser`;
    const now = Date.now();
    const formattedTime = formatTakenTime(new Date(now));

    const updatedMealSlots = { ...(activeSubscription.mealSlots || {}) };
    const updatedTakenByPerson = { ...(activeSubscription.takenByPerson || {}) };
    const dayTaken = [...(updatedTakenByPerson[dayId] || [])];

    let totalParcelsCheckedOut = 0;
    const categoryDetails: Array<{ categoryLabel: string; varietyColor?: string; parcel: number }> = [];

    Object.keys(categories).forEach((catKey) => {
      const cat = categories[catKey];
      const countToCheckOut = parcelInputs[catKey] ?? 0;
      if (countToCheckOut <= 0) return;

      let checkedOutForCategory = 0;
      for (const idx of cat.indices) {
        if (checkedOutForCategory >= countToCheckOut) break;
        const currentTaken = dayTaken[idx] || {};
        const isParcelCollected = !!currentTaken[parcelKey as keyof TakenState];
        const isDineInTaken = !!currentTaken[mealType as keyof TakenState];
        if (!isParcelCollected && !isDineInTaken) {
          dayTaken[idx] = {
            ...currentTaken,
            [mealKey]: true,
            [timeKey]: formattedTime,
            [userKey]: currentUser,
            [parcelKey]: true,
            [parcelTimeKey]: formattedTime,
            [parcelUserKey]: currentUser
          };
          checkedOutForCategory += 1;
          totalParcelsCheckedOut += 1;
        }
      }

      if (checkedOutForCategory > 0) {
        categoryDetails.push({
          categoryLabel: cat.categoryLabel,
          varietyColor: cat.varietyColor,
          parcel: checkedOutForCategory
        });
      }
    });

    if (totalParcelsCheckedOut === 0) {
      showAlert(UI_TEXT.error, UI_TEXT.parcelCheckoutAllServed);
      return;
    }

    updatedTakenByPerson[dayId] = dayTaken;

    const updatedSub: Subscription = {
      ...activeSubscription,
      mealSlots: updatedMealSlots,
      takenByPerson: updatedTakenByPerson,
      updatedAt: now
    };

    hasCheckedOutRef.current = true;

    const passLabel = `${activeSubscription.block} - ${activeSubscription.flat}`;
    const countsStr = categoryDetails.map(c => `${c.parcel} ${c.categoryLabel}`).join(", ");
    addActivityLog({
      module: ActivityModule.SCANNER,
      action: ActivityAction.UPDATE,
      targetId: activeSubscription.id,
      description: UI_TEXT.logParcelCheckout
        .replace("{flatId}", passLabel)
        .replace("{source}", String(source))
        .replace("{meal}", `${currentMealInfo.dayLabel} ${currentMealInfo.mealLabel}`)
        .replace("{counts}", countsStr)
        .replace("{total}", String(totalParcelsCheckedOut))
    });

    const sData: SuccessData = {
      passId: passLabel,
      block: activeSubscription.block,
      flat: activeSubscription.flat,
      dayLabel: currentMealInfo.dayLabel,
      mealLabel: currentMealInfo.mealLabel,
      categoryDetails,
      totalParcels: totalParcelsCheckedOut,
      timestamp: formatTakenTime(new Date(now)),
      countsText: countsStr,
      totalsText: `${totalParcelsCheckedOut} ${totalParcelsCheckedOut === 1 ? UI_TEXT.parcelSingular : UI_TEXT.parcels}`
    };

    setSuccessData(sData);

    try {
      void upsertSubscription(updatedSub);
      const autoClose = quickCheckoutAutoCloseMs ?? 3000;
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      successTimerRef.current = setTimeout(() => {
        setSuccessData(null);
        onSuccess();
        onClose();
      }, autoClose);
    } catch (err) {
      console.error("Parcel checkout error:", err);
      showAlert(UI_TEXT.error, UI_TEXT.syncError);
    }
  };

  if (!visible || !activeSubscription || !currentMealInfo) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: theme.colors.shadow + "CC", justifyContent: "center", alignItems: "center", padding: 12 }}>
        <View style={{
          width: "100%",
          maxWidth: Math.min(width * 0.94, 560),
          maxHeight: "90%",
          backgroundColor: theme.colors.surface,
          borderRadius: 24,
          padding: 20,
          borderWidth: 1,
          borderColor: theme.colors.border,
          shadowColor: theme.colors.shadow,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 20,
          elevation: 10
        }}>
          {successData ? (
            <View style={{ alignItems: "center", paddingVertical: 20, gap: 16 }}>
              <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: theme.colors.success + "20", alignItems: "center", justifyContent: "center" }}>
                <Ionicons name="checkmark-circle" size={48} color={theme.colors.success} />
              </View>
              <Text style={{ fontSize: 22, fontWeight: "900", color: theme.colors.textPrimary, textAlign: "center" }}>
                {UI_TEXT.parcelCheckout} Successful
              </Text>
              <Text style={{ fontSize: 16, fontWeight: "800", color: theme.colors.primary, textAlign: "center" }}>
                Pass: {successData.passId} ({successData.totalsText})
              </Text>
              <Text style={{ fontSize: 13, color: theme.colors.textSecondary, textAlign: "center" }}>
                {successData.countsText}
              </Text>
              <Pressable
                onPress={() => {
                  if (successTimerRef.current) clearTimeout(successTimerRef.current);
                  onSuccess();
                  onClose();
                }}
                style={({ pressed }) => [
                  { backgroundColor: theme.colors.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, marginTop: 10 },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <Text style={{ color: theme.colors.white, fontWeight: "800", fontSize: 15 }}>{UI_TEXT.ok || "OK"}</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                   <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.primary + "20", alignItems: 'center', justifyContent: 'center' }}>
                     <Ionicons name="cube" size={20} color={theme.colors.primary} />
                   </View>
                   <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.textPrimary }}>
                     {UI_TEXT.parcelCheckout}
                   </Text>
                 </View>
                 <Pressable
                   onPress={onClose}
                   accessible={true}
                   accessibilityRole="button"
                   accessibilityLabel={UI_TEXT.close}
                   style={({ pressed }) => [
                     { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
                     pressed && { opacity: 0.7 }
                   ]}
                 >
                   <Ionicons name="close" size={20} color={theme.colors.textPrimary} />
                 </Pressable>
              </View>

              <ScrollView contentContainerStyle={{ paddingBottom: 16, gap: 16 }} showsVerticalScrollIndicator={false}>
                <View style={{ backgroundColor: theme.colors.surfaceDark, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: theme.colors.textPrimary }}>
                    {UI_TEXT.block} {activeSubscription.block} - {UI_TEXT.flatUpper} {activeSubscription.flat}
                  </Text>
                  <Text style={{ fontSize: 13, color: theme.colors.textSecondary, marginTop: 4, fontWeight: '600' }}>
                    {currentMealInfo.dayLabel} • {currentMealInfo.mealLabel}
                  </Text>
                </View>

                {parcelCheckoutDetails && Object.values(parcelCheckoutDetails.categories).map((cat) => {
                  const currentVal = parcelInputs[cat.categoryKey] ?? cat.remParcelCount;
                  return (
                    <View key={cat.categoryKey} style={{ backgroundColor: theme.colors.surfaceDark + "40", padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border, gap: 10 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: cat.varietyColor || theme.colors.primary }} />
                          <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary }}>
                            {cat.categoryLabel}
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textSecondary }}>
                          {cat.servedCount}/{cat.totalCount} {UI_TEXT.served || "Served"}
                        </Text>
                      </View>

                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: theme.colors.surface, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.border }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: theme.colors.textPrimary }}>
                          {UI_TEXT.parcel}:
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <Pressable
                            onPress={() => handleParcelCountChange(cat.categoryKey, -1)}
                            disabled={currentVal <= 0}
                            style={({ pressed }) => [
                              { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
                              currentVal <= 0 && { opacity: 0.4 },
                              pressed && { opacity: 0.7 }
                            ]}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={`Decrease parcel count for ${cat.categoryLabel}`}
                          >
                            <Ionicons name="remove" size={16} color={theme.colors.textPrimary} />
                          </Pressable>
                          <Text style={{ fontSize: 16, fontWeight: '900', color: theme.colors.primary, minWidth: 24, textAlign: 'center' }}>
                            {currentVal}
                          </Text>
                          <Pressable
                            onPress={() => handleParcelCountChange(cat.categoryKey, 1)}
                            disabled={currentVal >= cat.remParcelCount}
                            style={({ pressed }) => [
                              { width: 32, height: 32, borderRadius: 16, backgroundColor: theme.colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
                              currentVal >= cat.remParcelCount && { opacity: 0.4 },
                              pressed && { opacity: 0.7 }
                            ]}
                            accessible={true}
                            accessibilityRole="button"
                            accessibilityLabel={`Increase parcel count for ${cat.categoryLabel}`}
                          >
                            <Ionicons name="add" size={16} color={theme.colors.textPrimary} />
                          </Pressable>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </ScrollView>

              <Pressable
                onPress={handleCompleteParcelCheckout}
                disabled={!isCheckoutEnabled}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.parcelCheckout}
                accessibilityState={{ disabled: !isCheckoutEnabled }}
                style={({ pressed }) => [
                  { backgroundColor: theme.colors.primary, borderRadius: 14, height: 50, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
                  !isCheckoutEnabled && { opacity: 0.4, backgroundColor: theme.colors.border },
                  pressed && isCheckoutEnabled && { opacity: 0.8 }
                ]}
              >
                <Text style={{ color: theme.colors.white, fontWeight: '900', fontSize: 16 }}>
                  {UI_TEXT.parcelCheckout}
                </Text>
              </Pressable>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
}
