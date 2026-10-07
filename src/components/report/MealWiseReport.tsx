import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, isMealEnabled, getMealLabel, isParcelEnabled, isSpecialMeal } from "../../constants";
import { AppThemeMode, ConfigDay, MealType } from "../../domain";

interface MealStats {
  veg: number;
  nonVeg: number;
  kidsVeg: number;
  kidsNonVeg: number;
  guestsVeg?: number;
  guestsNonVeg?: number;
  vegTaken: number;
  nonVegTaken: number;
  kidsVegTaken: number;
  kidsNonVegTaken: number;
  guestsVegTaken?: number;
  guestsNonVegTaken?: number;
  vegParcel: number;
  nonVegParcel: number;
  kidsVegParcel: number;
  kidsNonVegParcel: number;
  guestsVegParcel?: number;
  guestsNonVegParcel?: number;
  vegParcelTaken: number;
  nonVegParcelTaken: number;
  kidsVegParcelTaken: number;
  kidsNonVegParcelTaken: number;
  guestsVegParcelTaken?: number;
  guestsNonVegParcelTaken?: number;
  freeMealVeg: number;
  freeMealNonVeg: number;
  freeMealVegTaken: number;
  freeMealNonVegTaken: number;
}

interface MealWiseData {
  day: string;
  meals: Record<MealType, MealStats>;
}

export function MealWiseReport({
  data,
  dayConfig,
  kidsEnabled,
  guestsEnabled,
}: {
  data: MealWiseData[];
  dayConfig: ConfigDay[];
  kidsEnabled: boolean;
  guestsEnabled?: boolean;
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
            {[MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
              .filter((mKey) => isMealEnabled(item.day, mKey, dayConfig))
              .map((mKey) => {
                const m = item.meals[mKey];
                const tVeg = m.veg + m.freeMealVeg + m.kidsVeg + (m.guestsVeg || 0);
                const tNonVeg = m.nonVeg + m.freeMealNonVeg + m.kidsNonVeg + (m.guestsNonVeg || 0);
                const tTakenVeg = m.vegTaken + m.freeMealVegTaken + m.kidsVegTaken + (m.guestsVegTaken || 0);
                const tTakenNonVeg = m.nonVegTaken + m.freeMealNonVegTaken + m.kidsNonVegTaken + (m.guestsNonVegTaken || 0);
                const isSpecial = isSpecialMeal(item.day, mKey, dayConfig);

                const totalParcelCount = m.vegParcel + m.nonVegParcel + (m.kidsVegParcel || 0) + (m.kidsNonVegParcel || 0) + (m.guestsVegParcel || 0) + (m.guestsNonVegParcel || 0);
                const totalParcelTakenCount = m.vegParcelTaken + m.nonVegParcelTaken + (m.kidsVegParcelTaken || 0) + (m.kidsNonVegParcelTaken || 0) + (m.guestsVegParcelTaken || 0) + (m.guestsNonVegParcelTaken || 0);

                return (
                  <View key={mKey} style={[{ backgroundColor: theme.colors.surfaceDark + (theme.themeType === AppThemeMode.DARK ? "66" : "80"), borderRadius: 20, padding: 16, marginBottom: 16 }, isSpecial && { backgroundColor: theme.colors.specialMealBg, borderColor: theme.colors.specialMealBorder, borderWidth: 2, borderStyle: "dashed" }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
                      <Ionicons name={mKey === MealType.BREAKFAST ? "sunny-outline" : mKey === MealType.LUNCH ? "restaurant-outline" : "moon-outline"} size={18} color={isSpecial ? theme.colors.specialMealText : theme.colors.primary} />
                      <Text style={{ color: isSpecial ? theme.colors.specialMealText : theme.colors.primary, fontWeight: "800", fontSize: 16 }}>{getMealLabel(mKey)}</Text>
                      {isSpecial && (
                        <View style={{ backgroundColor: theme.colors.specialMealBorder, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                          <Ionicons name="star" size={10} color={theme.colors.white} />
                          <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.specialMealBadge}</Text>
                        </View>
                      )}
                    </View>
                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: 'center' }}>
                        <Text style={{ color: theme.colors.veg, fontWeight: "700", fontSize: 13 }}>{UI_TEXT.veg}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                           <Text style={{ fontSize: 12, color: theme.colors.veg, fontWeight: '800' }}>{tTakenVeg}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{tVeg}</Text>
                           {(kidsEnabled || guestsEnabled) && (
                             <Text style={{ fontSize: 10, color: theme.colors.textMuted, fontWeight: '700' }}>
                               {UI_TEXT.openParen}{UI_TEXT.adultAbbrLabel}{UI_TEXT.colon}{m.vegTaken}{UI_TEXT.slash}{m.veg}
                               {kidsEnabled ? `, ${UI_TEXT.kidsAbbrLabel}:${m.kidsVegTaken}/${m.kidsVeg}` : ""}
                               {guestsEnabled && m.guestsVeg !== undefined ? `, ${UI_TEXT.guestAbbrLabel}:${m.guestsVegTaken || 0}/${m.guestsVeg || 0}` : ""}
                               {UI_TEXT.closeParen}
                             </Text>
                           )}
                        </View>
                      </View>
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: 'center' }}>
                        <Text style={{ color: theme.colors.nonVeg, fontWeight: "700", fontSize: 13 }}>{UI_TEXT.nonVeg}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                           <Text style={{ fontSize: 12, color: theme.colors.nonVeg, fontWeight: '800' }}>{tTakenNonVeg}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{tNonVeg}</Text>
                           {(kidsEnabled || guestsEnabled) && (
                             <Text style={{ fontSize: 10, color: theme.colors.textMuted, fontWeight: '700' }}>
                               {UI_TEXT.openParen}{UI_TEXT.adultAbbrLabel}{UI_TEXT.colon}{m.nonVegTaken}{UI_TEXT.slash}{m.nonVeg}
                               {kidsEnabled ? `, ${UI_TEXT.kidsAbbrLabel}:${m.kidsNonVegTaken}/${m.kidsNonVeg}` : ""}
                               {guestsEnabled && m.guestsNonVeg !== undefined ? `, ${UI_TEXT.guestAbbrLabel}:${m.guestsNonVegTaken || 0}/${m.guestsNonVeg || 0}` : ""}
                               {UI_TEXT.closeParen}
                             </Text>
                           )}
                        </View>
                      </View>
                      <View style={{ borderTopWidth: 1, borderTopColor: colorScheme.border, paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ color: theme.colors.textPrimary, fontWeight: "900", fontSize: 14 }}>{UI_TEXT.total}</Text>
                        <Text style={{ color: theme.colors.veg, fontWeight: "900", fontSize: 14 }}>{tTakenVeg + tTakenNonVeg}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{tVeg + tNonVeg}</Text>
                      </View>
                      {isParcelEnabled(item.day, mKey, dayConfig) && totalParcelCount > 0 && (
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: 'center', marginTop: 4 }}>
                          <Text style={{ fontSize: 13, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.parcels}</Text>
                          <Text style={{ fontSize: 14, fontWeight: "900", color: theme.colors.primary }}>
                            {totalParcelTakenCount}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}
                            {totalParcelCount}{UI_TEXT.space}{UI_TEXT.parcelAbbr}
                          </Text>
                        </View>
                      )}
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
