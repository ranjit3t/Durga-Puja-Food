import React from "react";
import { View, Text } from "react-native";
import { useStyles } from "../../styles";
import { MealMenu, Day, ConfigDay, MealType, DietType } from "../../types";
import { isDietaryEnabled, getMealVarieties } from "../../constants";
import { UI_TEXT } from "../../strings";

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
  mealKey?: MealType;
  config?: ConfigDay[];
  menu: MealMenu;
}) {
  const styles = useStyles();
  const dayConf = config && dayId ? config.find((d) => d.id === dayId) : undefined;
  const mConf = dayConf && mealKey ? dayConf[mealKey] : undefined;
  const varieties = getMealVarieties(mConf);

  const targetVarieties = label
    ? varieties.filter((v) => v.name === label || v.id === label || (label === UI_TEXT.veg && v.id === "veg_default") || (label === UI_TEXT.nonVeg && v.id === "nonVeg_default"))
    : varieties;

  return (
    <View style={styles.mealSummaryRow}>
      {targetVarieties.map((v) => {
        let rawItems: any = [];
        if (v.id === "veg_default") rawItems = menu?.veg;
        else if (v.id === "nonVeg_default") rawItems = menu?.nonVeg;
        else rawItems = menu?.varieties?.[v.id]?.items;

        let items: string[] = [];
        if (Array.isArray(rawItems)) {
          items = rawItems.filter((i) => typeof i === "string" || typeof i === "number").map(String);
        } else if (rawItems && typeof rawItems === "object") {
          items = Object.values(rawItems).filter((i) => typeof i === "string" || typeof i === "number").map(String);
        } else if (typeof rawItems === "string" && rawItems.trim().length > 0) {
          items = [rawItems.trim()];
        }

        if (items.length === 0) return null;
        if (dayId && mealKey && config && !isDietaryEnabled(dayId, mealKey, v.type, config)) return null;

        const vColor = v.color || (v.type === DietType.VEG ? "#16a34a" : "#dc2626");

        return (
          <View key={v.id} style={styles.inlineItemList}>
            <View
              style={[styles.dot, { width: 6, height: 6, backgroundColor: vColor }]}
            />
            <Text style={styles.menuSummaryText}>{v.name}{UI_TEXT.colon}{UI_TEXT.space}{items.join(", ")}</Text>
          </View>
        );
      })}
    </View>
  );
}
