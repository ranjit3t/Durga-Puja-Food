import React from "react";
import { View, Text, Pressable } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, getMealLabel } from "../../constants";
import { ConfigDay, MealType } from "../../types";

interface FlatDayMeal {
  type: MealType;
  veg: number;
  nonVeg: number;
  kidsVeg: number;
  kidsNonVeg: number;
  vegTaken: number;
  nonVegTaken: number;
  kidsVegTaken: number;
  kidsNonVegTaken: number;
  vegParcel: number;
  nonVegParcel: number;
  kidsVegParcel: number;
  kidsNonVegParcel: number;
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
  kids: number;
  amount: string;
  dayStats: FlatDayStat[];
}

export function FlatWiseReport({
  data,
  dayConfig,
  onSelectFlat,
  kidsEnabled,
}: {
  data: FlatWiseItem[];
  dayConfig: ConfigDay[];
  onSelectFlat: (id: string) => void;
  kidsEnabled: boolean;
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
                 <Text style={{ color: colorScheme.accent, fontSize: 20, fontWeight: "900" }}>{UI_TEXT.rs}{UI_TEXT.space}{item.amount}</Text>
                 <Text style={{ color: theme.colors.textSecondary, fontWeight: "600", fontSize: 12, marginTop: 4 }}>
                   {kidsEnabled ? (
                     `${item.people}${UI_TEXT.adultAbbrLabel}${UI_TEXT.plus}${item.kids}${UI_TEXT.kidsAbbrLabel}`
                   ) : (
                     `${item.people + item.kids}${item.people + item.kids === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}`
                   )}
                 </Text>
              </View>
            </View>
            {item.dayStats.map((ds) => (
              <View key={ds.day} style={{ marginBottom: 16 }}>
                <Text style={{ fontWeight: "800", fontSize: 14, color: colorScheme.accent, marginBottom: 8 }}>{getDayLabel(ds.day, dayConfig)}</Text>
                <View style={{ gap: 8 }}>
                  {ds.meals.map((m) => (
                    <View key={m.type} style={{ backgroundColor: theme.colors.surface, borderRadius: 12, padding: 10, gap: 4 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                         <Text style={{ fontSize: 13, fontWeight: "800" }}>{getMealLabel(m.type)}</Text>
                         <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>
                           {kidsEnabled ? `${UI_TEXT.adultAbbrLabel}${UI_TEXT.colon}${UI_TEXT.space}` : ""}
                           {m.vegTaken}{UI_TEXT.slash}{m.veg}{UI_TEXT.vegAbbr}{UI_TEXT.space}{UI_TEXT.pipe}{UI_TEXT.space}{m.nonVegTaken}{UI_TEXT.slash}{m.nonVeg}{UI_TEXT.nonVegAbbr}
                         </Text>
                      </View>
                      {kidsEnabled && (
                        <View style={{ flexDirection: "row", justifyContent: "flex-end" }}>
                           <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textMuted }}>{UI_TEXT.kidsAbbrLabel}{UI_TEXT.colon}{UI_TEXT.space}{m.kidsVegTaken}{UI_TEXT.slash}{m.kidsVeg}{UI_TEXT.vegAbbr}{UI_TEXT.space}{UI_TEXT.pipe}{UI_TEXT.space}{m.kidsNonVegTaken}{UI_TEXT.slash}{m.kidsNonVeg}{UI_TEXT.nonVegAbbr}</Text>
                        </View>
                      )}
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
