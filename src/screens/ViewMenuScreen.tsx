import React, { useMemo, useRef, useEffect, useCallback } from "react";
import { View, Text, ScrollView, Pressable, StatusBar, Platform, Share } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import {
  getDayLabel,
  isMealEnabled,
  getSortedMealKeys,
  isMealCurrent,
  getMealLabel,
  isKidsParcelEnabled,
} from "../constants";
import { UserRole, MealType, AppScreen, AppThemeMode, ActivityModule, ActivityAction, Day, MealMenu } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { UserGreeting } from "../components/common/UserGreeting";
import { ActionLabel } from "../components/common/ActionLabel";
import { MealDisplay } from "../components/menu/MealDisplay";

import { useAuth } from "../context/AuthContext";
import { useCoreDatabase, useActivityLogs } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";

export function ViewMenuScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    foodMenu, dayConfig, seasonEnabled, foodPriceEnabled, paymentConfig, kidsEnabled, guestsEnabled, freeMealEnabled
  } = useCoreDatabase();
  const { addActivityLog } = useActivityLogs();
  const { navigate, goBack, targetDay, setTargetDay, setTargetMeal } = useAppNavigation();

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();

  const scrollRef = useRef<ScrollView>(null);
  const layouts = useRef<Record<string, number>>({});

  const onEdit = (day?: Day, meal?: MealType) => {
    addActivityLog({
      module: ActivityModule.MENU,
      action: ActivityAction.VIEW,
      targetId: day ? (meal ? `${day}-${meal}` : day) : "all",
      description: day ? UI_TEXT.logOpenEditor.replace("{day}", getDayLabel(day, dayConfig)) : UI_TEXT.logOpenMenuEditor
    });
    if (day) setTargetDay(day);
    if (meal) setTargetMeal(meal);
    navigate(AppScreen.MENU);
  };
  const isPaymentEnabled = paymentConfig.enabled;

  const emptyMeal = {
    veg: [],
    nonVeg: [],
    freeMealVeg: 0,
    freeMealNonVeg: 0,
    freeMealTaken: 0,
    freeMealVegTaken: 0,
    freeMealNonVegTaken: 0
  };
  const isAdmin = userRole === UserRole.ADMIN;
  const sortedActiveDays = useMemo(() => {
    const active = dayConfig
      .filter((d) => d.enabled)
      .map((d) => d.id);

    return [...active].sort((a, b) => {
      const aHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(a, m, dayConfig));
      const bHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(b, m, dayConfig));
      if (aHasCurrent && !bHasCurrent) return -1;
      if (!aHasCurrent && bHasCurrent) return 1;
      return 0;
    });
  }, [dayConfig]);

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

  const handleExportExcel = useCallback(async () => {
    const activeDays = dayConfig.filter((d) => d.enabled).map((d) => d.id);
    if (activeDays.length === 0) return;

    const headers: string[] = [
      UI_TEXT.dayNameColumn,
      UI_TEXT.mealTypeColumn,
      UI_TEXT.vegMenuItemsColumn,
      UI_TEXT.nonVegMenuItemsColumn,
      UI_TEXT.vegPriceColumn,
      UI_TEXT.nonVegPriceColumn,
      UI_TEXT.kidsVegPriceColumn,
      UI_TEXT.kidsNonVegPriceColumn,
      UI_TEXT.vegParcelPriceColumn,
      UI_TEXT.nonVegParcelPriceColumn,
      UI_TEXT.kidsVegParcelPriceColumn,
      UI_TEXT.kidsNonVegParcelPriceColumn,
    ];

    const escapeCell = (val: string | number | undefined | null) => {
      if (val === undefined || val === null) return '""';
      const str = String(val);
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const formatListItems = (raw: any): string => {
      if (Array.isArray(raw)) {
        return raw.filter(Boolean).map(String).join(", ");
      }
      if (raw && typeof raw === "object") {
        return Object.values(raw).filter(Boolean).map(String).join(", ");
      }
      if (typeof raw === "string" && raw.trim().length > 0) {
        return raw.trim();
      }
      return UI_TEXT.none;
    };

    const rows: string[][] = [];

    activeDays.forEach((dayId) => {
      const dayLabel = getDayLabel(dayId, dayConfig);
      const dayMenu = foodMenu[dayId] || {};

      getSortedMealKeys(dayId, dayConfig)
        .filter((mKey) => isMealEnabled(dayId, mKey, dayConfig))
        .forEach((mKey) => {
          const mealMenu: MealMenu = dayMenu[mKey] || { veg: [], nonVeg: [] };
          const mealLabel = getMealLabel(mKey);

          const vegItems = formatListItems(mealMenu.veg);
          const nonVegItems = formatListItems(mealMenu.nonVeg);

          const vegPrice = mealMenu.vegPrice || UI_TEXT.zero;
          const nonVegPrice = mealMenu.nonVegPrice || UI_TEXT.zero;
          const kidsVegPrice = mealMenu.kidsVegPrice || UI_TEXT.zero;
          const kidsNonVegPrice = mealMenu.kidsNonVegPrice || UI_TEXT.zero;

          const vegParcelPrice = mealMenu.vegParcelPrice || UI_TEXT.zero;
          const nonVegParcelPrice = mealMenu.nonVegParcelPrice || UI_TEXT.zero;

          const isKidsParcelOpt = isKidsParcelEnabled(dayId, mKey, dayConfig, kidsEnabled);
          const kidsVegParcelPrice = isKidsParcelOpt ? (mealMenu.kidsVegParcelPrice || UI_TEXT.zero) : UI_TEXT.zero;
          const kidsNonVegParcelPrice = isKidsParcelOpt ? (mealMenu.kidsNonVegParcelPrice || UI_TEXT.zero) : UI_TEXT.zero;

          rows.push([
            dayLabel,
            mealLabel,
            vegItems,
            nonVegItems,
            vegPrice,
            nonVegPrice,
            kidsVegPrice,
            kidsNonVegPrice,
            vegParcelPrice,
            nonVegParcelPrice,
            kidsVegParcelPrice,
            kidsNonVegParcelPrice,
          ]);
        });
    });

    const csvLines = [
      headers.map(escapeCell).join(","),
      ...rows.map((r) => r.map(escapeCell).join(",")),
    ];
    const csvContent = csvLines.join("\n");

    const fileName = UI_TEXT.exportMenuFileName.replace("{date}", new Date().toISOString().slice(0, 10));

    addActivityLog({
      module: ActivityModule.MENU,
      action: Platform.OS === "web" ? ActivityAction.DOWNLOAD : ActivityAction.SHARE,
      description: UI_TEXT.logExportMenu,
    });

    try {
      if (Platform.OS === "web") {
        const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        await Share.share({
          message: csvContent,
          title: fileName,
        });
      }
    } catch (err) {
      console.error("Menu export error:", err);
    }
  }, [dayConfig, foodMenu, addActivityLog]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <UserGreeting />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={styles.title}>{UI_TEXT.foodMenu}</Text>
            <Text style={styles.subtitle}>{UI_TEXT.menuSubtitle}</Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            {isAdmin && (
              <Pressable
                onPress={() => navigate(AppScreen.FOOD_PACKAGE)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.foodPackages}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: theme.colors.surfaceDark,
                    borderColor: theme.colors.primary,
                    borderWidth: 1.5,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    elevation: 2,
                    alignSelf: 'flex-start',
                  },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <Ionicons name="cube-outline" size={18} color={theme.colors.primary} />
                <Text style={{ color: theme.colors.primary, fontWeight: '800', fontSize: 13 }}>
                  {UI_TEXT.foodPackages}
                </Text>
              </Pressable>
            )}

            {sortedActiveDays.length >= 1 && (
              <Pressable
                onPress={handleExportExcel}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.exportExcel}
                style={({ pressed }) => [
                  {
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: theme.colors.primary,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 12,
                    elevation: 2,
                    shadowColor: theme.colors.primary,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.2,
                    shadowRadius: 4,
                    alignSelf: 'flex-start',
                  },
                  pressed && { opacity: 0.8 }
                ]}
              >
                <Ionicons
                  name={Platform.OS === 'web' ? "download-outline" : "share-outline"}
                  size={18}
                  color={theme.colors.white}
                />
                <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 13 }}>
                  {UI_TEXT.exportExcel}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
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
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`${UI_TEXT.editPass} ${getDayLabel(day, dayConfig)}`}
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
                {[MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
                  .filter((mKey) => isMealEnabled(day, mKey, dayConfig))
                  .map((mKey) => (
                    <MealDisplay
                      key={mKey}
                      title={mKey === MealType.BREAKFAST ? UI_TEXT.breakfast : mKey === MealType.LUNCH ? UI_TEXT.lunch : UI_TEXT.dinner}
                      mealKey={mKey}
                      dayId={day}
                      config={dayConfig}
                      icon={mKey === MealType.BREAKFAST ? "sunny-outline" : mKey === MealType.LUNCH ? "restaurant-outline" : "moon-outline"}
                      menu={dayMenu[mKey] || emptyMeal}
                      foodPriceEnabled={isAdmin && foodPriceEnabled && isPaymentEnabled}
                      kidsEnabled={!!kidsEnabled}
                      guestsEnabled={!!guestsEnabled}
                      freeMealEnabled={!!freeMealEnabled}
                    />
                  ))}
              </View>
            </View>
          );
        })}

        {isAdmin && seasonEnabled && (
          <View style={{ marginTop: 24, paddingHorizontal: 4 }}>
            <Pressable onPress={() => onEdit()} style={styles.primary}>
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
