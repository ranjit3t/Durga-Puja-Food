import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, isMealEnabled, getSortedMealKeys } from "../../constants";
import { ConfigDay, MealType } from "../../types";

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

export function MealWiseReport({
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
        return (
          <View key={item.day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
            <View style={{ borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 12, marginBottom: 12 }}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{getDayLabel(item.day, dayConfig)}</Text>
            </View>
            {getSortedMealKeys(item.day, dayConfig)
              .filter((mKey) => isMealEnabled(item.day, mKey, dayConfig))
              .map((mKey) => {
                const m = item.meals[mKey];
                const tVeg = m.veg + m.guestVeg, tNonVeg = m.nonVeg + m.guestNonVeg;
                const tTakenVeg = m.vegTaken + m.guestVegTaken, tTakenNonVeg = m.nonVegTaken + m.guestNonVegTaken;
                return (
                  <View key={mKey} style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 16, marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <Ionicons name={mKey === MealType.BREAKFAST ? "sunny-outline" : mKey === MealType.LUNCH ? "restaurant-outline" : "moon-outline"} size={18} color={theme.colors.primary} />
                      <Text style={{ color: theme.colors.primary, fontWeight: "800", fontSize: 16, textTransform: "capitalize" }}>{mKey}</Text>
                    </View>
                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: theme.colors.veg, fontWeight: "700", fontSize: 13 }}>{UI_TEXT.veg}</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.veg }}>{tTakenVeg} / {tVeg}</Text>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: theme.colors.nonVeg, fontWeight: "700", fontSize: 13 }}>{UI_TEXT.nonVeg}</Text>
                        <Text style={{ fontSize: 12, color: theme.colors.nonVeg }}>{tTakenNonVeg} / {tNonVeg}</Text>
                      </View>
                      <View style={{ borderTopWidth: 1, borderTopColor: colorScheme.border, paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: theme.colors.textPrimary, fontWeight: "900", fontSize: 14 }}>{UI_TEXT.total}</Text>
                        <Text style={{ color: theme.colors.veg, fontWeight: "900", fontSize: 14 }}>{tTakenVeg + tTakenNonVeg} / {tVeg + tNonVeg}</Text>
                      </View>
                    </View>
                  </View>
                );
              })}
          </View>
        );
      })}
    </View>
  );
}
