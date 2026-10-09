import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, isMealEnabled, isDietaryEnabled, getMealLabel, getMealFreeMealCounts, getMealVarieties } from "../../constants";
import { ConfigDay, FoodMenu, MealType, DietType, AppThemeMode } from "../../types";
import { formatCurrencyAmount } from "../../utils/paymentUtils";

export function FreeMealWiseReport({
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

  let seasonTotalPlanned = 0;
  let seasonTotalServed = 0;
  let seasonTotalCost = 0;

  activeDays.forEach((dayId) => {
    const dMenu = foodMenu[dayId];
    if (!dMenu) return;
    const meals = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].filter(m => isMealEnabled(dayId, m, dayConfig));
    meals.forEach((mKey) => {
      const gm = dMenu[mKey];
      if (!gm) return;
      const dayConf = dayConfig.find(d => d.id === dayId);
      const mConf = dayConf ? dayConf[mKey] : undefined;
      const varieties = getMealVarieties(mConf, dayConf?.vegOnly);
      const fmCounts = getMealFreeMealCounts(gm, varieties);

      const vEnabled = isDietaryEnabled(dayId, mKey, DietType.VEG, dayConfig);
      const nvEnabled = isDietaryEnabled(dayId, mKey, DietType.NON_VEG, dayConfig);

      const freeMealVeg = vEnabled ? fmCounts.freeMealVeg : 0;
      const freeMealNonVeg = nvEnabled ? fmCounts.freeMealNonVeg : 0;
      const freeMealVegTaken = vEnabled ? fmCounts.freeMealVegTaken : 0;
      const freeMealNonVegTaken = nvEnabled ? fmCounts.freeMealNonVegTaken : 0;

      seasonTotalPlanned += (freeMealVeg + freeMealNonVeg);
      seasonTotalServed += (freeMealVegTaken + freeMealNonVegTaken);

      // Cost incurred calculation: cost is incurred ONLY when served > 0
      varieties.forEach((v) => {
        let sCount = 0;
        let price = 0;
        if (v.id === "veg_default") {
          sCount = freeMealVegTaken;
          price = Number(gm.freeMealVegPrice || gm.vegPrice || 0);
        } else if (v.id === "nonVeg_default") {
          sCount = freeMealNonVegTaken;
          price = Number(gm.freeMealNonVegPrice || gm.nonVegPrice || 0);
        } else {
          sCount = Number(gm.freeMealTakenCounts?.[v.id]) || 0;
          price = Number(gm.varieties?.[v.id]?.freeMealPrice || gm.varieties?.[v.id]?.adultPrice || 0);
        }
        if (sCount > 0) {
          seasonTotalCost += (sCount * price);
        }
      });
    });
  });

  const seasonSummaryA11yLabel = `${UI_TEXT.freeMealSeasonSummary}: Total planned ${seasonTotalPlanned}, Total served ${seasonTotalServed}, Total cost ${seasonTotalCost} rupees`;

  return (
    <View style={{ gap: 16 }}>
      {/* Season Summary Card on Top */}
      <View
        style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}
        accessible={true}
        accessibilityRole="summary"
        accessibilityLabel={seasonSummaryA11yLabel}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <Ionicons name="gift-outline" size={20} color={theme.colors.white} />
          <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1, flexWrap: "wrap" }} numberOfLines={2}>
            {UI_TEXT.freeMealSeasonSummary}
          </Text>
        </View>

        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 }} numberOfLines={1}>
              {UI_TEXT.totalSubscribed}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }} numberOfLines={1}>
              {seasonTotalPlanned} {UI_TEXT.plates}
            </Text>
          </View>

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 }} numberOfLines={1}>
              {UI_TEXT.totalServed}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }} numberOfLines={1}>
              {seasonTotalServed} {UI_TEXT.plates}
            </Text>
          </View>

          <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 8, marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 16, flex: 1, marginRight: 8 }} numberOfLines={1}>
              {UI_TEXT.totalFreeMealCost}
            </Text>
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 20, flexShrink: 0 }} numberOfLines={1}>
              {UI_TEXT.rs} {formatCurrencyAmount(seasonTotalCost)}
            </Text>
          </View>
        </View>
      </View>

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
                const dayConf = dayConfig.find(d => d.id === dayId);
                const mConf = dayConf ? dayConf[mKey] : undefined;
                const varieties = getMealVarieties(mConf, dayConf?.vegOnly);
                const fmCounts = getMealFreeMealCounts(gm, varieties);

                const vEnabled = isDietaryEnabled(dayId, mKey, DietType.VEG, dayConfig);
                const nvEnabled = isDietaryEnabled(dayId, mKey, DietType.NON_VEG, dayConfig);
                const freeMealVeg = vEnabled ? fmCounts.freeMealVeg : 0;
                const freeMealNonVeg = nvEnabled ? fmCounts.freeMealNonVeg : 0;
                const freeMealVegTaken = vEnabled ? fmCounts.freeMealVegTaken : 0;
                const freeMealNonVegTaken = nvEnabled ? fmCounts.freeMealNonVegTaken : 0;

                const tTotal = freeMealVeg + freeMealNonVeg;
                const tTaken = freeMealVegTaken + freeMealNonVegTaken;

                let cardCost = 0;
                varieties.forEach((v) => {
                  let sCount = 0;
                  let price = 0;
                  if (v.id === "veg_default") {
                    sCount = freeMealVegTaken;
                    price = Number(gm.freeMealVegPrice || gm.vegPrice || 0);
                  } else if (v.id === "nonVeg_default") {
                    sCount = freeMealNonVegTaken;
                    price = Number(gm.freeMealNonVegPrice || gm.nonVegPrice || 0);
                  } else {
                    sCount = Number(gm.freeMealTakenCounts?.[v.id]) || 0;
                    price = Number(gm.varieties?.[v.id]?.freeMealPrice || gm.varieties?.[v.id]?.adultPrice || 0);
                  }
                  if (sCount > 0) {
                    cardCost += (sCount * price);
                  }
                });

                const cardA11yLabel = `${getDayLabel(dayId, dayConfig)} ${getMealLabel(mKey)} Free Meal: ${tTaken} served of ${tTotal} planned, Cost incurred ${cardCost} rupees`;

                return (
                  <View
                    key={mKey}
                    style={{ backgroundColor: theme.colors.surfaceDark + (theme.themeType === AppThemeMode.DARK ? "66" : "80"), borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.colors.border }}
                    accessible={true}
                    accessibilityRole="summary"
                    accessibilityLabel={cardA11yLabel}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                      <Ionicons name={mKey === MealType.BREAKFAST ? "sunny-outline" : mKey === MealType.LUNCH ? "restaurant-outline" : "moon-outline"} size={16} color={theme.colors.primary} />
                      <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary, flex: 1, flexWrap: "wrap" }}>{getMealLabel(mKey)}</Text>
                      {cardCost > 0 && (
                        <View style={{ backgroundColor: theme.colors.primary + "22", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.primary }}>
                          <Text style={{ fontSize: 12, fontWeight: '900', color: theme.colors.primary }}>
                            {UI_TEXT.costIncurred}: {UI_TEXT.rs} {formatCurrencyAmount(cardCost)}
                          </Text>
                        </View>
                      )}
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 8 }}>
                      <View style={{ gap: 4 }}>
                        {vEnabled && <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.veg }}>{UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{freeMealVegTaken}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{freeMealVeg}</Text>}
                        {nvEnabled && <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.nonVeg }}>{UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{freeMealNonVegTaken}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{freeMealNonVeg}</Text>}
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
