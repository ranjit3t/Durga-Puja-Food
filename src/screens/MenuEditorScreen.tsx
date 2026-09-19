/**
 * Administrative tool for managing the global festival food menu.
 * Allows adding and removing items from Breakfast, Lunch, and Dinner slots.
 */
import React, { useMemo, useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StatusBar,
} from "react-native";
import { useStyles } from "../styles";
import { useAppTheme, StatusBarStyleMode } from "../theme";
import { UI_TEXT } from "../strings";
import { AppThemeMode } from "../types";
import {
  getDayLabel,
  isMealEnabled,
  isMealDone,
  isMealCurrent,
  getSortedMealKeys,
  getMealLabel,
  getDayAbbr,
} from "../constants";
import { Day, DayMenu, MealMenu, ConfigDay, MealType, AppScreen, ActivityModule, ActivityAction } from "../types";
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
    foodMenu: menu, dayConfig: config, seasonEnabled, foodPriceEnabled, updateMenu, updateMealMenu, kidsEnabled, addActivityLog
  } = useDatabase();
  const { showAlert } = useUI();
  const { navigate, goBack, targetDay, targetMeal, setTargetDay, setTargetMeal } = useAppNavigation();

  const scrollRef = useRef<ScrollView>(null);
  const layouts = useRef<Record<string, number>>({});

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
  const updateMeal = (day: Day, meal: MealType, next: MealMenu) => {
    setLocalMenu(prev => ({
      ...prev,
      [day]: {
        ...(prev[day] || {
          [MealType.BREAKFAST]: emptyMeal,
          [MealType.LUNCH]: emptyMeal,
          [MealType.DINNER]: emptyMeal,
        }),
        [meal]: next
      }
    }));
  };

  const isMealDirty = (day: Day, meal: MealType) => {
    const original = menu[day]?.[meal] || emptyMeal;
    const current = localMenu[day]?.[meal] || emptyMeal;
    return JSON.stringify(original) !== JSON.stringify(current);
  };

  const hasAnyChanges = useMemo(() => {
    return JSON.stringify(menu) !== JSON.stringify(localMenu);
  }, [menu, localMenu]);

  const getMealChangeLog = (oldMeal: MealMenu, newMeal: MealMenu) => {
    const changes: string[] = [];

    const diffList = (oldList: string[], newList: string[], label: string) => {
      const added = newList.filter(i => !oldList.includes(i));
      const removed = oldList.filter(i => !newList.includes(i));
      if (added.length > 0) changes.push(`+${label}:[${added.join(',')}]`);
      if (removed.length > 0) changes.push(`-${label}:[${removed.join(',')}]`);
    };

    diffList(oldMeal.veg || [], newMeal.veg || [], UI_TEXT.vegAbbr);
    diffList(oldMeal.nonVeg || [], newMeal.nonVeg || [], UI_TEXT.nonVegAbbr);

    if (newMeal.vegPrice !== oldMeal.vegPrice) changes.push(`Price(V): ${oldMeal.vegPrice || '0'}->${newMeal.vegPrice}`);
    if (newMeal.nonVegPrice !== oldMeal.nonVegPrice) changes.push(`Price(N): ${oldMeal.nonVegPrice || '0'}->${newMeal.nonVegPrice}`);
    if (newMeal.kidsVegPrice !== oldMeal.kidsVegPrice) changes.push(`KidsPrice(V): ${oldMeal.kidsVegPrice || '0'}->${newMeal.kidsVegPrice}`);
    if (newMeal.kidsNonVegPrice !== oldMeal.kidsNonVegPrice) changes.push(`KidsPrice(N): ${oldMeal.kidsNonVegPrice || '0'}->${newMeal.kidsNonVegPrice}`);

    return changes.join(' | ');
  };

  const handleIndividualSave = async (day: Day, meal: MealType) => {
    setSaving(true);
    try {
      const oldMeal = menu[day]?.[meal] || emptyMeal;
      const newMeal = localMenu[day][meal];
      const changes = getMealChangeLog(oldMeal, newMeal);

      await updateMealMenu(day, meal, newMeal);
      addActivityLog({
        module: ActivityModule.MENU,
        action: ActivityAction.UPDATE,
        targetId: `${day}-${meal}`,
        description: UI_TEXT.logUpdateMenuDetails
          .replace("{day}", getDayLabel(day, config))
          .replace("{meal}", getMealLabel(meal))
          .replace("{changes}", changes || UI_TEXT.logUpdateMenu)
      });
      showAlert(UI_TEXT.success, UI_TEXT.menuUpdated, [
        { text: UI_TEXT.ok, onPress: () => {
          setTargetDay(day);
          setTargetMeal(meal);
          navigate(AppScreen.VIEW_MENU);
        }}
      ]);
    } catch (err) {
      showAlert(UI_TEXT.error, UI_TEXT.couldNotUpdateMenu);
    } finally {
      setSaving(false);
    }
  };

  /**
   * Persists the local menu state to the repository.
   */
  const handleSave = async () => {
    setSaving(true);
    const updatedMeals: string[] = [];
    Object.keys(localMenu).forEach(dayId => {
      ['breakfast', 'lunch', 'dinner'].forEach(m => {
        const mKey = m as MealType;
        if (JSON.stringify(localMenu[dayId]?.[mKey] || emptyMeal) !== JSON.stringify(menu[dayId]?.[mKey] || emptyMeal)) {
          updatedMeals.push(`${getDayAbbr(dayId, config)} ${getMealLabel(mKey)}`);
        }
      });
    });

    await onSave(localMenu);
    addActivityLog({
      module: ActivityModule.MENU,
      action: ActivityAction.UPDATE,
      description: `${UI_TEXT.logUpdateMenuAll}: ${updatedMeals.join(', ')}`
    });
    setSaving(false);
    showAlert(UI_TEXT.success, UI_TEXT.menuUpdated, [
      { text: UI_TEXT.ok, onPress: () => navigate(AppScreen.VIEW_MENU) }
    ]);
  };

  useEffect(() => {
    if (targetDay && layouts.current[targetDay] !== undefined) {
      setTimeout(() => {
        scrollRef.current?.scrollTo({ y: layouts.current[targetDay], animated: true });
        // Clear targets after scrolling
        setTargetDay("");
        setTargetMeal(null);
      }, 500);
    }
  }, [targetDay]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
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
        ref={scrollRef}
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
          const isTargeted = day === targetDay;

          return (
            <View
              key={day}
              onLayout={(e) => {
                layouts.current[day] = e.nativeEvent.layout.y;
              }}
              style={[
                styles.dashboardCard,
                { backgroundColor: colorScheme.bg, borderColor: isTargeted ? theme.colors.primary : colorScheme.border, borderWidth: isTargeted ? 2.5 : 1.5 }
              ]}
            >
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
                      onSave={() => handleIndividualSave(day, mKey)}
                      isDirty={isMealDirty(day, mKey)}
                      disabled={!canEdit || isDone || saving}
                      foodPriceEnabled={foodPriceEnabled}
                      kidsEnabled={!!kidsEnabled}
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
            style={[styles.primary, (saving || !hasAnyChanges) && { opacity: 0.5 }]}
            disabled={saving || !hasAnyChanges}
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
