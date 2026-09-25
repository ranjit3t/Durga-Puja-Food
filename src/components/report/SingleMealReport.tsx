import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, isMealEnabled, isDietaryEnabled, isParcelEnabled, getMealLabel } from "../../constants";
import { ConfigDay, MealType, DietType } from "../../domain";

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
  const [viewMode, setViewMode] = useState<"complete" | "planned">("complete");

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
  const totalNotTaken = Math.max(0, totalDemand - totalTaken);
  const totalParcels = m.vegParcel + m.nonVegParcel + (m.kidsVegParcel || 0) + (m.kidsNonVegParcel || 0);
  const totalParcelsTaken = m.vegParcelTaken + m.nonVegParcelTaken + (m.kidsVegParcelTaken || 0) + (m.kidsNonVegParcelTaken || 0);

  const mealVegParcel = m.vegParcel + (m.kidsVegParcel || 0);
  const mealNonVegParcel = m.nonVegParcel + (m.kidsNonVegParcel || 0);

  const colorScheme = theme.cardColors[2];

  return (
    <View style={{ gap: 16 }}>
      <View style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
        {/* Header Top Section */}
        <View style={[styles.dashboardCardTop, { borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 16, flexWrap: "wrap", gap: 10, alignItems: "center" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1, minWidth: 160 }}>
            <Ionicons
              name={selectedMealType === MealType.BREAKFAST ? "sunny-outline" : selectedMealType === MealType.LUNCH ? "restaurant-outline" : "moon-outline"}
              size={22}
              color={colorScheme.accent}
            />
            <Text style={[styles.dashboardDay, { color: colorScheme.accent, fontSize: 18, flexShrink: 1 }]}>
              {getDayLabel(selectedDayId, dayConfig)} - {getMealLabel(selectedMealType)}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: colorScheme.accentLight, alignSelf: "center", flexShrink: 0 }]}>
            <Text style={[styles.pillText, { color: colorScheme.accent, fontSize: 13, fontWeight: "800" }]}>
              {totalDemand} {UI_TEXT.plates}
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

        <View style={{ marginTop: 16, gap: 12 }}>
          {/* COMPLETE VIEW */}
          {viewMode === "complete" && (
            <>
              {/* Demand Split Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.demandSplit}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  {vegEnabled && (
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.veg, marginBottom: 2 }}>
                      {UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{tVeg}
                    </Text>
                  )}
                  {nonVegEnabled && (
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.nonVeg }}>
                      {UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{tNonVeg}
                    </Text>
                  )}
                </View>
              </View>

              <View style={{ backgroundColor: theme.cardColors[2].bg, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: theme.colors.veg, fontWeight: "800", fontSize: 16 }}>{UI_TEXT.mealTaken}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.colors.veg, fontSize: 24, fontWeight: "900" }}>{totalTaken}</Text>
                  <View style={{ marginTop: 4 }}>
                    {vegEnabled && (
                      <Text style={{ color: theme.colors.veg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                        {UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{tTakenVeg}
                      </Text>
                    )}
                    {nonVegEnabled && (
                      <Text style={{ color: theme.colors.nonVeg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                        {UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{tTakenNonVeg}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              <View style={{ backgroundColor: theme.cardColors[0].bg, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: theme.colors.nonVeg, fontWeight: "800", fontSize: 16 }}>{UI_TEXT.mealNotTaken}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: theme.colors.nonVeg, fontSize: 24, fontWeight: "900" }}>{totalNotTaken}</Text>
                  <View style={{ marginTop: 4 }}>
                    {vegEnabled && (
                      <Text style={{ color: theme.colors.veg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                        {UI_TEXT.veg}{UI_TEXT.colon}{UI_TEXT.space}{tVeg - tTakenVeg}
                      </Text>
                    )}
                    {nonVegEnabled && (
                      <Text style={{ color: theme.colors.nonVeg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                        {UI_TEXT.nonVeg}{UI_TEXT.colon}{UI_TEXT.space}{tNonVeg - tTakenNonVeg}
                      </Text>
                    )}
                  </View>
                </View>
              </View>

              {parcelEnabled && totalParcels > 0 ? (
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colorScheme.border, paddingTop: 16 }}>
                  <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.parcelsNeeded}</Text>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.primary }}>
                      {totalParcelsTaken}{UI_TEXT.space}{UI_TEXT.slash}{UI_TEXT.space}
                      {totalParcels}{UI_TEXT.space}{UI_TEXT.parcelAbbr}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: "600" }}>
                      {UI_TEXT.openParen}
                      {vegEnabled && mealVegParcel > 0 && <Text style={{ color: theme.colors.veg }}>{(m.vegParcelTaken + (m.kidsVegParcelTaken || 0))}{UI_TEXT.slash}{mealVegParcel}{UI_TEXT.space}{UI_TEXT.veg}</Text>}
                      {vegEnabled && mealVegParcel > 0 && nonVegEnabled && mealNonVegParcel > 0 && <Text>{UI_TEXT.comma}{UI_TEXT.space}</Text>}
                      {nonVegEnabled && mealNonVegParcel > 0 && <Text style={{ color: theme.colors.nonVeg }}>{(m.nonVegParcelTaken + (m.kidsNonVegParcelTaken || 0))}{UI_TEXT.slash}{mealNonVegParcel}{UI_TEXT.space}{UI_TEXT.nonVeg}</Text>}
                      {UI_TEXT.closeParen}
                    </Text>
                  </View>
                </View>
              ) : null}
            </>
          )}

          {/* PLANNED VIEW DETAILED BREAKDOWN WITH STAT BOXES */}
          {viewMode === "planned" && (
            <View style={{ gap: 10, marginTop: 4 }}>
              {/* 1. ADULTS / RESIDENT MEMBERS BLOCK */}
              <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.colors.border, gap: 10 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="person-outline" size={16} color={theme.colors.textSecondary} />
                  <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {kidsEnabled ? UI_TEXT.adults : UI_TEXT.generalMembers}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {vegEnabled && (
                    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 2 }} numberOfLines={1}>
                        {UI_TEXT.veg}
                      </Text>
                      <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.veg }}>
                        {m ? m.veg : 0}
                      </Text>
                    </View>
                  )}

                  {nonVegEnabled && (
                    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 2 }} numberOfLines={1}>
                        {UI_TEXT.nonVeg}
                      </Text>
                      <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.nonVeg }}>
                        {m ? m.nonVeg : 0}
                      </Text>
                    </View>
                  )}

                  <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}>
                    <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 2 }} numberOfLines={1}>
                      {UI_TEXT.total}
                    </Text>
                    <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.primary }}>
                      {(m ? m.veg + m.nonVeg : 0)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* 2. KIDS BLOCK */}
              {kidsEnabled && m && (m.kidsVeg + m.kidsNonVeg) > 0 && (
                <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.colors.border, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="happy-outline" size={16} color={theme.colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {UI_TEXT.kids}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {vegEnabled && (
                      <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 2 }} numberOfLines={1}>
                          {UI_TEXT.veg}
                        </Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.veg }}>
                          {m.kidsVeg}
                        </Text>
                      </View>
                    )}

                    {nonVegEnabled && (
                      <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 2 }} numberOfLines={1}>
                          {UI_TEXT.nonVeg}
                        </Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.nonVeg }}>
                          {m.kidsNonVeg}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 2 }} numberOfLines={1}>
                        {UI_TEXT.total}
                      </Text>
                      <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.primary }}>
                        {m.kidsVeg + m.kidsNonVeg}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 3. GUEST BLOCK */}
              {guestEnabled && m && (m.guestVeg + m.guestNonVeg) > 0 && (
                <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.colors.border, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="people-circle-outline" size={16} color={theme.colors.secondary} />
                    <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.secondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {UI_TEXT.guests}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {vegEnabled && (
                      <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 2 }} numberOfLines={1}>
                          {UI_TEXT.veg}
                        </Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.veg }}>
                          {m.guestVeg}
                        </Text>
                      </View>
                    )}

                    {nonVegEnabled && (
                      <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 2 }} numberOfLines={1}>
                          {UI_TEXT.nonVeg}
                        </Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.nonVeg }}>
                          {m.guestNonVeg}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 2 }} numberOfLines={1}>
                        {UI_TEXT.total}
                      </Text>
                      <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.secondary }}>
                        {m.guestVeg + m.guestNonVeg}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* 4. PARCELS BLOCK */}
              {parcelEnabled && totalParcels > 0 && (
                <View style={{ backgroundColor: theme.colors.surface, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: theme.colors.border, gap: 10 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="cube-outline" size={16} color={theme.colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.primary, textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {UI_TEXT.parcelsNeeded}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {vegEnabled && (
                      <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 2 }} numberOfLines={1}>
                          {UI_TEXT.veg}
                        </Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.veg }}>
                          {mealVegParcel}
                        </Text>
                      </View>
                    )}

                    {nonVegEnabled && (
                      <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 2 }} numberOfLines={1}>
                          {UI_TEXT.nonVeg}
                        </Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.nonVeg }}>
                          {mealNonVegParcel}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1, backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 10, alignItems: "center", borderWidth: 1, borderColor: theme.colors.border }}>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textMuted, marginBottom: 2 }} numberOfLines={1}>
                        {UI_TEXT.total}
                      </Text>
                      <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.primary }}>
                        {totalParcels}
                      </Text>
                    </View>
                  </View>
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
