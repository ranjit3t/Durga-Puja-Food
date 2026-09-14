import React, { memo } from "react";
import { View, Text, ScrollView, StatusBar, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { getDayLabel, isMealEnabled, isDietaryEnabled } from "../constants";
import { FoodMenu, MealMenu, ConfigDay } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { CounterInput } from "../components/common/CounterInput";

interface GuestMealCardProps {
  dayId: string;
  type: "breakfast" | "lunch" | "dinner";
  menu: MealMenu;
  config: ConfigDay[];
  disabled: boolean;
  onUpdate: (
    day: string,
    type: "breakfast" | "lunch" | "dinner",
    field: string,
    value: number
  ) => void;
}

const GuestMealCard = memo(({ dayId, type, menu, config, disabled, onUpdate }: GuestMealCardProps) => {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const isVegEnabled = isDietaryEnabled(dayId, type, "veg", config);
  const isNonVegEnabled = isDietaryEnabled(dayId, type, "nonVeg", config);
  const showDetailed = isVegEnabled && isNonVegEnabled;

  const mealLabel = type === "breakfast" ? UI_TEXT.breakfast : type === "lunch" ? UI_TEXT.lunch : UI_TEXT.dinner;
  const icon = type === "breakfast" ? "sunny-outline" : type === "lunch" ? "restaurant-outline" : "moon-outline";

  const guestVeg = menu.guestVeg || 0;
  const guestNonVeg = menu.guestNonVeg || 0;
  const guestVegTaken = menu.guestVegTaken || 0;
  const guestNonVegTaken = menu.guestNonVegTaken || 0;

  // For non-detailed (e.g. Veg only), we use guestVeg and guestVegTaken as the primary storage
  const guestTotal = showDetailed ? (guestVeg + guestNonVeg) : (menu.guestVeg || 0);
  const guestTaken = showDetailed ? (guestVegTaken + guestNonVegTaken) : (menu.guestVegTaken || 0);

  return (
    <View style={[styles.dashboardMealSection, { marginBottom: 20 }]}>
      <View style={[styles.mealDisplayHeader, { marginBottom: 16 }]}>
        <Ionicons name={icon} size={22} color={theme.colors.primary} />
        <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 18 }]}>{mealLabel}</Text>
      </View>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
        {showDetailed ? (
          <>
            <View style={{ width: '47%' }}>
              <CounterInput
                label={UI_TEXT.guestVeg}
                value={guestVeg}
                min={guestVegTaken}
                onChange={(val) => onUpdate(dayId, type, "guestVeg", val)}
                disabled={disabled}
              />
            </View>
            <View style={{ width: '47%' }}>
              <CounterInput
                label={UI_TEXT.guestNonVeg}
                value={guestNonVeg}
                min={guestNonVegTaken}
                onChange={(val) => onUpdate(dayId, type, "guestNonVeg", val)}
                disabled={disabled}
              />
            </View>
            <View style={{ width: '47%' }}>
              <CounterInput
                label={UI_TEXT.guestVegTaken}
                value={guestVegTaken}
                max={guestVeg}
                onChange={(val) => onUpdate(dayId, type, "guestVegTaken", val)}
                disabled={disabled}
              />
            </View>
            <View style={{ width: '47%' }}>
              <CounterInput
                label={UI_TEXT.guestNonVegTaken}
                value={guestNonVegTaken}
                max={guestNonVeg}
                onChange={(val) => onUpdate(dayId, type, "guestNonVegTaken", val)}
                disabled={disabled}
              />
            </View>

            <View style={{ width: '100%', flexDirection: 'row', gap: 16, marginTop: 4 }}>
               <View style={{ flex: 1, backgroundColor: theme.colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.guestTotal.toUpperCase()}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.textPrimary, marginTop: 4 }}>{guestTotal}</Text>
               </View>
               <View style={{ flex: 1, backgroundColor: theme.colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.guestTaken.toUpperCase()}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.success, marginTop: 4 }}>{guestTaken}</Text>
               </View>
            </View>
          </>
        ) : (
          <>
            <View style={{ width: '47%' }}>
              <CounterInput
                label={UI_TEXT.guestTotal}
                value={guestTotal}
                min={guestTaken}
                onChange={(val) => onUpdate(dayId, type, isVegEnabled ? "guestVeg" : "guestNonVeg", val)}
                disabled={disabled}
              />
            </View>
            <View style={{ width: '47%' }}>
              <CounterInput
                label={UI_TEXT.guestTaken}
                value={guestTaken}
                min={0}
                max={guestTotal}
                onChange={(val) => onUpdate(dayId, type, isVegEnabled ? "guestVegTaken" : "guestNonVegTaken", val)}
                disabled={disabled}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
});

export function GuestManagementScreen({
  menu,
  config,
  onUpdateMenu,
  onBack,
  onHome,
  onLogout,
  seasonEnabled,
}: {
  menu: FoodMenu;
  config: ConfigDay[];
  onUpdateMenu: (menu: FoodMenu) => Promise<void>;
  onBack: () => void;
  onHome: () => void;
  onLogout: () => void;
  seasonEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const activeDays = config.filter((d) => d.enabled).map((d) => d.id);

  const handleUpdate = (
    day: string,
    type: "breakfast" | "lunch" | "dinner",
    field: string,
    value: number
  ) => {
    const updatedMenu = { ...menu };
    const updatedDay = { ...(updatedMenu[day as any] || {}) };
    const updatedMeal = { ...(updatedDay[type] || { veg: [], nonVeg: [] }) };

    // Update the specific field
    (updatedMeal as any)[field] = value;

    // Recalculate guestTotal and guestTaken
    const isVegEnabled = isDietaryEnabled(day, type, "veg", config);
    const isNonVegEnabled = isDietaryEnabled(day, type, "nonVeg", config);

    if (isVegEnabled && isNonVegEnabled) {
      updatedMeal.guestTotal = (updatedMeal.guestVeg || 0) + (updatedMeal.guestNonVeg || 0);
      updatedMeal.guestTaken = (updatedMeal.guestVegTaken || 0) + (updatedMeal.guestNonVegTaken || 0);
    } else {
       // Single diet mode: keep synced
       updatedMeal.guestTotal = isVegEnabled ? (updatedMeal.guestVeg || 0) : (updatedMeal.guestNonVeg || 0);
       updatedMeal.guestTaken = isVegEnabled ? (updatedMeal.guestVegTaken || 0) : (updatedMeal.guestNonVegTaken || 0);
    }

    updatedDay[type] = updatedMeal;
    updatedMenu[day as any] = updatedDay;
    onUpdateMenu(updatedMenu);
  };

  return (
    <View style={styles.root}>
      <StatusBar style={themeType === "dark" ? "light" : "dark"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={onBack} />
            <HomeButton onPress={onHome} />
          </View>
          <LogoutButton onLogout={onLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.guestManagement}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.dashboardSubtitle}</Text>
      </View>

      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {activeDays.map((day, index) => {
          const dayMenu = menu[day] || {};
          const colorScheme = theme.cardColors[index % theme.cardColors.length];

          return (
            <View key={day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent, marginBottom: 16 }]}>{getDayLabel(day, config)}</Text>

              {isMealEnabled(day, "breakfast", config) && (
                <GuestMealCard
                  dayId={day}
                  type="breakfast"
                  menu={dayMenu.breakfast || { veg: [], nonVeg: [] }}
                  config={config}
                  onUpdate={handleUpdate}
                  disabled={!seasonEnabled}
                />
              )}
              {isMealEnabled(day, "lunch", config) && (
                <GuestMealCard
                  dayId={day}
                  type="lunch"
                  menu={dayMenu.lunch || { veg: [], nonVeg: [] }}
                  config={config}
                  onUpdate={handleUpdate}
                  disabled={!seasonEnabled}
                />
              )}
              {isMealEnabled(day, "dinner", config) && (
                <GuestMealCard
                  dayId={day}
                  type="dinner"
                  menu={dayMenu.dinner || { veg: [], nonVeg: [] }}
                  config={config}
                  onUpdate={handleUpdate}
                  disabled={!seasonEnabled}
                />
              )}
            </View>
          );
        })}

        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
