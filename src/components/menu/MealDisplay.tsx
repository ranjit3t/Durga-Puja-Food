import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { MealMenu, Day } from "../../types";
import { isDietaryEnabled } from "../../constants";

/**
 * Renders the food items for a single meal slot (e.g. Breakfast)
 * separated by Veg and Non-veg categories.
 */
export function MealDisplay({
  title,
  mealKey,
  dayId,
  config,
  icon,
  menu,
}: {
  title: string;
  mealKey: "breakfast" | "lunch" | "dinner";
  dayId: Day;
  config: ConfigDay[];
  icon: keyof typeof Ionicons.glyphMap;
  menu: MealMenu;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const veg = menu?.veg || [];
  const nonVeg = menu?.nonVeg || [];

  const vegEnabled = isDietaryEnabled(dayId, mealKey, "veg", config);
  const nonVegEnabled = isDietaryEnabled(dayId, mealKey, "nonVeg", config);

  const hasItems =
    (vegEnabled && veg.length > 0) || (nonVegEnabled && nonVeg.length > 0);

  if (!hasItems) return null;

  return (
    <View style={styles.mealDisplayRow}>
      <View style={styles.mealDisplayHeader}>
        <Ionicons name={icon} size={18} color={theme.colors.primary} />
        <Text style={styles.mealDisplayTitle}>{title}</Text>
      </View>

      <View style={styles.mealItemsContainer}>
        {vegEnabled && veg.length > 0 && (
          <View style={styles.mealTypeSection}>
            <View style={[styles.dot, styles.vegChoice, { marginTop: 4 }]} />
            <Text style={styles.mealItemsText}>{veg.join(", ")}</Text>
          </View>
        )}
        {nonVegEnabled && nonVeg.length > 0 && (
          <View style={styles.mealTypeSection}>
            <View style={[styles.dot, styles.nonVegChoice, { marginTop: 4 }]} />
            <Text style={styles.mealItemsText}>{nonVeg.join(", ")}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
