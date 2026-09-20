import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, isMealEnabled, isDietaryEnabled, getMealLabel } from "../../constants";
import { ConfigDay, FoodMenu, MealType, DietType, AppThemeMode } from "../../types";

export function GuestWiseReport({
  activeDays,
  foodMenu,
  dayConfig,
}: {
  activeDays: string[];
  foodMenu: FoodMenu;
  dayConfig: ConfigDay[];
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 16 }}>
      {activeDays.map((dayId, index) => {
        const dMenu = foodMenu[dayId];
        if (!dMenu) return null;
        const colorScheme = theme.cardColors[index % theme.cardColors.length];
        const meals = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].filter(m => isMealEnabled(dayId, m, dayConfig));
        if (meals.length === 0) return null;

        return (
          <View key={dayId} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
            <View style={[styles.dashboardCardTop, { borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 12, marginBottom: 12 }]}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{getDayLabel(dayId, dayConfig)}</Text>
            </View>
            <View style={{ gap: 12 }}>
              {meals.map((mKey) => {
                const gm = dMenu[mKey];
                if (!gm) return null;
                const vEnabled = isDietaryEnabled(dayId, mKey, DietType.VEG, dayConfig);
                const nvEnabled = isDietaryEnabled(dayId, mKey, DietType.NON_VEG, dayConfig);
                const tTotal = (gm.guestVeg || 0) + (gm.guestNonVeg || 0);
                const tTaken = (gm.guestVegTaken || 0) + (gm.guestNonVegTaken || 0);
                return (
                  <View key={mKey} style={{ backgroundColor: theme.colors.surfaceDark + (theme.themeType === AppThemeMode.DARK ? "66" : "80"), borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                      <Ionicons name={mKey === MealType.BREAKFAST ? "sunny-outline" : mKey === MealType.LUNCH ? "restaurant-outline" : "moon-outline"} size={16} color={theme.colors.primary} />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary }}>{getMealLabel(mKey)}</Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                      <View style={{ gap: 4 }}>
                        {vEnabled && <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.veg }}>{UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{gm.guestVegTaken || 0}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{gm.guestVeg || 0}</Text>}
                        {nvEnabled && <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.nonVeg }}>{UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{gm.guestNonVegTaken || 0}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{gm.guestNonVeg || 0}</Text>}
                      </View>
                      <View style={{ alignItems: 'flex-end' }}>
                        <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.total.toUpperCase()}</Text>
                        <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.primary }}>{tTaken}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{tTotal}</Text>
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
