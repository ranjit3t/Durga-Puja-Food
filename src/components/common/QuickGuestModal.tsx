/**
 * Reusable Quick Guest Modal component for live/current meals.
 * Opens automatically over Guest Management Screen when launched from Home Screen.
 * Provides instant optimistic updates, debounced database persistence, and activity logging.
 */
import React from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  ScrollView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "../../context/DatabaseContext";
import { useAuth } from "../../context/AuthContext";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import {
  MealType,
  DietType,
  UserRole,
  AppThemeMode,
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

  if (!visible || !currentMealInfo) return null;

  const { dayId, mealType, dayLabel, mealLabel } = currentMealInfo;
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
  const isDone = isMealDone(dayId, mealType, dayConfig);
  const isFuture = isMealInFuture(dayId, mealType, dayConfig);

  const anyCurrentMealEnabled = dayConfig.some(d => d.enabled && (
    (d[MealType.BREAKFAST].enabled && isMealCurrent(d.id, MealType.BREAKFAST, dayConfig)) ||
    (d[MealType.LUNCH].enabled && isMealCurrent(d.id, MealType.LUNCH, dayConfig)) ||
    (d[MealType.DINNER].enabled && isMealCurrent(d.id, MealType.DINNER, dayConfig))
  ));

  const isMealEditableForAdmin = isAdmin && (!anyCurrentMealEnabled ? !isDone : (isMealCurrent(dayId, mealType, dayConfig) || isFuture));

  const singleFieldPlanned = isVegEnabled ? "guestVeg" : "guestNonVeg";
  const singleFieldTaken = isVegEnabled ? "guestVegTaken" : "guestNonVegTaken";

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
        padding: 16
      }}>
        <View style={{
          width: "100%",
          maxWidth: 420,
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
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.primary,
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
              {/* Heading: Title + Day/Meal + LIVE Badge + Close Icon */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, paddingRight: 6 }}>
                  <Ionicons name="people" size={15} color={theme.colors.white} />
                  <Text style={{ fontSize: 12, fontWeight: "900", color: theme.colors.white, textTransform: "uppercase", letterSpacing: 0.5 }} numberOfLines={1}>
                    {UI_TEXT.guestCheckout}{UI_TEXT.space}{UI_TEXT.pipe}{UI_TEXT.space}{dayLabel}{UI_TEXT.space}{UI_TEXT.hyphen}{UI_TEXT.space}{mealLabel}
                  </Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ backgroundColor: theme.colors.white + "33", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: "900", color: theme.colors.white }}>
                      {UI_TEXT.live.toUpperCase()}
                    </Text>
                  </View>
                  <Pressable onPress={onClose} style={{ padding: 2 }}>
                    <Ionicons name="close" size={18} color={theme.colors.white} />
                  </Pressable>
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

            {/* Section 2: Guest Counter Inputs Card (2-Column Side-By-Side Layout) */}
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
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <CounterInput
                        label={`${UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.planned}`}
                        value={guestVeg}
                        min={guestVegTaken}
                        disabled={!isMealEditableForAdmin}
                        onChange={(val) => updateGuestCountDebounced(dayId, mealType, "guestVeg", val)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CounterInput
                        label={`${UI_TEXT.veg}${UI_TEXT.space}${UI_TEXT.served}`}
                        description={`${UI_TEXT.maxLimit}${UI_TEXT.colon}${UI_TEXT.space}${guestVeg}`}
                        value={guestVegTaken}
                        min={0}
                        max={guestVeg}
                        disabled={isDone || isFuture}
                        onChange={(val) => updateGuestCountDebounced(dayId, mealType, "guestVegTaken", val)}
                      />
                    </View>
                  </View>

                  {/* Non-Veg Row: Planned & Served side-by-side */}
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <View style={{ flex: 1 }}>
                      <CounterInput
                        label={`${UI_TEXT.nonVeg}${UI_TEXT.space}${UI_TEXT.planned}`}
                        value={guestNonVeg}
                        min={guestNonVegTaken}
                        disabled={!isMealEditableForAdmin}
                        onChange={(val) => updateGuestCountDebounced(dayId, mealType, "guestNonVeg", val)}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <CounterInput
                        label={`${UI_TEXT.nonVeg}${UI_TEXT.space}${UI_TEXT.served}`}
                        description={`${UI_TEXT.maxLimit}${UI_TEXT.colon}${UI_TEXT.space}${guestNonVeg}`}
                        value={guestNonVegTaken}
                        min={0}
                        max={guestNonVeg}
                        disabled={isDone || isFuture}
                        onChange={(val) => updateGuestCountDebounced(dayId, mealType, "guestNonVegTaken", val)}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                <View style={{ flexDirection: "row", gap: 8 }}>
                  <View style={{ flex: 1 }}>
                    <CounterInput
                      label={UI_TEXT.plannedTotal}
                      value={guestTotal}
                      min={guestTaken}
                      disabled={!isMealEditableForAdmin}
                      onChange={(val) => updateGuestCountDebounced(dayId, mealType, singleFieldPlanned, val)}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <CounterInput
                      label={UI_TEXT.totalServed}
                      description={`${UI_TEXT.maxLimit}${UI_TEXT.colon}${UI_TEXT.space}${guestTotal}`}
                      value={guestTaken}
                      min={0}
                      max={guestTotal}
                      disabled={isDone || isFuture}
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
