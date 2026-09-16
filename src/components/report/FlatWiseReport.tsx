import React from "react";
import { View, Text, Pressable } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel } from "../../constants";
import { ConfigDay, MealType } from "../../types";

interface FlatDayMeal {
  type: MealType;
  veg: number;
  nonVeg: number;
  vegTaken: number;
  nonVegTaken: number;
  vegParcel: number;
  nonVegParcel: number;
}

interface FlatDayStat {
  day: string;
  meals: FlatDayMeal[];
}

interface FlatWiseItem {
  id: string;
  flat: string;
  block: string;
  people: number;
  amount: string;
  dayStats: FlatDayStat[];
}

export function FlatWiseReport({
  data,
  dayConfig,
  onSelectFlat,
}: {
  data: FlatWiseItem[];
  dayConfig: ConfigDay[];
  onSelectFlat: (id: string) => void;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 16 }}>
      {data.map((item, index) => {
        const colorScheme = theme.cardColors[index % theme.cardColors.length];
        return (
          <Pressable key={item.id} onPress={() => onSelectFlat(item.id)} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
            <View style={[styles.dashboardCardTop, { borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 12, marginBottom: 12 }]}>
              <View>
                 <Text style={[styles.flatLabel, { color: colorScheme.accent }]}>{UI_TEXT.block} {item.block}</Text>
                 <Text style={[styles.dashboardDay, { fontSize: 24, color: theme.colors.textPrimary }]}>{UI_TEXT.flatUpper} {item.flat}</Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                 <Text style={{ color: colorScheme.accent, fontSize: 20, fontWeight: "900" }}>{UI_TEXT.rs} {item.amount}</Text>
                 <Text style={{ color: theme.colors.textSecondary, fontWeight: "600", fontSize: 12, marginTop: 4 }}>{item.people} {UI_TEXT.people}</Text>
              </View>
            </View>
            {item.dayStats.map((ds) => (
              <View key={ds.day} style={{ marginBottom: 16 }}>
                <Text style={{ fontWeight: "800", fontSize: 14, color: colorScheme.accent, marginBottom: 8 }}>{getDayLabel(ds.day, dayConfig)}</Text>
                <View style={{ gap: 8 }}>
                  {ds.meals.map((m) => (
                    <View key={m.type} style={{ backgroundColor: theme.colors.surface, borderRadius: 12, padding: 10, flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 13, fontWeight: "800", textTransform: "capitalize" }}>{m.type}</Text>
                      <Text style={{ fontSize: 12 }}>{UI_TEXT.vegAbbr}:{m.vegTaken}/{m.veg} | {UI_TEXT.nonVegAbbr}:{m.nonVegTaken}/{m.nonVeg}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </Pressable>
        );
      })}
    </View>
  );
}
