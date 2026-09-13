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
import { styles, CARD_COLORS } from "../styles";
import { UI_TEXT } from "../strings";
import { ConfigDay, MealConfig, AppConfig, PaymentConfig } from "../types";
import { BackButton } from "../components/common/BackButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { AlertButton } from "../components/common/CustomAlert";
import { Ionicons } from "@expo/vector-icons";
export function SettingsScreen({
  config,
  seasonName,
  seasonEnabled,
  payment,
  guestEnabled,
  onSave,
  onBack,
  onLogout,
  showAlert,
}: {
  config: ConfigDay[];
  seasonName: string;
  seasonEnabled: boolean;
  payment: PaymentConfig;
  guestEnabled: boolean;
  onSave: (config: AppConfig) => Promise<void>;
  onBack: () => void;
  onLogout: () => void;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
}) {
  const [localConfig, setLocalConfig] = useState<ConfigDay[]>(
    Array.isArray(config) ? [...config] : []
  );
  const [localSeasonName, setLocalSeasonName] = useState(seasonName || "");
  const [localSeasonEnabled, setLocalSeasonEnabled] = useState(seasonEnabled);
  const [localPayment, setLocalPayment] = useState<PaymentConfig>(payment || {
    enabled: true,
    options: { upi: true, cash: true, bankTransfer: true }
  });
  const [localGuestEnabled, setLocalGuestEnabled] = useState(guestEnabled);
  const [saving, setSaving] = useState(false);

  const updateDay = (id: string, next: Partial<ConfigDay>) => {
    setLocalConfig((current) =>
      (current || []).map((d) => {
        if (d && d.id === id) {
          const updated = { ...d, ...next };
          // If vegOnly is toggled ON, force all meal dietary options to Veg Only
          if (next.hasOwnProperty("vegOnly")) {
            if (next.vegOnly) {
              updated.breakfast = { ...updated.breakfast, veg: true, nonVeg: false };
              updated.lunch = { ...updated.lunch, veg: true, nonVeg: false };
              updated.dinner = { ...updated.dinner, veg: true, nonVeg: false };
            } else {
              // If toggled OFF, restore both options as default starting point
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
    const day = localConfig.find((d) => d.id === dayId);
    if (!day) return;
    const currentMeal = day[meal] || {
      enabled: false,
      veg: false,
      nonVeg: false,
      parcel: false,
    };
    updateDay(dayId, { [meal]: { ...currentMeal, ...next } });
  };

  const addNewDay = () => {
    // Generate a unique ID by finding the max numeric suffix in existing IDs
    const maxSuffix = localConfig.reduce((max, d) => {
      const match = d.id.match(/^Day(\d+)$/);
      if (match) {
        return Math.max(max, parseInt(match[1], 10));
      }
      return max;
    }, 0);

    const id = `Day${maxSuffix + 1}`;
    const emptyMeal: MealConfig = {
      enabled: false,
      veg: true,
      nonVeg: true,
      parcel: false,
    };
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
    await onSave({
      seasonName: localSeasonName,
      seasonEnabled: localSeasonEnabled,
      days: localConfig,
      payment: localPayment,
      guestEnabled: localGuestEnabled
    });
    setSaving(false);
    showAlert(UI_TEXT.success, UI_TEXT.settingsUpdated);
  };

  const hasChanged =
    JSON.stringify(config) !== JSON.stringify(localConfig) ||
    localSeasonName !== seasonName ||
    localSeasonEnabled !== seasonEnabled ||
    JSON.stringify(payment) !== JSON.stringify(localPayment) ||
    localGuestEnabled !== guestEnabled;

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <BackButton onPress={onBack} />
          <LogoutButton onLogout={onLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.settingsTitle}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.settingsSubtitle}</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* Season & Payment Configuration */}
        <View style={[styles.dashboardCard, { backgroundColor: CARD_COLORS[1].bg, borderColor: CARD_COLORS[1].border, borderWidth: 1.5 }, !localSeasonEnabled && { opacity: 0.6 }]}>
           <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                 <Text style={{ fontSize: 18, fontWeight: '900', color: CARD_COLORS[1].accent }}>{UI_TEXT.seasonNameLabel}</Text>
                 <Text style={{ fontSize: 11, color: '#6A6E73', fontWeight: '600', marginTop: 2 }}>{UI_TEXT.seasonNameHelper}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Switch
                  value={localSeasonEnabled}
                  onValueChange={setLocalSeasonEnabled}
                  trackColor={{ true: '#E31837' }}
                />
              </View>
           </View>

           <TextInput
             style={{
               backgroundColor: "#F8F9FA",
               borderWidth: 1,
               borderColor: "#E9ECEF",
               borderRadius: 12,
               paddingHorizontal: 16,
               paddingVertical: 14,
               fontSize: 16,
               color: "#1A1C1E",
               fontWeight: "700",
               marginBottom: 20
             }}
             value={localSeasonName}
             onChangeText={setLocalSeasonName}
             placeholder={UI_TEXT.seasonNamePlaceholder}
             selectTextOnFocus
           />

           <View style={{ height: 1, backgroundColor: '#E9ECEF', marginBottom: 20 }} />

           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <View>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A1C1E' }}>Payment Integration</Text>
                 <Text style={{ fontSize: 11, color: '#6A6E73', fontWeight: '600' }}>Enable tracking for subscriptions</Text>
              </View>
              <Switch
                value={localPayment.enabled}
                onValueChange={(val) => setLocalPayment({ ...localPayment, enabled: val })}
                trackColor={{ true: '#E31837' }}
              />
           </View>

           {localPayment.enabled && (
             <View style={{ backgroundColor: '#F8F9FA', borderRadius: 16, padding: 12, gap: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#E31837' }}>ENABLED METHODS</Text>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1C1E' }}>UPI</Text>
                   <Switch
                     value={localPayment.options.upi}
                     onValueChange={(val) => setLocalPayment({ ...localPayment, options: { ...localPayment.options, upi: val } })}
                     trackColor={{ true: '#28A745' }}
                     style={{ transform: [{ scale: 0.8 }] }}
                   />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1C1E' }}>Cash</Text>
                   <Switch
                     value={localPayment.options.cash}
                     onValueChange={(val) => setLocalPayment({ ...localPayment, options: { ...localPayment.options, cash: val } })}
                     trackColor={{ true: '#28A745' }}
                     style={{ transform: [{ scale: 0.8 }] }}
                   />
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                   <Text style={{ fontSize: 14, fontWeight: '700', color: '#1A1C1E' }}>Bank Transfer</Text>
                   <Switch
                     value={localPayment.options.bankTransfer}
                     onValueChange={(val) => setLocalPayment({ ...localPayment, options: { ...localPayment.options, bankTransfer: val } })}
                     trackColor={{ true: '#28A745' }}
                     style={{ transform: [{ scale: 0.8 }] }}
                   />
                </View>
             </View>
           )}

           <View style={{ height: 1, backgroundColor: '#E9ECEF', marginVertical: 20 }} />

           <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View>
                 <Text style={{ fontSize: 16, fontWeight: '800', color: '#1A1C1E' }}>{UI_TEXT.guestManagementLabel}</Text>
                 <Text style={{ fontSize: 11, color: '#6A6E73', fontWeight: '600' }}>{UI_TEXT.guestManagementHelper}</Text>
              </View>
              <Switch
                value={localGuestEnabled}
                onValueChange={setLocalGuestEnabled}
                trackColor={{ true: '#E31837' }}
              />
           </View>
        </View>

        {(localConfig || []).filter(d => d).map((day, index) => {
          const colorScheme = CARD_COLORS[(index + 2) % CARD_COLORS.length];
          return (
            <View key={day.id} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }, !day.enabled && { opacity: 0.6 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                 <Text style={{ fontSize: 18, fontWeight: '900', color: colorScheme.accent }}>{UI_TEXT.dayConfigTitle}</Text>
               <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Switch
                    value={day.enabled}
                    onValueChange={(val) => updateDay(day.id, { enabled: val })}
                    trackColor={{ true: '#E31837' }}
                  />
               </View>
            </View>

            <View style={{ marginBottom: 20 }}>
              <View style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 12, color: "#6A6E73", fontWeight: "700", marginBottom: 6, marginLeft: 4 }}>{UI_TEXT.dayNameLabel}</Text>
                <TextInput
                  style={{
                    backgroundColor: "#F8F9FA",
                    borderWidth: 1,
                    borderColor: "#E9ECEF",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: "#1A1C1E",
                    fontWeight: "700"
                  }}
                  value={day.label}
                  onChangeText={(val) => updateDay(day.id, { label: val })}
                  placeholder={UI_TEXT.dayNamePlaceholder}
                  selectTextOnFocus
                />
              </View>
              <View>
                <Text style={{ fontSize: 12, color: "#6A6E73", fontWeight: "700", marginBottom: 6, marginLeft: 4 }}>{UI_TEXT.abbrLabel}</Text>
                <TextInput
                  style={{
                    backgroundColor: "#F8F9FA",
                    borderWidth: 1,
                    borderColor: "#E9ECEF",
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingVertical: 12,
                    fontSize: 16,
                    color: "#E31837",
                    fontWeight: "900"
                  }}
                  value={day.abbr}
                  onChangeText={(val) => updateDay(day.id, { abbr: val.toUpperCase() })}
                  placeholder={UI_TEXT.abbrPlaceholder}
                  maxLength={4}
                  autoCapitalize="characters"
                  selectTextOnFocus
                />
              </View>
            </View>

            {day.enabled && (
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20, backgroundColor: '#FFF5F5', padding: 12, borderRadius: 16, borderWidth: 1, borderColor: '#FFEBEE' }}>
                  <View style={{ flex: 1 }}>
                     <Text style={{ fontWeight: '800', color: '#E31837', fontSize: 15 }}>{UI_TEXT.vegOnlyLabel}</Text>
                     <Text style={{ fontSize: 11, color: '#DC3545', marginTop: 2 }}>{UI_TEXT.vegOnlyHelper}</Text>
                  </View>
                  <Switch
                    value={day.vegOnly || false}
                    onValueChange={(val) => updateDay(day.id, { vegOnly: val })}
                    trackColor={{ true: '#E31837' }}
                  />
                </View>

                {(["breakfast", "lunch", "dinner"] as const).map((mKey) => {
                  const m = day[mKey] || {
                    enabled: false,
                    veg: false,
                    nonVeg: false,
                    parcel: false,
                  };
                  return (
                    <View key={mKey} style={[styles.dashboardMealSection, { marginBottom: 12, padding: 12, backgroundColor: "#F8F9FA" }, !m.enabled && { opacity: 0.6 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                           <Ionicons
                              name={mKey === "breakfast" ? "sunny-outline" : mKey === "lunch" ? "restaurant-outline" : "moon-outline"}
                              size={18}
                              color="#1A1C1E"
                           />
                           <Text style={{ fontWeight: "800", fontSize: 16, color: "#1A1C1E", textTransform: "capitalize" }}>
                             {mKey}
                           </Text>
                        </View>
                        <Switch
                           value={m.enabled}
                           onValueChange={(val) => updateMealConfig(day.id, mKey, { enabled: val })}
                           trackColor={{ true: '#E31837' }}
                        />
                      </View>

                      {m.enabled && (
                        <View style={{ gap: 12 }}>
                          {!day.vegOnly && (
                            <View style={[styles.selectorRow, { marginBottom: 0 }]}>
                              <Pressable
                                onPress={() => updateMealConfig(day.id, mKey, { veg: !m.veg })}
                                style={[styles.selector, m.veg && styles.vegChoice, { marginBottom: 0, flex: 1 }]}
                              >
                                <Text style={[styles.selectorText, m.veg && styles.selectorTextOn, { fontSize: 12 }]}>{UI_TEXT.vegLabel.toUpperCase()}</Text>
                              </Pressable>
                              <Pressable
                                onPress={() => updateMealConfig(day.id, mKey, { nonVeg: !m.nonVeg })}
                                style={[styles.selector, m.nonVeg && styles.nonVegChoice, { marginBottom: 0, flex: 1 }]}
                              >
                                <Text style={[styles.selectorText, m.nonVeg && styles.selectorTextOn, { fontSize: 12 }]}>{UI_TEXT.nonVegLabel.toUpperCase()}</Text>
                              </Pressable>
                            </View>
                          )}

                          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFF', padding: 10, borderRadius: 12, borderWidth: 1, borderColor: '#E9ECEF' }}>
                             <Text style={{ fontSize: 12, fontWeight: '800', color: '#6A6E73' }}>{UI_TEXT.parcelSettingsLabel} SUPPORT</Text>
                             <Switch
                               value={m.parcel}
                               onValueChange={(val) => updateMealConfig(day.id, mKey, { parcel: val })}
                               trackColor={{ true: '#E31837' }}
                               style={{ transform: [{ scale: 0.9 }] }}
                             />
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                <Pressable
                  onPress={() => removeDay(day.id)}
                  style={{ marginTop: 12, alignSelf: 'center', padding: 8 }}
                >
                  <Text style={{ color: '#DC3545', fontWeight: '800', fontSize: 13, textDecorationLine: "underline" }}>{UI_TEXT.removeDayLabel}</Text>
                </Pressable>
              </View>
            )}
          </View>
        );
      })}

        <Pressable onPress={addNewDay} style={[styles.secondary, { borderStyle: "dashed", marginTop: 10, height: 64 }]}>
          <ActionLabel icon="add-outline" label={UI_TEXT.addDayButton} />
        </Pressable>

        <Pressable
          onPress={handleSave}
          style={[styles.primary, (saving || !hasChanged) && { opacity: 0.5 }, { marginTop: 32 }]}
          disabled={saving || !hasChanged}
        >
          <ActionLabel
            icon="save-outline"
            label={saving ? UI_TEXT.saving : UI_TEXT.updateSettingsButton}
            color="#fff"
            size={22}
          />
        </Pressable>

        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
