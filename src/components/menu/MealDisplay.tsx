import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { MealMenu, Day, ConfigDay, MealType, DietType, AppThemeMode } from "../../types";
import { isDietaryEnabled, isMealCurrent } from "../../constants";
import { UI_TEXT } from "../../strings";

/**
 * Renders the food items for a single meal slot (e.g. Breakfast)
 * separated by Veg and Non-veg categories.
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
}: {
  title: string;
  mealKey: MealType;
  dayId: Day;
  config: ConfigDay[];
  icon: keyof typeof Ionicons.glyphMap;
  menu: MealMenu;
  foodPriceEnabled: boolean;
  kidsEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const veg = menu?.veg || [];
  const nonVeg = menu?.nonVeg || [];

  const dayConf = config.find(d => d.id === dayId);
  const mConf = dayConf ? dayConf[mealKey] : null;

  const vegEnabled = isDietaryEnabled(dayId, mealKey, DietType.VEG, config);
  const nonVegEnabled = isDietaryEnabled(dayId, mealKey, DietType.NON_VEG, config);
  const isBothEnabled = vegEnabled && nonVegEnabled;
  const isCurrent = isMealCurrent(dayId, mealKey, config);

  const hasItems =
    (vegEnabled && veg.length > 0) || (nonVegEnabled && nonVeg.length > 0);

  if (!hasItems) return null;

  return (
    <View style={styles.mealDisplayRow}>
      <View style={[styles.mealDisplayHeader, { flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name={icon} size={18} color={isCurrent ? theme.colors.primary : theme.colors.textSecondary} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <Text style={[styles.mealDisplayTitle, { color: isCurrent ? theme.colors.primary : theme.colors.textPrimary }]}>{title}</Text>
            {isCurrent && (
              <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.live.toUpperCase()}</Text>
              </View>
            )}
            {!isBothEnabled && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: vegEnabled ? theme.colors.successLight : theme.colors.errorLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: vegEnabled ? theme.colors.veg : theme.colors.nonVeg }}>
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
        {vegEnabled && veg.length > 0 && (
          <View style={{ marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.dot, styles.vegChoice]} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.veg, letterSpacing: 0.5 }}>{UI_TEXT.veg.toUpperCase()}</Text>
              </View>
              {foodPriceEnabled && (
                <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                     <View style={[styles.pill, { backgroundColor: theme.colors.successLight, height: 24, paddingHorizontal: 10, borderRadius: 8 }]}>
                       <Text style={{ fontSize: 11, fontWeight: '900', color: theme.colors.veg }}>{UI_TEXT.rs} {menu.vegPrice || mConf?.vegPrice || UI_TEXT.zero}</Text>
                     </View>
                     {kidsEnabled && (menu.kidsVegPrice || mConf?.kidsVegPrice) && (
                       <View style={[styles.pill, { backgroundColor: theme.colors.successLight, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.veg }]}>
                         <Text style={{ fontSize: 11, fontWeight: '900', color: theme.colors.veg }}>{UI_TEXT.kidsAbbrLabel}{UI_TEXT.colon} {UI_TEXT.rs} {menu.kidsVegPrice || mConf?.kidsVegPrice}</Text>
                       </View>
                     )}
                  </View>
                  {mConf?.parcel && (
                    <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: '700' }}>
                      {UI_TEXT.parcelLabel}{UI_TEXT.colon}{UI_TEXT.space}{UI_TEXT.rs}{UI_TEXT.space}{menu.vegParcelPrice || mConf?.vegParcelPrice || UI_TEXT.zero}
                      {kidsEnabled && (menu.kidsVegParcelPrice || mConf?.kidsVegParcelPrice) ? `${UI_TEXT.space}${UI_TEXT.openParen}${UI_TEXT.kidsAbbrLabel}${UI_TEXT.colon}${UI_TEXT.space}${UI_TEXT.rs}${UI_TEXT.space}${menu.kidsVegParcelPrice || mConf?.kidsVegParcelPrice}${UI_TEXT.closeParen}` : ''}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <Text style={[styles.mealItemsText, { marginTop: 2 }]}>{veg.join(", ")}</Text>
          </View>
        )}
        {nonVegEnabled && nonVeg.length > 0 && (
          <View style={{ marginBottom: 4 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6, flexWrap: 'wrap', gap: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <View style={[styles.dot, styles.nonVegChoice]} />
                <Text style={{ fontSize: 13, fontWeight: '800', color: theme.colors.nonVeg, letterSpacing: 0.5 }}>{UI_TEXT.nonVeg.toUpperCase()}</Text>
              </View>
              {foodPriceEnabled && (
                <View style={{ alignItems: 'flex-end', gap: 4, flexShrink: 1 }}>
                  <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                    <View style={[styles.pill, { backgroundColor: theme.colors.errorLight, height: 24, paddingHorizontal: 10, borderRadius: 8 }]}>
                      <Text style={{ fontSize: 11, fontWeight: '900', color: theme.colors.nonVeg }}>{UI_TEXT.rs} {menu.nonVegPrice || mConf?.nonVegPrice || UI_TEXT.zero}</Text>
                    </View>
                    {kidsEnabled && (menu.kidsNonVegPrice || mConf?.kidsNonVegPrice) && (
                       <View style={[styles.pill, { backgroundColor: theme.colors.errorLight, paddingVertical: 4, paddingHorizontal: 10, borderRadius: 8, borderStyle: 'dashed', borderWidth: 1, borderColor: theme.colors.nonVeg }]}>
                         <Text style={{ fontSize: 11, fontWeight: '900', color: theme.colors.nonVeg }}>{UI_TEXT.kidsAbbrLabel}{UI_TEXT.colon} {UI_TEXT.rs} {menu.kidsNonVegPrice || mConf?.kidsNonVegPrice}</Text>
                       </View>
                     )}
                  </View>
                  {mConf?.parcel && (
                    <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: '700' }}>
                      {UI_TEXT.parcelLabel}{UI_TEXT.colon}{UI_TEXT.space}{UI_TEXT.rs}{UI_TEXT.space}{menu.nonVegParcelPrice || mConf?.nonVegParcelPrice || UI_TEXT.zero}
                      {kidsEnabled && (menu.kidsNonVegParcelPrice || mConf?.kidsNonVegParcelPrice) ? `${UI_TEXT.space}${UI_TEXT.openParen}${UI_TEXT.kidsAbbrLabel}${UI_TEXT.colon}${UI_TEXT.space}${UI_TEXT.rs}${UI_TEXT.space}${menu.kidsNonVegParcelPrice || mConf?.kidsNonVegParcelPrice}${UI_TEXT.closeParen}` : ''}
                    </Text>
                  )}
                </View>
              )}
            </View>
            <Text style={[styles.mealItemsText, { marginTop: 2 }]}>{nonVeg.join(", ")}</Text>
          </View>
        )}
      </View>
    </View>
  );
}
