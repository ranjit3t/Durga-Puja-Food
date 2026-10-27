/**
 * Application Settings Screen for Admins.
 * Allows managing the festival day configuration, enabling/disabling meals, dietary choices, and parcels.
 */
import React, { useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
  TextInput,
  Switch,
  Modal,
} from "react-native";
import { useStyles, useScaling } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { ConfigDay, PaymentConfig, AppScreen, PaymentMode, AppThemeMode, ActivityModule, ActivityAction, DietaryOption, MealSlot, DietaryVariety } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { UserGreeting } from "../components/common/UserGreeting";
import { ActionLabel } from "../components/common/ActionLabel";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useCoreDatabase, useActivityLogs } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";
import { getPaymentModeLabel, getMealLabel, getMealConstraints, getMealVarieties, isMealEnabled, isMealDone } from "../constants";
import { calculateSeasonVendorTotals, formatCurrencyAmount } from "../utils/paymentUtils";
import { MealConfig, MealType, DietType } from "../domain";

type PresetColor = {
  hex: string;
  name: string;
};

const COLOR_PALETTE: PresetColor[] = [
  { hex: "#16A34A", name: "Emerald Green" },
  { hex: "#15803D", name: "Forest Green" },
  { hex: "#0D9488", name: "Teal Blue" },
  { hex: "#2563EB", name: "Royal Blue" },
  { hex: "#4F46E5", name: "Indigo Purple" },
  { hex: "#9333EA", name: "Deep Purple" },
  { hex: "#C026D3", name: "Fuchsia Pink" },
  { hex: "#E11D48", name: "Crimson Red" },
  { hex: "#EA580C", name: "Sunset Orange" },
  { hex: "#CA8A04", name: "Amber Gold" },
];

function VarietyModal({
  visible,
  editingVariety,
  allowedDietTypes,
  onClose,
  onSave,
  theme,
}: {
  visible: boolean;
  editingVariety: { dayId: string; mealKey: MealType; variety: DietaryVariety | null } | null;
  allowedDietTypes: DietType[];
  onClose: () => void;
  onSave: (dayId: string, mealKey: MealType, varId: string | null, name: string, type: DietType, color: string) => void;
  theme: any;
}) {
  const [name, setName] = useState("");
  const [type, setType] = useState<DietType>(DietType.VEG);
  const [color, setColor] = useState(COLOR_PALETTE[0].hex);
  const [hoveredColor, setHoveredColor] = useState<string | null>(null);

  React.useEffect(() => {
    if (editingVariety) {
      if (editingVariety.variety) {
        setName(editingVariety.variety.name);
        setType(editingVariety.variety.type);
        setColor(editingVariety.variety.color || (editingVariety.variety.type === DietType.VEG ? theme.colors.veg : theme.colors.nonVeg));
      } else {
        setName("");
        const defaultType = allowedDietTypes.includes(DietType.VEG) ? DietType.VEG : allowedDietTypes[0] || DietType.VEG;
        setType(defaultType);
        setColor(defaultType === DietType.VEG ? theme.colors.veg : theme.colors.nonVeg);
      }
    }
  }, [editingVariety, allowedDietTypes, theme]);

  if (!visible || !editingVariety) return null;

  const activeColorName = COLOR_PALETTE.find((c) => c.hex.toLowerCase() === color.trim().toLowerCase())?.name || "Custom Color";

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
        <View style={{ width: "100%", maxWidth: 380, backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, borderWidth: 1, borderColor: theme.colors.border, gap: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary }}>
              {editingVariety.variety ? UI_TEXT.editVariety : UI_TEXT.addVariety}
            </Text>
            <Pressable onPress={onClose} accessible={true} accessibilityRole="button" accessibilityLabel={UI_TEXT.cancel}>
              <Ionicons name="close" size={22} color={theme.colors.textSecondary} />
            </Pressable>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary }}>
              {UI_TEXT.varietyNameLabel} (Max 15 chars)
            </Text>
            <TextInput
              accessible={true}
              accessibilityLabel={UI_TEXT.varietyNameLabel}
              accessibilityHint={UI_TEXT.varietyNamePlaceholder}
              style={{ height: 44, borderRadius: 12, backgroundColor: theme.colors.background, borderWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 12, fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary }}
              value={name}
              onChangeText={setName}
              placeholder={UI_TEXT.varietyNamePlaceholder}
              placeholderTextColor={theme.colors.textMuted}
              maxLength={15}
              selectTextOnFocus
            />
          </View>

          <View style={{ gap: 6 }}>
            <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary }}>
              {UI_TEXT.dietaryCategoryType}
            </Text>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {allowedDietTypes.includes(DietType.VEG) && (
                <Pressable
                  onPress={() => {
                    setType(DietType.VEG);
                    setColor(theme.colors.veg);
                  }}
                  style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: type === DietType.VEG ? theme.colors.veg : theme.colors.background, borderWidth: 1, borderColor: type === DietType.VEG ? theme.colors.veg : theme.colors.border, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontWeight: "900", fontSize: 13, color: type === DietType.VEG ? theme.colors.white : theme.colors.textSecondary }}>
                    {UI_TEXT.veg.toUpperCase()}
                  </Text>
                </Pressable>
              )}
              {allowedDietTypes.includes(DietType.NON_VEG) && (
                <Pressable
                  onPress={() => {
                    setType(DietType.NON_VEG);
                    setColor(theme.colors.nonVeg);
                  }}
                  style={{ flex: 1, height: 40, borderRadius: 10, backgroundColor: type === DietType.NON_VEG ? theme.colors.nonVeg : theme.colors.background, borderWidth: 1, borderColor: type === DietType.NON_VEG ? theme.colors.nonVeg : theme.colors.border, alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ fontWeight: "900", fontSize: 13, color: type === DietType.NON_VEG ? theme.colors.white : theme.colors.textSecondary }}>
                    {UI_TEXT.nonVeg.toUpperCase()}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          <View style={{ gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary }}>
                {UI_TEXT.colorCodeLabel}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.primary }}>
                {activeColorName}
              </Text>
            </View>
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
              {COLOR_PALETTE.map((c) => {
                const isSelected = color.trim().toLowerCase() === c.hex.toLowerCase();
                return (
                  <Pressable
                    key={c.hex}
                    onPress={() => setColor(c.hex)}
                    onHoverIn={() => setHoveredColor(c.hex)}
                    onHoverOut={() => setHoveredColor(null)}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityState={{ selected: isSelected }}
                    accessibilityLabel={`${UI_TEXT.colorCodeLabel}: ${c.name}`}
                    style={({ pressed }) => [
                      {
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        backgroundColor: c.hex,
                        borderWidth: isSelected ? 3 : 1,
                        borderColor: isSelected ? theme.colors.textPrimary : theme.colors.border,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      pressed && { opacity: 0.8 },
                    ]}
                  >
                    {isSelected && <Ionicons name="checkmark" size={16} color={theme.colors.white} />}
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ flexDirection: "row", gap: 10, marginTop: 8 }}>
            <Pressable
              onPress={onClose}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.cancel}
              style={{ flex: 1, height: 42, borderRadius: 12, backgroundColor: theme.colors.surfaceDark, borderWidth: 1, borderColor: theme.colors.border, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontWeight: "800", color: theme.colors.textPrimary, fontSize: 14 }}>{UI_TEXT.cancel}</Text>
            </Pressable>
            <Pressable
              onPress={() => onSave(editingVariety.dayId, editingVariety.mealKey, editingVariety.variety?.id || null, name, type, color)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.saveChanges}
              style={{ flex: 1.5, height: 42, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontWeight: "900", color: theme.colors.white, fontSize: 14 }}>{UI_TEXT.saveChanges}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function SettingsScreen() {
  const { handleLogout } = useAuth();
  const {
    dayConfig: config, seasonName, seasonEnabled, paymentConfig: payment, freeMealEnabled, mobileEnabled, foodPriceEnabled,
    whatsappCountryCode, updateConfig, kidsEnabled, guestsEnabled, vendorKidsMealChargingEnabled, subscriptions, foodMenu, quickCheckoutAutoCloseMs, soundEnabled,
    vendorName, vendorAddress, vendorSettledCost, nonAdminCheckoutEnabled, cheatCodeEnabled
  } = useCoreDatabase();
  const { addActivityLog } = useActivityLogs();
  const { showAlert } = useUI();
  const { navigate, goBack } = useAppNavigation();

  const styles = useStyles();
  const { s } = useScaling();
  const { theme, themeType } = useAppTheme();

  const [localConfig, setLocalConfig] = useState<ConfigDay[]>([]);
  const [localSeasonName, setLocalSeasonName] = useState("");
  const [localSeasonEnabled, setLocalSeasonEnabled] = useState(true);
  const [localPayment, setLocalPayment] = useState<PaymentConfig>({
    enabled: true,
    options: { upi: true, cash: true, bankTransfer: true }
  });
  const [localFreeMealEnabled, setLocalFreeMealEnabled] = useState(true);
  const [localMobileEnabled, setLocalMobileEnabled] = useState(true);
  const [localFoodPriceEnabled, setLocalFoodPriceEnabled] = useState(false);
  const [localKidsEnabled, setLocalKidsEnabled] = useState(false);
  const [localGuestsEnabled, setLocalGuestsEnabled] = useState(false);
  const [localVendorKidsMealChargingEnabled, setLocalVendorKidsMealChargingEnabled] = useState(true);
  const [localWhatsappCountryCode, setLocalWhatsappCountryCode] = useState(UI_TEXT.defaultCountryCode);
  const [localQuickCheckoutAutoCloseMs, setLocalQuickCheckoutAutoCloseMs] = useState<number>(3000);
  const [localSoundEnabled, setLocalSoundEnabled] = useState<boolean>(true);
  const [localNonAdminCheckoutEnabled, setLocalNonAdminCheckoutEnabled] = useState<boolean>(true);
  const [localCheatCodeEnabled, setLocalCheatCodeEnabled] = useState<boolean>(false);
  const [localVendorName, setLocalVendorName] = useState("");
  const [localVendorAddress, setLocalVendorAddress] = useState("");
  const [localVendorSettledCost, setLocalVendorSettledCost] = useState("");
  const [saving, setSaving] = useState(false);

  // Saved baseline state representing the current persisted configuration
  const [savedBaseline, setSavedBaseline] = useState<{
    config: ConfigDay[];
    seasonName: string;
    seasonEnabled: boolean;
    payment: PaymentConfig;
    freeMealEnabled: boolean;
    mobileEnabled: boolean;
    foodPriceEnabled: boolean;
    kidsEnabled: boolean;
    guestsEnabled: boolean;
    vendorKidsMealChargingEnabled: boolean;
    whatsappCountryCode: string;
    quickCheckoutAutoCloseMs: number;
    soundEnabled: boolean;
    nonAdminCheckoutEnabled: boolean;
    cheatCodeEnabled: boolean;
    vendorName: string;
    vendorAddress: string;
    vendorSettledCost: string;
  } | null>(null);

  const [editingVarietyModal, setEditingVarietyModal] = useState<{
    dayId: string;
    mealKey: MealType;
    variety: DietaryVariety | null;
  } | null>(null);

  const currentEditingAllowedTypes = useMemo(() => {
    if (!editingVarietyModal) return [DietType.VEG, DietType.NON_VEG];
    const day = localConfig.find((d) => d.id === editingVarietyModal.dayId);
    if (!day) return [DietType.VEG, DietType.NON_VEG];
    const m = day[editingVarietyModal.mealKey];
    const isVegAllowed = day.enabled && m.enabled && (m.veg || day.vegOnly);
    const isNonVegAllowed = day.enabled && m.enabled && !day.vegOnly && m.nonVeg;

    const res: DietType[] = [];
    if (isVegAllowed) res.push(DietType.VEG);
    if (isNonVegAllowed) res.push(DietType.NON_VEG);
    return res.length > 0 ? res : [DietType.VEG, DietType.NON_VEG];
  }, [editingVarietyModal, localConfig]);

  const handleSaveVariety = (
    dayId: string,
    mealKey: MealType,
    varId: string | null,
    name: string,
    type: DietType,
    color: string
  ) => {
    const trimmedName = name.trim().slice(0, 15);
    if (!trimmedName) {
      showAlert("Invalid Name", "Please enter a valid variety name (up to 15 characters).");
      return;
    }

    const day = localConfig.find((d) => d.id === dayId);
    if (!day) return;
    const m = day[mealKey];

    const isVegAllowed = day.enabled && m.enabled && (m.veg || day.vegOnly);
    const isNonVegAllowed = day.enabled && m.enabled && !day.vegOnly && m.nonVeg;

    if (type === DietType.VEG && !isVegAllowed) {
      showAlert("Not Allowed", "Veg sub-categories are not enabled for this meal.");
      return;
    }
    if (type === DietType.NON_VEG && !isNonVegAllowed) {
      showAlert("Not Allowed", "Non-Veg sub-categories are not enabled for this meal.");
      return;
    }

    const currentVarieties = getMealVarieties(m, day.vegOnly);

    let nextVarieties: DietaryVariety[] = [];
    if (varId) {
      nextVarieties = currentVarieties.map((v) =>
        v.id === varId ? { ...v, name: trimmedName, type, color } : v
      );
    } else {
      if (currentVarieties.length >= 10) {
        showAlert("Limit Reached", "Maximum 10 dietary varieties allowed per meal.");
        return;
      }
      const newId = `v_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
      const newVar: DietaryVariety = {
        id: newId,
        name: trimmedName,
        type,
        color,
      };
      nextVarieties = [...currentVarieties, newVar];
    }

    updateMealConfig(dayId, mealKey, { varieties: nextVarieties });
    setEditingVarietyModal(null);
  };

  const handleDeleteVariety = (dayId: string, mealKey: MealType, variety: DietaryVariety) => {
    const day = localConfig.find((d) => d.id === dayId);
    if (!day) return;
    const m = day[mealKey];
    const currentVarieties = getMealVarieties(m);

    if (currentVarieties.length <= 1) {
      showAlert("Cannot Delete", "At least one dietary variety must remain enabled for the meal.");
      return;
    }

    const isSubscribed = (subscriptions || []).some((sub) => {
      const slots = sub.mealSlots?.[dayId] || [];
      return slots.some((s) => {
        const choice = s[mealKey];
        if (choice === variety.id) return true;
        if ((variety.id === "veg_default" || variety.isDefault) && variety.type === DietType.VEG && (choice === DietaryOption.VEG || choice === "veg")) return true;
        if ((variety.id === "nonVeg_default" || variety.isDefault) && variety.type === DietType.NON_VEG && (choice === DietaryOption.NON_VEG || choice === "nonVeg")) return true;
        return false;
      });
    });

    if (isSubscribed) {
      showAlert(
        UI_TEXT.confirmDisableTitle,
        `Cannot delete sub-category "${variety.name}" as it is currently subscribed in active pass(es).`
      );
      return;
    }

    showAlert("Delete Sub-Category", `Are you sure you want to delete "${variety.name}"?`, [
      { text: UI_TEXT.cancel, style: "cancel" },
      {
        text: UI_TEXT.removeButton,
        style: "destructive",
        onPress: () => {
          const nextVarieties = currentVarieties.filter((v) => v.id !== variety.id);
          updateMealConfig(dayId, mealKey, { varieties: nextVarieties });
        },
      },
    ]);
  };

  const activeDaysList = useMemo(() => {
    return localConfig.filter(d => d.enabled).map(d => d.id);
  }, [localConfig]);

  const { expectedTotal, actualTotal } = useMemo(() => {
    return calculateSeasonVendorTotals(
      activeDaysList,
      foodMenu,
      localConfig,
      subscriptions,
      localKidsEnabled,
      localGuestsEnabled,
      [],
      localVendorKidsMealChargingEnabled,
      localFreeMealEnabled
    );
  }, [activeDaysList, foodMenu, localConfig, subscriptions, localKidsEnabled, localGuestsEnabled, localVendorKidsMealChargingEnabled, localFreeMealEnabled]);

  const areAllMealsDone = useMemo(() => {
    const activeDays = localConfig.filter(d => d.enabled);
    if (activeDays.length === 0) return false;
    return activeDays.every(day => {
      return [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].every(mealType => {
        if (!isMealEnabled(day.id, mealType, localConfig)) return true;
        return isMealDone(day.id, mealType, localConfig);
      });
    });
  }, [localConfig]);

  // Sync saved baseline & local state when database config is loaded
  React.useLayoutEffect(() => {
    if (config) {
      const currentContextBaseline = {
        config: Array.isArray(config) ? JSON.parse(JSON.stringify(config)) : [],
        seasonName: seasonName || "",
        seasonEnabled,
        payment: payment ? JSON.parse(JSON.stringify(payment)) : { enabled: true, options: { upi: true, cash: true, bankTransfer: true } },
        freeMealEnabled,
        mobileEnabled,
        foodPriceEnabled,
        kidsEnabled: kidsEnabled || false,
        guestsEnabled: guestsEnabled || false,
        vendorKidsMealChargingEnabled: vendorKidsMealChargingEnabled !== false,
        whatsappCountryCode: whatsappCountryCode || UI_TEXT.defaultCountryCode,
        quickCheckoutAutoCloseMs: quickCheckoutAutoCloseMs ?? 3000,
        soundEnabled: soundEnabled !== false,
        nonAdminCheckoutEnabled: nonAdminCheckoutEnabled !== false,
        cheatCodeEnabled: cheatCodeEnabled || false,
        vendorName: vendorName || "",
        vendorAddress: vendorAddress || "",
        vendorSettledCost: vendorSettledCost || "",
      };

      if (!savedBaseline) {
        setLocalConfig(JSON.parse(JSON.stringify(currentContextBaseline.config)));
        setLocalSeasonName(currentContextBaseline.seasonName);
        setLocalSeasonEnabled(currentContextBaseline.seasonEnabled);
        setLocalPayment(JSON.parse(JSON.stringify(currentContextBaseline.payment)));
        setLocalFreeMealEnabled(currentContextBaseline.freeMealEnabled);
        setLocalMobileEnabled(currentContextBaseline.mobileEnabled);
        setLocalFoodPriceEnabled(currentContextBaseline.foodPriceEnabled);
        setLocalKidsEnabled(currentContextBaseline.kidsEnabled);
        setLocalGuestsEnabled(currentContextBaseline.guestsEnabled);
        setLocalVendorKidsMealChargingEnabled(currentContextBaseline.vendorKidsMealChargingEnabled);
        setLocalWhatsappCountryCode(currentContextBaseline.whatsappCountryCode);
        setLocalQuickCheckoutAutoCloseMs(currentContextBaseline.quickCheckoutAutoCloseMs);
        setLocalSoundEnabled(currentContextBaseline.soundEnabled);
        setLocalNonAdminCheckoutEnabled(currentContextBaseline.nonAdminCheckoutEnabled);
        setLocalCheatCodeEnabled(currentContextBaseline.cheatCodeEnabled);
        setLocalVendorName(currentContextBaseline.vendorName);
        setLocalVendorAddress(currentContextBaseline.vendorAddress);
        setLocalVendorSettledCost(currentContextBaseline.vendorSettledCost);
      }
      setSavedBaseline(currentContextBaseline);
    }
  }, [config, seasonName, seasonEnabled, payment, freeMealEnabled, mobileEnabled, foodPriceEnabled, kidsEnabled, guestsEnabled, vendorKidsMealChargingEnabled, whatsappCountryCode, quickCheckoutAutoCloseMs, soundEnabled, nonAdminCheckoutEnabled, cheatCodeEnabled, vendorName, vendorAddress, vendorSettledCost]);

  const updateDay = (id: string, next: Partial<ConfigDay>) => {
    setLocalConfig((current) =>
      (current || []).map((d) => {
        if (d && d.id === id) {
          const updated = { ...d, ...next };

          // If day is disabled, no meal can be current
          if (next.enabled === false) {
            updated[MealType.BREAKFAST] = { ...updated[MealType.BREAKFAST], current: false };
            updated[MealType.LUNCH] = { ...updated[MealType.LUNCH], current: false };
            updated[MealType.DINNER] = { ...updated[MealType.DINNER], current: false };
          }

          return updated;
        }
        return d;
      })
    );
  };

  const getMealConstraints = (dayId: string, mealKey: MealType, configToCheck: ConfigDay[]) => {
    let anyFutureDone = false;
    let pastDone = false;
    let canUnmarkCurrent = true;

    const sortedDays = configToCheck.filter(d => d.enabled);
    const dayIdx = sortedDays.findIndex(d => d.id === dayId);
    const mealKeys: MealType[] = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];
    const mealIdx = mealKeys.indexOf(mealKey);

    sortedDays.forEach((d, dIndex) => {
      mealKeys.forEach((m, mIndex) => {
        const mObj = d[m];
        if (!mObj.enabled) return;

        const isLater = dIndex > dayIdx || (dIndex === dayIdx && mIndex > mealIdx);
        const isEarlier = dIndex < dayIdx || (dIndex === dayIdx && mIndex < mealIdx);

        if (isLater && mObj.done) anyFutureDone = true;
        if (isEarlier && !mObj.done) pastDone = true;
      });
    });

    const currentDay = sortedDays[dayIdx];
    if (currentDay) {
      mealKeys.forEach((m, mIndex) => {
        if (mIndex < mealIdx && currentDay[m].enabled && !currentDay[m].done) {
          pastDone = true;
        }
      });
    }

    return { anyFutureDone, pastDone, canUnmarkCurrent };
  };

  const getMealDoneConstraints = (dayId: string, mealKey: MealType, configToCheck: ConfigDay[]) => {
    let canMarkDone = true;
    let canUnmarkDone = true;
    const { anyFutureDone, pastDone } = getMealConstraints(dayId, mealKey, configToCheck);
    if (anyFutureDone) canUnmarkDone = false;
    if (pastDone) canMarkDone = false;
    return { canMarkDone, canUnmarkDone };
  };

  const validateAndSetSeasonEnabled = (val: boolean) => {
    if (!val) {
      const anyMealNotDoneOrEnabled = localConfig.some(d =>
        d.enabled && [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => d[m].enabled && !d[m].done)
      );
      if (anyMealNotDoneOrEnabled) {
        showAlert(
          UI_TEXT.warning,
          UI_TEXT.lockSeasonConstraintWarning || "Cannot lock season while active or uncompleted meals remain. Mark all meals as completed first."
        );
        return;
      }
    }
    setLocalSeasonEnabled(val);
  };

  const validateAndSetPaymentEnabled = (val: boolean) => {
    if (!val) {
      const hasPayments = (subscriptions || []).some(s => parseFloat(s.amount || "0") > 0 || (s.payments && s.payments.some(p => parseFloat(p.amount || "0") > 0)));
      if (hasPayments) {
        showAlert(
          UI_TEXT.warning,
          UI_TEXT.disablePaymentConstraintWarning || "Cannot disable payment integration when active subscription payments exist."
        );
        return;
      }
    }
    setLocalPayment({ ...localPayment, enabled: val });
  };

  const validateAndSetKidsEnabled = (val: boolean) => {
    if (!val) {
      const hasKids = (subscriptions || []).some(s => (s.kidsCount || 0) > 0);
      if (hasKids) {
        showAlert(
          UI_TEXT.warning,
          UI_TEXT.disableKidsConstraintWarning || "Cannot disable kids support when active passes have registered kids."
        );
        return;
      }
    }
    setLocalKidsEnabled(val);
  };

  const validateAndSetGuestsEnabled = (val: boolean) => {
    if (!val) {
      const hasGuests = (subscriptions || []).some(s => (s.guestsCount || 0) > 0);
      if (hasGuests) {
        showAlert(
          UI_TEXT.warning,
          UI_TEXT.disableGuestsConstraintWarning || "Cannot disable guests support when active passes have registered guests."
        );
        return;
      }
    }
    setLocalGuestsEnabled(val);
  };

  const validateAndSetFreeMealEnabled = (val: boolean) => {
    if (!val) {
      const hasFreeMeals = (foodMenu && Object.values(foodMenu).some((d: any) =>
        Object.values(d || {}).some((m: any) => (m.freeMealVeg || 0) > 0 || (m.freeMealNonVeg || 0) > 0)
      ));
      if (hasFreeMeals) {
        showAlert(
          UI_TEXT.warning,
          UI_TEXT.disableFreeMealConstraintWarning || "Cannot disable Free Meal Desk when free meal quotas are configured."
        );
        return;
      }
    }
    setLocalFreeMealEnabled(val);
  };

  const validateAndSetMobileEnabled = (val: boolean) => {
    if (!val) {
      const hasMobile = (subscriptions || []).some(s => !!s.mobile);
      if (hasMobile) {
        showAlert(
          UI_TEXT.warning,
          UI_TEXT.disableMobileConstraintWarning || "Cannot disable Mobile Number Tracking when registered passes contain mobile numbers."
        );
        return;
      }
    }
    setLocalMobileEnabled(val);
  };

  const validateAndSetFoodPriceEnabled = (val: boolean) => {
    if (!val) {
      const hasPrices = (foodMenu && Object.values(foodMenu).some((d: any) =>
        Object.values(d || {}).some((m: any) => parseFloat(m.vegPrice || "0") > 0 || parseFloat(m.nonVegPrice || "0") > 0)
      ));
      if (hasPrices) {
        showAlert(
          UI_TEXT.warning,
          UI_TEXT.disableFoodPriceConstraintWarning || "Cannot disable Menu Pricing when meal prices are configured."
        );
        return;
      }
    }
    setLocalFoodPriceEnabled(val);
  };

  const validateAndSetPaymentOption = (key: keyof PaymentConfig['options'], mode: PaymentMode, val: boolean) => {
    if (!val) {
      const hasModePayments = (subscriptions || []).some(s =>
        s.paymentMode === mode || (s.payments && s.payments.some(p => p.mode === mode && parseFloat(p.amount || "0") > 0))
      );
      if (hasModePayments) {
        showAlert(
          UI_TEXT.warning,
          UI_TEXT.disablePaymentMethodConstraintWarning.replace("{method}", getPaymentModeLabel(mode)) || `Cannot disable ${getPaymentModeLabel(mode)} when active passes have used this payment method.`
        );
        return;
      }
    }
    setLocalPayment({
      ...localPayment,
      options: { ...localPayment.options, [key]: val }
    });
  };

  const hasAnyPaymentTaken = useMemo(() => {
    return (subscriptions || []).some((sub) => {
      if (sub.payments && sub.payments.length > 0) {
        return sub.payments.some((p) => (parseFloat(p.amount) || 0) > 0);
      }
      return (parseFloat(sub.amount || "0") || 0) > 0;
    });
  }, [subscriptions]);

  const validateAndSetMaxPayments = (newVal: number) => {
    const baselineMax = savedBaseline?.payment?.maxPayments || payment?.maxPayments || 10;
    if (newVal < baselineMax && hasAnyPaymentTaken) {
      showAlert(UI_TEXT.cannotDecreaseMaxPaymentsTitle, UI_TEXT.cannotDecreaseMaxPaymentsMessage);
      return;
    }
    setLocalPayment({
      ...localPayment,
      maxPayments: Math.max(1, Math.min(20, newVal)),
    });
  };

  const updateMealConfig = (
    dayId: string,
    mealKey: MealType,
    next: Partial<MealConfig>
  ) => {
    setLocalConfig((prev) => {
      return (prev || []).map((day) => {
        if (day.id === dayId) {
          const currentMeal = day[mealKey];
          return {
            ...day,
            [mealKey]: { ...currentMeal, ...next },
          };
        }
        return day;
      });
    });
  };

  const validateAndSetEnabled = (dayId: string, mealKey: MealType, val: boolean) => {
    if (!val) {
      const hasSubscribed = (subscriptions || []).some((sub) => {
        const slots = sub.mealSlots?.[dayId] || [];
        return slots.some((s) => s[mealKey] && s[mealKey] !== DietaryOption.NONE);
      });
      if (hasSubscribed) {
        showAlert(UI_TEXT.confirmDisableTitle, "Cannot disable this meal as active passes have subscribed to it.");
        return;
      }
    }
    updateMealConfig(dayId, mealKey, { enabled: val });
  };

  const validateAndSetKidsParcel = (dayId: string, mealKey: MealType, val: boolean) => {
    if (!val) {
      const hasKidsParcel = (subscriptions || []).some((sub) => {
        const slots = sub.mealSlots?.[dayId] || [];
        const adultCount = sub.peopleCount || 0;
        const kCount = kidsEnabled ? (sub.kidsCount || 0) : 0;
        for (let i = adultCount; i < adultCount + kCount; i++) {
          const slot = slots[i];
          if (slot && slot[mealKey] && slot[mealKey] !== DietaryOption.NONE && slot[`${mealKey}Parcel` as keyof MealSlot]) {
            return true;
          }
        }
        return false;
      });
      if (hasKidsParcel) {
        showAlert(UI_TEXT.confirmDisableTitle, "Cannot disable kids parcel as active kids have opted for parcel on this meal.");
        return;
      }
    }
    updateMealConfig(dayId, mealKey, { kidsParcel: val });
  };

  const validateAndSetDone = (dayId: string, mealKey: MealType, val: boolean) => {
    const { canMarkDone, canUnmarkDone } = getMealDoneConstraints(dayId, mealKey, localConfig);
    if (val && !canMarkDone) {
      showAlert(UI_TEXT.warning, "Previous meals or days must be completed first.");
      return;
    }
    if (!val && !canUnmarkDone) {
      showAlert(UI_TEXT.warning, "Cannot unmark as completed because a later meal has already been marked completed.");
      return;
    }
    updateMealConfig(dayId, mealKey, { done: val, current: val ? false : localConfig.find(d => d.id === dayId)?.[mealKey]?.current });
  };

  const validateAndSetCurrent = (dayId: string, mealKey: MealType, val: boolean) => {
    if (val) {
      const isDone = localConfig.find(d => d.id === dayId)?.[mealKey]?.done;
      if (isDone) {
        showAlert(UI_TEXT.warning, "Completed meals cannot be marked as current.");
        return;
      }
      setLocalConfig(prev => prev.map(d => {
        const nextD = { ...d };
        ([MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]).forEach(m => {
          nextD[m] = { ...nextD[m], current: d.id === dayId && m === mealKey ? val : false };
        });
        return nextD;
      }));
    } else {
      updateMealConfig(dayId, mealKey, { current: false });
    }
  };

  const handleAddDay = () => {
    const maxSuffix = localConfig.reduce((max, d) => {
      const match = d.id.match(/^day(\d+)$/i);
      if (match) {
        const num = parseInt(match[1], 10);
        return num > max ? num : max;
      }
      return max;
    }, 0);

    const newId = `day${maxSuffix + 1}`;
    const emptyMeal: MealConfig = { enabled: false, veg: true, nonVeg: true, parcel: false, parcelAlert: false, done: false, current: false };
    const newDay: ConfigDay = {
      id: newId,
      label: `Day ${maxSuffix + 1}`,
      abbr: `D${maxSuffix + 1}`,
      enabled: true,
      vegOnly: false,
      breakfast: { ...emptyMeal },
      lunch: { ...emptyMeal, enabled: true },
      dinner: { ...emptyMeal, enabled: true },
    };

    setLocalConfig([...localConfig, newDay]);
  };

  const handleDeleteDay = (id: string) => {
    showAlert(UI_TEXT.confirmDeleteDay, UI_TEXT.confirmDeleteDayMessage, [
      { text: UI_TEXT.cancel, style: "cancel" },
      {
        text: UI_TEXT.delete,
        style: "destructive",
        onPress: () => {
          setLocalConfig((current) => current.filter((d) => d.id !== id));
        },
      },
    ]);
  };

  const getSettingsChangeLog = () => {
    const changes: string[] = [];
    if (localSeasonName !== seasonName) changes.push(`Name: ${seasonName || 'None'} -> ${localSeasonName}`);
    if (localSeasonEnabled !== seasonEnabled) changes.push(`Status: ${seasonEnabled ? 'Active' : 'Locked'} -> ${localSeasonEnabled ? 'Active' : 'Locked'}`);
    if (localFreeMealEnabled !== freeMealEnabled) changes.push(`Free Meals: ${freeMealEnabled ? 'ON' : 'OFF'} -> ${localFreeMealEnabled ? 'ON' : 'OFF'}`);
    if (localMobileEnabled !== mobileEnabled) changes.push(`Mobile: ${mobileEnabled ? 'ON' : 'OFF'} -> ${localMobileEnabled ? 'ON' : 'OFF'}`);
    if (localFoodPriceEnabled !== foodPriceEnabled) changes.push(`Pricing: ${foodPriceEnabled ? 'ON' : 'OFF'} -> ${localFoodPriceEnabled ? 'ON' : 'OFF'}`);
    if (localKidsEnabled !== kidsEnabled) changes.push(`Kids: ${kidsEnabled ? 'ON' : 'OFF'} -> ${localKidsEnabled ? 'ON' : 'OFF'}`);
    if (localGuestsEnabled !== guestsEnabled) changes.push(`Guests: ${guestsEnabled ? 'ON' : 'OFF'} -> ${localGuestsEnabled ? 'ON' : 'OFF'}`);
    if (localWhatsappCountryCode !== whatsappCountryCode) changes.push(`WA Code: ${whatsappCountryCode} -> ${localWhatsappCountryCode}`);
    if (localQuickCheckoutAutoCloseMs !== quickCheckoutAutoCloseMs) changes.push(`Splash Timeout: ${quickCheckoutAutoCloseMs ?? 3000}ms -> ${localQuickCheckoutAutoCloseMs}ms`);
    if (localSoundEnabled !== soundEnabled) changes.push(`Sound: ${soundEnabled ? 'ON' : 'OFF'} -> ${localSoundEnabled ? 'ON' : 'OFF'}`);
    if (localNonAdminCheckoutEnabled !== nonAdminCheckoutEnabled) changes.push(`Non-Admin Quick Checkout: ${nonAdminCheckoutEnabled ? 'ON' : 'OFF'} -> ${localNonAdminCheckoutEnabled ? 'ON' : 'OFF'}`);
    if (localCheatCodeEnabled !== cheatCodeEnabled) changes.push(`Cheat Code Pass Codes: ${cheatCodeEnabled ? 'ON' : 'OFF'} -> ${localCheatCodeEnabled ? 'ON' : 'OFF'}`);
    if (localVendorName !== vendorName) changes.push(`Vendor Name: ${vendorName || 'None'} -> ${localVendorName}`);
    if (localVendorAddress !== vendorAddress) changes.push(`Vendor Address: ${vendorAddress || 'None'} -> ${localVendorAddress}`);
    if (areAllMealsDone && localVendorSettledCost !== vendorSettledCost) changes.push(`Vendor Settled Cost: ${vendorSettledCost || 'None'} -> ${localVendorSettledCost}`);

    if (JSON.stringify(localPayment) !== JSON.stringify(payment)) {
      if (localPayment.enabled !== payment.enabled) changes.push(`Payment: ${payment.enabled ? 'ON' : 'OFF'} -> ${localPayment.enabled ? 'ON' : 'OFF'}`);
      const oldOpts = Object.entries(payment.options).filter(([_, v]) => v).map(([k]) => k).join(',');
      const newOpts = Object.entries(localPayment.options).filter(([_, v]) => v).map(([k]) => k).join(',');
      if (oldOpts !== newOpts) changes.push(`Methods: [${oldOpts}] -> [${newOpts}]`);
    }

    if (JSON.stringify(localConfig) !== JSON.stringify(config)) {
      const oldIds = (config || []).map(d => d.id);
      const newIds = (localConfig || []).map(d => d.id);

      const added = newIds.filter(id => !oldIds.includes(id));
      const removed = oldIds.filter(id => !newIds.includes(id));

      if (added.length > 0) changes.push(`Added Days: ${added.join(',')}`);
      if (removed.length > 0) changes.push(`Removed Days: ${removed.join(',')}`);

      localConfig.forEach(newDay => {
        const oldDay = (config || []).find(d => d.id === newDay.id);
        if (oldDay && JSON.stringify(oldDay) !== JSON.stringify(newDay)) {
          const dayChanges: string[] = [];
          if (newDay.label !== oldDay.label) dayChanges.push(`Label: ${oldDay.label} -> ${newDay.label}`);
          if (newDay.enabled !== oldDay.enabled) dayChanges.push(`Enabled: ${oldDay.enabled ? 'ON' : 'OFF'}`);
          if (newDay.vegOnly !== oldDay.vegOnly) dayChanges.push(`VegOnly: ${oldDay.vegOnly ? 'ON' : 'OFF'}`);

          ([MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]).forEach(m => {
            const oldM = oldDay[m];
            const newM = newDay[m];
            if (JSON.stringify(oldM) !== JSON.stringify(newM)) {
              const mChanges: string[] = [];
              if (newM.enabled !== oldM.enabled) mChanges.push(`Enabled:${newM.enabled ? 'ON' : 'OFF'}`);
              if (newM.veg !== oldM.veg) mChanges.push(`Veg:${newM.veg ? 'ON' : 'OFF'}`);
              if (newM.nonVeg !== oldM.nonVeg) mChanges.push(`NonVeg:${newM.nonVeg ? 'ON' : 'OFF'}`);
              if (newM.parcel !== oldM.parcel) mChanges.push(`Parcel:${newM.parcel ? 'ON' : 'OFF'}`);
              if (newM.kidsParcel !== oldM.kidsParcel) mChanges.push(`KidsParcel:${newM.kidsParcel ? 'ON' : 'OFF'}`);
              if (newM.dineInFallbackParcel !== oldM.dineInFallbackParcel) mChanges.push(`DineInFallbackParcel:${newM.dineInFallbackParcel ? 'ON' : 'OFF'}`);
              if (newM.parcelAlert !== oldM.parcelAlert) mChanges.push(`ParcelAlert:${newM.parcelAlert ? 'ON' : 'OFF'}`);
              if (newM.done !== oldM.done) mChanges.push(`Done:${newM.done ? 'ON' : 'OFF'}`);
              if (newM.current !== oldM.current) mChanges.push(`Current:${newM.current ? 'ON' : 'OFF'}`);
              dayChanges.push(`Meal ${m}: [${mChanges.join(',')}]`);
            }
          });
          if (dayChanges.length > 0) changes.push(`${newDay.label || newDay.id}: [${dayChanges.join('|')}]`);
        }
      });
    }

    return changes.join('; ');
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const changeLog = getSettingsChangeLog();

      const newBaseline = {
        config: JSON.parse(JSON.stringify(localConfig)),
        seasonName: localSeasonName,
        seasonEnabled: localSeasonEnabled,
        payment: JSON.parse(JSON.stringify(localPayment)),
        freeMealEnabled: localFreeMealEnabled,
        mobileEnabled: localMobileEnabled,
        foodPriceEnabled: localFoodPriceEnabled,
        kidsEnabled: localKidsEnabled,
        guestsEnabled: localGuestsEnabled,
        vendorKidsMealChargingEnabled: localVendorKidsMealChargingEnabled,
        whatsappCountryCode: localWhatsappCountryCode,
        quickCheckoutAutoCloseMs: localQuickCheckoutAutoCloseMs,
        soundEnabled: localSoundEnabled,
        nonAdminCheckoutEnabled: localNonAdminCheckoutEnabled,
        cheatCodeEnabled: localCheatCodeEnabled,
        vendorName: localVendorName,
        vendorAddress: localVendorAddress,
        vendorSettledCost: areAllMealsDone ? localVendorSettledCost : vendorSettledCost,
      };

      await updateConfig({
        seasonName: localSeasonName,
        seasonEnabled: localSeasonEnabled,
        days: localConfig,
        payment: localPayment,
        freeMealEnabled: localFreeMealEnabled,
        mobileEnabled: localMobileEnabled,
        foodPriceEnabled: localFoodPriceEnabled,
        kidsEnabled: localKidsEnabled,
        guestsEnabled: localGuestsEnabled,
        vendorKidsMealChargingEnabled: localVendorKidsMealChargingEnabled,
        whatsappCountryCode: localWhatsappCountryCode,
        quickCheckoutAutoCloseMs: localQuickCheckoutAutoCloseMs,
        soundEnabled: localSoundEnabled,
        nonAdminCheckoutEnabled: localNonAdminCheckoutEnabled,
        cheatCodeEnabled: localCheatCodeEnabled,
        vendorName: localVendorName,
        vendorAddress: localVendorAddress,
        vendorSettledCost: areAllMealsDone ? localVendorSettledCost : vendorSettledCost,
      });

      setSavedBaseline(newBaseline);

      addActivityLog({
        module: ActivityModule.CONFIG,
        action: ActivityAction.UPDATE,
        description: UI_TEXT.logUpdateConfigDetails.replace("{changes}", changeLog || UI_TEXT.logUpdateConfig)
      });

      showAlert(UI_TEXT.success, UI_TEXT.settingsUpdated, [
        { text: UI_TEXT.ok }
      ]);
    } catch (err) {
      console.error("Save settings error:", err);
      showAlert(UI_TEXT.error, UI_TEXT.saveConfigError);
    } finally {
      setSaving(false);
    }
  };

  const hasChanged = useMemo(() => {
    if (!savedBaseline) return false;

    return (
      JSON.stringify(savedBaseline.config) !== JSON.stringify(localConfig) ||
      localSeasonName !== savedBaseline.seasonName ||
      localSeasonEnabled !== savedBaseline.seasonEnabled ||
      JSON.stringify(localPayment) !== JSON.stringify(savedBaseline.payment) ||
      localFreeMealEnabled !== savedBaseline.freeMealEnabled ||
      localMobileEnabled !== savedBaseline.mobileEnabled ||
      localFoodPriceEnabled !== savedBaseline.foodPriceEnabled ||
      localKidsEnabled !== savedBaseline.kidsEnabled ||
      localGuestsEnabled !== savedBaseline.guestsEnabled ||
      localVendorKidsMealChargingEnabled !== savedBaseline.vendorKidsMealChargingEnabled ||
      localWhatsappCountryCode !== savedBaseline.whatsappCountryCode ||
      localQuickCheckoutAutoCloseMs !== savedBaseline.quickCheckoutAutoCloseMs ||
      localSoundEnabled !== savedBaseline.soundEnabled ||
      localNonAdminCheckoutEnabled !== savedBaseline.nonAdminCheckoutEnabled ||
      localCheatCodeEnabled !== savedBaseline.cheatCodeEnabled ||
      localVendorName !== savedBaseline.vendorName ||
      localVendorAddress !== savedBaseline.vendorAddress ||
      (areAllMealsDone && localVendorSettledCost !== savedBaseline.vendorSettledCost)
    );
  }, [
    savedBaseline,
    localConfig,
    localSeasonName,
    localSeasonEnabled,
    localPayment,
    localFreeMealEnabled,
    localMobileEnabled,
    localFoodPriceEnabled,
    localKidsEnabled,
    localGuestsEnabled,
    localVendorKidsMealChargingEnabled,
    localWhatsappCountryCode,
    localQuickCheckoutAutoCloseMs,
    localSoundEnabled,
    localNonAdminCheckoutEnabled,
    localCheatCodeEnabled,
    localVendorName,
    localVendorAddress,
    localVendorSettledCost,
    areAllMealsDone
  ]);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <StatusBar {...({ barStyle: themeType === AppThemeMode.DARK ? "light-content" : "dark-content", backgroundColor: theme.colors.surface } as any)} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            {hasChanged && (
              <Pressable
                onPress={handleSave}
                disabled={saving}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.saveChanges}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: s(10),
                    paddingVertical: s(6),
                    borderRadius: s(10),
                    elevation: 2,
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: 0.2,
                    shadowRadius: 2,
                  },
                  pressed && { opacity: 0.8 },
                  saving && { opacity: 0.6 }
                ]}
              >
                <Ionicons name="save-outline" size={s(14)} color={theme.colors.white} />
                <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: s(11) }}>
                  {saving ? UI_TEXT.saving : UI_TEXT.save}
                </Text>
              </Pressable>
            )}
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <UserGreeting />
      </View>

      <ScrollView style={{ flex: 1, width: "100%" }} contentContainerStyle={[styles.content, { paddingBottom: s(180) }]} keyboardShouldPersistTaps="handled">
        {/* Season & General Settings Card */}
        <View style={[styles.dashboardCard, { backgroundColor: theme.cardColors[1].bg, borderColor: theme.cardColors[1].border, borderWidth: 1.5 }, !localSeasonEnabled && { opacity: 0.6 }]}>
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                 <Text style={{ fontSize: 18, fontWeight: '900', color: theme.cardColors[1].accent }}>{UI_TEXT.seasonNameLabel}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', marginTop: 2 }}>{UI_TEXT.seasonNameHelper}</Text>
              </View>
              <Switch
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel={UI_TEXT.seasonNameLabel}
                accessibilityHint={UI_TEXT.seasonStatusHelper}
                accessibilityState={{ checked: localSeasonEnabled }}
                value={localSeasonEnabled}
                onValueChange={(val) => validateAndSetSeasonEnabled(val)}
                trackColor={{ true: theme.colors.primary }}
                style={{ flexShrink: 0 }}
              />
           </View>
           <TextInput
             accessible={true}
             accessibilityLabel={UI_TEXT.seasonNameLabel}
             accessibilityHint={UI_TEXT.seasonNamePlaceholder}
             style={styles.input}
             value={localSeasonName}
             onChangeText={setLocalSeasonName}
             placeholder={UI_TEXT.seasonNamePlaceholder}
             placeholderTextColor={theme.colors.textMuted}
             selectTextOnFocus
           />
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.paymentIntegration}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.paymentIntegrationHelper}</Text>
              </View>
              <Switch
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel={UI_TEXT.paymentIntegration}
                accessibilityHint={UI_TEXT.paymentIntegrationHelper}
                accessibilityState={{ checked: localPayment.enabled }}
                value={localPayment.enabled}
                onValueChange={(val) => validateAndSetPaymentEnabled(val)}
                trackColor={{ true: theme.colors.primary }}
                style={{ flexShrink: 0 }}
              />
           </View>
           {localPayment.enabled && (
             <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 12, gap: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.primary }}>{UI_TEXT.enabledMethods}</Text>
                {([['upi', PaymentMode.UPI], ['cash', PaymentMode.CASH], ['bankTransfer', PaymentMode.BANK_TRANSFER]] as const).map(([key, mode]) => (
                  <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary, flex: 1, marginRight: 10 }}>{getPaymentModeLabel(mode)}</Text>
                     <Switch
                       accessible={true}
                       accessibilityRole="switch"
                       accessibilityLabel={getPaymentModeLabel(mode)}
                       accessibilityState={{ checked: localPayment.options[key] }}
                       value={localPayment.options[key]}
                       onValueChange={(val) => validateAndSetPaymentOption(key, mode, val)}
                       trackColor={{ true: theme.colors.success }}
                       style={{ transform: [{ scale: 0.8 }], flexShrink: 0 }}
                     />
                  </View>
                ))}

                <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 4 }} />

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: theme.colors.textPrimary }}>
                      {UI_TEXT.maxPaymentsLabel}
                    </Text>
                    <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: "600", marginTop: 2 }}>
                      {UI_TEXT.maxPaymentsHelper}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.colors.surfaceDark, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4 }}>
                    <Pressable
                      onPress={() => validateAndSetMaxPayments((localPayment.maxPayments || 10) - 1)}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Decrease Max Payments"
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="remove-circle-outline" size={20} color={theme.colors.primary} />
                    </Pressable>
                    <Text style={{ fontSize: 15, fontWeight: "900", color: theme.colors.textPrimary, minWidth: 24, textAlign: "center" }}>
                      {localPayment.maxPayments || 10}
                    </Text>
                    <Pressable
                      onPress={() => validateAndSetMaxPayments((localPayment.maxPayments || 10) + 1)}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel="Increase Max Payments"
                      style={{ padding: 4 }}
                    >
                      <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
                    </Pressable>
                  </View>
                </View>
             </View>
           )}
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.nonAdminCheckoutLabel}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.nonAdminCheckoutHelper}</Text>
              </View>
              <Switch
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel={UI_TEXT.nonAdminCheckoutLabel}
                accessibilityHint={UI_TEXT.nonAdminCheckoutHelper}
                accessibilityState={{ checked: localNonAdminCheckoutEnabled }}
                value={localNonAdminCheckoutEnabled}
                onValueChange={setLocalNonAdminCheckoutEnabled}
                trackColor={{ true: theme.colors.primary }}
                style={{ flexShrink: 0 }}
              />
           </View>
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.cheatCodeEnabledLabel}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.cheatCodeEnabledHelper}</Text>
              </View>
              <Switch
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel={UI_TEXT.cheatCodeEnabledLabel}
                accessibilityHint={UI_TEXT.cheatCodeEnabledHelper}
                accessibilityState={{ checked: localCheatCodeEnabled }}
                value={localCheatCodeEnabled}
                onValueChange={setLocalCheatCodeEnabled}
                trackColor={{ true: theme.colors.primary }}
                style={{ flexShrink: 0 }}
              />
           </View>
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.enableKidsSupport}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.enableKidsSupportHelper}</Text>
              </View>
              <Switch
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel={UI_TEXT.enableKidsSupport}
                accessibilityHint={UI_TEXT.enableKidsSupportHelper}
                accessibilityState={{ checked: localKidsEnabled }}
                value={localKidsEnabled}
                onValueChange={(val) => validateAndSetKidsEnabled(val)}
                trackColor={{ true: theme.colors.primary }}
                style={{ flexShrink: 0 }}
              />
           </View>
           {localKidsEnabled && (
             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 16, marginTop: 12 }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                   <Text style={{ fontSize: 15, fontWeight: '700', color: theme.colors.textPrimary }}>{UI_TEXT.vendorKidsMealChargingLabel}</Text>
                   <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.vendorKidsMealChargingHelper}</Text>
                </View>
                <Switch
                  accessible={true}
                  accessibilityRole="switch"
                  accessibilityLabel={UI_TEXT.vendorKidsMealChargingLabel}
                  accessibilityHint={UI_TEXT.vendorKidsMealChargingHelper}
                  accessibilityState={{ checked: localVendorKidsMealChargingEnabled }}
                  value={localVendorKidsMealChargingEnabled}
                  onValueChange={(val) => setLocalVendorKidsMealChargingEnabled(val)}
                  trackColor={{ true: theme.colors.success }}
                  style={{ transform: [{ scale: 0.8 }], flexShrink: 0 }}
                />
             </View>
           )}
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.enableGuestsSupport}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.enableGuestsSupportHelper}</Text>
              </View>
              <Switch
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel={UI_TEXT.enableGuestsSupport}
                accessibilityHint={UI_TEXT.enableGuestsSupportHelper}
                accessibilityState={{ checked: localGuestsEnabled }}
                value={localGuestsEnabled}
                onValueChange={(val) => validateAndSetGuestsEnabled(val)}
                trackColor={{ true: theme.colors.primary }}
                style={{ flexShrink: 0 }}
              />
           </View>
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.freeMealReport}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.freeMealDeskHelper || "Enable Free Meal desk tracking"}</Text>
              </View>
              <Switch
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel={UI_TEXT.freeMealReport}
                accessibilityState={{ checked: localFreeMealEnabled }}
                value={localFreeMealEnabled}
                onValueChange={(val) => validateAndSetFreeMealEnabled(val)}
                trackColor={{ true: theme.colors.primary }}
                style={{ flexShrink: 0 }}
              />
           </View>
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.addMobileInPass}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.addMobileInPassHelper}</Text>
              </View>
              <Switch
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel={UI_TEXT.addMobileInPass}
                accessibilityHint={UI_TEXT.addMobileInPassHelper}
                accessibilityState={{ checked: localMobileEnabled }}
                value={localMobileEnabled}
                onValueChange={(val) => validateAndSetMobileEnabled(val)}
                trackColor={{ true: theme.colors.primary }}
                style={{ flexShrink: 0 }}
              />
           </View>
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.vendorPriceReport}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.vendorPriceReportHelper || "Enable vendor menu pricing and cost reports"}</Text>
              </View>
              <Switch
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel={UI_TEXT.vendorPriceReport}
                accessibilityState={{ checked: localFoodPriceEnabled }}
                value={localFoodPriceEnabled}
                onValueChange={(val) => validateAndSetFoodPriceEnabled(val)}
                trackColor={{ true: theme.colors.primary }}
                style={{ flexShrink: 0 }}
              />
           </View>
        </View>

        {/* Vendor Details & Financial Settlement Section Card */}
        <View style={[styles.dashboardCard, { backgroundColor: theme.cardColors[2].bg, borderColor: theme.cardColors[2].border, borderWidth: 1.5, marginTop: 16 }]}>
           <View style={{ marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '900', color: theme.cardColors[2].accent }}>{UI_TEXT.vendorSettingsSectionTitle}</Text>
              <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', marginTop: 2 }}>{UI_TEXT.vendorSettledCostHelper}</Text>
           </View>

           <View style={{ gap: 12 }}>
             {/* Vendor Name */}
             <View>
               <Text style={[styles.selectorLabel, { marginTop: 0 }]}>{UI_TEXT.vendorNameLabel}</Text>
               <TextInput
                 accessible={true}
                 accessibilityLabel={UI_TEXT.vendorNameLabel}
                 accessibilityHint={UI_TEXT.vendorNamePlaceholder}
                 style={styles.input}
                 value={localVendorName}
                 onChangeText={setLocalVendorName}
                 placeholder={UI_TEXT.vendorNamePlaceholder}
                 placeholderTextColor={theme.colors.textMuted}
                 selectTextOnFocus
               />
             </View>

             {/* Vendor Address */}
             <View>
               <Text style={styles.selectorLabel}>{UI_TEXT.vendorAddressLabel}</Text>
               <TextInput
                 accessible={true}
                 accessibilityLabel={UI_TEXT.vendorAddressLabel}
                 accessibilityHint={UI_TEXT.vendorAddressPlaceholder}
                 style={styles.input}
                 value={localVendorAddress}
                 onChangeText={setLocalVendorAddress}
                 placeholder={UI_TEXT.vendorAddressPlaceholder}
                 placeholderTextColor={theme.colors.textMuted}
                 selectTextOnFocus
               />
             </View>

             {/* Vendor Food Expected Cost (Automatic & Non-editable) */}
             <View>
               <Text style={styles.selectorLabel}>{UI_TEXT.vendorExpectedCostLabel}</Text>
               <View style={[styles.input, { backgroundColor: theme.colors.surfaceDark, justifyContent: 'center' }]}>
                 <Text style={{ fontSize: 15, fontWeight: '900', color: theme.colors.textPrimary }}>
                   {UI_TEXT.rs} {formatCurrencyAmount(expectedTotal)}
                 </Text>
               </View>
             </View>

             {/* Vendor Food Actual Cost (Automatic & Non-editable) */}
             <View>
               <Text style={styles.selectorLabel}>{UI_TEXT.vendorActualCostLabel}</Text>
               <View style={[styles.input, { backgroundColor: theme.colors.surfaceDark, justifyContent: 'center' }]}>
                 <Text style={{ fontSize: 15, fontWeight: '900', color: theme.colors.primary }}>
                   {UI_TEXT.rs} {formatCurrencyAmount(actualTotal)}
                 </Text>
               </View>
             </View>

             {/* Vendor Food Settled Cost (Editable only when all meals are done) */}
             <View>
               <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                 <Text style={[styles.selectorLabel, { marginTop: 0 }]}>{UI_TEXT.vendorSettledCostLabel}</Text>
                 {!areAllMealsDone && (
                   <View style={{ backgroundColor: theme.colors.warningLight || theme.colors.primary + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                     <Text style={{ fontSize: 10, fontWeight: "800", color: theme.colors.warning || theme.colors.primary }}>
                       {UI_TEXT.locked}
                     </Text>
                   </View>
                 )}
               </View>
               <TextInput
                 accessible={true}
                 accessibilityLabel={UI_TEXT.vendorSettledCostLabel}
                 accessibilityHint={UI_TEXT.vendorSettledCostPlaceholder}
                 style={[styles.input, !areAllMealsDone && { backgroundColor: theme.colors.surfaceDark, opacity: 0.7 }]}
                 value={localVendorSettledCost}
                 onChangeText={(txt) => {
                   const filtered = txt.replace(/[^0-9.]/g, "");
                   const parts = filtered.split(".");
                   const sanitized = parts.length > 1 ? `${parts[0]}.${parts.slice(1).join("")}` : filtered;
                   setLocalVendorSettledCost(sanitized);
                 }}
                 placeholder={UI_TEXT.vendorSettledCostPlaceholder}
                 placeholderTextColor={theme.colors.textMuted}
                 keyboardType="numeric"
                 editable={areAllMealsDone}
                 selectTextOnFocus={areAllMealsDone}
               />
               <Text style={{ fontSize: 11, color: areAllMealsDone ? theme.colors.success : theme.colors.textSecondary, fontWeight: "700", marginTop: 4 }}>
                 {areAllMealsDone ? UI_TEXT.unlocked : UI_TEXT.vendorSettledCostHelper}
               </Text>
             </View>
           </View>
        </View>

        {(localConfig || []).map((day, index) => {
          const colorScheme = theme.cardColors[(index + 2) % theme.cardColors.length];
          return (
            <View key={day.id} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }, !day.enabled && { opacity: 0.6 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                 <Text style={{ fontSize: 18, fontWeight: '900', color: colorScheme.accent, flex: 1, marginRight: 10 }}>{UI_TEXT.dayConfigTitle}</Text>
                 {(() => {
                   const isDaySubscribed = (subscriptions || []).some(sub =>
                     (sub.mealSlots[day.id] || []).some(slot =>
                       slot[MealType.BREAKFAST] !== DietaryOption.NONE ||
                       slot[MealType.LUNCH] !== DietaryOption.NONE ||
                       slot[MealType.DINNER] !== DietaryOption.NONE
                     )
                   );
                   return (
                     <Switch
                       value={day.enabled}
                       onValueChange={(val) => {
                          if (!val && isDaySubscribed) {
                             showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.daySubscribedError);
                             return;
                          }
                          updateDay(day.id, { enabled: val });
                       }}
                       trackColor={{ true: theme.colors.primary }}
                       style={{ flexShrink: 0 }}
                     />
                   );
                 })()}
              </View>
              <View style={{ gap: 16, marginBottom: 20 }}>
                <TextInput style={styles.input} value={day.label} onChangeText={(val) => updateDay(day.id, { label: val })} placeholder={UI_TEXT.dayNamePlaceholder} selectTextOnFocus />
                <TextInput style={styles.input} value={day.abbr} onChangeText={(val) => updateDay(day.id, { abbr: val.toUpperCase() })} placeholder={UI_TEXT.abbrPlaceholder} maxLength={4} autoCapitalize="characters" selectTextOnFocus />
              </View>
              {day.enabled && (
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: theme.colors.errorLight, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border }}>
                    <View style={{ flex: 1, marginRight: 10 }}>
                       <Text style={{ fontWeight: '800', color: theme.colors.primary, fontSize: 15 }}>{UI_TEXT.vegOnlyLabel}</Text>
                       <Text style={{ fontSize: 11, color: theme.colors.nonVeg, marginTop: 2 }}>{UI_TEXT.vegOnlyHelper}</Text>
                    </View>
                    <Switch
                      value={day.vegOnly || false}
                      disabled={day.breakfast.done || day.lunch.done || day.dinner.done}
                      onValueChange={(val) => updateDay(day.id, { vegOnly: val })}
                      trackColor={{ true: theme.colors.primary }}
                      style={{ flexShrink: 0 }}
                    />
                  </View>
                  {[MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].map((mKey) => {
                    const m = day[mKey] || { enabled: false, veg: true, nonVeg: true, parcel: false };
                    return (
                      <View key={mKey} style={[styles.dashboardMealSection, { marginBottom: 12, padding: 12, backgroundColor: theme.colors.surface }, !m.enabled && { opacity: 0.6 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, marginRight: 10 }}>
                             <Ionicons name={mKey === "breakfast" ? "sunny-outline" : mKey === "lunch" ? "restaurant-outline" : "moon-outline"} size={18} color={theme.colors.textPrimary} />
                             <Text style={{ fontWeight: "800", fontSize: 16, color: theme.colors.textPrimary, textTransform: "capitalize", flex: 1 }}>{getMealLabel(mKey as MealType)}</Text>
                          </View>
                          {(() => {
                            return (
                              <Switch
                                value={m.enabled}
                                onValueChange={(val) => validateAndSetEnabled(day.id, mKey as MealType, val)}
                                trackColor={{ true: theme.colors.primary }}
                                style={{ flexShrink: 0 }}
                              />
                            );
                          })()}
                        </View>
                        {m.enabled && (
                          <View style={{ gap: 12 }}>
                            {!day.vegOnly && (
                              <View style={[styles.selectorRow, { marginBottom: 0 }]}>
                                <Pressable onPress={() => updateMealConfig(day.id, mKey, { veg: !m.veg })} style={[styles.selector, m.veg && styles.vegChoice, { marginBottom: 0, flex: 1 }]}>
                                  <Text style={[styles.selectorText, m.veg && styles.selectorTextOn, { fontSize: 12 }]}>{UI_TEXT.vegLabel.toUpperCase()}</Text>
                                </Pressable>
                                <Pressable onPress={() => updateMealConfig(day.id, mKey, { nonVeg: !m.nonVeg })} style={[styles.selector, m.nonVeg && styles.nonVegChoice, { marginBottom: 0, flex: 1 }]}>
                                  <Text style={[styles.selectorText, m.nonVeg && styles.selectorTextOn, { fontSize: 12 }]}>{UI_TEXT.nonVegLabel.toUpperCase()}</Text>
                                </Pressable>
                              </View>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.background, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                               <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, flex: 1, marginRight: 10 }}>{UI_TEXT.parcelSupportLabel.toUpperCase()}</Text>
                               <Switch
                                 value={m.parcel || false}
                                 disabled={m.done}
                                 onValueChange={(val) => {
                                   updateMealConfig(day.id, mKey, {
                                     parcel: val,
                                     parcelAlert: val ? m.parcelAlert : false,
                                     kidsParcel: val ? m.kidsParcel : false,
                                     dineInFallbackParcel: val ? m.dineInFallbackParcel : false,
                                   });
                                 }}
                                 trackColor={{ true: theme.colors.primary }}
                                 style={{ transform: [{ scale: 0.8 }], flexShrink: 0 }}
                                 accessible={true}
                                 accessibilityRole="switch"
                                 accessibilityLabel={UI_TEXT.parcelSupportLabel}
                                 accessibilityState={{ checked: !!m.parcel }}
                               />
                            </View>
                            {m.parcel && localKidsEnabled && (
                               <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.background, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, flex: 1, marginRight: 10 }}>{UI_TEXT.kidsParcelLabel.toUpperCase()}</Text>
                                  <Switch
                                    value={!!m.kidsParcel}
                                    disabled={m.done}
                                    onValueChange={(val) => validateAndSetKidsParcel(day.id, mKey as MealType, val)}
                                    trackColor={{ true: theme.colors.primary }}
                                    style={{ transform: [{ scale: 0.8 }], flexShrink: 0 }}
                                    accessible={true}
                                    accessibilityRole="switch"
                                    accessibilityLabel={UI_TEXT.kidsParcelLabel}
                                    accessibilityState={{ checked: !!m.kidsParcel }}
                                  />
                               </View>
                            )}
                            {m.parcel && (
                               <View style={{ flexDirection: 'column', backgroundColor: theme.colors.background, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, gap: 4 }}>
                                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                     <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, flex: 1, marginRight: 10 }}>{UI_TEXT.dineInFallbackParcelLabel.toUpperCase()}</Text>
                                     <Switch
                                       value={!!m.dineInFallbackParcel}
                                       disabled={m.done}
                                       onValueChange={(val) => updateMealConfig(day.id, mKey, { dineInFallbackParcel: val })}
                                       trackColor={{ true: theme.colors.primary }}
                                       style={{ transform: [{ scale: 0.8 }], flexShrink: 0 }}
                                       accessible={true}
                                       accessibilityRole="switch"
                                       accessibilityLabel={UI_TEXT.dineInFallbackParcelLabel}
                                       accessibilityHint={UI_TEXT.dineInFallbackParcelDesc}
                                       accessibilityState={{ checked: !!m.dineInFallbackParcel }}
                                     />
                                  </View>
                                  <Text style={{ fontSize: 10, color: theme.colors.textMuted, lineHeight: 14 }}>
                                     {UI_TEXT.dineInFallbackParcelDesc}
                                  </Text>
                               </View>
                            )}
                            {m.parcel && (
                               <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.background, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, flex: 1, marginRight: 10 }}>{UI_TEXT.parcelAlertLabel.toUpperCase()}</Text>
                                  <Switch
                                    value={!!m.parcelAlert}
                                    disabled={m.done}
                                    onValueChange={(val) => updateMealConfig(day.id, mKey as MealType, { parcelAlert: val })}
                                    trackColor={{ true: theme.colors.primary }}
                                    style={{ transform: [{ scale: 0.8 }], flexShrink: 0 }}
                                  />
                               </View>
                            )}
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.background, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                               <View style={{ flex: 1, marginRight: 10 }}>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary }}>{UI_TEXT.specialMeal.toUpperCase()}</Text>
                                  <Text style={{ fontSize: 9, fontWeight: '600', color: theme.colors.textMuted }}>{UI_TEXT.specialMealHelper}</Text>
                               </View>
                               <Switch
                                 value={m.special || false}
                                 disabled={m.done}
                                 onValueChange={(val) => updateMealConfig(day.id, mKey as MealType, { special: val })}
                                 trackColor={{ true: theme.colors.specialMealBorder || theme.colors.warning }}
                                 style={{ transform: [{ scale: 0.8 }], flexShrink: 0 }}
                                 accessible={true}
                                 accessibilityRole="switch"
                                 accessibilityLabel={UI_TEXT.specialMeal}
                                 accessibilityState={{ checked: !!m.special }}
                               />
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.background, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                               <View style={{ flex: 1, marginRight: 10 }}>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary }}>{UI_TEXT.markDoneLabel.toUpperCase()}</Text>
                                  <Text style={{ fontSize: 9, fontWeight: '600', color: theme.colors.textMuted }}>{UI_TEXT.markDoneHelper}</Text>
                               </View>
                               <Switch value={m.done || false} onValueChange={(val) => validateAndSetDone(day.id, mKey as MealType, val)} trackColor={{ true: theme.colors.success }} style={{ transform: [{ scale: 0.8 }], flexShrink: 0 }} />
                            </View>
                            {!m.done && (
                               <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.background, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                                  <View style={{ flex: 1, marginRight: 10 }}>
                                     <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary }}>{UI_TEXT.currentMealLabel.toUpperCase()}</Text>
                                     <Text style={{ fontSize: 9, fontWeight: '600', color: theme.colors.textMuted }}>{UI_TEXT.currentMealHelper}</Text>
                                  </View>
                                  <Switch value={m.current || false} onValueChange={(val) => validateAndSetCurrent(day.id, mKey as MealType, val)} trackColor={{ true: theme.colors.primary }} style={{ transform: [{ scale: 0.8 }], flexShrink: 0 }} />
                               </View>
                            )}

                            {/* Dietary Sub-Categories manager */}
                            {(() => {
                              const isVegAllowed = day.enabled && m.enabled && (m.veg || day.vegOnly);
                              const isNonVegAllowed = day.enabled && m.enabled && !day.vegOnly && m.nonVeg;
                              const isAnyAllowed = isVegAllowed || isNonVegAllowed;
                              const varieties = getMealVarieties(m, day.vegOnly);

                              return (
                                <View style={{ backgroundColor: theme.colors.background, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, gap: 8 }}>
                                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <View style={{ flex: 1, marginRight: 8 }}>
                                      <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary }}>
                                        {UI_TEXT.dietarySubCategories} ({varieties.length}/10)
                                      </Text>
                                      <Text style={{ fontSize: 10, fontWeight: '600', color: theme.colors.textMuted }}>
                                        {isAnyAllowed
                                          ? (day.vegOnly ? UI_TEXT.vegOnlyDayHelper : !m.nonVeg ? UI_TEXT.vegOnlyMealHelper : !m.veg ? UI_TEXT.nonVegOnlyMealHelper : UI_TEXT.dietarySubCategoriesHelper)
                                          : UI_TEXT.noDietaryCategoryEnabled}
                                      </Text>
                                    </View>
                                    {isAnyAllowed && varieties.length < 10 && (
                                      <Pressable
                                        onPress={() => setEditingVarietyModal({ dayId: day.id, mealKey: mKey as MealType, variety: null })}
                                        accessible={true}
                                        accessibilityRole="button"
                                        accessibilityLabel={UI_TEXT.addVariety}
                                        style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.primary, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }}
                                      >
                                        <Ionicons name="add" size={14} color={theme.colors.white} />
                                        <Text style={{ fontSize: 11, fontWeight: '800', color: theme.colors.white }}>{UI_TEXT.addVariety}</Text>
                                      </Pressable>
                                    )}
                                  </View>

                                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                                    {varieties.map((v) => (
                                      <View
                                        key={v.id}
                                        style={{
                                          flexDirection: 'row',
                                          alignItems: 'center',
                                          gap: 6,
                                          backgroundColor: theme.colors.surface,
                                          paddingHorizontal: 8,
                                          paddingVertical: 5,
                                          borderRadius: 8,
                                          borderWidth: 1.5,
                                          borderColor: v.color || (v.type === DietType.VEG ? theme.colors.veg : theme.colors.nonVeg),
                                          maxWidth: '100%',
                                        }}
                                      >
                                        <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: v.color || (v.type === DietType.VEG ? theme.colors.veg : theme.colors.nonVeg) }} />
                                        <Text numberOfLines={1} style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textPrimary, flexShrink: 1 }}>{v.name}</Text>
                                        <Text style={{ fontSize: 9, fontWeight: '700', color: theme.colors.textMuted, textTransform: 'uppercase' }}>({v.type})</Text>

                                        <Pressable
                                          onPress={() => setEditingVarietyModal({ dayId: day.id, mealKey: mKey as MealType, variety: v })}
                                          accessible={true}
                                          accessibilityRole="button"
                                          accessibilityLabel={`${UI_TEXT.editVariety}: ${v.name}`}
                                          style={{ padding: 2 }}
                                        >
                                          <Ionicons name="pencil-outline" size={13} color={theme.colors.textSecondary} />
                                        </Pressable>

                                        <Pressable
                                          onPress={() => handleDeleteVariety(day.id, mKey as MealType, v)}
                                          accessible={true}
                                          accessibilityRole="button"
                                          accessibilityLabel={`Delete variety ${v.name}`}
                                          style={{ padding: 2 }}
                                        >
                                          <Ionicons name="trash-outline" size={13} color={theme.colors.nonVeg} />
                                        </Pressable>
                                      </View>
                                    ))}
                                    {varieties.length === 0 && (
                                      <Text style={{ fontSize: 11, fontStyle: 'italic', color: theme.colors.textMuted }}>
                                        {UI_TEXT.noActiveSubCategories}
                                      </Text>
                                    )}
                                  </View>
                                </View>
                              );
                            })()}
                          </View>
                        )}
                      </View>
                    );
                  })}

                  <Pressable
                    onPress={handleSave}
                    style={[styles.primary, { height: 44, marginTop: 12, backgroundColor: colorScheme.accent }, (saving || !hasChanged) && { opacity: 0.5 }]}
                    disabled={saving || !hasChanged}
                  >
                    <ActionLabel icon="save-outline" label={UI_TEXT.saveChanges} color={theme.colors.white} size={18} />
                  </Pressable>

                  {(() => {
                    const isDaySubscribed = (subscriptions || []).some(sub =>
                      (sub.mealSlots[day.id] || []).some(slot =>
                        slot[MealType.BREAKFAST] !== DietaryOption.NONE ||
                        slot[MealType.LUNCH] !== DietaryOption.NONE ||
                        slot[MealType.DINNER] !== DietaryOption.NONE
                      )
                    );

                    return (
                      <Pressable
                        disabled={isDaySubscribed}
                        onPress={() => handleDeleteDay(day.id)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={UI_TEXT.removeDayLabel}
                        accessibilityState={{ disabled: isDaySubscribed }}
                        style={({ pressed }) => [
                          {
                            marginTop: 12,
                            alignSelf: 'center',
                            paddingVertical: 10,
                            paddingHorizontal: 20,
                            borderRadius: 12,
                            backgroundColor: theme.colors.nonVeg,
                          },
                          pressed && { opacity: 0.7 },
                          isDaySubscribed && { opacity: 0.3 }
                        ]}
                      >
                        <ActionLabel icon="trash-outline" label={UI_TEXT.removeDayLabel} color={theme.colors.white} size={14} />
                      </Pressable>
                    );
                  })()}
                </View>
              )}
            </View>
          );
        })}
        <Pressable
          onPress={handleAddDay}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={UI_TEXT.addDayButton}
          style={[styles.secondary, { borderStyle: "dashed", marginTop: 10, height: 64 }]}
        >
          <ActionLabel icon="add-outline" label={UI_TEXT.addDayButton} />
        </Pressable>
        <Pressable
          onPress={handleSave}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={saving ? UI_TEXT.saving : UI_TEXT.updateSettingsButton}
          accessibilityState={{ disabled: saving || !hasChanged }}
          style={[styles.primary, (saving || !hasChanged) && { opacity: 0.5 }, { marginTop: 32 }]}
          disabled={saving || !hasChanged}
        >
          <ActionLabel icon="save-outline" label={saving ? UI_TEXT.saving : UI_TEXT.updateSettingsButton} color={theme.colors.white} size={22} />
        </Pressable>
        <View style={styles.footer}><Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text></View>
      </ScrollView>

      <VarietyModal
        visible={!!editingVarietyModal}
        editingVariety={editingVarietyModal}
        allowedDietTypes={currentEditingAllowedTypes}
        onClose={() => setEditingVarietyModal(null)}
        onSave={handleSaveVariety}
        theme={theme}
      />
    </View>
  );
}
