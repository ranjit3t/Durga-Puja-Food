import React from "react";
import { View, Text, ScrollView, Pressable, StatusBar } from "react-native";
import { styles } from "../styles";
import { UI_TEXT } from "../strings";
import {
  getDayLabel,
  isMealEnabled,
} from "../constants";
import { FoodMenu, UserRole, ConfigDay } from "../types";
import { BackButton } from "../components/common/BackButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { MealDisplay } from "../components/menu/MealDisplay";

export function ViewMenuScreen({
  menu,
  userRole,
  config,
  onEdit,
  onBack,
  onLogout,
}: {
  menu: FoodMenu;
  userRole: UserRole;
  config: ConfigDay[];
  onEdit: () => void;
  onBack: () => void;
  onLogout: () => void;
}) {
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
        <Text style={styles.eyebrow}>{UI_TEXT.festivalFeast}</Text>
        <Text style={styles.title}>{UI_TEXT.foodMenu}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.menuSubtitle}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        {activeDays.map((day) => {
          const dayMenu = menu[day] || {
            breakfast: emptyMeal,
            lunch: emptyMeal,
            dinner: emptyMeal,
          };
          return (
            <View key={day} style={styles.menuDayCard}>
              <View style={styles.menuDayHeader}>
                <Text style={styles.menuDayTitle}>{getDayLabel(day, config)}</Text>
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
                  />
                )}
              </View>
            </View>
          );
        })}

        {isAdmin && (
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
