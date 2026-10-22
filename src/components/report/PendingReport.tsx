import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { isDietaryEnabled } from "../../constants";
import { ConfigDay, DietType } from "../../domain";

interface PendingItem {
  id: string;
  block: string;
  flat: string;
  mobile?: number;
  veg: number;
  nonVeg: number;
  count: number;
  kids: number;
  adults?: number;
  guests?: number;
  totalSubscribed?: number;
  totalTaken?: number;
  isFullyMissed?: boolean;
  isPartial?: boolean;
}

export function PendingReport({
  data,
  selectedDayId,
  selectedMealType,
  dayConfig,
  onSelectFlat,
  kidsEnabled,
  guestsEnabled,
}: {
  data: PendingItem[];
  selectedDayId: string;
  selectedMealType: any; // MealType
  dayConfig: ConfigDay[];
  onSelectFlat: (id: string) => void;
  kidsEnabled: boolean;
  guestsEnabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const totalPendingPasses = data.length;
  const fullyMissedPasses = data.filter(item => item.isFullyMissed || ((item.totalTaken ?? 0) === 0)).length;
  const partialPasses = data.filter(item => item.isPartial || (((item.totalTaken ?? 0) > 0) && ((item.totalTaken ?? 0) < (item.totalSubscribed ?? 0)))).length;
  const totalAdultsMissed = data.reduce((acc, item) => acc + (item.adults ?? Math.max(0, item.count - (item.kids || 0))), 0);
  const totalKidsMissed = kidsEnabled ? data.reduce((acc, item) => acc + (item.kids || 0), 0) : 0;
  const totalGuestsMissed = guestsEnabled ? data.reduce((acc, item) => acc + (item.guests || 0), 0) : 0;
  const totalMembersMissed = totalAdultsMissed + totalKidsMissed + totalGuestsMissed;

  return (
    <View style={{ gap: 16 }}>
      {/* Red Summary Card */}
      {data.length > 0 && (
        <View
          style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}
          accessible={true}
          accessibilityRole="summary"
          accessibilityLabel={`${UI_TEXT.notTakenReport}: ${totalPendingPasses} passes, ${totalMembersMissed} members pending`}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <Ionicons name="alert-circle-outline" size={20} color={theme.colors.white} />
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1 }}>
              {UI_TEXT.notTakenReport}
            </Text>
          </View>

          <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
            {/* Total Pending Passes Block */}
            <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.passMissedPartialPickup} ({totalPendingPasses})
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 2 }}>
                <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "900" }}>
                  {totalPendingPasses} {totalPendingPasses === 1 ? UI_TEXT.flat : `${UI_TEXT.flat}s`}
                </Text>
                <Text style={{ color: theme.colors.white + "DD", fontSize: 13, fontWeight: "700" }}>
                  {UI_TEXT.openParen}
                  {fullyMissedPasses} {UI_TEXT.missedCheckoutBadgeLabel}
                  {UI_TEXT.pipe}
                  {partialPasses} {UI_TEXT.partialCheckoutBadgeLabel}
                  {UI_TEXT.closeParen}
                </Text>
              </View>
            </View>

            {/* Headcount Breakdown Block */}
            <View style={{ gap: 3, marginBottom: 4, paddingBottom: 4 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.membersMissedPartialPickup} ({totalMembersMissed})
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                {totalAdultsMissed > 0 && (
                  <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                    • {UI_TEXT.adults}: {totalAdultsMissed}
                  </Text>
                )}
                {kidsEnabled && totalKidsMissed > 0 && (
                  <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                    • {UI_TEXT.kids}: {totalKidsMissed}
                  </Text>
                )}
                {guestsEnabled && totalGuestsMissed > 0 && (
                  <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                    • {UI_TEXT.guests}: {totalGuestsMissed}
                  </Text>
                )}
              </View>
            </View>
          </View>
        </View>
      )}

      {data.length === 0 ? (
        <Text style={styles.emptyState}>{UI_TEXT.noMealsSelected}</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {data.map((item, index) => {
            const colorScheme = theme.cardColors[index % theme.cardColors.length];
            const vegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, DietType.VEG, dayConfig);
            const nonVegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, DietType.NON_VEG, dayConfig);

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
                  <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{item.block}{UI_TEXT.hyphen}{item.flat}</Text>
                  <View style={{ alignItems: 'flex-end', gap: 4 }}>
                    {(item.isFullyMissed || (item.totalTaken ?? 0) === 0) ? (
                      <View style={{ backgroundColor: theme.colors.errorLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.error }}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: theme.colors.error }}>
                          {UI_TEXT.missedCheckoutBadgeLabel} {item.totalTaken ?? 0}/{item.totalSubscribed ?? item.count}
                        </Text>
                      </View>
                    ) : (item.isPartial || ((item.totalTaken ?? 0) > 0 && (item.totalTaken ?? 0) < (item.totalSubscribed ?? (item.count + (item.totalTaken ?? 0))))) ? (
                      <View style={{ backgroundColor: theme.colors.warningLight || theme.colors.primary + "20", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, borderWidth: 1, borderColor: theme.colors.warning || theme.colors.primary }}>
                        <Text style={{ fontSize: 10, fontWeight: '900', color: theme.colors.warning || theme.colors.primary }}>
                          {UI_TEXT.partialCheckoutBadgeLabel} {item.totalTaken ?? 0}/{item.totalSubscribed ?? ((item.count) + (item.totalTaken ?? 0))}
                        </Text>
                      </View>
                    ) : null}
                    <Text style={[styles.amount, { color: colorScheme.accent, fontWeight: '900' }]}>
                      {(item.count === 1 ? UI_TEXT.personNotTaken : UI_TEXT.personsNotTaken).replace("{count}", String(item.count))}
                    </Text>
                    {kidsEnabled && item.kids > 0 && <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.textMuted, marginBottom: 2 }}>{(item.kids === 1 ? UI_TEXT.kidIncluded : UI_TEXT.kidsIncluded).replace("{count}", String(item.kids))}</Text>}
                    <Text style={[styles.helper, { fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary }]}>
                      {UI_TEXT.openParen}
                      {vegEnabled && item.veg > 0 && <Text style={{ color: theme.colors.veg }}>{item.veg}{UI_TEXT.space}{UI_TEXT.veg}</Text>}
                      {vegEnabled && item.veg > 0 && nonVegEnabled && item.nonVeg > 0 && <Text>{UI_TEXT.comma}{UI_TEXT.space}</Text>}
                      {nonVegEnabled && item.nonVeg > 0 && <Text style={{ color: theme.colors.nonVeg }}>{item.nonVeg}{UI_TEXT.space}{UI_TEXT.nonVeg}</Text>}
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
