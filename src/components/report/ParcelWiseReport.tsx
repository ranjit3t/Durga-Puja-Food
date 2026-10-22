import React, { useState, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, isMealEnabled, isParcelEnabled, isDietaryEnabled, getMealLabel } from "../../constants";
import { ConfigDay, MealType, DietType } from "../../domain";
import { MissedParcelReport } from "./MissedParcelReport";

interface MealStats {
  veg: number;
  nonVeg: number;
  vegTaken: number;
  nonVegTaken: number;
  vegParcel: number;
  nonVegParcel: number;
  vegParcelTaken: number;
  nonVegParcelTaken: number;
  kidsVegParcel?: number;
  kidsNonVegParcel?: number;
  kidsVegParcelTaken?: number;
  kidsNonVegParcelTaken?: number;
  guestsVegParcel?: number;
  guestsNonVegParcel?: number;
  guestsVegParcelTaken?: number;
  guestsNonVegParcelTaken?: number;
  freeMealVeg: number;
  freeMealNonVeg: number;
  freeMealVegTaken: number;
  freeMealNonVegTaken: number;
}

interface MealWiseData {
  day: string;
  meals: Record<MealType, MealStats>;
}

enum ParcelTab {
  SUMMARY = "summary",
  MISSED = "missed"
}

export function ParcelWiseReport({
  data,
  dayConfig,
  getMissedParcelData,
  selectedDayId,
  selectedMealType,
  onSelectFlat,
  kidsEnabled,
  guestsEnabled,
  freeMealEnabled,
  isCapturing,
}: {
  data: MealWiseData[];
  dayConfig: ConfigDay[];
  getMissedParcelData: (dayId: string, mealType: MealType) => any[];
  selectedDayId: string;
  selectedMealType: MealType;
  onSelectFlat: (id: string) => void;
  kidsEnabled: boolean;
  guestsEnabled?: boolean;
  freeMealEnabled?: boolean;
  isCapturing?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<ParcelTab>(ParcelTab.SUMMARY);

  const missedData = useMemo(() => {
    return getMissedParcelData(selectedDayId, selectedMealType);
  }, [getMissedParcelData, selectedDayId, selectedMealType]);

  const missedParcelSummary = useMemo(() => {
    let missedSum = 0;
    let missedVegSum = 0;
    let missedNonVegSum = 0;
    dayConfig.forEach((dayObj) => {
      if (!dayObj.enabled) return;
      [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach((mType) => {
        if (!isMealEnabled(dayObj.id, mType, dayConfig) || !isParcelEnabled(dayObj.id, mType, dayConfig)) return;
        const missedItems = getMissedParcelData(dayObj.id, mType);
        missedItems.forEach((item) => {
          missedSum += item.count;
          missedVegSum += (item.vegCount || 0);
          missedNonVegSum += (item.nonVegCount || 0);
        });
      });
    });
    return { total: missedSum, veg: missedVegSum, nonVeg: missedNonVegSum };
  }, [dayConfig, getMissedParcelData]);

  const summaryTotals = useMemo(() => {
    let totalVeg = 0;
    let totalNonVeg = 0;
    let totalVegTaken = 0;
    let totalNonVegTaken = 0;
    let totalFreeMealVegParcelTaken = 0;
    let totalFreeMealNonVegParcelTaken = 0;

    data.forEach((item) => {
      const mealsWithParcels = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
        .filter((mKey) => isMealEnabled(item.day, mKey, dayConfig) && isParcelEnabled(item.day, mKey, dayConfig));

      mealsWithParcels.forEach((mKey) => {
        const m = item.meals[mKey];
        if (!m) return;
        const freeVegParcel = (m as any).freeMealVegParcelTaken || 0;
        const freeNonVegParcel = (m as any).freeMealNonVegParcelTaken || 0;
        totalFreeMealVegParcelTaken += freeVegParcel;
        totalFreeMealNonVegParcelTaken += freeNonVegParcel;

        const tVeg = (m.vegParcel || 0) + (m.kidsVegParcel || 0) + (m.guestsVegParcel || 0) + freeVegParcel;
        const tNonVeg = (m.nonVegParcel || 0) + (m.kidsNonVegParcel || 0) + (m.guestsNonVegParcel || 0) + freeNonVegParcel;
        const tVegTaken = (m.vegParcelTaken || 0) + (m.kidsVegParcelTaken || 0) + (m.guestsVegParcelTaken || 0) + freeVegParcel;
        const tNonVegTaken = (m.nonVegParcelTaken || 0) + (m.kidsNonVegParcelTaken || 0) + (m.guestsNonVegParcelTaken || 0) + freeNonVegParcel;

        totalVeg += tVeg;
        totalNonVeg += tNonVeg;
        totalVegTaken += tVegTaken;
        totalNonVegTaken += tNonVegTaken;
      });
    });

    const totalParcelPlanned = totalVeg + totalNonVeg;
    const totalParcelServed = totalVegTaken + totalNonVegTaken;
    const totalFreeMealParcelTaken = totalFreeMealVegParcelTaken + totalFreeMealNonVegParcelTaken;

    return {
      totalVeg,
      totalNonVeg,
      totalVegTaken,
      totalNonVegTaken,
      totalParcelPlanned,
      totalParcelServed,
      totalFreeMealVegParcelTaken,
      totalFreeMealNonVegParcelTaken,
      totalFreeMealParcelTaken,
    };
  }, [data, dayConfig]);

  return (
    <View style={{ gap: 16 }}>
      {/* Sub-Tabs */}
      {!isCapturing && (
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8, paddingHorizontal: 2 }}>
        {[
          { id: ParcelTab.SUMMARY, label: UI_TEXT.dayWiseReport, icon: "list-outline" },
          { id: ParcelTab.MISSED, label: UI_TEXT.optedDineIn, icon: "alert-circle-outline" },
        ].map(tab => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id as ParcelTab)}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: activeTab === tab.id }}
            style={({ pressed }) => [
              {
                flex: 1,
                minWidth: 140,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                paddingVertical: 8,
                paddingHorizontal: 12,
                borderRadius: 12,
                backgroundColor: activeTab === tab.id ? theme.colors.primary : theme.colors.surfaceDark,
                borderWidth: 1,
                borderColor: theme.colors.border
              },
              pressed && { opacity: 0.7 }
            ]}
          >
            <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? theme.colors.white : theme.colors.textSecondary} />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              style={{ fontSize: 12, fontWeight: '800', color: activeTab === tab.id ? theme.colors.white : theme.colors.textSecondary }}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
      )}

      {activeTab === ParcelTab.SUMMARY ? (
        <View style={{ gap: 16 }}>
          {/* Red Summary Card for Parcel Report */}
          {summaryTotals.totalParcelPlanned > 0 && (
            <View
              style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}
              accessible={true}
              accessibilityRole="summary"
              accessibilityLabel={`${UI_TEXT.parcelReport}: ${summaryTotals.totalParcelServed} of ${summaryTotals.totalParcelPlanned} parcels served`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Ionicons name="cube-outline" size={20} color={theme.colors.white} />
                <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1 }}>
                  {UI_TEXT.parcelReport}
                </Text>
              </View>

              <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
                {/* Total Parcels Block */}
                <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
                  <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                    {UI_TEXT.totalParcels} ({summaryTotals.totalParcelServed} / {summaryTotals.totalParcelPlanned})
                  </Text>
                  <Text style={{ color: theme.colors.white, fontSize: 18, fontWeight: "900" }}>
                    {summaryTotals.totalParcelServed}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{summaryTotals.totalParcelPlanned}{UI_TEXT.space}{UI_TEXT.parcels}
                  </Text>
                </View>

                {/* Dietary Breakdown Block */}
                <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
                  <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                    {UI_TEXT.subCategoryBreakdown}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                    <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                      • {UI_TEXT.veg}: {summaryTotals.totalVegTaken} / {summaryTotals.totalVeg}
                    </Text>
                    <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                      • {UI_TEXT.nonVeg}: {summaryTotals.totalNonVegTaken} / {summaryTotals.totalNonVeg}
                    </Text>
                  </View>
                </View>

                {/* Free Meal Parcels Block (Shown only when free meal enabled) */}
                {freeMealEnabled && summaryTotals.totalFreeMealParcelTaken > 0 && (
                  <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
                    <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                      {UI_TEXT.freeMealParcels} ({summaryTotals.totalFreeMealParcelTaken})
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                      <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "900" }}>
                        {summaryTotals.totalFreeMealParcelTaken} {summaryTotals.totalFreeMealParcelTaken === 1 ? UI_TEXT.parcelSingular : UI_TEXT.parcels}
                      </Text>
                      {summaryTotals.totalFreeMealVegParcelTaken > 0 && (
                        <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                          • {UI_TEXT.veg}: {summaryTotals.totalFreeMealVegParcelTaken}
                        </Text>
                      )}
                      {summaryTotals.totalFreeMealNonVegParcelTaken > 0 && (
                        <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                          • {UI_TEXT.nonVeg}: {summaryTotals.totalFreeMealNonVegParcelTaken}
                        </Text>
                      )}
                    </View>
                  </View>
                )}

                {/* Overall Missed Parcels / Opted Dine-In Block */}
                <View style={{ gap: 3, paddingBottom: 4 }}>
                  <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                    {UI_TEXT.optedDineIn} ({missedParcelSummary.total})
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12, flexWrap: "wrap", marginTop: 2 }}>
                    <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "900" }}>
                      {missedParcelSummary.total} {missedParcelSummary.total === 1 ? UI_TEXT.parcelSingular : UI_TEXT.parcels}
                    </Text>
                    {missedParcelSummary.veg > 0 && (
                      <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                        • {UI_TEXT.veg}: {missedParcelSummary.veg}
                      </Text>
                    )}
                    {missedParcelSummary.nonVeg > 0 && (
                      <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                        • {UI_TEXT.nonVeg}: {missedParcelSummary.nonVeg}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            </View>
          )}

          {data.map((item, index) => {
            const colorScheme = theme.cardColors[index % theme.cardColors.length];
            const mealsWithParcels = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
              .filter((mKey) => isMealEnabled(item.day, mKey, dayConfig) && isParcelEnabled(item.day, mKey, dayConfig));

            if (mealsWithParcels.length === 0) return null;

            return (
              <View key={item.day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
                <View style={{ borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 12, marginBottom: 12 }}>
                  <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{getDayLabel(item.day, dayConfig)}</Text>
                </View>
                <View style={{ gap: 12 }}>
                  {mealsWithParcels.map((mKey) => {
                    const m = item.meals[mKey];
                    const freeVegParcel = (m as any).freeMealVegParcelTaken || 0;
                    const freeNonVegParcel = (m as any).freeMealNonVegParcelTaken || 0;

                    const tVeg = (m.vegParcel || 0) + (m.kidsVegParcel || 0) + (m.guestsVegParcel || 0) + freeVegParcel;
                    const tNonVeg = (m.nonVegParcel || 0) + (m.kidsNonVegParcel || 0) + (m.guestsNonVegParcel || 0) + freeNonVegParcel;
                    const tVegTaken = (m.vegParcelTaken || 0) + (m.kidsVegParcelTaken || 0) + (m.guestsVegParcelTaken || 0) + freeVegParcel;
                    const tNonVegTaken = (m.nonVegParcelTaken || 0) + (m.kidsNonVegParcelTaken || 0) + (m.guestsNonVegParcelTaken || 0) + freeNonVegParcel;

                    const totalParcel = tVeg + tNonVeg;
                    const totalParcelTaken = tVegTaken + tNonVegTaken;

                    if (totalParcel === 0) return null;

                    return (
                      <View key={mKey} style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                          <Ionicons name={mKey === MealType.BREAKFAST ? "sunny-outline" : mKey === MealType.LUNCH ? "restaurant-outline" : "moon-outline"} size={16} color={theme.colors.primary} />
                          <Text style={{ fontSize: 15, fontWeight: '800', color: theme.colors.textPrimary }}>{getMealLabel(mKey)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                          <View style={{ gap: 4 }}>
                            {isDietaryEnabled(item.day, mKey, DietType.VEG, dayConfig) && (
                              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.veg }}>
                                {UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{tVegTaken}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{tVeg}
                              </Text>
                            )}
                            {isDietaryEnabled(item.day, mKey, DietType.NON_VEG, dayConfig) && (
                              <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.nonVeg }}>
                                {UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{tNonVegTaken}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{tNonVeg}
                              </Text>
                            )}
                          </View>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.total.toUpperCase()}</Text>
                            <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.primary }}>{totalParcelTaken}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}{totalParcel}{UI_TEXT.space}{UI_TEXT.parcelAbbr}</Text>
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
      ) : (
        <MissedParcelReport
          data={missedData}
          selectedDayId={selectedDayId}
          selectedMealType={selectedMealType}
          dayConfig={dayConfig}
          onSelectFlat={onSelectFlat}
          kidsEnabled={kidsEnabled}
          guestsEnabled={guestsEnabled}
        />
      )}
    </View>
  );
}
