/**
 * Administrative tool for managing the global festival food menu.
 * Allows adding and removing items from Breakfast, Lunch, and Dinner slots.
 */
import React, { useMemo, useState } from "react";
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
  isMealDone,
  isMealCurrent,
  getSortedMealKeys,
} from "../constants";
import { Day, DayMenu, MealMenu, ConfigDay, MealType, AppScreen } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { MealMenuEditor } from "../components/menu/MealMenuEditor";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";
import { useUI } from "../context/UIContext";

export function MenuEditorScreen() {
  const { handleLogout } = useAuth();
  const {
    foodMenu: menu, dayConfig: config, seasonEnabled, foodPriceEnabled, updateMenu
  } = useDatabase();
  const { showAlert } = useUI();
  const { navigate, goBack } = useAppNavigation();

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const [localMenu, setLocalMenu] = useState(menu);
  const [saving, setSaving] = useState(false);
  const canEdit = seasonEnabled;

  const onSave = updateMenu;

  const emptyMeal = {
    veg: [],
    nonVeg: [],
    guestVeg: 0,
    guestNonVeg: 0,
    guestTaken: 0,
    guestVegTaken: 0,
    guestNonVegTaken: 0
  };

  const sortedActiveDays = useMemo(() => {
    const active = config.filter((d) => d.enabled).map((d) => d.id);
    return [...active].sort((a, b) => {
      const aHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(a, m, config));
      const bHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(b, m, config));
      if (aHasCurrent && !bHasCurrent) return -1;
      if (!aHasCurrent && bHasCurrent) return 1;
      return 0;
    });
  }, [config]);

  /**
   * Local update handler for meal slot items.
   */
  const updateMeal = (day: Day, meal: keyof DayMenu, next: MealMenu) => {
    const dayData = localMenu[day] || {
      [MealType.BREAKFAST]: emptyMeal,
      [MealType.LUNCH]: emptyMeal,
      [MealType.DINNER]: emptyMeal,
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
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <LogoutButton onLogout={handleLogout} />
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
        {sortedActiveDays.map((day, index) => {
          const dayMenu = localMenu[day] || {
            [MealType.BREAKFAST]: emptyMeal,
            [MealType.LUNCH]: emptyMeal,
            [MealType.DINNER]: emptyMeal,
          };
          const colorScheme = theme.cardColors[index % theme.cardColors.length];
          return (
            <View key={day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent, marginBottom: 12 }]}>{getDayLabel(day, config)}</Text>
              {getSortedMealKeys(day, config)
                .filter((mKey) => isMealEnabled(day, mKey, config))
                .map((mKey) => {
                  const isDone = isMealDone(day, mKey, config);
                  return (
                    <MealMenuEditor
                      key={mKey}
                      title={mKey === MealType.BREAKFAST ? UI_TEXT.breakfast : mKey === MealType.LUNCH ? UI_TEXT.lunch : UI_TEXT.dinner}
                      mealKey={mKey}
                      dayId={day}
                      config={config}
                      value={dayMenu[mKey] || emptyMeal}
                      onChange={(next) => updateMeal(day, mKey, next)}
                      disabled={!canEdit || isDone}
                      foodPriceEnabled={foodPriceEnabled}
                    />
                  );
                })}
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
              color={theme.colors.white}
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
