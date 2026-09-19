import React, { useMemo, useRef, useEffect } from "react";
import { View, Text, ScrollView, Pressable, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { StatusBarStyleMode, useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import {
  getDayLabel,
  isMealEnabled,
  getSortedMealKeys,
  isMealCurrent,
} from "../constants";
import { UserRole, ConfigDay, MealType, AppScreen, AppThemeMode, ActivityModule, ActivityAction } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { MealDisplay } from "../components/menu/MealDisplay";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";

export function ViewMenuScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    foodMenu, dayConfig, guestEnabled, seasonEnabled, foodPriceEnabled, paymentConfig, kidsEnabled, addActivityLog
  } = useDatabase();
  const { navigate, goBack, targetDay, setTargetDay, targetMeal, setTargetMeal } = useAppNavigation();

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();

  const scrollRef = useRef<ScrollView>(null);
  const layouts = useRef<Record<string, number>>({});

  const onEdit = (day?: Day, meal?: MealType) => {
    addActivityLog({
      module: ActivityModule.MENU,
      action: ActivityAction.VIEW,
      targetId: day ? (meal ? `${day}-${meal}` : day) : "all",
      description: day ? `Opening editor for ${getDayLabel(day, dayConfig)}` : "Opening overall menu editor"
    });
    if (day) setTargetDay(day);
    if (meal) setTargetMeal(meal);
    navigate(AppScreen.MENU);
  };
  const isPaymentEnabled = paymentConfig.enabled;

  const emptyMeal = {
    veg: [],
    nonVeg: [],
    guestVeg: 0,
    guestNonVeg: 0,
    guestTaken: 0,
    guestVegTaken: 0,
    guestNonVegTaken: 0
  };
  const isAdmin = userRole === UserRole.ADMIN;
  const sortedActiveDays = useMemo(() => {
    const active = dayConfig
      .filter((d) => d.enabled)
      .filter((d) => {
        const dayMenu = foodMenu[d.id];
        if (!dayMenu) return false;
        return Object.values(dayMenu).some(
          (m: any) => (m?.veg?.length || 0) > 0 || (m?.nonVeg?.length || 0) > 0
        );
      })
      .map((d) => d.id);

    return [...active].sort((a, b) => {
      const aHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(a, m, dayConfig));
      const bHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(b, m, dayConfig));
      if (aHasCurrent && !bHasCurrent) return -1;
      if (!aHasCurrent && bHasCurrent) return 1;
      return 0;
    });
  }, [dayConfig, foodMenu]);

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
      <StatusBar style={themeType === AppThemeMode.DARK ? StatusBarStyleMode.LIGHT : StatusBarStyleMode.DARK} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.foodMenu}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.menuSubtitle}</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={styles.content}
      >
        {sortedActiveDays.map((day, index) => {
          const dayMenu = foodMenu[day] || {
            [MealType.BREAKFAST]: emptyMeal,
            [MealType.LUNCH]: emptyMeal,
            [MealType.DINNER]: emptyMeal,
          };
          const colorScheme = theme.cardColors[index % theme.cardColors.length];
          return (
            <View
              key={day}
              onLayout={(e) => {
                layouts.current[day] = e.nativeEvent.layout.y;
              }}
              style={[styles.menuDayCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}
            >
              <View style={[styles.menuDayHeader, { backgroundColor: colorScheme.accentLight, borderBottomColor: colorScheme.border, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                <Text style={[styles.menuDayTitle, { color: colorScheme.accent }]}>{getDayLabel(day, dayConfig)}</Text>
                {isAdmin && seasonEnabled && (
                  <Pressable
                    onPress={() => onEdit(day)}
                    style={({ pressed }) => [
                      {
                        padding: 6,
                        borderRadius: 20,
                        backgroundColor: colorScheme.accentLight
                      },
                      pressed && { opacity: 0.7 }
                    ]}
                  >
                    <Ionicons name="pencil" size={18} color={colorScheme.accent} />
                  </Pressable>
                )}
              </View>
              <View style={styles.menuDayBody}>
                {getSortedMealKeys(day, dayConfig)
                  .filter((mKey) => isMealEnabled(day, mKey, dayConfig))
                  .filter((mKey) => {
                    const meal = dayMenu[mKey];
                    return (meal?.veg?.length || 0) > 0 || (meal?.nonVeg?.length || 0) > 0;
                  })
                  .map((mKey) => (
                    <MealDisplay
                      key={mKey}
                      title={mKey === MealType.BREAKFAST ? UI_TEXT.breakfast : mKey === MealType.LUNCH ? UI_TEXT.lunch : UI_TEXT.dinner}
                      mealKey={mKey}
                      dayId={day}
                      config={dayConfig}
                      icon={mKey === MealType.BREAKFAST ? "sunny-outline" : mKey === MealType.LUNCH ? "restaurant-outline" : "moon-outline"}
                      menu={dayMenu[mKey] || emptyMeal}
                      foodPriceEnabled={foodPriceEnabled && isPaymentEnabled}
                      kidsEnabled={!!kidsEnabled}
                    />
                  ))}
              </View>
            </View>
          );
        })}

        {isAdmin && seasonEnabled && (
          <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
            <Pressable onPress={onEdit} style={styles.primary}>
              <ActionLabel
                icon="create-outline"
                label={UI_TEXT.updateMenuItems}
                color={theme.colors.white}
              />
            </Pressable>
          </View>
        )}

        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
