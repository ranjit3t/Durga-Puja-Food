import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, isMealEnabled, getSortedMealKeys, isParcelEnabled, isDietaryEnabled, getMealLabel } from "../../constants";
import { ConfigDay, MealType, DietType } from "../../types";

interface MealStats {
  veg: number;
  nonVeg: number;
  vegTaken: number;
  nonVegTaken: number;
  vegParcel: number;
  nonVegParcel: number;
  guestVeg: number;
  guestNonVeg: number;
  guestVegTaken: number;
  guestNonVegTaken: number;
}

interface MealWiseData {
  day: string;
  meals: Record<MealType, MealStats>;
}

export function ParcelWiseReport({
  data,
  dayConfig,
}: {
  data: MealWiseData[];
  dayConfig: ConfigDay[];
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 16 }}>
      {data.map((item, index) => {
        const colorScheme = theme.cardColors[index % theme.cardColors.length];
        const mealsWithParcels = getSortedMealKeys(item.day, dayConfig)
          .filter((mKey) => isMealEnabled(item.day, mKey, dayConfig) && isParcelEnabled(item.day, mKey, dayConfig));

        if (mealsWithParcels.length === 0) return null;

        return (
          <View key={item.day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 12, marginBottom: 12 }}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{getDayLabel(item.day, dayConfig)}</Text>
            </View>
            <View style={{ gap: 12 }}>
              {mealsWithParcels.map((mKey) => {
                const m = item.meals[mKey];
                const totalParcel = (m.vegParcel || 0) + (m.nonVegParcel || 0);
                if (totalParcel === 0) return null;

                return (
                  <View key={mKey} style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Ionicons name={mKey === MealType.BREAKFAST ? "sunny-outline" : mKey === MealType.LUNCH ? "restaurant-outline" : "moon-outline"} size={16} color={theme.colors.primary} />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary }}>{getMealLabel(mKey)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <View style={{ gap: 4 }}>
                        {isDietaryEnabled(item.day, mKey, DietType.VEG, dayConfig) && <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.veg }}>{UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{m.vegParcel || 0}</Text>}
                        {isDietaryEnabled(item.day, mKey, DietType.NON_VEG, dayConfig) && <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.nonVeg }}>{UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{m.nonVegParcel || 0}</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.total.toUpperCase()}</Text>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.primary }}>{totalParcel}{UI_TEXT.space}{UI_TEXT.parcelAbbr}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
