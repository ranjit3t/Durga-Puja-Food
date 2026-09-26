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
} from "react-native";
import { useStyles } from "../styles";
import { useAppTheme, StatusBarStyleMode } from "../theme";
import { UI_TEXT } from "../strings";
import { ConfigDay, PaymentConfig, AppScreen, PaymentMode, AppThemeMode, ActivityModule, ActivityAction, DietaryOption } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useCoreDatabase, useActivityLogs } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";
import { getPaymentModeLabel, getMealLabel, getMealConstraints } from "../constants";
import { MealConfig, MealType } from "../domain";

export function SettingsScreen() {
  const { handleLogout } = useAuth();
  const {
    dayConfig: config, seasonName, seasonEnabled, paymentConfig: payment, guestEnabled, mobileEnabled, foodPriceEnabled,
    whatsappCountryCode, updateConfig, kidsEnabled, subscriptions, foodMenu, quickCheckoutAutoCloseMs, soundEnabled
  } = useCoreDatabase();
  const { addActivityLog } = useActivityLogs();
  const { showAlert } = useUI();
  const { navigate, goBack } = useAppNavigation();

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();

  const [localConfig, setLocalConfig] = useState<ConfigDay[]>([]);
  const [localSeasonName, setLocalSeasonName] = useState("");
  const [localSeasonEnabled, setLocalSeasonEnabled] = useState(true);
  const [localPayment, setLocalPayment] = useState<PaymentConfig>({
    enabled: true,
    options: { upi: true, cash: true, bankTransfer: true }
  });
  const [localGuestEnabled, setLocalGuestEnabled] = useState(true);
  const [localMobileEnabled, setLocalMobileEnabled] = useState(true);
  const [localFoodPriceEnabled, setLocalFoodPriceEnabled] = useState(false);
  const [localKidsEnabled, setLocalKidsEnabled] = useState(false);
  const [localWhatsappCountryCode, setLocalWhatsappCountryCode] = useState(UI_TEXT.defaultCountryCode);
  const [localQuickCheckoutAutoCloseMs, setLocalQuickCheckoutAutoCloseMs] = useState<number>(3000);
  const [localSoundEnabled, setLocalSoundEnabled] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);

  // Saved baseline state representing the current persisted configuration
  const [savedBaseline, setSavedBaseline] = useState<{
    config: ConfigDay[];
    seasonName: string;
    seasonEnabled: boolean;
    payment: PaymentConfig;
    guestEnabled: boolean;
    mobileEnabled: boolean;
    foodPriceEnabled: boolean;
    kidsEnabled: boolean;
    whatsappCountryCode: string;
    quickCheckoutAutoCloseMs: number;
    soundEnabled: boolean;
  } | null>(null);

  // Sync saved baseline & local state when database config is loaded
  React.useEffect(() => {
    if (config) {
      const currentContextBaseline = {
        config: Array.isArray(config) ? JSON.parse(JSON.stringify(config)) : [],
        seasonName: seasonName || "",
        seasonEnabled,
        payment: payment ? JSON.parse(JSON.stringify(payment)) : { enabled: true, options: { upi: true, cash: true, bankTransfer: true } },
        guestEnabled,
        mobileEnabled,
        foodPriceEnabled,
        kidsEnabled: kidsEnabled || false,
        whatsappCountryCode: whatsappCountryCode || UI_TEXT.defaultCountryCode,
        quickCheckoutAutoCloseMs: quickCheckoutAutoCloseMs ?? 3000,
        soundEnabled: soundEnabled !== false,
      };

      if (!savedBaseline) {
        setLocalConfig(JSON.parse(JSON.stringify(currentContextBaseline.config)));
        setLocalSeasonName(currentContextBaseline.seasonName);
        setLocalSeasonEnabled(currentContextBaseline.seasonEnabled);
        setLocalPayment(JSON.parse(JSON.stringify(currentContextBaseline.payment)));
        setLocalGuestEnabled(currentContextBaseline.guestEnabled);
        setLocalMobileEnabled(currentContextBaseline.mobileEnabled);
        setLocalFoodPriceEnabled(currentContextBaseline.foodPriceEnabled);
        setLocalKidsEnabled(currentContextBaseline.kidsEnabled);
        setLocalWhatsappCountryCode(currentContextBaseline.whatsappCountryCode);
        setLocalQuickCheckoutAutoCloseMs(currentContextBaseline.quickCheckoutAutoCloseMs);
        setLocalSoundEnabled(currentContextBaseline.soundEnabled);
      }
      setSavedBaseline(currentContextBaseline);
    }
  }, [config, seasonName, seasonEnabled, payment, guestEnabled, mobileEnabled, foodPriceEnabled, whatsappCountryCode, quickCheckoutAutoCloseMs, soundEnabled]);

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

          if (next.hasOwnProperty("vegOnly")) {
            if (next.vegOnly) {
              updated[MealType.BREAKFAST] = { ...updated[MealType.BREAKFAST], veg: true, nonVeg: false };
              updated[MealType.LUNCH] = { ...updated[MealType.LUNCH], veg: true, nonVeg: false };
              updated[MealType.DINNER] = { ...updated[MealType.DINNER], veg: true, nonVeg: false };
            } else {
              updated[MealType.BREAKFAST] = { ...updated[MealType.BREAKFAST], veg: true, nonVeg: true };
              updated[MealType.LUNCH] = { ...updated[MealType.LUNCH], veg: true, nonVeg: true };
              updated[MealType.DINNER] = { ...updated[MealType.DINNER], veg: true, nonVeg: true };
            }
          }
          return updated;
        }
        return d;
      })
    );
  };

  const validateAndSetSeasonEnabled = (val: boolean) => {
    if (!val) { // Switching OFF
      const anyMealNotDoneOrEnabled = localConfig.some(d =>
        d.enabled && (
          (d[MealType.BREAKFAST].enabled && !d[MealType.BREAKFAST].done) ||
          (d[MealType.LUNCH].enabled && !d[MealType.LUNCH].done) ||
          (d[MealType.DINNER].enabled && !d[MealType.DINNER].done)
        )
      );
      if (anyMealNotDoneOrEnabled) {
        showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.seasonDisabledError);
        return;
      }
    }
    setLocalSeasonEnabled(val);
  };

  const validateAndSetKidsEnabled = (val: boolean) => {
    if (!val) { // Switching OFF
      const hasKids = (subscriptions || []).some(sub => (sub.kidsCount || 0) > 0);
      if (hasKids) {
        showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.kidsDisabledError);
        return;
      }
    }
    setLocalKidsEnabled(val);
  };

  const validateAndSetGuestEnabled = (val: boolean) => {
    if (!val) { // Switching OFF
      const hasGuestSubscriptions = Object.values(foodMenu || {}).some(dayMenu =>
        [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(mKey => {
           const m = dayMenu[mKey as keyof typeof dayMenu];
           return m && ((m.guestVeg || 0) > 0 || (m.guestNonVeg || 0) > 0);
        })
      );
      if (hasGuestSubscriptions) {
        showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.guestDisabledError);
        return;
      }
    }
    setLocalGuestEnabled(val);
  };
  const validateAndSetMobileEnabled = (val: boolean) => setLocalMobileEnabled(val);
  const validateAndSetFoodPriceEnabled = (val: boolean) => setLocalFoodPriceEnabled(val);

  const validateAndSetPaymentEnabled = (val: boolean) => {
    if (!val) { // Switching OFF
      const hasPayment = (subscriptions || []).some(sub =>
        (parseFloat(sub.amount) > 0) ||
        (sub.payments && sub.payments.some(p => parseFloat(p.amount) > 0))
      );
      if (hasPayment) {
        showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.paymentDisabledError);
        return;
      }
    }
    setLocalPayment({ ...localPayment, enabled: val });
  };

  const validateAndSetPaymentOption = (key: keyof PaymentConfig['options'], mode: PaymentMode, val: boolean) => {
    if (!val) { // Switching OFF
      const hasPaymentOnChannel = (subscriptions || []).some(sub =>
        sub.payments && sub.payments.some(p => p.mode === mode && parseFloat(p.amount) > 0)
      );
      if (hasPaymentOnChannel) {
        showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.paymentChannelDisabledError);
        return;
      }
    }
    setLocalPayment({ ...localPayment, options: { ...localPayment.options, [key]: val } });
  };

  const validateAndSetEnabled = (dayId: string, meal: MealType, val: boolean) => {
    if (!val) { // Switching OFF
      const hasSub = (subscriptions || []).some(sub =>
        sub.mealSlots[dayId]?.some(slot => slot[meal] !== DietaryOption.NONE)
      );
      if (hasSub) {
        showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.mealSubscribedError);
        return;
      }
    }
    updateMealConfig(dayId, meal as any, { enabled: val });
  };

  const validateAndSetDone = (dayId: string, meal: MealType, val: boolean) => {
    const { canMarkDone, canUnmarkDone } = getMealConstraints(dayId, meal, localConfig);
    if (val && !canMarkDone) {
      showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.markDoneError);
      return;
    }
    if (!val && !canUnmarkDone) {
      showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.unmarkDoneError);
      return;
    }
    const currentM = (localConfig.find(d => d.id === dayId) as any)?.[meal];
    updateMealConfig(dayId, meal as any, { done: val, current: val ? false : currentM?.current });
  };

  const validateAndSetCurrent = (dayId: string, meal: MealType, val: boolean) => {
    const { anyFutureDone, pastDone, canUnmarkCurrent } = getMealConstraints(dayId, meal, localConfig);
    if (val) {
      if (anyFutureDone) {
        showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.enableCurrentError);
        return;
      }
      if (!pastDone) {
        showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.enableCurrentPastError);
        return;
      }
    }
    if (!val && !canUnmarkCurrent) {
      showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.disableCurrentError);
      return;
    }
    updateMealConfig(dayId, meal as any, { current: val });
  };

  const updateMealConfig = (
    dayId: string,
    meal: MealType,
    next: Partial<MealConfig>
  ) => {
    setLocalConfig((prev) => {
      const updated = prev.map((d) => {
        if (d.id !== dayId) return d;
        return {
          ...d,
          [meal]: { ...d[meal], ...next }
        };
      });

      if (next.current) {
        return updated.map((d) => {
          const isTargetDay = d.id === dayId;
          return {
            ...d,
            [MealType.BREAKFAST]: {
              ...d[MealType.BREAKFAST],
              current: isTargetDay && meal === MealType.BREAKFAST
            },
            [MealType.LUNCH]: {
              ...d[MealType.LUNCH],
              current: isTargetDay && meal === MealType.LUNCH
            },
            [MealType.DINNER]: {
              ...d[MealType.DINNER],
              current: isTargetDay && meal === MealType.DINNER
            },
          };
        });
      }

      // If meal was disabled or marked done, ensure current is off
      return updated.map(d => {
        if (d.id !== dayId) return d;
        const m = d[meal];
        if (m.enabled === false || m.done === true) {
          return { ...d, [meal]: { ...m, current: false } };
        }
        return d;
      });
    });
  };

  const addNewDay = () => {
    const maxSuffix = localConfig.reduce((max, d) => {
      const match = d.id.match(/^Day(\d+)$/);
      return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);

    const id = `Day${maxSuffix + 1}`;
    const emptyMeal: MealConfig = { enabled: false, veg: true, nonVeg: true, parcel: false, parcelAlert: false, vegParcelPrice: UI_TEXT.zero, nonVegParcelPrice: UI_TEXT.zero };
    const newDay: ConfigDay = {
      id,
      label: UI_TEXT.newDayLabel,
      abbr: UI_TEXT.newDayAbbr,
      enabled: true,
      [MealType.BREAKFAST]: { ...emptyMeal },
      [MealType.LUNCH]: { ...emptyMeal },
      [MealType.DINNER]: { ...emptyMeal },
    };
    setLocalConfig([...localConfig, newDay]);
  };

  const removeDay = (id: string) => {
    showAlert(UI_TEXT.removeDayConfirmTitle, UI_TEXT.removeDayConfirmMessage, [
      { text: UI_TEXT.cancel, style: "cancel" },
      {
        text: UI_TEXT.removeButton,
        style: "destructive",
        onPress: () =>
          setLocalConfig((current) => current.filter((d) => d.id !== id)),
      },
    ]);
  };

  const getSettingsChangeLog = () => {
    const changes: string[] = [];
    if (localSeasonName !== seasonName) changes.push(`Name: ${seasonName || 'None'} -> ${localSeasonName}`);
    if (localSeasonEnabled !== seasonEnabled) changes.push(`Status: ${seasonEnabled ? 'Active' : 'Locked'} -> ${localSeasonEnabled ? 'Active' : 'Locked'}`);
    if (localGuestEnabled !== guestEnabled) changes.push(`Guests: ${guestEnabled ? 'ON' : 'OFF'} -> ${localGuestEnabled ? 'ON' : 'OFF'}`);
    if (localMobileEnabled !== mobileEnabled) changes.push(`Mobile: ${mobileEnabled ? 'ON' : 'OFF'} -> ${localMobileEnabled ? 'ON' : 'OFF'}`);
    if (localFoodPriceEnabled !== foodPriceEnabled) changes.push(`Pricing: ${foodPriceEnabled ? 'ON' : 'OFF'} -> ${localFoodPriceEnabled ? 'ON' : 'OFF'}`);
    if (localKidsEnabled !== kidsEnabled) changes.push(`Kids: ${kidsEnabled ? 'ON' : 'OFF'} -> ${localKidsEnabled ? 'ON' : 'OFF'}`);
    if (localWhatsappCountryCode !== whatsappCountryCode) changes.push(`WA Code: ${whatsappCountryCode} -> ${localWhatsappCountryCode}`);
    if (localQuickCheckoutAutoCloseMs !== quickCheckoutAutoCloseMs) changes.push(`Splash Timeout: ${quickCheckoutAutoCloseMs ?? 3000}ms -> ${localQuickCheckoutAutoCloseMs}ms`);
    if (localSoundEnabled !== soundEnabled) changes.push(`Sound: ${soundEnabled ? 'ON' : 'OFF'} -> ${localSoundEnabled ? 'ON' : 'OFF'}`);

    if (JSON.stringify(localPayment) !== JSON.stringify(payment)) {
      if (localPayment.enabled !== payment.enabled) changes.push(`Payment: ${payment.enabled ? 'ON' : 'OFF'} -> ${localPayment.enabled ? 'ON' : 'OFF'}`);
      // Simple summary for options
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
              if (newM.parcelAlert !== oldM.parcelAlert) mChanges.push(`ParcelAlert:${newM.parcelAlert ? 'ON' : 'OFF'}`);
              if (newM.done !== oldM.done) mChanges.push(`Done:${newM.done ? 'ON' : 'OFF'}`);
              if (newM.current !== oldM.current) mChanges.push(`Current:${newM.current ? 'ON' : 'OFF'}`);

              if (mChanges.length > 0) {
                dayChanges.push(`${getMealLabel(m as MealType).toUpperCase()}(${mChanges.join(',')})`);
              }
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
        guestEnabled: localGuestEnabled,
        mobileEnabled: localMobileEnabled,
        foodPriceEnabled: localFoodPriceEnabled,
        kidsEnabled: localKidsEnabled,
        whatsappCountryCode: localWhatsappCountryCode,
        quickCheckoutAutoCloseMs: localQuickCheckoutAutoCloseMs,
        soundEnabled: localSoundEnabled,
      };

      await updateConfig({
        seasonName: localSeasonName,
        seasonEnabled: localSeasonEnabled,
        days: localConfig,
        payment: localPayment,
        guestEnabled: localGuestEnabled,
        mobileEnabled: localMobileEnabled,
        foodPriceEnabled: localFoodPriceEnabled,
        kidsEnabled: localKidsEnabled,
        whatsappCountryCode: localWhatsappCountryCode,
        quickCheckoutAutoCloseMs: localQuickCheckoutAutoCloseMs,
        soundEnabled: localSoundEnabled,
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
      localGuestEnabled !== savedBaseline.guestEnabled ||
      localMobileEnabled !== savedBaseline.mobileEnabled ||
      localFoodPriceEnabled !== savedBaseline.foodPriceEnabled ||
      localKidsEnabled !== savedBaseline.kidsEnabled ||
      localWhatsappCountryCode !== savedBaseline.whatsappCountryCode ||
      localQuickCheckoutAutoCloseMs !== savedBaseline.quickCheckoutAutoCloseMs ||
      localSoundEnabled !== savedBaseline.soundEnabled
    );
  }, [
    savedBaseline,
    localConfig,
    localSeasonName,
    localSeasonEnabled,
    localPayment,
    localGuestEnabled,
    localMobileEnabled,
    localFoodPriceEnabled,
    localKidsEnabled,
    localWhatsappCountryCode,
    localQuickCheckoutAutoCloseMs,
    localSoundEnabled,
  ]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <Text style={styles.title}>{UI_TEXT.settingsTitle}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.settingsSubtitle}</Text>
      </View>

      <ScrollView style={{ flex: 1, width: "100%" }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
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
             </View>
           )}
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
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.guestManagementLabel}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.guestManagementHelper}</Text>
              </View>
              <Switch
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel={UI_TEXT.guestManagementLabel}
                accessibilityHint={UI_TEXT.guestManagementHelper}
                accessibilityState={{ checked: localGuestEnabled }}
                value={localGuestEnabled}
                onValueChange={(val) => validateAndSetGuestEnabled(val)}
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
                onValueChange={setLocalMobileEnabled}
                trackColor={{ true: theme.colors.primary }}
                style={{ flexShrink: 0 }}
              />
           </View>
           {localMobileEnabled && (
             <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "700", marginBottom: 6, marginLeft: 4 }}>{UI_TEXT.whatsappCountryCodeLabel.toUpperCase()}</Text>
                <TextInput
                  accessible={true}
                  accessibilityLabel={UI_TEXT.whatsappCountryCodeLabel}
                  accessibilityHint={UI_TEXT.whatsappCountryCodePlaceholder}
                  style={styles.input}
                  value={localWhatsappCountryCode}
                  onChangeText={setLocalWhatsappCountryCode}
                  placeholder={UI_TEXT.whatsappCountryCodePlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  keyboardType="phone-pad"
                  selectTextOnFocus
                />
             </View>
           )}
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           {localPayment.enabled && (
             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View style={{ flex: 1, marginRight: 10 }}>
                   <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.enableFoodPrice}</Text>
                   <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.enableFoodPriceHelper}</Text>
                </View>
                <Switch
                  accessible={true}
                  accessibilityRole="switch"
                  accessibilityLabel={UI_TEXT.enableFoodPrice}
                  accessibilityHint={UI_TEXT.enableFoodPriceHelper}
                  accessibilityState={{ checked: localFoodPriceEnabled }}
                  value={localFoodPriceEnabled}
                  onValueChange={setLocalFoodPriceEnabled}
                  trackColor={{ true: theme.colors.primary }}
                  style={{ flexShrink: 0 }}
                />
             </View>
           )}

           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ gap: 8 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                 <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.splashTimeoutLabel}</Text>
                    <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', marginTop: 2 }}>{UI_TEXT.splashTimeoutHelper}</Text>
                 </View>
              </View>
              <TextInput
                 accessible={true}
                 accessibilityLabel={UI_TEXT.splashTimeoutLabel}
                 accessibilityHint={UI_TEXT.splashTimeoutHelper}
                 style={styles.input}
                 value={String(localQuickCheckoutAutoCloseMs)}
                 onChangeText={(txt) => {
                   const num = parseInt(txt.replace(/[^0-9]/g, ""), 10);
                   if (isNaN(num)) {
                     setLocalQuickCheckoutAutoCloseMs(0);
                   } else {
                     setLocalQuickCheckoutAutoCloseMs(Math.min(10000, Math.max(0, num)));
                   }
                 }}
                 keyboardType="numeric"
                 selectTextOnFocus
              />
           </View>

           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flex: 1, marginRight: 10 }}>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.soundEnabledLabel}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', marginTop: 2 }}>{UI_TEXT.soundEnabledHelper}</Text>
              </View>
              <Switch
                accessible={true}
                accessibilityRole="switch"
                accessibilityLabel={UI_TEXT.soundEnabledLabel}
                accessibilityHint={UI_TEXT.soundEnabledHelper}
                accessibilityState={{ checked: localSoundEnabled }}
                value={localSoundEnabled}
                onValueChange={setLocalSoundEnabled}
                trackColor={{ true: theme.colors.primary }}
                style={{ flexShrink: 0 }}
              />
           </View>

           <Pressable
             accessible={true}
             accessibilityRole="button"
             accessibilityLabel={UI_TEXT.saveChanges}
             accessibilityState={{ disabled: saving || !hasChanged }}
             onPress={handleSave}
             style={[styles.primary, { height: 44, marginTop: 24, backgroundColor: theme.colors.primary }, (saving || !hasChanged) && { opacity: 0.5 }]}
             disabled={saving || !hasChanged}
           >
             <ActionLabel icon="save-outline" label={UI_TEXT.saveChanges} color={theme.colors.white} size={18} />
           </Pressable>
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
                            const isMealSubscribed = (subscriptions || []).some(sub =>
                              sub.mealSlots[day.id]?.some(slot => slot[mKey as MealType] !== DietaryOption.NONE)
                            );
                            return (
                              <Switch
                                value={m.enabled}
                                onValueChange={(val) => {
                                   if (!val && isMealSubscribed) {
                                      showAlert(UI_TEXT.confirmDisableTitle, UI_TEXT.mealSubscribedError);
                                      return;
                                   }
                                   updateMealConfig(day.id, mKey as any, { enabled: val });
                                }}
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
                                     parcelAlert: val ? m.parcelAlert : false
                                   });
                                 }}
                                 trackColor={{ true: theme.colors.primary }}
                                 style={{ transform: [{ scale: 0.8 }], flexShrink: 0 }}
                               />
                            </View>
                            {m.parcel && (
                               <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.background, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary, flex: 1, marginRight: 10 }}>{UI_TEXT.parcelAlertLabel.toUpperCase()}</Text>
                                  <Switch
                                    value={!!m.parcelAlert}
                                    disabled={m.done}
                                    onValueChange={(val) => updateMealConfig(day.id, mKey, { parcelAlert: val })}
                                    trackColor={{ true: theme.colors.primary }}
                                    style={{ transform: [{ scale: 0.8 }], flexShrink: 0 }}
                                  />
                               </View>
                            )}
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
                        onPress={() => removeDay(day.id)}
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
        <Pressable onPress={addNewDay} style={[styles.secondary, { borderStyle: "dashed", marginTop: 10, height: 64 }]}>
          <ActionLabel icon="add-outline" label={UI_TEXT.addDayButton} />
        </Pressable>
        <Pressable onPress={handleSave} style={[styles.primary, (saving || !hasChanged) && { opacity: 0.5 }, { marginTop: 32 }]} disabled={saving || !hasChanged}>
          <ActionLabel icon="save-outline" label={saving ? UI_TEXT.saving : UI_TEXT.updateSettingsButton} color={theme.colors.white} size={22} />
        </Pressable>
        <View style={styles.footer}><Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text></View>
      </ScrollView>
    </View>
  );
}
