/**
 * Application Settings Screen for Admins.
 * Allows managing the festival day configuration, enabling/disabling meals, dietary choices, and parcels.
 */
import React, { useState } from "react";
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
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { ConfigDay, MealConfig, PaymentConfig, AppScreen, PaymentMode } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";

export function SettingsScreen() {
  const { handleLogout } = useAuth();
  const {
    dayConfig: config, seasonName, seasonEnabled, paymentConfig: payment, guestEnabled, mobileEnabled, foodPriceEnabled,
    whatsappCountryCode, updateConfig
  } = useDatabase();
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
  const [localWhatsappCountryCode, setLocalWhatsappCountryCode] = useState("91");
  const [saving, setSaving] = useState(false);
  const [initialized, setInitialized] = useState(false);

  // Sync local state when database config is loaded (Once only or when saved)
  React.useEffect(() => {
    if (config && !initialized) {
      setLocalConfig(Array.isArray(config) ? JSON.parse(JSON.stringify(config)) : []);
      setLocalSeasonName(seasonName || "");
      setLocalSeasonEnabled(seasonEnabled);
      if (payment) setLocalPayment(JSON.parse(JSON.stringify(payment)));
      setLocalGuestEnabled(guestEnabled);
      setLocalMobileEnabled(mobileEnabled);
      setLocalFoodPriceEnabled(foodPriceEnabled);
      setLocalWhatsappCountryCode(whatsappCountryCode || "91");
      setInitialized(true);
    }
  }, [config, seasonName, seasonEnabled, payment, guestEnabled, mobileEnabled, foodPriceEnabled, whatsappCountryCode, initialized]);

  const updateDay = (id: string, next: Partial<ConfigDay>) => {
    setLocalConfig((current) =>
      (current || []).map((d) => {
        if (d && d.id === id) {
          const updated = { ...d, ...next };

          // If day is disabled, no meal can be current
          if (next.enabled === false) {
            updated.breakfast = { ...updated.breakfast, current: false };
            updated.lunch = { ...updated.lunch, current: false };
            updated.dinner = { ...updated.dinner, current: false };
          }

          if (next.hasOwnProperty("vegOnly")) {
            if (next.vegOnly) {
              updated.breakfast = { ...updated.breakfast, veg: true, nonVeg: false };
              updated.lunch = { ...updated.lunch, veg: true, nonVeg: false };
              updated.dinner = { ...updated.dinner, veg: true, nonVeg: false };
            } else {
              updated.breakfast = { ...updated.breakfast, veg: true, nonVeg: true };
              updated.lunch = { ...updated.lunch, veg: true, nonVeg: true };
              updated.dinner = { ...updated.dinner, veg: true, nonVeg: true };
            }
          }
          return updated;
        }
        return d;
      })
    );
  };

  const updateMealConfig = (
    dayId: string,
    meal: "breakfast" | "lunch" | "dinner",
    next: Partial<MealConfig>
  ) => {
    setLocalConfig((currentConfig) => {
      let updatedConfig = [...currentConfig];
      if (next.current) {
        updatedConfig = updatedConfig.map((d) => ({
          ...d,
          breakfast: { ...d.breakfast, current: false },
          lunch: { ...d.lunch, current: false },
          dinner: { ...d.dinner, current: false },
        }));
      }

      return updatedConfig.map((d) => {
        if (d.id === dayId) {
          const mealConfig = { ...d[meal], ...next };

          // If meal is disabled or marked as done, it cannot be the current meal
          if (mealConfig.enabled === false || mealConfig.done === true) {
            mealConfig.current = false;
          }

          return {
            ...d,
            [meal]: mealConfig,
          };
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
    const emptyMeal: MealConfig = { enabled: false, veg: true, nonVeg: true, parcel: false, vegParcelPrice: UI_TEXT.zero, nonVegParcelPrice: UI_TEXT.zero };
    const newDay: ConfigDay = {
      id,
      label: UI_TEXT.newDayLabel,
      abbr: UI_TEXT.newDayAbbr,
      enabled: true,
      breakfast: { ...emptyMeal },
      lunch: { ...emptyMeal },
      dinner: { ...emptyMeal },
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

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateConfig({
        seasonName: localSeasonName,
        seasonEnabled: localSeasonEnabled,
        days: localConfig,
        payment: localPayment,
        guestEnabled: localGuestEnabled,
        mobileEnabled: localMobileEnabled,
        foodPriceEnabled: localFoodPriceEnabled,
        whatsappCountryCode: localWhatsappCountryCode,
      });
      setInitialized(false); // Allow re-syncing from DB
      showAlert(UI_TEXT.success, UI_TEXT.settingsUpdated);
    } catch (err) {
      console.error("Save settings error:", err);
      showAlert(UI_TEXT.error, UI_TEXT.saveConfigError);
    } finally {
      setSaving(false);
    }
  };

  const hasChanged =
    JSON.stringify(config) !== JSON.stringify(localConfig) ||
    localSeasonName !== seasonName ||
    localSeasonEnabled !== seasonEnabled ||
    JSON.stringify(payment) !== JSON.stringify(localPayment) ||
    localGuestEnabled !== guestEnabled ||
    localMobileEnabled !== mobileEnabled ||
    localFoodPriceEnabled !== foodPriceEnabled ||
    localWhatsappCountryCode !== whatsappCountryCode;

  return (
    <View style={styles.root}>
      <StatusBar style={themeType === "dark" ? "light" : "dark"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.settingsTitle}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.settingsSubtitle}</Text>
      </View>

      <ScrollView style={{ flex: 1, width: "100%" }} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={[styles.dashboardCard, { backgroundColor: theme.cardColors[1].bg, borderColor: theme.cardColors[1].border, borderWidth: 1.5 }, !localSeasonEnabled && { opacity: 0.6 }]}>
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                 <Text style={{ fontSize: 18, fontWeight: '900', color: theme.cardColors[1].accent }}>{UI_TEXT.seasonNameLabel}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600', marginTop: 2 }}>{UI_TEXT.seasonNameHelper}</Text>
              </View>
              <Switch value={localSeasonEnabled} onValueChange={setLocalSeasonEnabled} trackColor={{ true: theme.colors.primary }} />
           </View>
           <TextInput style={styles.input} value={localSeasonName} onChangeText={setLocalSeasonName} placeholder={UI_TEXT.seasonNamePlaceholder} placeholderTextColor={theme.colors.textMuted} selectTextOnFocus />
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.paymentIntegration}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.paymentIntegrationHelper}</Text>
              </View>
              <Switch value={localPayment.enabled} onValueChange={(val) => setLocalPayment({ ...localPayment, enabled: val })} trackColor={{ true: theme.colors.primary }} />
           </View>
           {localPayment.enabled && (
             <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 12, gap: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.primary }}>{UI_TEXT.enabledMethods}</Text>
                {([['upi', PaymentMode.UPI], ['cash', PaymentMode.CASH], ['bankTransfer', PaymentMode.BANK_TRANSFER]] as const).map(([key, mode]) => (
                  <View key={key} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                     <Text style={{ fontSize: 14, fontWeight: '700', color: theme.colors.textPrimary }}>{mode}</Text>
                     <Switch value={localPayment.options[key]} onValueChange={(val) => setLocalPayment({ ...localPayment, options: { ...localPayment.options, [key]: val } })} trackColor={{ true: theme.colors.success }} style={{ transform: [{ scale: 0.8 }] }} />
                  </View>
                ))}
             </View>
           )}
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.guestManagementLabel}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.guestManagementHelper}</Text>
              </View>
              <Switch value={localGuestEnabled} onValueChange={setLocalGuestEnabled} trackColor={{ true: theme.colors.primary }} />
           </View>
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.addMobileInPass}</Text>
                 <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.addMobileInPassHelper}</Text>
              </View>
              <Switch value={localMobileEnabled} onValueChange={setLocalMobileEnabled} trackColor={{ true: theme.colors.primary }} />
           </View>
           {localMobileEnabled && (
             <View style={{ marginTop: 20 }}>
                <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "700", marginBottom: 6, marginLeft: 4 }}>{UI_TEXT.whatsappCountryCodeLabel.toUpperCase()}</Text>
                <TextInput style={styles.input} value={localWhatsappCountryCode} onChangeText={setLocalWhatsappCountryCode} placeholder={UI_TEXT.whatsappCountryCodePlaceholder} placeholderTextColor={theme.colors.textMuted} keyboardType="phone-pad" selectTextOnFocus />
             </View>
           )}
           <View style={{ height: 1, backgroundColor: theme.colors.border, marginVertical: 20 }} />
           {localPayment.enabled && (
             <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <View>
                   <Text style={{ fontSize: 16, fontWeight: '800', color: theme.colors.textPrimary }}>{UI_TEXT.enableFoodPrice}</Text>
                   <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: '600' }}>{UI_TEXT.enableFoodPriceHelper}</Text>
                </View>
                <Switch value={localFoodPriceEnabled} onValueChange={setLocalFoodPriceEnabled} trackColor={{ true: theme.colors.primary }} />
             </View>
           )}
        </View>

        {(localConfig || []).map((day, index) => {
          const colorScheme = theme.cardColors[(index + 2) % theme.cardColors.length];
          return (
            <View key={day.id} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }, !day.enabled && { opacity: 0.6 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                 <Text style={{ fontSize: 18, fontWeight: '900', color: colorScheme.accent }}>{UI_TEXT.dayConfigTitle}</Text>
                 <Switch value={day.enabled} onValueChange={(val) => updateDay(day.id, { enabled: val })} trackColor={{ true: theme.colors.primary }} />
              </View>
              <View style={{ gap: 16, marginBottom: 20 }}>
                <TextInput style={styles.input} value={day.label} onChangeText={(val) => updateDay(day.id, { label: val })} placeholder={UI_TEXT.dayNamePlaceholder} selectTextOnFocus />
                <TextInput style={styles.input} value={day.abbr} onChangeText={(val) => updateDay(day.id, { abbr: val.toUpperCase() })} placeholder={UI_TEXT.abbrPlaceholder} maxLength={4} autoCapitalize="characters" selectTextOnFocus />
              </View>
              {day.enabled && (
                <View style={{ marginTop: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: theme.colors.errorLight, padding: 12, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border }}>
                    <View style={{ flex: 1 }}>
                       <Text style={{ fontWeight: '800', color: theme.colors.primary, fontSize: 15 }}>{UI_TEXT.vegOnlyLabel}</Text>
                       <Text style={{ fontSize: 11, color: theme.colors.nonVeg, marginTop: 2 }}>{UI_TEXT.vegOnlyHelper}</Text>
                    </View>
                    <Switch value={day.vegOnly || false} onValueChange={(val) => updateDay(day.id, { vegOnly: val })} trackColor={{ true: theme.colors.primary }} />
                  </View>
                  {(['breakfast', 'lunch', 'dinner'] as const).map((mKey) => {
                    const m = day[mKey] || { enabled: false, veg: true, nonVeg: true, parcel: false };
                    return (
                      <View key={mKey} style={[styles.dashboardMealSection, { marginBottom: 12, padding: 12, backgroundColor: theme.colors.surface }, !m.enabled && { opacity: 0.6 }]}>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                             <Ionicons name={mKey === "breakfast" ? "sunny-outline" : mKey === "lunch" ? "restaurant-outline" : "moon-outline"} size={18} color={theme.colors.textPrimary} />
                             <Text style={{ fontWeight: "800", fontSize: 16, color: theme.colors.textPrimary, textTransform: "capitalize" }}>{mKey}</Text>
                          </View>
                          <Switch value={m.enabled} onValueChange={(val) => updateMealConfig(day.id, mKey, { enabled: val })} trackColor={{ true: theme.colors.primary }} />
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
                               <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary }}>{UI_TEXT.parcelSupportLabel.toUpperCase()}</Text>
                               <Switch value={m.parcel} onValueChange={(val) => updateMealConfig(day.id, mKey, { parcel: val })} trackColor={{ true: theme.colors.primary }} style={{ transform: [{ scale: 0.8 }] }} />
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.background, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                               <View>
                                  <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary }}>{UI_TEXT.markDoneLabel.toUpperCase()}</Text>
                                  <Text style={{ fontSize: 9, fontWeight: '600', color: theme.colors.textMuted }}>{UI_TEXT.markDoneHelper}</Text>
                               </View>
                               <Switch value={m.done || false} onValueChange={(val) => updateMealConfig(day.id, mKey, { done: val, current: val ? false : m.current })} trackColor={{ true: theme.colors.success }} style={{ transform: [{ scale: 0.8 }] }} />
                            </View>
                            {!m.done && (
                               <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: theme.colors.background, padding: 10, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                                  <View>
                                     <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textSecondary }}>{UI_TEXT.currentMealLabel.toUpperCase()}</Text>
                                     <Text style={{ fontSize: 9, fontWeight: '600', color: theme.colors.textMuted }}>{UI_TEXT.currentMealHelper}</Text>
                                  </View>
                                  <Switch value={m.current || false} onValueChange={(val) => updateMealConfig(day.id, mKey, { current: val })} trackColor={{ true: theme.colors.primary }} style={{ transform: [{ scale: 0.8 }] }} />
                               </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                  <Pressable onPress={() => removeDay(day.id)} style={{ marginTop: 12, alignSelf: 'center', padding: 8 }}>
                    <Text style={{ color: theme.colors.nonVeg, fontWeight: '800', fontSize: 13, textDecorationLine: "underline" }}>{UI_TEXT.removeDayLabel}</Text>
                  </Pressable>
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
