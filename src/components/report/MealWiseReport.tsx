import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, isMealEnabled, getSortedMealKeys, getMealLabel } from "../../constants";
import { AppThemeMode, ConfigDay, MealType } from "../../domain";

interface MealStats {
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

interface MealWiseData {
  day: string;
  meals: Record<MealType, MealStats>;
}

export function MealWiseReport({
  data,
  dayConfig,
  kidsEnabled,
}: {
  data: MealWiseData[];
  dayConfig: ConfigDay[];
  kidsEnabled: boolean;
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
                const tVeg = m.veg + m.guestVeg + m.kidsVeg, tNonVeg = m.nonVeg + m.guestNonVeg + m.kidsNonVeg;
                const tTakenVeg = m.vegTaken + m.guestVegTaken + m.kidsVegTaken, tTakenNonVeg = m.nonVegTaken + m.guestNonVegTaken + m.kidsNonVegTaken;
                return (
                  <View key={mKey} style={{ backgroundColor: theme.colors.surfaceDark + (theme.themeType === AppThemeMode.DARK ? "66" : "80"), borderRadius: 20, padding: 16, marginBottom: 16 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                      <Ionicons name={mKey === MealType.BREAKFAST ? "sunny-outline" : mKey === MealType.LUNCH ? "restaurant-outline" : "moon-outline"} size={18} color={theme.colors.primary} />
                      <Text style={{ color: theme.colors.primary, fontWeight: "800", fontSize: 16 }}>{getMealLabel(mKey)}</Text>
                    </View>
                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: 'center' }}>
                        <Text style={{ color: theme.colors.veg, fontWeight: "700", fontSize: 13 }}>{UI_TEXT.veg}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                           <Text style={{ fontSize: 12, color: theme.colors.veg, fontWeight: '800' }}>{tTakenVeg}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{tVeg}</Text>
                           {kidsEnabled && <Text style={{ fontSize: 10, color: theme.colors.textMuted, fontWeight: '700' }}>{UI_TEXT.openParen}{UI_TEXT.adultAbbrLabel}{UI_TEXT.colon}{m.vegTaken}{UI_TEXT.slash}{m.veg}{UI_TEXT.comma}{UI_TEXT.space}{UI_TEXT.kidsAbbrLabel}{UI_TEXT.colon}{m.kidsVegTaken}{UI_TEXT.slash}{m.kidsVeg}{UI_TEXT.closeParen}</Text>}
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: 'center' }}>
                        <Text style={{ color: theme.colors.nonVeg, fontWeight: "700", fontSize: 13 }}>{UI_TEXT.nonVeg}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                           <Text style={{ fontSize: 12, color: theme.colors.nonVeg, fontWeight: '800' }}>{tTakenNonVeg}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{tNonVeg}</Text>
                           {kidsEnabled && <Text style={{ fontSize: 10, color: theme.colors.textMuted, fontWeight: '700' }}>{UI_TEXT.openParen}{UI_TEXT.adultAbbrLabel}{UI_TEXT.colon}{m.nonVegTaken}{UI_TEXT.slash}{m.nonVeg}{UI_TEXT.comma}{UI_TEXT.space}{UI_TEXT.kidsAbbrLabel}{UI_TEXT.colon}{m.kidsNonVegTaken}{UI_TEXT.slash}{m.kidsNonVeg}{UI_TEXT.closeParen}</Text>}
                        </View>
                      </View>
                      <View style={{ borderTopWidth: 1, borderTopColor: colorScheme.border, paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: theme.colors.textPrimary, fontWeight: "900", fontSize: 14 }}>{UI_TEXT.total}</Text>
                        <Text style={{ color: theme.colors.veg, fontWeight: "900", fontSize: 14 }}>{tTakenVeg + tTakenNonVeg}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{tVeg + tNonVeg}</Text>
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
