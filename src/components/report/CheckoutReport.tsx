import React from "react";
import { View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, getMealLabel, formatTimestamp, isParcelEnabled } from "../../constants";
import { ConfigDay, MealType } from "../../domain";

export function CheckoutReport({
  data,
  selectedDayId,
  selectedMealType,
  selectedCheckoutUser,
  onSelectUser,
  dayConfig,
  onSelectFlat,
  kidsEnabled,
  guestsEnabled,
}: {
  data: { passes: any[]; summary: any };
  selectedDayId: string;
  selectedMealType: MealType;
  selectedCheckoutUser?: string;
  onSelectUser?: (user: string) => void;
  dayConfig: ConfigDay[];
  onSelectFlat: (id: string) => void;
  kidsEnabled: boolean;
  guestsEnabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { passes, summary } = data;

  const isParcelEnabledForMeal = isParcelEnabled(selectedDayId, selectedMealType, dayConfig);

  const formatTime = (ts?: number | string | null) => {
    if (!ts) return "-";
    if (typeof ts === "string" && isNaN(Number(ts))) {
      return ts;
    }
    const formatted = formatTimestamp(ts);
    return formatted || "-";
  };

  const checkedOutPasses = passes.filter((p: any) => p.takenCount > 0);

  const singleCheckoutPasses = checkedOutPasses.filter((p: any) => {
    const times = new Set(
      p.memberCheckouts
        .filter((m: any) => m.isTaken)
        .map((m: any) => m.numericTime || m.timeDisplay)
    );
    const count = times.size > 0 ? times.size : (p.takenCount > 0 ? 1 : 0);
    return count === 1;
  }).length;

  const multipleCheckoutPasses = checkedOutPasses.filter((p: any) => {
    const times = new Set(
      p.memberCheckouts
        .filter((m: any) => m.isTaken)
        .map((m: any) => m.numericTime || m.timeDisplay)
    );
    const count = times.size > 0 ? times.size : (p.takenCount > 0 ? 1 : 0);
    return count > 1;
  }).length;

  const userCheckoutCounts = React.useMemo(() => {
    if (summary.userCheckoutCounts && Object.keys(summary.userCheckoutCounts).length > 0) {
      return summary.userCheckoutCounts;
    }
    const counts: Record<string, number> = {};
    passes.forEach((p: any) => {
      (p.memberCheckouts || []).forEach((m: any) => {
        if (m.isTaken && m.userName) {
          const u = String(m.userName).trim();
          counts[u] = (counts[u] || 0) + 1;
        }
      });
    });
    return counts;
  }, [passes, summary.userCheckoutCounts]);

  const userEntries = Object.entries(userCheckoutCounts);

  const availableUsers = React.useMemo(() => {
    const set = new Set<string>();
    if (summary.userCheckoutCounts) {
      Object.keys(summary.userCheckoutCounts).forEach(u => set.add(u));
    }
    passes.forEach((p: any) => {
      (p.memberCheckouts || []).forEach((m: any) => {
        if (m.userName) set.add(String(m.userName).trim());
      });
    });
    if (set.size === 0) {
      set.add("admin");
      set.add("vendor");
      set.add("atanu");
      set.add("samrat");
      set.add("suman");
      set.add("chhoton");
    }
    return Array.from(set).sort();
  }, [summary, passes]);

  const handleSelectUser = (u: string) => {
    if (onSelectUser) onSelectUser(u);
  };

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.card, { padding: 12, backgroundColor: theme.colors.surface, borderRadius: 12, borderWidth: 1.5, borderColor: theme.colors.border }]}>
        <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, marginBottom: 8, textTransform: "uppercase" }}>
          {UI_TEXT.filterByOperator}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
            <Pressable
              onPress={() => handleSelectUser("")}
              accessible={true}
              accessibilityRole="button"
              accessibilityState={{ selected: !selectedCheckoutUser }}
              style={[
                styles.selector,
                !selectedCheckoutUser && styles.selectorOn,
                { paddingHorizontal: 12, paddingVertical: 6, marginBottom: 0, minWidth: 70 }
              ]}
            >
              <Text style={[styles.selectorText, !selectedCheckoutUser && styles.selectorTextOn, { fontSize: 11, fontWeight: "800" }]}>
                {UI_TEXT.allUsers}
              </Text>
            </Pressable>
            {availableUsers.map((u) => {
              const isSelected = selectedCheckoutUser === u;
              return (
                <Pressable
                  key={u}
                  onPress={() => handleSelectUser(u)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  style={[
                    styles.selector,
                    isSelected && styles.selectorOn,
                    { paddingHorizontal: 12, paddingVertical: 6, marginBottom: 0, minWidth: 70 }
                  ]}
                >
                  <Text style={[styles.selectorText, isSelected && styles.selectorTextOn, { fontSize: 11, fontWeight: "800" }]}>
                    {u}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </View>

      <View
        style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}
        accessible={true}
        accessibilityRole="summary"
        accessibilityLabel={`${UI_TEXT.checkoutReport}: ${summary.completeCount} completed, ${summary.partialCount} partial, ${summary.missedCount} missed passes`}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <Ionicons name="time-outline" size={20} color={theme.colors.white} />
          <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1, minWidth: 140 }}>
            {UI_TEXT.checkoutReport}
          </Text>
          {selectedDayId && selectedMealType ? (
            <View style={{ backgroundColor: theme.colors.white + "25", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
              <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "900" }}>
                {getDayLabel(selectedDayId, dayConfig)} - {getMealLabel(selectedMealType)}
              </Text>
            </View>
          ) : null}
        </View>

        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
          <View style={{ gap: 4, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.totalPassesLabel}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 16, fontWeight: "900" }}>
                {summary.totalPassesForMeal} {summary.totalPassesForMeal === 1 ? UI_TEXT.passSingular : UI_TEXT.passPlural}
              </Text>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
              <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                • {UI_TEXT.completedPasses}: {summary.completeCount}
              </Text>
              {summary.partialCount > 0 ? (
                <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                  • {UI_TEXT.partialPasses}: {summary.partialCount}
                </Text>
              ) : null}
              {(summary.missedCount ?? 0) > 0 ? (
                <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                  • {UI_TEXT.missedPasses}: {summary.missedCount}
                </Text>
              ) : null}
            </View>
          </View>

          {singleCheckoutPasses > 0 || multipleCheckoutPasses > 0 ? (
            <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.checkoutOccurrencesLabel}
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                {singleCheckoutPasses > 0 ? (
                  <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                    • {UI_TEXT.singleCheckoutLabel}: {singleCheckoutPasses} {singleCheckoutPasses === 1 ? UI_TEXT.passSingular : UI_TEXT.passPlural}
                  </Text>
                ) : null}
                {multipleCheckoutPasses > 0 ? (
                  <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                    • {UI_TEXT.multipleCheckoutLabel}: {multipleCheckoutPasses} {multipleCheckoutPasses === 1 ? UI_TEXT.passSingular : UI_TEXT.passPlural}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {userEntries.length > 0 ? (
            <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.checkoutOperatorsLabel} ({summary.totalMembersCheckedOut})
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                {userEntries.map(([username, count], uIdx) => (
                  <Text key={uIdx} style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                    • {username}: {String(count)}
                  </Text>
                ))}
              </View>
            </View>
          ) : null}

          {summary.dineInCheckedOut > 0 || summary.parcelsCheckedOut > 0 ? (
            <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.serviceTypeLabel || "Service Mode"} ({summary.totalMembersCheckedOut})
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                  • {UI_TEXT.dineIn}: {summary.dineInCheckedOut}
                </Text>
                {summary.parcelsCheckedOut > 0 ? (
                  <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                    • {UI_TEXT.parcel}: {summary.parcelsCheckedOut}
                  </Text>
                ) : null}
              </View>
            </View>
          ) : null}

          {summary.totalMembersCheckedOut > 0 ? (
            <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.members} ({summary.totalMembersCheckedOut})
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 2 }}>
                {kidsEnabled || guestsEnabled ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    {summary.adultsCheckedOut > 0 ? (
                      <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                        • {UI_TEXT.adults}: {summary.adultsCheckedOut}
                      </Text>
                    ) : null}
                    {kidsEnabled && summary.kidsCheckedOut > 0 ? (
                      <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                        • {UI_TEXT.kids}: {summary.kidsCheckedOut}
                      </Text>
                    ) : null}
                    {guestsEnabled && summary.guestsCheckedOut > 0 ? (
                      <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                        • {UI_TEXT.guests}: {summary.guestsCheckedOut}
                      </Text>
                    ) : null}
                  </View>
                ) : (
                  <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                    • {UI_TEXT.members}: {summary.totalMembersCheckedOut}
                  </Text>
                )}
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <View>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
                {UI_TEXT.earliestCheckout}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 15, fontWeight: "900", marginTop: 2 }}>
                {formatTime(summary.earliestTime)}
              </Text>
            </View>
            <View style={{ alignItems: "flex-end" }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 11, fontWeight: "700", textTransform: "uppercase" }}>
                {UI_TEXT.latestCheckout}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 15, fontWeight: "900", marginTop: 2 }}>
                {formatTime(summary.latestTime)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {passes.length === 0 ? (
        <Text style={styles.emptyState}>{UI_TEXT.noCheckoutsYet}</Text>
      ) : (
        <View style={{ gap: 12 }}>
          {passes.map((pass: any, index: number) => {
            const colorScheme = theme.cardColors[index % theme.cardColors.length];
            const passLabel = `${pass.block}${UI_TEXT.hyphen}${pass.flat}`;
            const badgeColor = pass.isMissed
              ? theme.colors.error
              : pass.isComplete
              ? theme.colors.success
              : theme.colors.warning || theme.colors.primary;

            const badgeBg = pass.isMissed
              ? theme.colors.errorLight
              : pass.isComplete
              ? theme.colors.successLight
              : theme.colors.warningLight || theme.colors.primary + "20";

            const badgeText = pass.isMissed
              ? UI_TEXT.missedCheckoutBadgeLabel
              : pass.isComplete
              ? UI_TEXT.completedCheckoutBadgeLabel
              : UI_TEXT.partialCheckoutBadgeLabel;

            const uniqueTimes = new Set(
              pass.memberCheckouts
                .filter((m: any) => m.isTaken)
                .map((m: any) => m.numericTime || m.timeDisplay)
            );
            const checkoutOccurrences = uniqueTimes.size > 0 ? uniqueTimes.size : (pass.takenCount > 0 ? 1 : 0);

            return (
              <Pressable
                key={pass.id}
                onPress={() => onSelectFlat(pass.id)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`Pass ${passLabel}, ${badgeText}, ${pass.takenCount} of ${pass.subscribedCount} checked out in ${checkoutOccurrences} checkouts`}
                style={({ pressed }) => [
                  styles.dashboardCard,
                  { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <View style={styles.dashboardCardTop}>
                  <View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>
                        {passLabel}
                      </Text>
                      {checkoutOccurrences > 0 ? (
                        <View style={{
                          backgroundColor: colorScheme.accent + "20",
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          borderWidth: 1,
                          borderColor: colorScheme.accent
                        }}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: colorScheme.accent }}>
                            {checkoutOccurrences} {checkoutOccurrences === 1 ? UI_TEXT.checkoutSingular : UI_TEXT.checkoutPlural}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 2 }}>
                      {pass.takenCount} / {pass.subscribedCount} Checked Out
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end' }}>
                    {!selectedCheckoutUser ? (
                      <View style={{
                        backgroundColor: badgeBg,
                        paddingHorizontal: 8,
                        paddingVertical: 3,
                        borderRadius: 6,
                        borderWidth: 1,
                        borderColor: badgeColor,
                      }}>
                        <Text style={{ fontSize: 11, fontWeight: '900', color: badgeColor }}>
                          {badgeText}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>

                {/* Individual Member Checkouts in Order */}
                <View style={{ gap: 6, borderTopWidth: 1, borderTopColor: colorScheme.border, paddingTop: 10, marginTop: 10 }}>
                  {pass.memberCheckouts.map((mem: any, mIdx: number) => (
                    <View key={mIdx} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, flexWrap: "wrap" }}>
                        <Ionicons
                          name={mem.isTaken ? "checkmark-circle" : "ellipse-outline"}
                          size={14}
                          color={mem.isTaken ? theme.colors.success : theme.colors.textMuted}
                        />
                        <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textPrimary }}>
                          {mem.label}
                        </Text>
                        {mem.actualServiceType ? (
                          <View style={{
                            backgroundColor: theme.colors.primary + "18",
                            paddingHorizontal: 6,
                            paddingVertical: 1,
                            borderRadius: 4,
                            borderWidth: 0.8,
                            borderColor: theme.colors.primary + "40"
                          }}>
                            <Text style={{ fontSize: 10, fontWeight: "800", color: theme.colors.primary }}>
                              {mem.actualServiceType}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: mem.isTaken ? colorScheme.accent : theme.colors.textMuted }}>
                          {mem.timeDisplay ? formatTime(mem.timeDisplay) : formatTime(mem.numericTime)}
                        </Text>
                        {mem.isTaken && mem.userName ? (
                          <Text style={{ fontSize: 10, fontWeight: "600", color: theme.colors.textSecondary, marginTop: 1 }}>
                            {UI_TEXT.byPrefix} {mem.userName}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ))}
                </View>
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}
