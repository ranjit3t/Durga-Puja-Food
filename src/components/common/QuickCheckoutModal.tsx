import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, Pressable, StyleSheet, Platform, Modal, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { CounterInput } from "./CounterInput";
import { useDatabase } from "../../context/DatabaseContext";
import { useUI } from "../../context/UIContext";
import { Subscription, MealType, DietaryOption, ActivityModule, ActivityAction, AppThemeMode } from "../../types";
import { isParcelEnabled, getMealLabel } from "../../constants";

interface QuickCheckoutModalProps {
  visible: boolean;
  subscription: Subscription | null;
  currentMealInfo: {
    dayId: string;
    mealType: MealType;
    dayLabel: string;
    mealLabel: string;
  } | null;
  onClose: () => void;
  onSuccess: () => void;
}

export function QuickCheckoutModal({
  visible,
  subscription,
  currentMealInfo,
  onClose,
  onSuccess
}: QuickCheckoutModalProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { dayConfig, kidsEnabled, addActivityLog, upsertSubscription } = useDatabase();
  const { showAlert } = useUI();

  const [adultInput, setAdultInput] = useState(0);
  const [kidInput, setKidInput] = useState(0);
  const [parcelInput, setParcelInput] = useState(0);

  // Calculate Quick Checkout limits and summary
  const quickCheckoutDetails = useMemo(() => {
    if (!subscription || !currentMealInfo) return null;

    const { dayId, mealType } = currentMealInfo;
    const mealKey = mealType;
    const parcelKey = `${mealType}Parcel`;

    const peopleCount = subscription.peopleCount;
    const kidsCount = kidsEnabled ? (subscription.kidsCount || 0) : 0;
    const headcount = peopleCount + kidsCount;

    const slots = subscription.mealSlots?.[dayId] || [];
    const taken = subscription.takenByPerson?.[dayId] || [];

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
      nonVegCount
    };
  }, [subscription, currentMealInfo, kidsEnabled, dayConfig]);

  const activePassIdRef = useRef<string | null>(null);

  // Initialize inputs ONLY when modal opens or when switching to a different pass ID
  useEffect(() => {
    if (visible && subscription) {
      const passId = subscription.id;
      if (activePassIdRef.current !== passId) {
        setAdultInput(0);
        setKidInput(0);
        setParcelInput(0);
        activePassIdRef.current = passId;
      }
    } else {
      activePassIdRef.current = null;
    }
  }, [visible, subscription?.id]);

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
    if (!subscription || !currentMealInfo || !quickCheckoutDetails) return;

    const { dayId, mealType } = currentMealInfo;
    const mealKey = mealType;
    const parcelKey = `${mealType}Parcel`;

    const updatedSub: Subscription = JSON.parse(JSON.stringify(subscription));
    const takenList = [...(updatedSub.takenByPerson[dayId] || [])];

    const peopleCount = subscription.peopleCount;
    const kidsCount = kidsEnabled ? (subscription.kidsCount || 0) : 0;
    const headcount = peopleCount + kidsCount;

    const safeAdultInput = Math.min(Math.max(0, adultInput), quickCheckoutDetails.adultsMax);
    const safeKidInput = Math.min(Math.max(0, kidInput), quickCheckoutDetails.kidsMax);
    const currentSafeFoodSum = safeAdultInput + safeKidInput;
    const safeParcelInput = Math.min(Math.max(0, parcelInput), currentSafeFoodSum, quickCheckoutDetails.parcelMax);

    // 1. Adult Allocation
    let remAdults = safeAdultInput;
    for (let i = 0; i < peopleCount; i++) {
      if (remAdults <= 0) break;
      const isSubscribed = updatedSub.mealSlots[dayId]?.[i]?.[mealKey] !== DietaryOption.NONE;
      const isUnserved = !takenList[i]?.[mealKey];
      if (isSubscribed && isUnserved) {
        takenList[i] = { ...takenList[i], [mealKey]: true };
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
          takenList[i] = { ...takenList[i], [mealKey]: true };
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
          takenList[i] = { ...takenList[i], [parcelKey]: true };
          remParcel--;
        }
      }
    }

    updatedSub.takenByPerson[dayId] = takenList;

    await upsertSubscription(updatedSub);

    // Format context-aware log description based on kids and parcel enablement
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

    // Calculate updated post-checkout taken totals for log
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
      targetId: subscription.id,
      description: UI_TEXT.logQuickCheckout
        .replace("{flatId}", subscription.id)
        .replace("{meal}", getMealLabel(mealType))
        .replace("{counts}", counts.join(", "))
        .replace("{totals}", totalsParts.join(", "))
    });

    // 4. Parcel Inconsistency Logging
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
        targetId: subscription.id,
        description: UI_TEXT.logMissedParcel.replace("{flatId}", subscription.id).replace("{meal}", getMealLabel(mealType))
      });
    }

    showAlert(UI_TEXT.success, UI_TEXT.checkoutSuccessful, [{ text: UI_TEXT.ok }]);
    onSuccess();
  };

  const isCheckoutDisabled = (adultInput + kidInput + parcelInput) === 0;

  return (
    <Modal
      visible={visible && !!subscription}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: theme.colors.shadow + "CC",
        justifyContent: "center",
        alignItems: "center",
        padding: 20
      }}>
        <View style={{
          width: "100%",
          maxWidth: 420,
          backgroundColor: theme.colors.surface,
          borderRadius: 20,
          padding: 20,
          borderWidth: 1,
          borderColor: theme.colors.border,
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
        }}>
          <ScrollView contentContainerStyle={{ gap: 16 }} keyboardShouldPersistTaps="handled">
            {/* Header Title */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <View>
                <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.textPrimary }}>
                  {UI_TEXT.quickCheckout}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.primary, marginTop: 2 }}>
                  {UI_TEXT.pass}{UI_TEXT.space}{subscription?.id}
                </Text>
              </View>
            </View>

            {/* Header Summary Box - Exact Dashboard Summary Card Pattern (Solid Red Theme) */}
            {quickCheckoutDetails && currentMealInfo && (
              <View style={{
                padding: 16,
                borderRadius: 18,
                backgroundColor: theme.colors.primary,
                borderColor: theme.colors.primary,
                borderWidth: 1,
                gap: 10,
                ...Platform.select({
                  ios: {
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                  },
                  android: { elevation: 6 },
                  web: { boxShadow: `0 4px 14px ${theme.colors.primary}40` }
                })
              }}>
                {/* Heading: Saptami - Breakfast */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 6, flex: 1 }}>
                    <Ionicons name="restaurant" size={16} color={theme.colors.white} style={{ marginTop: 1 }} />
                    <Text style={{ fontSize: 13, fontWeight: "900", color: theme.colors.white, textTransform: "uppercase", letterSpacing: 0.8, flex: 1, flexWrap: "wrap" }}>
                      {currentMealInfo.dayLabel}{UI_TEXT.space}{UI_TEXT.hyphen}{UI_TEXT.space}{currentMealInfo.mealLabel}
                    </Text>
                  </View>

                  <View style={{ backgroundColor: theme.colors.white + "33", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, flexShrink: 0, alignSelf: "flex-start" }}>
                    <Text style={{ fontSize: 10, fontWeight: "900", color: theme.colors.white }}>
                      {UI_TEXT.live.toUpperCase()}
                    </Text>
                  </View>
                </View>

                {/* Headcount & Dietary Breakdown */}
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 14, fontWeight: "800", color: theme.colors.white }}>
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

                  <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.white, opacity: 0.9 }}>
                    {quickCheckoutDetails.vegCount > 0 ? `${quickCheckoutDetails.vegCount} ${UI_TEXT.veg}` : ""}
                    {quickCheckoutDetails.vegCount > 0 && quickCheckoutDetails.nonVegCount > 0 ? `${UI_TEXT.pipe}` : ""}
                    {quickCheckoutDetails.nonVegCount > 0 ? `${quickCheckoutDetails.nonVegCount} ${UI_TEXT.nonVeg}` : ""}
                  </Text>
                </View>

                <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2 }} />

                {/* Food Demand & Serving Status */}
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.white }}>
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
                      <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.white }}>
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

            {/* Section 2: Counter Inputs Card Container (View Pass Section Aesthetics) */}
            {quickCheckoutDetails && currentMealInfo && (
              <View style={{
                padding: 16,
                borderRadius: 18,
                backgroundColor: theme.themeType === AppThemeMode.DARK ? "rgba(27, 45, 36, 0.5)" : "rgba(235, 251, 238, 0.7)",
                borderColor: theme.cardColors[2].border,
                borderWidth: 1.5,
                gap: 12,
              }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="flash-outline" size={16} color={theme.cardColors[2].accent} />
                  <Text style={{ fontSize: 12, fontWeight: "800", color: theme.cardColors[2].accent, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {UI_TEXT.quickCheckout}
                  </Text>
                </View>

                {quickCheckoutDetails.adultsMax > 0 && (
                  <CounterInput
                    label={kidsEnabled ? UI_TEXT.adults : UI_TEXT.members}
                    description={`${UI_TEXT.maxLimit}${UI_TEXT.colon}${UI_TEXT.space}${quickCheckoutDetails.adultsMax}`}
                    value={adultInput}
                    min={0}
                    max={quickCheckoutDetails.adultsMax}
                    onChange={setAdultInput}
                  />
                )}

                {kidsEnabled && quickCheckoutDetails.kidsMax > 0 && (
                  <CounterInput
                    label={UI_TEXT.kids}
                    description={`${UI_TEXT.maxLimit}${UI_TEXT.colon}${UI_TEXT.space}${quickCheckoutDetails.kidsMax}`}
                    value={kidInput}
                    min={0}
                    max={quickCheckoutDetails.kidsMax}
                    onChange={setKidInput}
                  />
                )}

                {quickCheckoutDetails.parcelSupported && effectiveParcelMax > 0 && (
                  <CounterInput
                    label={UI_TEXT.parcels}
                    description={`${UI_TEXT.maxLimit}${UI_TEXT.colon}${UI_TEXT.space}${effectiveParcelMax}`}
                    value={parcelInput}
                    min={0}
                    max={effectiveParcelMax}
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
    marginTop: 16,
    marginBottom: 8,
  },
  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "800",
  },
  checkoutButton: {
    flex: 1,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  checkoutText: {
    fontSize: 15,
    fontWeight: "800",
  },
});
