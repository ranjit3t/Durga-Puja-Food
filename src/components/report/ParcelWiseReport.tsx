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
  guestVeg: number;
  guestNonVeg: number;
  guestVegTaken: number;
  guestNonVegTaken: number;
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
}: {
  data: MealWiseData[];
  dayConfig: ConfigDay[];
  getMissedParcelData: (dayId: string, mealType: MealType) => any[];
  selectedDayId: string;
  selectedMealType: MealType;
  onSelectFlat: (id: string) => void;
  kidsEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<ParcelTab>(ParcelTab.SUMMARY);

  const missedData = useMemo(() => {
    return getMissedParcelData(selectedDayId, selectedMealType);
  }, [getMissedParcelData, selectedDayId, selectedMealType]);

  return (
    <View style={{ gap: 16 }}>
      {/* Sub-Tabs */}
      <View style={{ flexDirection: 'row', gap: 12, marginBottom: 8, paddingHorizontal: 4 }}>
        {[
          { id: ParcelTab.SUMMARY, label: UI_TEXT.dayWiseReport, icon: "list-outline" },
          { id: ParcelTab.MISSED, label: UI_TEXT.missedParcelReport, icon: "alert-circle-outline" },
        ].map(tab => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id as ParcelTab)}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 8,
                paddingVertical: 8,
                paddingHorizontal: 16,
                borderRadius: 12,
                backgroundColor: activeTab === tab.id ? theme.colors.primary : theme.colors.surfaceDark,
                borderWidth: 1,
                borderColor: theme.colors.border
              },
              pressed && { opacity: 0.7 }
            ]}
          >
            <Ionicons name={tab.icon as any} size={16} color={activeTab === tab.id ? theme.colors.white : theme.colors.textSecondary} />
            <Text style={{ fontSize: 13, fontWeight: '800', color: activeTab === tab.id ? theme.colors.white : theme.colors.textSecondary }}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {activeTab === ParcelTab.SUMMARY ? (
        data.map((item, index) => {
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
                  const tVeg = (m.vegParcel || 0) + (m.kidsVegParcel || 0);
                  const tNonVeg = (m.nonVegParcel || 0) + (m.kidsNonVegParcel || 0);
                  const tVegTaken = (m.vegParcelTaken || 0) + (m.kidsVegParcelTaken || 0);
                  const tNonVegTaken = (m.nonVegParcelTaken || 0) + (m.kidsNonVegParcelTaken || 0);

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
        })
      ) : (
        <MissedParcelReport
          data={missedData}
          selectedDayId={selectedDayId}
          selectedMealType={selectedMealType}
          dayConfig={dayConfig}
          onSelectFlat={onSelectFlat}
          kidsEnabled={kidsEnabled}
        />
      )}
    </View>
  );
}
