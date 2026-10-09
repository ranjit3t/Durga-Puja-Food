import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { MealMenu, Day, ConfigDay, MealType, DietType, DietaryVariety, VarietyMenu } from "../../types";
import { isDietaryEnabled, isMealCurrent, isKidsParcelEnabled, getMealVarieties, isSpecialMeal, isGuestsParcelEnabled } from "../../constants";
import { UI_TEXT } from "../../strings";

/**
 * Renders the food items for a single meal slot (e.g. Breakfast)
 * with granular dietary sub-categories, custom names, color badges, and pricing.
 */
export function MealDisplay({
  title,
  mealKey,
  dayId,
  config,
  icon,
  menu,
  foodPriceEnabled,
  kidsEnabled,
  guestsEnabled,
  freeMealEnabled,
}: {
  title: string;
  mealKey: MealType;
  dayId: Day;
  config: ConfigDay[];
  icon: keyof typeof Ionicons.glyphMap;
  menu: MealMenu;
  foodPriceEnabled: boolean;
  kidsEnabled: boolean;
  guestsEnabled?: boolean;
  freeMealEnabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const dayConf = config.find((d) => d.id === dayId);
  const mConf = dayConf ? dayConf[mealKey] : null;
  const varieties = getMealVarieties(mConf || undefined);

  const vegEnabled = isDietaryEnabled(dayId, mealKey, DietType.VEG, config);
  const nonVegEnabled = isDietaryEnabled(dayId, mealKey, DietType.NON_VEG, config);
  const isBothEnabled = vegEnabled && nonVegEnabled;
  const isCurrent = isMealCurrent(dayId, mealKey, config);
  const isSpecial = isSpecialMeal(dayId, mealKey, config);

  const getVarietyItems = (v: DietaryVariety): string[] => {
    let raw: any = [];
    if (v.id === "veg_default") raw = menu?.veg;
    else if (v.id === "nonVeg_default") raw = menu?.nonVeg;
    else raw = menu?.varieties?.[v.id]?.items;

    if (Array.isArray(raw)) {
      return raw.filter((i) => typeof i === "string" || typeof i === "number").map(String);
    }
    if (raw && typeof raw === "object") {
      return Object.values(raw).filter((i) => typeof i === "string" || typeof i === "number").map(String);
    }
    if (typeof raw === "string" && raw.trim().length > 0) {
      return [raw.trim()];
    }
    return [];
  };

  const getVarietyPrice = (v: DietaryVariety, field: 'adultPrice' | 'kidsPrice' | 'guestPrice' | 'parcelPrice' | 'kidsParcelPrice' | 'guestParcelPrice' | 'freeMealPrice'): string => {
    if (v.id === "veg_default") {
      if (field === "adultPrice") return menu?.vegPrice || mConf?.vegPrice || "";
      if (field === "kidsPrice") return menu?.kidsVegPrice || (mConf as any)?.kidsVegPrice || "";
      if (field === "guestPrice") return menu?.guestsVegPrice || (mConf as any)?.guestsVegPrice || "";
      if (field === "parcelPrice") return menu?.vegParcelPrice || mConf?.vegParcelPrice || "";
      if (field === "kidsParcelPrice") return menu?.kidsVegParcelPrice || (mConf as any)?.kidsVegParcelPrice || "";
      if (field === "guestParcelPrice") return menu?.guestsVegParcelPrice || (mConf as any)?.guestsVegParcelPrice || "";
      if (field === "freeMealPrice") return menu?.freeMealVegPrice || "";
    }
    if (v.id === "nonVeg_default") {
      if (field === "adultPrice") return menu?.nonVegPrice || mConf?.nonVegPrice || "";
      if (field === "kidsPrice") return menu?.kidsNonVegPrice || (mConf as any)?.kidsNonVegPrice || "";
      if (field === "guestPrice") return menu?.guestsNonVegPrice || (mConf as any)?.guestsNonVegPrice || "";
      if (field === "parcelPrice") return menu?.nonVegParcelPrice || mConf?.nonVegParcelPrice || "";
      if (field === "kidsParcelPrice") return menu?.kidsVegParcelPrice || (mConf as any)?.kidsVegParcelPrice || "";
      if (field === "guestParcelPrice") return menu?.guestsVegParcelPrice || (mConf as any)?.guestsVegParcelPrice || "";
      if (field === "freeMealPrice") return menu?.freeMealNonVegPrice || "";
    }
    const val = menu?.varieties?.[v.id]?.[field as keyof VarietyMenu];
    return typeof val === 'string' ? val : "";
  };

  return (
    <View
      style={[
        styles.mealDisplayRow,
        isSpecial && {
          backgroundColor: theme.colors.specialMealBg,
          borderColor: theme.colors.specialMealBorder,
          borderWidth: 2,
          borderStyle: "dashed",
          borderRadius: 16,
          padding: 12,
          marginBottom: 16,
        }
      ]}
    >
      <View style={[styles.mealDisplayHeader, { flexWrap: "wrap", gap: 8, justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name={icon} size={18} color={isCurrent ? theme.colors.primary : isSpecial ? theme.colors.specialMealText : theme.colors.textSecondary} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <Text style={[styles.mealDisplayTitle, { color: isCurrent ? theme.colors.primary : isSpecial ? theme.colors.specialMealText : theme.colors.textPrimary }]}>{title}</Text>
            {isSpecial && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.colors.specialMealBorder, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Ionicons name="star" size={10} color={theme.colors.white} />
                <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 }}>{UI_TEXT.specialMealBadge}</Text>
              </View>
            )}
            {isCurrent && (
              <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.live.toUpperCase()}</Text>
              </View>
            )}
            {!isBothEnabled && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: vegEnabled ? theme.colors.successLight : theme.colors.errorLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: vegEnabled ? theme.colors.veg : theme.colors.nonVeg }}>
                <Ionicons name={vegEnabled ? "leaf" : "flame"} size={10} color={vegEnabled ? theme.colors.veg : theme.colors.nonVeg} />
                <Text style={{ color: vegEnabled ? theme.colors.veg : theme.colors.nonVeg, fontSize: 10, fontWeight: "800" }}>
                  {(vegEnabled ? UI_TEXT.vegOnly : UI_TEXT.nonVegOnly).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.mealItemsContainer}>
        {varieties.map((v, idx) => {
          const items = getVarietyItems(v);
          const vColor = v.color || (v.type === DietType.VEG ? theme.colors.veg : theme.colors.nonVeg);
          const adultPrice = getVarietyPrice(v, "adultPrice");
          const kidsPrice = getVarietyPrice(v, "kidsPrice");
          const guestPrice = getVarietyPrice(v, "guestPrice");
          const parcelPrice = getVarietyPrice(v, "parcelPrice");
          const kidsParcelPrice = getVarietyPrice(v, "kidsParcelPrice");
          const guestParcelPrice = getVarietyPrice(v, "guestParcelPrice");
          const freeMealPrice = getVarietyPrice(v, "freeMealPrice" as any);

          return (
            <View key={v.id} style={{ marginBottom: idx < varieties.length - 1 ? 16 : 4 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: vColor }} />
                  <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary, letterSpacing: 0.5 }}>
                    {v.name.toUpperCase()}
                  </Text>
                  <View style={{ backgroundColor: theme.colors.surfaceDark, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4 }}>
                    <Text style={{ fontSize: 9, fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase" }}>
                      {v.type}
                    </Text>
                  </View>
                </View>

                {foodPriceEnabled && (
                  <View style={{ alignItems: "flex-end", gap: 4, flexShrink: 1 }}>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                      {adultPrice ? (
                        <View style={[styles.pill, { backgroundColor: vColor + "22", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: vColor }]}>
                          <Text style={{ fontSize: 11, fontWeight: "900", color: theme.colors.textPrimary }}>
                            {UI_TEXT.rs} {adultPrice}
                          </Text>
                        </View>
                      ) : null}

                      {kidsEnabled && kidsPrice ? (
                        <View style={[styles.pill, { backgroundColor: vColor + "22", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderStyle: "dashed", borderWidth: 1, borderColor: vColor }]}>
                          <Text style={{ fontSize: 11, fontWeight: "900", color: theme.colors.textPrimary }}>
                            {UI_TEXT.kidsAbbrLabel}{UI_TEXT.colon} {UI_TEXT.rs} {kidsPrice}
                          </Text>
                        </View>
                      ) : null}

                      {guestsEnabled && guestPrice ? (
                        <View style={[styles.pill, { backgroundColor: vColor + "22", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderStyle: "dashed", borderWidth: 1, borderColor: vColor }]}>
                          <Text style={{ fontSize: 11, fontWeight: "900", color: theme.colors.textPrimary }}>
                            {UI_TEXT.guestAbbrLabel}{UI_TEXT.colon} {UI_TEXT.rs} {guestPrice}
                          </Text>
                        </View>
                      ) : null}

                      {freeMealEnabled && freeMealPrice ? (
                        <View style={[styles.pill, { backgroundColor: vColor + "22", paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderStyle: "dotted", borderWidth: 1, borderColor: vColor }]}>
                          <Text style={{ fontSize: 11, fontWeight: "900", color: theme.colors.textPrimary }}>
                            {UI_TEXT.freeMeal}{UI_TEXT.colon} {UI_TEXT.rs} {freeMealPrice}
                          </Text>
                        </View>
                      ) : null}
                    </View>

                    {mConf?.parcel && (parcelPrice || kidsParcelPrice || guestParcelPrice) ? (
                      <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: "700" }}>
                        {UI_TEXT.parcelLabel}{UI_TEXT.colon}{UI_TEXT.space}{UI_TEXT.rs}{UI_TEXT.space}{parcelPrice || "0"}
                        {kidsEnabled && isKidsParcelEnabled(dayId, mealKey, config, kidsEnabled) && kidsParcelPrice
                          ? `${UI_TEXT.space}${UI_TEXT.openParen}${UI_TEXT.kidsAbbrLabel}${UI_TEXT.colon}${UI_TEXT.space}${UI_TEXT.rs}${UI_TEXT.space}${kidsParcelPrice}${UI_TEXT.closeParen}`
                          : ""}
                        {guestsEnabled && isGuestsParcelEnabled(dayId, mealKey, config, guestsEnabled) && guestParcelPrice
                          ? `${UI_TEXT.space}${UI_TEXT.openParen}${UI_TEXT.guestAbbrLabel}${UI_TEXT.colon}${UI_TEXT.space}${UI_TEXT.rs}${UI_TEXT.space}${guestParcelPrice}${UI_TEXT.closeParen}`
                          : ""}
                      </Text>
                    ) : null}
                  </View>
                )}
              </View>

              <Text style={[styles.mealItemsText, { marginTop: 2 }, items.length === 0 && { fontStyle: "italic", color: theme.colors.textMuted }]}>
                {items.length > 0 ? items.join(", ") : UI_TEXT.noItemsListed}
              </Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}
