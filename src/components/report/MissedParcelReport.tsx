import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { ConfigDay, MealType } from "../../domain";

interface MissedParcelItem {
  id: string;
  block: string;
  flat: string;
  mobile?: number;
  count: number;
  kids: number;
  guests?: number;
}

export function MissedParcelReport({
  data,
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
  const totalKids = kidsEnabled ? data.reduce((acc, item) => acc + (item.kids || 0), 0) : 0;
  const totalGuests = guestsEnabled ? data.reduce((acc, item) => acc + (item.guests || 0), 0) : 0;

  return (
    <View style={{ gap: 16 }}>
      {/* Red Summary Card for Missed Parcels */}
      {data.length > 0 && (
        <View
          style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel={`${UI_TEXT.missedParcelReport}: ${totalMissedPasses} passes, ${totalMissedParcels} missed parcels`}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.white} />
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1 }}>
              {UI_TEXT.missedParcelReport}
            </Text>
          </View>

          <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
            {/* Total Missed Parcels Block */}
            <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.missedParcelReport} ({totalMissedParcels})
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: "900" }}>
                {totalMissedParcels} {totalMissedParcels === 1 ? UI_TEXT.parcelSingular : UI_TEXT.parcels} ({totalMissedPasses} {totalMissedPasses === 1 ? UI_TEXT.passSingular : UI_TEXT.passPlural})
              </Text>
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
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[styles.amount, { color: theme.colors.primary, fontWeight: '900' }]}>
                      {item.count}{UI_TEXT.space}{UI_TEXT.parcelAbbr}{UI_TEXT.space}{UI_TEXT.pending}
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
