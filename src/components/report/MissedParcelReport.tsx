import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, getMealLabel } from "../../constants";
import { ConfigDay, MealType } from "../../domain";

interface MissedParcelItem {
  id: string;
  block: string;
  flat: string;
  mobile?: number;
  count: number;
  vegCount?: number;
  nonVegCount?: number;
  savedParcelCost?: number;
  kids: number;
  guests?: number;
}

export function MissedParcelReport({
  data,
  selectedDayId,
  selectedMealType,
  dayConfig,
  onSelectFlat,
  kidsEnabled,
  guestsEnabled,
}: {
  data: MissedParcelItem[];
  selectedDayId: string;
  selectedMealType: MealType;
  dayConfig: ConfigDay[];
  onSelectFlat: (id: string) => void;
  kidsEnabled: boolean;
  guestsEnabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const totalMissedPasses = data.length;
  const totalMissedParcels = data.reduce((acc, item) => acc + item.count, 0);
  const totalVegMissed = data.reduce((acc, item) => acc + (item.vegCount || 0), 0);
  const totalNonVegMissed = data.reduce((acc, item) => acc + (item.nonVegCount || 0), 0);
  const totalSavedMoney = data.reduce((acc, item) => acc + (item.savedParcelCost || 0), 0);
  const totalKids = kidsEnabled ? data.reduce((acc, item) => acc + (item.kids || 0), 0) : 0;
  const totalGuests = guestsEnabled ? data.reduce((acc, item) => acc + (item.guests || 0), 0) : 0;

  return (
    <View style={{ gap: 16 }}>
      {/* Red Summary Card for Opted Dine-In Parcels */}
      {data.length > 0 && (
        <View
          style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel={`${UI_TEXT.optedDineIn}: ${totalMissedPasses} passes, ${totalMissedParcels} parcels`}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.white} />
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1, minWidth: 140 }}>
              {UI_TEXT.optedDineIn}
            </Text>
            {selectedDayId && selectedMealType && (
              <View style={{ backgroundColor: theme.colors.white + "25", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "900" }}>
                  {getDayLabel(selectedDayId, dayConfig)} - {getMealLabel(selectedMealType)}
                </Text>
              </View>
            )}
          </View>

          <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
            {/* Total Opted Dine-In Parcels Block */}
            <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.optedDineIn} ({totalMissedParcels})
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: "900" }}>
                  {totalMissedParcels} {totalMissedParcels === 1 ? UI_TEXT.parcelSingular : UI_TEXT.parcels} ({totalMissedPasses} {totalMissedPasses === 1 ? UI_TEXT.passSingular : UI_TEXT.passPlural})
                </Text>
              </View>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 4 }}>
                {totalVegMissed > 0 && (
                  <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                    • {UI_TEXT.veg}: {totalVegMissed}
                  </Text>
                )}
                {totalNonVegMissed > 0 && (
                  <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                    • {UI_TEXT.nonVeg}: {totalNonVegMissed}
                  </Text>
                )}
              </View>
              {totalSavedMoney > 0 && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: theme.colors.white + "20" }}>
                  <Text style={{ color: theme.colors.white + "DD", fontSize: 13, fontWeight: "700" }}>
                    • {UI_TEXT.savedParcelCostLabel}:
                  </Text>
                  <Text style={{ color: theme.colors.white, fontSize: 15, fontWeight: "900" }}>
                    {UI_TEXT.rs} {totalSavedMoney.toFixed(0)}
                  </Text>
                </View>
              )}
            </View>

            {/* Member Details Block if applicable */}
            {(kidsEnabled && totalKids > 0) || (guestsEnabled && totalGuests > 0) ? (
              <View style={{ gap: 3, paddingBottom: 4 }}>
                <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                  {UI_TEXT.totalPeopleLabel}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                  {kidsEnabled && totalKids > 0 && (
                    <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                      • {UI_TEXT.kids}: {totalKids}
                    </Text>
                  )}
                  {guestsEnabled && totalGuests > 0 && (
                    <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                      • {UI_TEXT.guests}: {totalGuests}
                    </Text>
                  )}
                </View>
              </View>
            ) : null}
          </View>
        </View>
      )}

      {data.length === 0 ? (
        <Text style={styles.emptyState}>{UI_TEXT.noRecords}</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {data.map((item, index) => {
            const colorScheme = theme.cardColors[index % theme.cardColors.length];

            return (
              <Pressable
                key={item.id}
                onPress={() => onSelectFlat(item.id)}
                style={({ pressed }) => [
                  styles.dashboardCard,
                  { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <View style={styles.dashboardCardTop}>
                  <View>
                     <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{item.block}{UI_TEXT.hyphen}{item.flat}</Text>
                     {(kidsEnabled || guestsEnabled) && (item.kids > 0 || (item.guests || 0) > 0) && (
                       <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.textMuted, marginTop: 2 }}>
                         {kidsEnabled && item.kids > 0 ? `${(item.kids === 1 ? UI_TEXT.kidIncluded : UI_TEXT.kidsIncluded).replace("{count}", String(item.kids))}` : ""}
                         {kidsEnabled && item.kids > 0 && guestsEnabled && (item.guests || 0) > 0 ? ", " : ""}
                         {guestsEnabled && (item.guests || 0) > 0 ? `${(item.guests === 1 ? UI_TEXT.guestIncluded : UI_TEXT.guestsIncluded).replace("{count}", String(item.guests))}` : ""}
                       </Text>
                     )}
                  </View>
                  <View style={{ alignItems: 'flex-end', gap: 2 }}>
                    <Text style={[styles.amount, { color: theme.colors.primary, fontWeight: '900' }]}>
                      {item.count}{UI_TEXT.space}{UI_TEXT.optedDineIn}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>
                      {UI_TEXT.openParen}
                      {(item.vegCount || 0) > 0 && <Text style={{ color: colorScheme.accent }}>{item.vegCount} {UI_TEXT.vegAbbr}</Text>}
                      {(item.vegCount || 0) > 0 && (item.nonVegCount || 0) > 0 && <Text style={{ color: colorScheme.accent }}>{UI_TEXT.comma}{UI_TEXT.space}</Text>}
                      {(item.nonVegCount || 0) > 0 && <Text style={{ color: colorScheme.accent }}>{item.nonVegCount} {UI_TEXT.nonVegAbbr}</Text>}
                      {UI_TEXT.closeParen}
                    </Text>
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
