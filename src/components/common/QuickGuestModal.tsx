/**
 * Reusable Quick Guest Modal component for live/current meals.
 * Opens automatically over Guest Management Screen when launched from Home Screen.
 * Provides instant optimistic updates, debounced database persistence, and activity logging.
 */
import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  StyleSheet,
  useWindowDimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "../../context/DatabaseContext";
import { useAuth } from "../../context/AuthContext";
import { useUI } from "../../context/UIContext";
import { useAppNavigation } from "../../context/NavigationContext";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import {
  MealType,
  DietType,
  UserRole,
  AppThemeMode,
  AppScreen,
} from "../../types";
import {
  isDietaryEnabledForDay,
  isMealDone,
  isMealInFuture,
  isMealCurrent,
} from "../../constants";
import { CounterInput } from "./CounterInput";

interface QuickGuestModalProps {
  visible: boolean;
  currentMealInfo: {
    dayId: string;
    mealType: MealType;
    dayLabel: string;
    mealLabel: string;
  } | null;
  onClose: () => void;
}

export function QuickGuestModal({
  visible,
  currentMealInfo,
  onClose,
}: QuickGuestModalProps) {
  const { foodMenu, dayConfig, updateGuestCountDebounced } = useDatabase();
  const { userRole } = useAuth();
  const { theme } = useAppTheme();
  const { showAlert } = useUI();
  const { navigate } = useAppNavigation();
  const { width } = useWindowDimensions();
  const alertShownRef = useRef(false);

  const dayId = currentMealInfo?.dayId || "";
  const mealType = currentMealInfo?.mealType || MealType.BREAKFAST;
  const dayLabel = currentMealInfo?.dayLabel || "";
  const mealLabel = currentMealInfo?.mealLabel || "";

  const isStillCurrent = currentMealInfo
    ? isMealCurrent(dayId, mealType, dayConfig)
    : false;
  const isDone = currentMealInfo
    ? isMealDone(dayId, mealType, dayConfig)
    : false;

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

  if (!visible || !currentMealInfo) return null;

  const dayMenu = foodMenu[dayId];
  const mealMenu = dayMenu ? dayMenu[mealType] : undefined;

  const guestVeg = mealMenu?.guestVeg || 0;
  const guestVegTaken = mealMenu?.guestVegTaken || 0;
  const guestNonVeg = mealMenu?.guestNonVeg || 0;
  const guestNonVegTaken = mealMenu?.guestNonVegTaken || 0;

  const guestTotal = guestVeg + guestNonVeg;
  const guestTaken = guestVegTaken + guestNonVegTaken;
  const guestPending = Math.max(0, guestTotal - guestTaken);

  const isVegEnabled = isDietaryEnabledForDay(dayId, DietType.VEG, dayConfig);
  const isNonVegEnabled = isDietaryEnabledForDay(dayId, DietType.NON_VEG, dayConfig);
  const showDetailed = isVegEnabled && isNonVegEnabled;

  const isAdmin = userRole === UserRole.ADMIN;
  const isFuture = isMealInFuture(dayId, mealType, dayConfig);

  const isServedDisabled = isDone || isFuture || !isStillCurrent;

  const anyCurrentMealEnabled = dayConfig.some(d => d.enabled && (
    (d[MealType.BREAKFAST].enabled && isMealCurrent(d.id, MealType.BREAKFAST, dayConfig)) ||
    (d[MealType.LUNCH].enabled && isMealCurrent(d.id, MealType.LUNCH, dayConfig)) ||
    (d[MealType.DINNER].enabled && isMealCurrent(d.id, MealType.DINNER, dayConfig))
  ));

  const isMealEditableForAdmin = isAdmin && (!anyCurrentMealEnabled ? !isDone : (isMealCurrent(dayId, mealType, dayConfig) || isFuture));

  const singleFieldPlanned = isVegEnabled ? "guestVeg" : "guestNonVeg";
  const singleFieldTaken = isVegEnabled ? "guestVegTaken" : "guestNonVegTaken";

  const isUltraNarrow = width < 360;
  const cardMaxWidth = Math.min(width * 0.94, 500);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={{
        flex: 1,
        backgroundColor: theme.colors.shadow + "CC",
        justifyContent: "center",
        alignItems: "center",
        padding: 12
      }}>
        <View style={{
          width: "100%",
          maxWidth: cardMaxWidth,
          maxHeight: "88%",
          backgroundColor: theme.colors.surface,
          borderRadius: 20,
          padding: 16,
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
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: 8 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Section 1: Combined Red Festive Header & Summary Card */}
            <View style={{
              padding: 12,
              borderRadius: 14,
              backgroundColor: (isStillCurrent && !isDone) ? theme.colors.primary : theme.colors.textMuted,
              borderColor: (isStillCurrent && !isDone) ? theme.colors.primary : theme.colors.textMuted,
              borderWidth: 1,
              gap: 6,
              ...Platform.select({
                ios: {
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 6,
                },
                android: { elevation: 4 },
                web: { boxShadow: `0 3px 10px ${theme.colors.primary}33` }
              })
            }}>
              {/* Heading: Title + Day/Meal + LIVE Badge */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
                  <Ionicons name="people" size={16} color={theme.colors.white} />
                  <Text style={{ fontSize: 12, fontWeight: "900", color: theme.colors.white, textTransform: "uppercase", letterSpacing: 0.5, flex: 1, flexWrap: "wrap" }}>
                    {UI_TEXT.guestCheckout}{UI_TEXT.space}{UI_TEXT.pipe}{UI_TEXT.space}{dayLabel}{UI_TEXT.space}{UI_TEXT.hyphen}{UI_TEXT.space}{mealLabel}
                  </Text>
                </View>

                <View style={{ backgroundColor: theme.colors.white + "33", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 9, fontWeight: "900", color: theme.colors.white }}>
                    {(isStillCurrent && !isDone) ? UI_TEXT.live.toUpperCase() : (isDone ? UI_TEXT.mealDoneLabel.toUpperCase() : "INACTIVE")}
                  </Text>
                </View>
              </View>

              {/* Headcount Metrics */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.white }}>
                  {UI_TEXT.planned}{UI_TEXT.colon}{UI_TEXT.space}{guestTotal}
                  {UI_TEXT.pipe}
                  {UI_TEXT.served}{UI_TEXT.colon}{UI_TEXT.space}{guestTaken}
                </Text>

                <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.white, opacity: 0.9 }}>
                  {UI_TEXT.pending}{UI_TEXT.colon}{UI_TEXT.space}{guestPending}
                </Text>
              </View>
            </View>

            {/* Section 2: Guest Counter Inputs Card Container */}
            <View style={{
              padding: 10,
              borderRadius: 14,
              backgroundColor: theme.themeType === AppThemeMode.DARK ? "rgba(27, 45, 36, 0.5)" : "rgba(235, 251, 238, 0.7)",
              borderColor: theme.cardColors[2].border,
              borderWidth: 1.5,
              gap: 8,
            }}>
              {showDetailed ? (
                <View style={{ gap: 6 }}>
                  {/* Veg Row: Planned & Served side-by-side */}
                  <View style={{ flexDirection: isUltraNarrow ? "column" : "row", gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <CounterInput
                        label={`${UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.planned}`}
                        value={guestVeg}
                        min={guestVegTaken}
                        disabled={!isMealEditableForAdmin}
                        onChange={(val) => updateGuestCountDebounced(dayId, mealType, "guestVeg", val)}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <CounterInput
                        label={`${UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.served}`}
                        value={guestVegTaken}
                        min={0}
                        max={guestVeg}
                        disabled={isServedDisabled}
                        onChange={(val) => updateGuestCountDebounced(dayId, mealType, "guestVegTaken", val)}
                      />
                    </View>
                  </View>

                  {/* Non-Veg Row: Planned & Served side-by-side */}
                  <View style={{ flexDirection: isUltraNarrow ? "column" : "row", gap: 8 }}>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <CounterInput
                        label={`${UI_TEXT.nonVeg}${UI_TEXT.space}${UI_TEXT.planned}`}
                        value={guestNonVeg}
                        min={guestNonVegTaken}
                        disabled={!isMealEditableForAdmin}
                        onChange={(val) => updateGuestCountDebounced(dayId, mealType, "guestNonVeg", val)}
                      />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <CounterInput
                        label={`${UI_TEXT.nonVeg}${UI_TEXT.space}${UI_TEXT.served}`}
                        value={guestNonVegTaken}
                        min={0}
                        max={guestNonVeg}
                        disabled={isServedDisabled}
                        onChange={(val) => updateGuestCountDebounced(dayId, mealType, "guestNonVegTaken", val)}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: isUltraNarrow ? "column" : "row", gap: 8 }}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <CounterInput
                      label={UI_TEXT.plannedTotal}
                      value={guestTotal}
                      min={guestTaken}
                      disabled={!isMealEditableForAdmin}
                      onChange={(val) => updateGuestCountDebounced(dayId, mealType, singleFieldPlanned, val)}
                    />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <CounterInput
                      label={UI_TEXT.totalServed}
                      value={guestTaken}
                      min={0}
                      max={guestTotal}
                      disabled={isServedDisabled}
                      onChange={(val) => updateGuestCountDebounced(dayId, mealType, singleFieldTaken, val)}
                    />
                  </View>
                </View>
              )}
            </View>

            {/* Action Buttons */}
            <View style={modalStyles.actionRow}>
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  modalStyles.closeButton,
                  {
                    backgroundColor: theme.colors.primary,
                  },
                  Platform.select({
                    ios: {
                      shadowColor: theme.colors.primary,
                      shadowOffset: { width: 0, height: 3 },
                      shadowOpacity: 0.25,
                      shadowRadius: 5,
                    },
                    android: { elevation: 3 },
                    web: { boxShadow: `0 3px 10px ${theme.colors.primary}33` }
                  }),
                  pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] }
                ]}
              >
                <Ionicons name="checkmark-circle-outline" size={16} color={theme.colors.white} />
                <Text style={[modalStyles.closeText, { color: theme.colors.white }]}>
                  {UI_TEXT.close}
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
    marginTop: 10,
    marginBottom: 2,
  },
  closeButton: {
    width: "100%",
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 6,
  },
  closeText: {
    fontSize: 14,
    fontWeight: "800",
  },
});
