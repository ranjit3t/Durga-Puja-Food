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
import { styles } from "../styles";
import { UI_TEXT } from "../strings";
import { ConfigDay, MealConfig } from "../types";
import { BackButton } from "../components/common/BackButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { AlertButton } from "../components/common/CustomAlert";

export function SettingsScreen({
  config,
  onSave,
  onBack,
  onLogout,
  showAlert,
}: {
  config: ConfigDay[];
  onSave: (config: ConfigDay[]) => Promise<void>;
  onBack: () => void;
  onLogout: () => void;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
}) {
  const [localConfig, setLocalConfig] = useState<ConfigDay[]>(
    Array.isArray(config) ? [...config] : []
  );
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
    const id = `Day${localConfig.length + 1}`;
    const emptyMeal: MealConfig = {
      enabled: false,
      veg: true,
      nonVeg: true,
      parcel: false,
    };
    const newDay: ConfigDay = {
      id,
      label: "New Day",
      abbr: "New",
      enabled: true,
      breakfast: { ...emptyMeal },
      lunch: { ...emptyMeal },
      dinner: { ...emptyMeal },
    };
    setLocalConfig([...localConfig, newDay]);
  };

  const removeDay = (id: string) => {
    showAlert("Remove Day?", "This will hide all data for this day.", [
      { text: UI_TEXT.cancel, style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: () =>
          setLocalConfig((current) => current.filter((d) => d.id !== id)),
      },
    ]);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(localConfig);
    setSaving(false);
    showAlert(UI_TEXT.success, "Settings updated successfully");
  };

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <BackButton onPress={onBack} />
          <LogoutButton onLogout={onLogout} />
        </View>
        <Text style={styles.eyebrow}>{UI_TEXT.operations}</Text>
        <Text style={styles.title}>App Settings</Text>
        <Text style={styles.subtitle}>Configure days, meals, and dietary options.</Text>
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {(localConfig || []).filter(d => d).map((day) => (
          <View key={day.id} style={[styles.dashboardCard, !day.enabled && { opacity: 0.6 }]}>
            <View style={styles.dashboardCardTop}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <TextInput
                  style={[styles.dashboardDay, { borderBottomWidth: 1, borderBottomColor: '#ccc' }]}
                  value={day.label}
                  onChangeText={(val) => updateDay(day.id, { label: val })}
                  placeholder="Day Name"
                />
                <TextInput
                  style={[styles.helper, { marginTop: 4 }]}
                  value={day.abbr}
                  onChangeText={(val) => updateDay(day.id, { abbr: val })}
                  placeholder="Abbr (e.g. Sap)"
                  maxLength={3}
                />
              </View>
              <View style={{ alignItems: 'center' }}>
                <Switch
                  value={day.enabled}
                  onValueChange={(val) => updateDay(day.id, { enabled: val })}
                />
                <Text style={{ fontSize: 10, marginTop: 2 }}>{day.enabled ? "Active" : "Disabled"}</Text>
              </View>
            </View>

            {day.enabled && (
              <View style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: '#f0f4f1', padding: 8, borderRadius: 8 }}>
                  <Text style={{ flex: 1, fontWeight: '700', color: '#356044' }}>Veg only</Text>
                  <Switch
                    value={day.vegOnly || false}
                    onValueChange={(val) => updateDay(day.id, { vegOnly: val })}
                    trackColor={{ true: '#4d8b58' }}
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
                    <View key={mKey} style={[styles.dashboardMealSection, { marginBottom: 12, padding: 10 }]}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 16 }]}>
                          {mKey.charAt(0).toUpperCase() + mKey.slice(1)}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                          <View style={{ alignItems: 'center' }}>
                             <Switch
                                value={m.enabled}
                                onValueChange={(val) => updateMealConfig(day.id, mKey, { enabled: val })}
                             />
                             <Text style={{ fontSize: 9, color: '#666' }}>{m.enabled ? "Enabled" : "Disabled"}</Text>
                          </View>
                        </View>
                      </View>

                      {m.enabled && (
                        <View style={{ gap: 10 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <View style={styles.selectorRow}>
                              {!day.vegOnly && (
                                <>
                                  <Pressable
                                    onPress={() => updateMealConfig(day.id, mKey, { veg: !m.veg })}
                                    style={[styles.selector, m.veg && styles.selectorOn]}
                                  >
                                    <Text style={[styles.selectorText, m.veg && styles.selectorTextOn]}>Veg</Text>
                                  </Pressable>
                                  <Pressable
                                    onPress={() => updateMealConfig(day.id, mKey, { nonVeg: !m.nonVeg })}
                                    style={[styles.selector, m.nonVeg && styles.selectorOn]}
                                  >
                                    <Text style={[styles.selectorText, m.nonVeg && styles.selectorTextOn]}>Non-Veg</Text>
                                  </Pressable>
                                </>
                              )}
                            </View>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                               <Text style={{ fontSize: 12, fontWeight: '700', color: '#7b5a2d' }}>Parcel</Text>
                               <Switch
                                 value={m.parcel}
                                 onValueChange={(val) => updateMealConfig(day.id, mKey, { parcel: val })}
                                 trackColor={{ true: '#c35b3b' }}
                               />
                            </View>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}

                <Pressable
                  onPress={() => removeDay(day.id)}
                  style={{ marginTop: 8, alignSelf: 'flex-end' }}
                >
                  <Text style={{ color: '#b34e45', fontWeight: '700', fontSize: 12 }}>Remove Day</Text>
                </Pressable>
              </View>
            )}
          </View>
        ))}

        <Pressable onPress={addNewDay} style={[styles.secondary, { marginTop: 10 }]}>
          <ActionLabel icon="add-outline" label="Add New Day" />
        </Pressable>

        <Pressable
          onPress={handleSave}
          style={[styles.primary, saving && { opacity: 0.7 }, { marginTop: 24 }]}
          disabled={saving}
        >
          <ActionLabel
            icon="save-outline"
            label={saving ? UI_TEXT.saving : "Save Settings"}
            color="#fff"
          />
        </Pressable>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}
