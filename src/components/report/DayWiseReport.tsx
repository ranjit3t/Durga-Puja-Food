import React from "react";
import { View, Text } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, isDietaryEnabledForDay, isParcelEnabled } from "../../constants";
import { ConfigDay, MealType, DietType } from "../../types";

interface DayWiseData {
  day: string;
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

export function DayWiseReport({
  data,
  dayConfig,
}: {
  data: DayWiseData[];
  dayConfig: ConfigDay[];
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 16 }}>
      {data.map((item, index) => {
        const vegEnabled = isDietaryEnabledForDay(item.day, DietType.VEG, dayConfig);
        const nonVegEnabled = isDietaryEnabledForDay(item.day, DietType.NON_VEG, dayConfig);
        const hasParcelSupport = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isParcelEnabled(item.day, m, dayConfig));

        const totalVeg = item.veg + item.guestVeg;
        const totalNonVeg = item.nonVeg + item.guestNonVeg;
        const totalVegTaken = item.vegTaken + item.guestVegTaken;
        const totalNonVegTaken = item.nonVegTaken + item.guestNonVegTaken;
        const totalDemand = totalVeg + totalNonVeg;
        const totalTaken = totalVegTaken + totalNonVegTaken;
        const totalNotTaken = totalDemand - totalTaken;
        const colorScheme = theme.cardColors[index % theme.cardColors.length];

        return (
          <View key={item.day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
            <View style={[styles.dashboardCardTop, { borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 16 }]}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{getDayLabel(item.day, dayConfig)}</Text>
              <View style={[styles.pill, { backgroundColor: colorScheme.accent + "20" }]}>
                <Text style={[styles.pillText, { color: colorScheme.accent }]}>{totalDemand} {UI_TEXT.platesDemand}</Text>
              </View>
            </View>
            <View style={{ marginTop: 20, gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.totalDemand}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  {vegEnabled && <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.veg, marginBottom: 2 }}>{UI_TEXT.veg}: {totalVeg}</Text>}
                  {nonVegEnabled && <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.nonVeg }}>{UI_TEXT.nonVeg}: {totalNonVeg}</Text>}
                </View>
              </View>
              {/* Meal Taken Section */}
              <View style={{ backgroundColor: theme.colors.successLight, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: theme.colors.veg, fontWeight: "800", fontSize: 16 }}>{UI_TEXT.mealTaken}</Text>
                <Text style={{ color: theme.colors.veg, fontSize: 24, fontWeight: "900" }}>{totalTaken}</Text>
              </View>
              {/* Meal Not Taken Section */}
              <View style={{ backgroundColor: theme.colors.errorLight, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: theme.colors.nonVeg, fontWeight: "800", fontSize: 16 }}>{UI_TEXT.mealNotTaken}</Text>
                <Text style={{ color: theme.colors.nonVeg, fontSize: 24, fontWeight: "900" }}>{totalNotTaken}</Text>
              </View>
              {hasParcelSupport && (item.vegParcel + item.nonVegParcel) > 0 && (
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colorScheme.border, paddingTop: 16 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.totalParcels}</Text>
                  <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.primary }}>{item.vegParcel + item.nonVegParcel} {UI_TEXT.parcelAbbr}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
