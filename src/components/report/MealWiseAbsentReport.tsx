import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";

export interface AbsentPassRecord {
  passId: string;
  block?: string;
  flat?: string;
  memberRole: string;
  memberIndex: number;
  mealType: string;
  hasParcel?: boolean;
  absentTime?: string;
  absentUser?: string;
}

export interface AbsentMealSlot {
  mealType: string;
  mealLabel: string;
  mAdults: number;
  mKids: number;
  mGuests: number;
  mMeals: number;
  mParcels: number;
  passes: AbsentPassRecord[];
}

export interface AbsentDayBreakdown {
  dayId: string;
  dayLabel: string;
  meals: AbsentMealSlot[];
}

export interface AbsentReportData {
  totalAbsentMeals: number;
  totalAbsentParcels: number;
  absentAdults: number;
  absentKids: number;
  absentGuests: number;
  dayBreakdowns: AbsentDayBreakdown[];
}

export interface MealWiseAbsentReportProps {
  data: AbsentReportData;
  kidsEnabled?: boolean;
  guestsEnabled?: boolean;
}

export const MealWiseAbsentReport: React.FC<MealWiseAbsentReportProps> = ({
  data,
  kidsEnabled = false,
  guestsEnabled = false,
}) => {
  const { theme } = useAppTheme();

  const summaryCards = [
    {
      title: UI_TEXT.absentMealsTotal,
      value: String(data.totalAbsentMeals || 0),
      icon: "person-remove-outline" as const,
      color: "#c2410c",
      bg: "#ffedd5",
    },
    {
      title: UI_TEXT.absentParcelsTotal,
      value: String(data.totalAbsentParcels || 0),
      icon: "cube-outline" as const,
      color: "#ea580c",
      bg: "#fff7ed",
    },
    {
      title: UI_TEXT.absentAdults,
      value: String(data.absentAdults || 0),
      icon: "person-outline" as const,
      color: "#0369a1",
      bg: "#e0f2fe",
    },
    ...(kidsEnabled
      ? [
          {
            title: UI_TEXT.absentKids,
            value: String(data.absentKids || 0),
            icon: "happy-outline" as const,
            color: "#7c3aed",
            bg: "#f3e8ff",
          },
        ]
      : []),
    ...(guestsEnabled
      ? [
          {
            title: UI_TEXT.absentGuests,
            value: String(data.absentGuests || 0),
            icon: "people-outline" as const,
            color: "#0d9488",
            bg: "#ccfbf1",
          },
        ]
      : []),
  ];

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Ionicons name="person-remove" size={24} color="#c2410c" />
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
            {UI_TEXT.absentReport}
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            {UI_TEXT.absentReportSubtitle}
          </Text>
        </View>
      </View>

      {/* Top Summary Cards */}
      <View style={styles.summaryRow}>
        {summaryCards.map((card, idx) => (
          <View key={idx} style={[styles.summaryCard, { backgroundColor: card.bg, borderColor: card.color + "44" }]}>
            <Ionicons name={card.icon} size={20} color={card.color} />
            <Text style={[styles.summaryTitle, { color: card.color }]}>{card.title}</Text>
            <Text style={[styles.summaryValue, { color: card.color }]}>{card.value}</Text>
          </View>
        ))}
      </View>

      {/* Day & Meal Wise Pass Breakdown */}
      {data.dayBreakdowns.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <Ionicons name="checkmark-circle-outline" size={32} color={theme.colors.veg} />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {UI_TEXT.noAbsentRecords}
          </Text>
        </View>
      ) : (
        data.dayBreakdowns.map((day) => (
          <View key={day.dayId} style={styles.daySection}>
            <View style={styles.dayHeader}>
              <Ionicons name="calendar-outline" size={18} color={theme.colors.primary} />
              <Text style={[styles.dayTitle, { color: theme.colors.primary }]}>
                {day.dayLabel}
              </Text>
            </View>

            {day.meals.map((meal) => (
              <View
                key={`${day.dayId}-${meal.mealType}`}
                style={[styles.mealCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <View style={styles.mealHeader}>
                  <Text style={[styles.mealTitle, { color: theme.colors.textPrimary }]}>
                    {meal.mealLabel}
                  </Text>
                  <View style={styles.badgeGroup}>
                    <Text style={styles.absentBadge}>
                      {UI_TEXT.absentCount}: {meal.mMeals}
                    </Text>
                    {meal.mParcels > 0 && (
                      <Text style={styles.parcelBadge}>
                        {UI_TEXT.parcels}: {meal.mParcels}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Member Sub-categorization Summary */}
                <Text style={[styles.subCatText, { color: theme.colors.textSecondary }]}>
                  {UI_TEXT.adults}: {meal.mAdults}
                  {kidsEnabled ? ` | ${UI_TEXT.kids}: ${meal.mKids}` : ""}
                  {guestsEnabled ? ` | ${UI_TEXT.guests}: ${meal.mGuests}` : ""}
                </Text>

                {/* List of Absent Passes */}
                <View style={styles.passList}>
                  {meal.passes.map((p, pIdx) => {
                    const passLabel = p.block && p.flat ? `${p.block}-${p.flat}` : p.flat || p.passId;
                    return (
                      <View
                        key={pIdx}
                        style={[styles.passItem, { backgroundColor: theme.colors.background, borderColor: theme.colors.border }]}
                        accessibilityLabel={`Pass ${passLabel}, Member ${p.memberRole}, Absent for ${meal.mealLabel}`}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.passLabelText, { color: theme.colors.textPrimary }]}>
                            {UI_TEXT.pass} {passLabel} • {p.memberRole}
                          </Text>
                          {p.absentTime && (
                            <Text style={[styles.stampText, { color: theme.colors.textSecondary }]}>
                              {p.absentTime} {p.absentUser ? `by ${p.absentUser}` : ""}
                            </Text>
                          )}
                        </View>
                        <Text style={styles.absentPill}>{UI_TEXT.absent}</Text>
                      </View>
                    );
                  })}
                </View>
              </View>
            ))}
          </View>
        ))
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  summaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: 140,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "flex-start",
    gap: 6,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: "900",
  },
  daySection: {
    gap: 12,
    marginTop: 8,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  mealCard: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  badgeGroup: {
    flexDirection: "row",
    gap: 6,
  },
  absentBadge: {
    backgroundColor: "#ffedd5",
    color: "#c2410c",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  parcelBadge: {
    backgroundColor: "#ffedd5",
    color: "#ea580c",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subCatText: {
    fontSize: 12,
  },
  passList: {
    gap: 8,
    marginTop: 4,
  },
  passItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  passLabelText: {
    fontSize: 13,
    fontWeight: "700",
  },
  stampText: {
    fontSize: 11,
    marginTop: 2,
  },
  absentPill: {
    backgroundColor: "#f97316",
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "900",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  emptyCard: {
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
