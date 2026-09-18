import React from "react";
import { View, Text } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, isMealEnabled, isDietaryEnabled, isParcelEnabled } from "../../constants";
import { ConfigDay, MealType, DietType, AppThemeMode } from "../../types";

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

interface DayData {
  day: string;
  meals: Record<MealType, MealStats>;
}

export function SingleMealReport({
  selectedDayId,
  selectedMealType,
  mealWiseData,
  dayConfig,
  guestEnabled,
  kidsEnabled,
}: {
  selectedDayId: string;
  selectedMealType: MealType;
  mealWiseData: DayData[];
  dayConfig: ConfigDay[];
  guestEnabled: boolean;
  kidsEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const dayData = mealWiseData.find(d => d.day === selectedDayId);
  if (!dayData) return null;

  const m = dayData.meals[selectedMealType];
  const vegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, DietType.VEG, dayConfig);
  const nonVegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, DietType.NON_VEG, dayConfig);
  const parcelEnabled = isParcelEnabled(selectedDayId, selectedMealType, dayConfig);
  const mealEnabled = isMealEnabled(selectedDayId, selectedMealType, dayConfig);

  if (!mealEnabled) {
    return <Text style={styles.emptyState}>{UI_TEXT.mealDisabled}</Text>;
  }

  const tVeg = m.veg + m.guestVeg + m.kidsVeg;
  const tNonVeg = m.nonVeg + m.guestNonVeg + m.kidsNonVeg;
  const tTakenVeg = m.vegTaken + m.guestVegTaken + m.kidsVegTaken;
  const tTakenNonVeg = m.nonVegTaken + m.guestNonVegTaken + m.kidsNonVegTaken;

  const totalDemand = tVeg + tNonVeg;
  const totalTaken = tTakenVeg + tTakenNonVeg;
  const totalNotTaken = totalDemand - totalTaken;
  const colorScheme = theme.cardColors[2];

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
        <View style={[styles.dashboardCardTop, { borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 16 }]}>
          <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{getDayLabel(selectedDayId, dayConfig)}</Text>
          <View style={[styles.pill, { backgroundColor: colorScheme.accentLight }]}>
            <Text style={[styles.pillText, { color: colorScheme.accent }]}>{totalDemand} {UI_TEXT.totalDemand}</Text>
          </View>
        </View>

        <View style={{ marginTop: 20, gap: 12 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.demandSplit}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              {vegEnabled && (
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.veg, marginBottom: 2 }}>
                  {UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{tVeg}{UI_TEXT.space}{(kidsEnabled || guestEnabled) && (
                    `(${kidsEnabled ? `${UI_TEXT.adultAbbrLabel}${UI_TEXT.colon}${m.veg}${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.kidsAbbrLabel}${UI_TEXT.colon}${m.kidsVeg}` : `${UI_TEXT.personAbbr}${UI_TEXT.colon}${m.veg}`}${guestEnabled ? `${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.guestAbbrLabel}${UI_TEXT.colon}${m.guestVeg}` : ""})`
                  )}
                </Text>
              )}
              {nonVegEnabled && (
                <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.nonVeg }}>
                  {UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{tNonVeg}{UI_TEXT.space}{(kidsEnabled || guestEnabled) && (
                    `(${kidsEnabled ? `${UI_TEXT.adultAbbrLabel}${UI_TEXT.colon}${m.nonVeg}${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.kidsAbbrLabel}${UI_TEXT.colon}${m.kidsNonVeg}` : `${UI_TEXT.personAbbr}${UI_TEXT.colon}${m.nonVeg}`}${guestEnabled ? `${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.guestAbbrLabel}${UI_TEXT.colon}${m.guestNonVeg}` : ""})`
                  )}
                </Text>
              )}
            </View>
          </View>

          <View style={{ backgroundColor: theme.colors.successLight, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: theme.colors.veg, fontWeight: "800", fontSize: 16 }}>{UI_TEXT.mealTaken}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: theme.colors.veg, fontSize: 24, fontWeight: "900" }}>{totalTaken}</Text>
              <View style={{ marginTop: 4 }}>
                {vegEnabled && (
                  <Text style={{ color: theme.colors.veg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                    {UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{tTakenVeg}{UI_TEXT.space}{(kidsEnabled || guestEnabled) && (
                      `(${kidsEnabled ? `${UI_TEXT.adultAbbrLabel}${UI_TEXT.colon}${m.vegTaken}${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.kidsAbbrLabel}${UI_TEXT.colon}${m.kidsVegTaken}` : `${UI_TEXT.personAbbr}${UI_TEXT.colon}${m.vegTaken}`}${guestEnabled ? `${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.guestAbbrLabel}${UI_TEXT.colon}${m.guestVegTaken}` : ""})`
                    )}
                  </Text>
                )}
                {nonVegEnabled && (
                  <Text style={{ color: theme.colors.nonVeg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                    {UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{tTakenNonVeg}{UI_TEXT.space}{(kidsEnabled || guestEnabled) && (
                      `(${kidsEnabled ? `${UI_TEXT.adultAbbrLabel}${UI_TEXT.colon}${m.nonVegTaken}${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.kidsAbbrLabel}${UI_TEXT.colon}${m.kidsNonVegTaken}` : `${UI_TEXT.personAbbr}${UI_TEXT.colon}${m.nonVegTaken}`}${guestEnabled ? `${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.guestAbbrLabel}${UI_TEXT.colon}${m.guestNonVegTaken}` : ""})`
                    )}
                  </Text>
                )}
              </View>
            </View>
          </View>

          <View style={{ backgroundColor: theme.colors.errorLight, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: theme.colors.nonVeg, fontWeight: "800", fontSize: 16 }}>{UI_TEXT.mealNotTaken}</Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: theme.colors.nonVeg, fontSize: 24, fontWeight: "900" }}>{totalNotTaken}</Text>
              <View style={{ marginTop: 4 }}>
                {vegEnabled && (
                  <Text style={{ color: theme.colors.veg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                    {UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{tVeg - tTakenVeg}{UI_TEXT.space}{(kidsEnabled || guestEnabled) && (
                      `(${kidsEnabled ? `${UI_TEXT.adultAbbrLabel}${UI_TEXT.colon}${m.veg - m.vegTaken}${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.kidsAbbrLabel}${UI_TEXT.colon}${m.kidsVeg - m.kidsVegTaken}` : `${UI_TEXT.personAbbr}${UI_TEXT.colon}${m.veg - m.vegTaken}`}${guestEnabled ? `${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.guestAbbrLabel}${UI_TEXT.colon}${m.guestVeg - m.guestVegTaken}` : ""})`
                    )}
                  </Text>
                )}
                {nonVegEnabled && (
                  <Text style={{ color: theme.colors.nonVeg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                    {UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{tNonVeg - tTakenNonVeg}{UI_TEXT.space}{(kidsEnabled || guestEnabled) && (
                      `(${kidsEnabled ? `${UI_TEXT.adultAbbrLabel}${UI_TEXT.colon}${m.nonVeg - m.nonVegTaken}${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.kidsAbbrLabel}${UI_TEXT.colon}${m.kidsNonVeg - m.kidsNonVegTaken}` : `${UI_TEXT.personAbbr}${UI_TEXT.colon}${m.nonVeg - m.nonVegTaken}`}${guestEnabled ? `${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.guestAbbrLabel}${UI_TEXT.colon}${m.guestNonVeg - m.guestNonVegTaken}` : ""})`
                    )}
                  </Text>
                )}
              </View>
            </View>
          </View>

          {parcelEnabled && (m.vegParcel + m.nonVegParcel) > 0 ? (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colorScheme.border, paddingTop: 16 }}>
              <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.parcelsNeeded}</Text>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.primary }}>{m.vegParcel + m.nonVegParcel}{UI_TEXT.space}{UI_TEXT.parcelAbbr}</Text>
                <Text style={{ fontSize: 11, fontWeight: "600" }}>
                  {UI_TEXT.openParen}
                  {vegEnabled && m.vegParcel > 0 && <Text style={{ color: theme.colors.veg }}>{m.vegParcel}{UI_TEXT.space}{UI_TEXT.veg}</Text>}
                  {vegEnabled && m.vegParcel > 0 && nonVegEnabled && m.nonVegParcel > 0 && <Text>{UI_TEXT.comma}{UI_TEXT.space}</Text>}
                  {nonVegEnabled && m.nonVegParcel > 0 && <Text style={{ color: theme.colors.nonVeg }}>{m.nonVegParcel}{UI_TEXT.space}{UI_TEXT.nonVeg}</Text>}
                  {UI_TEXT.closeParen}
                </Text>
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}
