import React from "react";
import { View, Text, ScrollView, Pressable, StatusBar } from "react-native";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import {
  getDayLabel,
  isMealEnabled,
} from "../constants";
import { FoodMenu, UserRole, ConfigDay } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { MealDisplay } from "../components/menu/MealDisplay";

export function ViewMenuScreen({
  menu,
  userRole,
  config,
  onEdit,
  onBack,
  onHome,
  onLogout,
  guestEnabled,
  seasonEnabled,
}: {
  menu: FoodMenu;
  userRole: UserRole;
  config: ConfigDay[];
  onEdit: () => void;
  onBack: () => void;
  onHome: () => void;
  onLogout: () => void;
  guestEnabled: boolean;
  seasonEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const emptyMeal = {
    veg: [],
    nonVeg: [],
    guestVeg: 0,
    guestNonVeg: 0,
    guestTaken: 0,
    guestVegTaken: 0,
    guestNonVegTaken: 0
  };
  const isAdmin = userRole === "admin";
  const activeDays = config.filter((d) => d.enabled).map((d) => d.id);

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
        <Text style={styles.subtitle}>{UI_TEXT.menuSubtitle}</Text>
      </View>
      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={styles.content}
      >
        {activeDays.map((day, index) => {
          const dayMenu = menu[day] || {
            breakfast: emptyMeal,
            lunch: emptyMeal,
            dinner: emptyMeal,
          };
          const colorScheme = theme.cardColors[index % theme.cardColors.length];
          return (
            <View key={day} style={[styles.menuDayCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
              <View style={[styles.menuDayHeader, { backgroundColor: colorScheme.accent + "15", borderBottomColor: colorScheme.border }]}>
                <Text style={[styles.menuDayTitle, { color: colorScheme.accent }]}>{getDayLabel(day, config)}</Text>
              </View>
              <View style={styles.menuDayBody}>
                {isMealEnabled(day, "breakfast", config) && (
                  <MealDisplay
                    title={UI_TEXT.breakfast}
                    mealKey="breakfast"
                    dayId={day}
                    config={config}
                    icon="sunny-outline"
                    menu={dayMenu.breakfast || emptyMeal}
                    guestEnabled={guestEnabled}
                  />
                )}
                {isMealEnabled(day, "lunch", config) && (
                  <MealDisplay
                    title={UI_TEXT.lunch}
                    mealKey="lunch"
                    dayId={day}
                    config={config}
                    icon="restaurant-outline"
                    menu={dayMenu.lunch || emptyMeal}
                    guestEnabled={guestEnabled}
                  />
                )}
                {isMealEnabled(day, "dinner", config) && (
                  <MealDisplay
                    title={UI_TEXT.dinner}
                    mealKey="dinner"
                    dayId={day}
                    config={config}
                    icon="moon-outline"
                    menu={dayMenu.dinner || emptyMeal}
                    guestEnabled={guestEnabled}
                  />
                )}
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
                color="#FFF"
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
