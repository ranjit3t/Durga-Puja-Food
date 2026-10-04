import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, isMealEnabled, isDietaryEnabled, isParcelEnabled, getMealLabel, getMealVarieties, isSpecialMeal } from "../../constants";
import { ConfigDay, MealType, DietType, DietaryOption } from "../../domain";
import { useCoreDatabase } from "../../context/DatabaseContext";
import { MealMetricGrid } from "../dashboard/MealMetricGrid";

interface DayWiseData {
  day: string;
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
  vegParcelTaken: number;
  nonVegParcelTaken: number;
  kidsVegParcelTaken: number;
  kidsNonVegParcelTaken: number;
  guestVeg: number;
  guestNonVeg: number;
  guestVegTaken: number;
  guestNonVegTaken: number;
}

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
  vegParcelTaken: number;
  nonVegParcelTaken: number;
  kidsVegParcelTaken: number;
  kidsNonVegParcelTaken: number;
  guestVeg: number;
  guestNonVeg: number;
  guestVegTaken: number;
  guestNonVegTaken: number;
}

interface DayData {
  day: string;
  meals: Record<MealType, MealStats>;
}

export function DayWiseReport({
  data,
  selectedDayId,
  selectedMealType,
  mealWiseData = [],
  dayConfig,
  kidsEnabled,
  guestEnabled,
}: {
  data: DayWiseData[];
  selectedDayId?: string;
  selectedMealType?: MealType;
  mealWiseData?: DayData[];
  dayConfig: ConfigDay[];
  kidsEnabled: boolean;
  guestEnabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const { subscriptions, foodMenu } = useCoreDatabase();
  const [viewMode, setViewMode] = useState<"complete" | "planned">("complete");

  const currentDayId = selectedDayId || (data.length > 0 ? data[0].day : "");
  const currentMealType = selectedMealType || MealType.LUNCH;

  const dayMealData = mealWiseData.find((item) => item.day === currentDayId);

  if (!currentDayId) return null;

  const m = dayMealData?.meals[currentMealType];
  const mealEnabled = isMealEnabled(currentDayId, currentMealType, dayConfig);

  if (!mealEnabled) {
    return (
      <View style={[styles.card, { padding: 20, alignItems: "center" }]}>
        <Text style={styles.emptyState}>{UI_TEXT.mealDisabled}</Text>
      </View>
    );
  }

  const vegEnabled = isDietaryEnabled(currentDayId, currentMealType, DietType.VEG, dayConfig);
  const nonVegEnabled = isDietaryEnabled(currentDayId, currentMealType, DietType.NON_VEG, dayConfig);
  const parcelEnabled = isParcelEnabled(currentDayId, currentMealType, dayConfig);

  // Meal level calculations
  const mealVeg = m ? m.veg + (m.guestVeg || 0) + (m.kidsVeg || 0) : 0;
  const mealNonVeg = m ? m.nonVeg + (m.guestNonVeg || 0) + (m.kidsNonVeg || 0) : 0;
  const mealVegTaken = m ? m.vegTaken + (m.guestVegTaken || 0) + (m.kidsVegTaken || 0) : 0;
  const mealNonVegTaken = m ? m.nonVegTaken + (m.guestNonVegTaken || 0) + (m.kidsNonVegTaken || 0) : 0;

  const mealTotalDemand = mealVeg + mealNonVeg;
  const mealTotalTaken = mealVegTaken + mealNonVegTaken;
  const mealTotalNotTaken = Math.max(0, mealTotalDemand - mealTotalTaken);

  const mealVegParcel = m ? m.vegParcel + (m.kidsVegParcel || 0) : 0;
  const mealNonVegParcel = m ? m.nonVegParcel + (m.kidsNonVegParcel || 0) : 0;
  const mealTotalParcel = mealVegParcel + mealNonVegParcel;
  const mealVegParcelTaken = m ? m.vegParcelTaken + (m.kidsVegParcelTaken || 0) : 0;
  const mealNonVegParcelTaken = m ? m.nonVegParcelTaken + (m.kidsNonVegParcelTaken || 0) : 0;
  const mealTotalParcelTaken = mealVegParcelTaken + mealNonVegParcelTaken;

  const colorScheme = theme.cardColors[0];
  const isSpecial = isSpecialMeal(currentDayId, currentMealType, dayConfig);

  return (
    <View style={{ gap: 16 }}>
      {/* Main Selected Day & Meal Card */}
      <View style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
        {/* Header Top Section */}
        <View style={[styles.dashboardCardTop, { borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 16, flexWrap: "wrap", gap: 10, alignItems: "center" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 160, flexWrap: "wrap" }}>
            <Ionicons
              name={currentMealType === MealType.BREAKFAST ? "sunny-outline" : currentMealType === MealType.LUNCH ? "restaurant-outline" : "moon-outline"}
              size={22}
              color={colorScheme.accent}
            />
            <Text style={[styles.dashboardDay, { color: colorScheme.accent, fontSize: 18, flexShrink: 1 }]}>
              {getDayLabel(currentDayId, dayConfig)} - {getMealLabel(currentMealType)}
            </Text>
            {isSpecial && (
              <View style={{ backgroundColor: theme.colors.specialMealBorder, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Ionicons name="star" size={10} color={theme.colors.white} />
                <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.specialMealBadge}</Text>
              </View>
            )}
          </View>
          <View style={[styles.pill, { backgroundColor: colorScheme.accentLight, alignSelf: "center", flexShrink: 0 }]}>
            <Text style={[styles.pillText, { color: colorScheme.accent, fontSize: 13, fontWeight: "800" }]}>
              {mealTotalDemand} {mealTotalDemand === 1 ? UI_TEXT.plateSingular : UI_TEXT.plates}
            </Text>
          </View>
        </View>

        {/* View Mode Switcher Toggle Bar */}
        <View
          style={{
            flexDirection: "row",
            backgroundColor: theme.colors.surfaceDark,
            borderRadius: 14,
            padding: 6,
            marginTop: 16,
            gap: 8,
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          <Pressable
            onPress={() => setViewMode("complete")}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={UI_TEXT.completeView}
            accessibilityState={{ selected: viewMode === "complete" }}
            style={({ pressed }) => [
              {
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: viewMode === "complete" ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: viewMode === "complete" ? theme.colors.primary : theme.colors.border,
                ...Platform.select({
                  ios: {
                    shadowColor: viewMode === "complete" ? theme.colors.primary : theme.colors.shadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: viewMode === "complete" ? 0.3 : 0.05,
                    shadowRadius: 2,
                  },
                  android: {
                    elevation: viewMode === "complete" ? 2 : 0,
                  },
                  web: {
                    boxShadow: viewMode === "complete" ? `0px 1px 4px ${theme.colors.primary}40` : 'none',
                  },
                }),
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons
              name="grid-outline"
              size={18}
              color={viewMode === "complete" ? theme.colors.white : theme.colors.textSecondary}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: viewMode === "complete" ? theme.colors.white : theme.colors.textSecondary,
              }}
            >
              {UI_TEXT.completeView}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => setViewMode("planned")}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={UI_TEXT.plannedView}
            accessibilityState={{ selected: viewMode === "planned" }}
            style={({ pressed }) => [
              {
                flex: 1,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: viewMode === "planned" ? theme.colors.primary : theme.colors.surface,
                borderWidth: 1,
                borderColor: viewMode === "planned" ? theme.colors.primary : theme.colors.border,
                ...Platform.select({
                  ios: {
                    shadowColor: viewMode === "planned" ? theme.colors.primary : theme.colors.shadow,
                    shadowOffset: { width: 0, height: 1 },
                    shadowOpacity: viewMode === "planned" ? 0.3 : 0.05,
                    shadowRadius: 2,
                  },
                  android: {
                    elevation: viewMode === "planned" ? 2 : 0,
                  },
                  web: {
                    boxShadow: viewMode === "planned" ? `0px 1px 4px ${theme.colors.primary}40` : 'none',
                  },
                }),
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons
              name="clipboard-outline"
              size={18}
              color={viewMode === "planned" ? theme.colors.white : theme.colors.textSecondary}
            />
            <Text
              style={{
                fontSize: 13,
                fontWeight: "800",
                color: viewMode === "planned" ? theme.colors.white : theme.colors.textSecondary,
              }}
            >
              {UI_TEXT.plannedView}
            </Text>
          </Pressable>
        </View>

        {/* Content based on View Mode */}
        <View style={{ marginTop: 16, gap: 12 }}>
          {/* COMPLETE VIEW: Show Demand Split, Taken & Pending details */}
          {viewMode === "complete" && (
            <>
              {/* Demand Split Summary Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.demandSplit}</Text>
                <View style={{ alignItems: "flex-end" }}>
                  {vegEnabled && (
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.veg, marginBottom: 2 }}>
                      {UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{mealVeg}
                    </Text>
                  )}
                  {nonVegEnabled && (
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.nonVeg }}>
                      {UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{mealNonVeg}
                    </Text>
                  )}
                </View>
              </View>

              {/* Meal Taken Section */}
              <View style={{ backgroundColor: theme.colors.successLight, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: theme.colors.veg, fontWeight: "800", fontSize: 16 }}>{UI_TEXT.mealTaken}</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: theme.colors.veg, fontSize: 24, fontWeight: "900" }}>{mealTotalTaken}</Text>
                  {m && (
                    <View style={{ marginTop: 2 }}>
                      {vegEnabled && (
                        <Text style={{ color: theme.colors.veg, fontSize: 11, fontWeight: "700", textAlign: "right" }}>
                          {UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{mealVegTaken}
                        </Text>
                      )}
                      {nonVegEnabled && (
                        <Text style={{ color: theme.colors.nonVeg, fontSize: 11, fontWeight: "700", textAlign: "right" }}>
                          {UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{mealNonVegTaken}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>

              {/* Meal Not Taken Section */}
              <View style={{ backgroundColor: theme.colors.errorLight, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: theme.colors.nonVeg, fontWeight: "800", fontSize: 16 }}>{UI_TEXT.mealNotTaken}</Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ color: theme.colors.nonVeg, fontSize: 24, fontWeight: "900" }}>{mealTotalNotTaken}</Text>
                  {m && (
                    <View style={{ marginTop: 2 }}>
                      {vegEnabled && (
                        <Text style={{ color: theme.colors.veg, fontSize: 11, fontWeight: "700", textAlign: "right" }}>
                          {UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{mealVeg - mealVegTaken}
                        </Text>
                      )}
                      {nonVegEnabled && (
                        <Text style={{ color: theme.colors.nonVeg, fontSize: 11, fontWeight: "700", textAlign: "right" }}>
                          {UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{mealNonVeg - mealNonVegTaken}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </>
          )}

          {/* MEAL METRIC GRID (Dashboard style for both Complete and Planned view modes) */}
          <MealMetricGrid
            day={currentDayId}
            type={currentMealType}
            total={mealTotalDemand}
            veg={mealVeg}
            nonVeg={mealNonVeg}
            parcel={mealTotalParcel}
            parcelTaken={mealTotalParcelTaken}
            totalVegTaken={mealVegTaken}
            totalNonVegTaken={mealNonVegTaken}
            guestVeg={m?.guestVeg || 0}
            guestNonVeg={m?.guestNonVeg || 0}
            guestVegTaken={m?.guestVegTaken || 0}
            guestNonVegTaken={m?.guestNonVegTaken || 0}
            totalMealTaken={mealTotalTaken}
            kidsTotal={(m?.kidsVeg || 0) + (m?.kidsNonVeg || 0)}
            kidsTaken={(m?.kidsVegTaken || 0) + (m?.kidsNonVegTaken || 0)}
            kidsVeg={m?.kidsVeg || 0}
            kidsNonVeg={m?.kidsNonVeg || 0}
            kidsVegTaken={m?.kidsVegTaken || 0}
            kidsNonVegTaken={m?.kidsNonVegTaken || 0}
            kidsEnabled={kidsEnabled}
            guestEnabled={!!guestEnabled}
            isParcelEnabled={parcelEnabled}
            isBothEnabled={vegEnabled && nonVegEnabled}
            showPlannedOnly={viewMode === "planned"}
            labels={{
              veg: UI_TEXT.veg,
              nonVeg: UI_TEXT.nonVeg,
              kidsTotal: UI_TEXT.kids,
              kidsTaken: UI_TEXT.taken,
              kidsVeg: UI_TEXT.veg,
              kidsNonVeg: UI_TEXT.nonVeg,
              kidsVegTaken: UI_TEXT.vegTaken,
              kidsNonVegTaken: UI_TEXT.vegTaken,
              vegTaken: UI_TEXT.vegTaken,
              nonVegTaken: UI_TEXT.nonVegTaken,
              guestVeg: UI_TEXT.guestVeg,
              guestNonVeg: UI_TEXT.guestNonVeg,
              guestVegTaken: UI_TEXT.guestVegTaken,
              guestNonVegTaken: UI_TEXT.guestNonVegTaken,
            }}
          />
        </View>
      </View>
    </View>
  );
}
