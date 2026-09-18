import React from "react";
import { View, Text } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, isDietaryEnabledForDay, isParcelEnabled } from "../../constants";
import { ConfigDay, MealType, DietType, AppThemeMode } from "../../types";

interface DayWiseData {
  day: string;
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
  guestVeg: number;
  guestNonVeg: number;
  guestVegTaken: number;
  guestNonVegTaken: number;
}

export function DayWiseReport({
  data,
  dayConfig,
  kidsEnabled,
}: {
  data: DayWiseData[];
  dayConfig: ConfigDay[];
  kidsEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 16 }}>
      {data.map((item, index) => {
        const vegEnabled = isDietaryEnabledForDay(item.day, DietType.VEG, dayConfig);
        const nonVegEnabled = isDietaryEnabledForDay(item.day, DietType.NON_VEG, dayConfig);
        const hasParcelSupport = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isParcelEnabled(item.day, m, dayConfig));

        const totalVeg = item.veg + item.guestVeg + item.kidsVeg;
        const totalNonVeg = item.nonVeg + item.guestNonVeg + item.kidsNonVeg;
        const totalVegTaken = item.vegTaken + item.guestVegTaken + item.kidsVegTaken;
        const totalNonVegTaken = item.nonVegTaken + item.guestNonVegTaken + item.kidsNonVegTaken;
        const totalDemand = totalVeg + totalNonVeg;
        const totalTaken = totalVegTaken + totalNonVegTaken;
        const totalNotTaken = totalDemand - totalTaken;
        const colorScheme = theme.cardColors[index % theme.cardColors.length];

        return (
          <View key={item.day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
            <View style={[styles.dashboardCardTop, { borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 16 }]}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{getDayLabel(item.day, dayConfig)}</Text>
              <View style={[styles.pill, { backgroundColor: colorScheme.accentLight }]}>
                <Text style={[styles.pillText, { color: colorScheme.accent }]}>{totalDemand} {UI_TEXT.platesDemand}</Text>
              </View>
            </View>
            <View style={{ marginTop: 20, gap: 12 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.totalDemand}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  {vegEnabled && (
                    <View style={{ alignItems: 'flex-end', marginBottom: 4 }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.veg }}>{UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{totalVeg}</Text>
                      {kidsEnabled && (
                        <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textMuted }}>{UI_TEXT.openParen}{UI_TEXT.adultAbbrLabel}{UI_TEXT.colon}{item.veg}{UI_TEXT.comma}{UI_TEXT.space}{UI_TEXT.kidsAbbrLabel}{UI_TEXT.colon}{item.kidsVeg}{UI_TEXT.closeParen}</Text>
                      )}
                    </View>
                  )}
                  {nonVegEnabled && (
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.nonVeg }}>{UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{totalNonVeg}</Text>
                      {kidsEnabled && (
                        <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textMuted }}>{UI_TEXT.openParen}{UI_TEXT.adultAbbrLabel}{UI_TEXT.colon}{item.nonVeg}{UI_TEXT.comma}{UI_TEXT.space}{UI_TEXT.kidsAbbrLabel}{UI_TEXT.colon}{item.kidsNonVeg}{UI_TEXT.closeParen}</Text>
                      )}
                    </View>
                  )}
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
                  <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.primary }}>{item.vegParcel + item.nonVegParcel}{UI_TEXT.space}{UI_TEXT.parcelAbbr}</Text>
                </View>
              )}
            </View>
          </View>
        );
      })}
    </View>
  );
}
