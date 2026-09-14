import React from "react";
import { View, Text } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { MealMenu, Day } from "../../types";
import { isDietaryEnabled } from "../../constants";

/**
 * A compact, inline version of the food menu for list views.
 */
export function MealSummaryInline({
  label,
  dayId,
  mealKey,
  config,
  menu,
}: {
  label: string;
  dayId?: Day;
  mealKey?: "breakfast" | "lunch" | "dinner";
  config?: ConfigDay[];
  menu: MealMenu;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const veg = menu?.veg || [];
  const nonVeg = menu?.nonVeg || [];

  const vegEnabled =
    dayId && mealKey && config
      ? isDietaryEnabled(dayId, mealKey, "veg", config)
      : true;
  const nonVegEnabled =
    dayId && mealKey && config
      ? isDietaryEnabled(dayId, mealKey, "nonVeg", config)
      : true;

  return (
    <View style={styles.mealSummaryRow}>
      {label ? <Text style={styles.menuSummaryLabel}>{label}:</Text> : null}

      {vegEnabled && veg.length > 0 && (
        <View style={styles.inlineItemList}>
          <View
            style={[styles.dot, styles.vegChoice, { width: 6, height: 6 }]}
          />
          <Text style={styles.menuSummaryText}>{veg.join(", ")}</Text>
        </View>
      )}

      {nonVegEnabled && nonVeg.length > 0 && (
        <View style={styles.inlineItemList}>
          <View
            style={[styles.dot, styles.nonVegChoice, { width: 6, height: 6 }]}
          />
          <Text style={styles.menuSummaryText}>{nonVeg.join(", ")}</Text>
        </View>
      )}
    </View>
  );
}
