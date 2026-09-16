import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { MealMenu, Day, ConfigDay, MealType, DietType } from "../../types";
import { isDietaryEnabled } from "../../constants";
import { UI_TEXT } from "../../strings";

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
  foodPriceEnabled,
}: {
  title: string;
  mealKey: MealType;
  dayId: Day;
  config: ConfigDay[];
  icon: keyof typeof Ionicons.glyphMap;
  menu: MealMenu;
  foodPriceEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const veg = menu?.veg || [];
  const nonVeg = menu?.nonVeg || [];

  const dayConf = config.find(d => d.id === dayId);
  const mConf = dayConf ? dayConf[mealKey] : null;

  const vegEnabled = isDietaryEnabled(dayId, mealKey, DietType.VEG, config);
  const nonVegEnabled = isDietaryEnabled(dayId, mealKey, DietType.NON_VEG, config);

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
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.dot, styles.vegChoice]} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.veg, letterSpacing: 0.5 }}>{UI_TEXT.veg.toUpperCase()}</Text>
              </View>
              {foodPriceEnabled && (
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.pill, { backgroundColor: theme.colors.successLight, height: 24, paddingHorizontal: 10, borderRadius: 8 }]}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: theme.colors.veg }}>{UI_TEXT.rs} {menu.vegPrice || mConf?.vegPrice || "0"}</Text>
                  </View>
                  {mConf?.parcel && (
                    <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: '700' }}>
                      {UI_TEXT.parcelLabel}: {UI_TEXT.rs} {menu.vegParcelPrice || mConf?.vegParcelPrice || UI_TEXT.zero}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <Text style={[styles.mealItemsText, { marginTop: 2 }]}>{veg.join(", ")}</Text>
          </View>
        )}
        {nonVegEnabled && nonVeg.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.dot, styles.nonVegChoice]} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.nonVeg, letterSpacing: 0.5 }}>{UI_TEXT.nonVeg.toUpperCase()}</Text>
              </View>
              {foodPriceEnabled && (
                <View style={{ alignItems: 'flex-end', gap: 4 }}>
                  <View style={[styles.pill, { backgroundColor: theme.colors.errorLight, height: 24, paddingHorizontal: 10, borderRadius: 8 }]}>
                    <Text style={{ fontSize: 11, fontWeight: '900', color: theme.colors.nonVeg }}>{UI_TEXT.rs} {menu.nonVegPrice || mConf?.nonVegPrice || "0"}</Text>
                  </View>
                  {mConf?.parcel && (
                    <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: '700' }}>
                      {UI_TEXT.parcelLabel}: {UI_TEXT.rs} {menu.nonVegParcelPrice || mConf?.nonVegParcelPrice || UI_TEXT.zero}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <Text style={[styles.mealItemsText, { marginTop: 2 }]}>{nonVeg.join(", ")}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
