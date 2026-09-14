/**
 * Administrative tool for managing the global festival food menu.
 * Allows adding and removing items from Breakfast, Lunch, and Dinner slots.
 */
import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import {
  getDayLabel,
  isMealEnabled,
} from "../constants";
import { FoodMenu, Day, DayMenu, MealMenu, ConfigDay } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { MealMenuEditor } from "../components/menu/MealMenuEditor";
import { AlertButton } from "../components/common/CustomAlert";

export function MenuEditorScreen({
  menu,
  config,
  onSave,
  onBack,
  onHome,
  onLogout,
  showAlert,
  guestEnabled,
  seasonEnabled,
}: {
  menu: FoodMenu;
  config: ConfigDay[];
  onSave: (menu: FoodMenu) => Promise<void>;
  onBack: () => void;
  onHome: () => void;
  onLogout: () => void;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  guestEnabled: boolean;
  seasonEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const [localMenu, setLocalMenu] = useState(menu);
  const [saving, setSaving] = useState(false);
  const canEdit = seasonEnabled;
  const emptyMeal = {
    veg: [],
    nonVeg: [],
    guestVeg: 0,
    guestNonVeg: 0,
    guestTaken: 0,
    guestVegTaken: 0,
    guestNonVegTaken: 0
  };

  const activeDays = config.filter((d) => d.enabled).map((d) => d.id);

  /**
   * Local update handler for meal slot items.
   */
  const updateMeal = (day: Day, meal: keyof DayMenu, next: MealMenu) => {
    const dayData = localMenu[day] || {
      breakfast: emptyMeal,
      lunch: emptyMeal,
      dinner: emptyMeal,
    };
    setLocalMenu({ ...localMenu, [day]: { ...dayData, [meal]: next } });
  };

  /**
   * Persists the local menu state to the repository.
   */
  const handleSave = async () => {
    setSaving(true);
    await onSave(localMenu);
    setSaving(false);
    showAlert(UI_TEXT.success, UI_TEXT.menuUpdated);
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
        <Text style={styles.title}>{UI_TEXT.foodMenu}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.menuEditorSubtitle}</Text>
      </View>
      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Daily meal editors */}
        {activeDays.map((day, index) => {
          const dayMenu = localMenu[day] || {
            breakfast: emptyMeal,
            lunch: emptyMeal,
            dinner: emptyMeal,
          };
          const colorScheme = theme.cardColors[index % theme.cardColors.length];
          return (
            <View key={day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent, marginBottom: 12 }]}>{getDayLabel(day, config)}</Text>
              {isMealEnabled(day, "breakfast", config) && (
                <MealMenuEditor
                  title={UI_TEXT.breakfast}
                  mealKey="breakfast"
                  dayId={day}
                  config={config}
                  value={dayMenu.breakfast || emptyMeal}
                  onChange={(next) => updateMeal(day, "breakfast", next)}
                  disabled={!canEdit}
                />
              )}
              {isMealEnabled(day, "lunch", config) && (
                <MealMenuEditor
                  title={UI_TEXT.lunch}
                  mealKey="lunch"
                  dayId={day}
                  config={config}
                  value={dayMenu.lunch || emptyMeal}
                  onChange={(next) => updateMeal(day, "lunch", next)}
                  disabled={!canEdit}
                />
              )}
              {isMealEnabled(day, "dinner", config) && (
                <MealMenuEditor
                  title={UI_TEXT.dinner}
                  mealKey="dinner"
                  dayId={day}
                  config={config}
                  value={dayMenu.dinner || emptyMeal}
                  onChange={(next) => updateMeal(day, "dinner", next)}
                  disabled={!canEdit}
                />
              )}
            </View>
          );
        })}

        {/* Action Button */}
        {canEdit && (
          <Pressable
            onPress={handleSave}
            style={[styles.primary, saving && { opacity: 0.7 }]}
            disabled={saving}
          >
            <ActionLabel
              icon="save-outline"
              label={saving ? UI_TEXT.saving : UI_TEXT.saveMenu}
              color="#fff"
            />
          </Pressable>
        )}

        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
