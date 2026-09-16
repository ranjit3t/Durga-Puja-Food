/**
 * Operational Dashboard for tracking meal demands and collections.
 * Provides aggregated counts for kitchen planning and guest entry management.
 */
import React, { memo, useMemo } from "react";
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import {
  getDayLabel,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled,
  isMealCurrent,
  getSortedMealKeys,
  getPaymentModeLabel,
} from "../constants";
import { MealMenu, UserRole, ConfigDay, MealType, DietType, AppScreen, PaymentMode } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { MealSummaryInline } from "../components/menu/MealSummaryInline";
import { Metric } from "../components/common/Metric";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";

interface MealSectionProps {
  day: string;
  type: MealType;
  icon: keyof typeof Ionicons.glyphMap;
  total: number;
  veg: number;
  nonVeg: number;
  parcel: number;
  parcelTaken: number;
  taken: number;
  flatVegTaken: number;
  flatNonVegTaken: number;
  guestVeg: number;
  guestNonVeg: number;
  guestVegTaken: number;
  guestNonVegTaken: number;
  menu: MealMenu;
  userRole: UserRole;
  config: ConfigDay[];
  onUpdateGuest: (
    day: string,
    type: MealType,
    field:
      | "guestVeg"
      | "guestNonVeg"
      | "guestTaken"
      | "guestVegTaken"
      | "guestNonVegTaken",
    value: number
  ) => void;
  guestEnabled: boolean;
  seasonEnabled: boolean;
  labels: {
    veg: string;
    nonVeg: string;
    parcel: string;
    parcelTaken: string;
    taken: string;
    guestVeg: string;
    guestNonVeg: string;
    guestVegTaken: string;
    guestNonVegTaken: string;
    vegTaken: string;
    nonVegTaken: string;
  };
}

/**
 * Renders a specific meal category (e.g. Lunch) with its demand metrics.
 */
const DashboardMealSection = memo(
  ({
    day,
    type,
    icon,
    total,
    veg,
    nonVeg,
    parcel,
    parcelTaken,
    taken,
    flatVegTaken,
    flatNonVegTaken,
    guestVeg,
    guestNonVeg,
    guestVegTaken,
    guestNonVegTaken,
    menu,
    config,
    guestEnabled,
    labels,
  }: MealSectionProps) => {
    const vegItems = menu?.veg || [];
    const nonVegItems = menu?.nonVeg || [];

    const isVegEnabled = isDietaryEnabled(day, type, DietType.VEG, config);
    const isNonVegEnabled = isDietaryEnabled(day, type, DietType.NON_VEG, config);
    const isBothEnabled = isVegEnabled && isNonVegEnabled;

    const totalVegTaken = flatVegTaken + guestVegTaken;
    const totalNonVegTaken = flatNonVegTaken + guestNonVegTaken;
    const totalMealTaken = totalVegTaken + totalNonVegTaken;

    const mealLabel = type === MealType.BREAKFAST ? UI_TEXT.breakfast : type === MealType.LUNCH ? UI_TEXT.lunch : UI_TEXT.dinner;
    const isCurrent = isMealCurrent(day, type, config);

    const styles = useStyles();
    const { theme } = useAppTheme();

    return (
      <View style={[styles.dashboardMealSection, isCurrent && { borderColor: theme.colors.primary, borderWidth: 1.5, backgroundColor: theme.colors.primary + "08" }]}>
        <View style={[styles.mealDisplayHeader, { marginBottom: 12, justifyContent: "space-between" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name={icon} size={22} color={isCurrent ? theme.colors.primary : theme.colors.textSecondary} />
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
               <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 18, color: isCurrent ? theme.colors.primary : theme.colors.textPrimary }]}>
                 {mealLabel}
               </Text>
               {isCurrent && (
                 <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                    <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.live.toUpperCase()}</Text>
                 </View>
               )}
            </View>
          </View>
          <View style={[styles.pill, { backgroundColor: isCurrent ? theme.colors.primary + "15" : theme.colors.surface }]}>
             <Text style={[styles.pillText, { color: isCurrent ? theme.colors.primary : theme.colors.textSecondary }]}>{total} {UI_TEXT.plates}</Text>
          </View>
        </View>

        {/* Menu Quick-View */}
        {(vegItems.length > 0 || nonVegItems.length > 0) ? (
          <View style={{ gap: 8, marginBottom: 16 }}>
            {isVegEnabled && vegItems.length > 0 ? (
              <View style={[styles.menuBox, { borderLeftWidth: 4, borderLeftColor: theme.colors.veg, paddingVertical: 8 }]}>
                <MealSummaryInline
                  label={UI_TEXT.veg}
                  dayId={day}
                  mealKey={type}
                  config={config}
                  menu={{ veg: vegItems, nonVeg: [] }}
                />
              </View>
            ) : null}
            {isNonVegEnabled && nonVegItems.length > 0 ? (
                <View
                  style={[styles.menuBox, { borderLeftWidth: 4, borderLeftColor: theme.colors.nonVeg, paddingVertical: 8 }]}
                >
                  <MealSummaryInline
                    label={UI_TEXT.nonVeg}
                    dayId={day}
                    mealKey={type}
                    config={config}
                    menu={{ veg: [], nonVeg: nonVegItems }}
                  />
                </View>
              ) : null}
          </View>
        ) : null}

        {/* Aggregated Demand Metrics */}
        <View style={styles.metricGrid}>
          <Metric icon="people-outline" label={UI_TEXT.total} value={total} />

          {/* Guest Total */}
          {guestEnabled && (
            <Metric
              icon="people-circle-outline"
              label={UI_TEXT.guestTotal}
              value={guestVeg + guestNonVeg}
            />
          )}

          {/* Detailed Demand */}
          {isBothEnabled && (
            <>
              <Metric icon="leaf-outline" label={labels.veg} value={veg} color={theme.colors.veg} />
              <Metric icon="flame-outline" label={labels.nonVeg} value={nonVeg} color={theme.colors.nonVeg} />
            </>
          )}

          {isParcelEnabled(day, type, config) && (
            <>
              <Metric icon="cube-outline" label={labels.parcel} value={parcel} />
              <Metric
                icon="checkmark-circle-outline"
                label={labels.parcelTaken}
                value={parcelTaken}
                color={theme.colors.primary}
              />
            </>
          )}

          <Metric
            icon="checkmark-done-outline"
            label={UI_TEXT.total + " " + UI_TEXT.taken}
            value={totalMealTaken}
            color={theme.colors.veg}
          />

          {/* Detailed View */}
          {isBothEnabled && (
            <>
              <View style={{ width: "100%", height: 1, backgroundColor: theme.colors.border, marginVertical: 8 }} />

              <Metric
                icon="checkmark-done-outline"
                label={labels.vegTaken}
                value={totalVegTaken}
                color={theme.colors.veg}
              />
              <Metric
                icon="checkmark-done-outline"
                label={labels.nonVegTaken}
                value={totalNonVegTaken}
                color={theme.colors.nonVeg}
              />

              {guestEnabled && (
                <>
                  <Metric
                    icon="leaf-outline"
                    label={labels.guestVeg}
                    value={guestVeg}
                    color={theme.colors.veg}
                  />
                  <Metric
                    icon="flame-outline"
                    label={labels.guestNonVeg}
                    value={guestNonVeg}
                    color={theme.colors.nonVeg}
                  />

                  <Metric
                    icon="checkbox-outline"
                    label={labels.guestVegTaken}
                    value={guestVegTaken}
                  />
                  <Metric
                    icon="checkbox-outline"
                    label={labels.guestNonVegTaken}
                    value={guestNonVegTaken}
                  />
                </>
              )}
            </>
          )}

          {!isBothEnabled && guestEnabled && (
            <Metric
              icon="checkbox-outline"
              label={UI_TEXT.guestTaken}
              value={guestVegTaken + guestNonVegTaken}
              color={theme.colors.veg}
            />
          )}
        </View>
      </View>
    );
  }
);

export function DashboardScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    foodMenu, dayConfig, seasonName, paymentConfig, guestEnabled, seasonEnabled,
    dashboardData, collections, updateGuestCount
  } = useDatabase();

  const { navigate, goBack } = useAppNavigation();
  const { showAlert } = useUI();

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();

  const sortedActiveDays = useMemo(() => {
    const active = dayConfig.filter((d) => d.enabled).map((d) => d.id);
    return [...active].sort((a, b) => {
      const aHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(a, m, dayConfig));
      const bHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(b, m, dayConfig));

      if (aHasCurrent && !bHasCurrent) return -1;
      if (!aHasCurrent && bHasCurrent) return 1;

      // If neither or both (shouldn't happen) have current, maintain original config order
      const aIdx = dayConfig.findIndex(d => d.id === a);
      const bIdx = dayConfig.findIndex(d => d.id === b);
      return aIdx - bIdx;
    });
  }, [dayConfig]);

  const summaryTotals = useMemo(() => {
    return dashboardData.reduce((acc, day) => {
      acc.total += (day.breakfast || 0) + (day.lunch || 0) + (day.dinner || 0);
      acc.veg += (day.breakfastVeg || 0) + (day.lunchVeg || 0) + (day.dinnerVeg || 0);
      acc.nonVeg += (day.breakfastNonVeg || 0) + (day.lunchNonVeg || 0) + (day.dinnerNonVeg || 0);
      acc.taken += (day.breakfastTaken || 0) + (day.lunchTaken || 0) + (day.dinnerTaken || 0);
      return acc;
    }, { total: 0, veg: 0, nonVeg: 0, taken: 0 });
  }, [dashboardData]);

  const { isVegEnabledGlobally, isNonVegEnabledGlobally } = useMemo(() => {
    return {
      isVegEnabledGlobally: dayConfig.some(d => d.enabled && (
        (d[MealType.BREAKFAST].enabled && d[MealType.BREAKFAST].veg) ||
        (d[MealType.LUNCH].enabled && d[MealType.LUNCH].veg) ||
        (d[MealType.DINNER].enabled && d[MealType.DINNER].veg)
      )),
      isNonVegEnabledGlobally: dayConfig.some(d => d.enabled && (
        (d[MealType.BREAKFAST].enabled && d[MealType.BREAKFAST].nonVeg) ||
        (d[MealType.LUNCH].enabled && d[MealType.LUNCH].nonVeg) ||
        (d[MealType.DINNER].enabled && d[MealType.DINNER].nonVeg)
      ))
    };
  }, [dayConfig]);

  const emptyMeal = {
    veg: [],
    nonVeg: [],
    guestVeg: 0,
    guestNonVeg: 0,
    guestTaken: 0,
    guestVegTaken: 0,
    guestNonVegTaken: 0,
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <StatusBar style={themeType === "dark" ? "light" : "dark"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.dashboardTitle}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.dashboardSubtitle}</Text>
      </View>
      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Event Summary Card */}
        <View style={[styles.card, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, elevation: 6, marginBottom: 24 }]}>
          <View style={styles.previewTop}>
            <View style={{ flex: 1, paddingRight: 10 }}>
              <Text style={[styles.previewLabel, { color: theme.colors.white, opacity: 0.7 }]}>{UI_TEXT.dailyDemandSummary}</Text>
              {!!seasonName && (
                <Text style={[styles.previewTitle, { color: theme.colors.white, fontSize: 22 }]} numberOfLines={2}>
                  {seasonName}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end' }}>
               <Text style={[styles.previewAmount, { color: theme.colors.white, fontSize: 32 }]}>
                 {summaryTotals.total}
               </Text>
               <Text style={{ color: theme.colors.white, opacity: 0.8, fontSize: 12, fontWeight: "700" }}>{UI_TEXT.plates.toUpperCase()}</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2, marginVertical: 12 }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.previewMeta, { color: theme.colors.white }]}>
               {(() => {
                 const parts = [];
                 if (isVegEnabledGlobally) parts.push(`${summaryTotals.veg} ${UI_TEXT.veg}`);
                 if (isNonVegEnabledGlobally) parts.push(`${summaryTotals.nonVeg} ${UI_TEXT.nonVeg}`);
                 return parts.length > 0 ? parts.join(" | ") : UI_TEXT.none;
               })()}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
               <Ionicons name="checkmark-done-circle" size={16} color={theme.colors.white} />
               <Text style={{ color: theme.colors.white, fontWeight: "800", fontSize: 14 }}>
                 {summaryTotals.taken} {UI_TEXT.taken.toUpperCase()}
               </Text>
            </View>
          </View>
        </View>

        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>{UI_TEXT.dailyMealDemand}</Text>

        {/* Daily Demand Matrices */}
        {sortedActiveDays.map((day, index) => {
          const item = dashboardData.find(d => d.dayId === day) || {};
          const dayMenu = foodMenu[day] || {
            [MealType.BREAKFAST]: emptyMeal,
            [MealType.LUNCH]: emptyMeal,
            [MealType.DINNER]: emptyMeal,
          };
          const colorScheme = theme.cardColors[index % theme.cardColors.length];
          const sortedMeals = getSortedMealKeys(day, dayConfig);

          return (
            <View key={day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
              <View style={[styles.dashboardCardTop, { marginBottom: 16 }]}>
                <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{getDayLabel(day, dayConfig)}</Text>
              </View>

              {sortedMeals.map((mKey) => {
                if (!isMealEnabled(day, mKey, dayConfig)) return null;

                const mealProps = mKey === MealType.BREAKFAST ? {
                  total: item.breakfast || 0,
                  veg: item.breakfastVeg || 0,
                  nonVeg: item.breakfastNonVeg || 0,
                  parcel: item.breakfastParcel || 0,
                  parcelTaken: item.breakfastParcelTaken || 0,
                  taken: item.breakfastTaken || 0,
                  flatVegTaken: item.breakfastFlatVegTaken || 0,
                  flatNonVegTaken: item.breakfastFlatNonVegTaken || 0,
                  guestVeg: item.breakfastGuestVeg || 0,
                  guestNonVeg: item.breakfastGuestNonVeg || 0,
                  guestVegTaken: item.breakfastGuestVegTaken || 0,
                  guestNonVegTaken: item.breakfastGuestNonVegTaken || 0,
                  icon: "sunny-outline" as const,
                  labels: {
                    veg: UI_TEXT.bVeg,
                    nonVeg: UI_TEXT.bNonVeg,
                    parcel: UI_TEXT.bParcel,
                    parcelTaken: UI_TEXT.bP_Taken,
                    taken: UI_TEXT.bTaken,
                    guestVeg: UI_TEXT.guestVeg,
                    guestNonVeg: UI_TEXT.guestNonVeg,
                    guestVegTaken: UI_TEXT.guestVegTaken,
                    guestNonVegTaken: UI_TEXT.guestNonVegTaken,
                    vegTaken: UI_TEXT.vegTaken,
                    nonVegTaken: UI_TEXT.nonVegTaken,
                  }
                } : mKey === MealType.LUNCH ? {
                  total: item.lunch || 0,
                  veg: item.lunchVeg || 0,
                  nonVeg: item.lunchNonVeg || 0,
                  parcel: item.lunchParcel || 0,
                  parcelTaken: item.lunchParcelTaken || 0,
                  taken: item.lunchTaken || 0,
                  flatVegTaken: item.lunchFlatVegTaken || 0,
                  flatNonVegTaken: item.lunchFlatNonVegTaken || 0,
                  guestVeg: item.lunchGuestVeg || 0,
                  guestNonVeg: item.lunchGuestNonVeg || 0,
                  guestVegTaken: item.lunchGuestVegTaken || 0,
                  guestNonVegTaken: item.lunchGuestNonVegTaken || 0,
                  icon: "restaurant-outline" as const,
                  labels: {
                    veg: UI_TEXT.lVeg,
                    nonVeg: UI_TEXT.lNonVeg,
                    parcel: UI_TEXT.lParcel,
                    parcelTaken: UI_TEXT.lP_Taken,
                    taken: UI_TEXT.lTaken,
                    guestVeg: UI_TEXT.guestVeg,
                    guestNonVeg: UI_TEXT.guestNonVeg,
                    guestVegTaken: UI_TEXT.guestVegTaken,
                    guestNonVegTaken: UI_TEXT.guestNonVegTaken,
                    vegTaken: UI_TEXT.vegTaken,
                    nonVegTaken: UI_TEXT.nonVegTaken,
                  }
                } : {
                  total: item.dinner || 0,
                  veg: item.dinnerVeg || 0,
                  nonVeg: item.dinnerNonVeg || 0,
                  parcel: item.dinnerParcel || 0,
                  parcelTaken: item.dinnerParcelTaken || 0,
                  taken: item.dinnerTaken || 0,
                  flatVegTaken: item.dinnerFlatVegTaken || 0,
                  flatNonVegTaken: item.dinnerFlatNonVegTaken || 0,
                  guestVeg: item.dinnerGuestVeg || 0,
                  guestNonVeg: item.dinnerGuestNonVeg || 0,
                  guestVegTaken: item.dinnerGuestVegTaken || 0,
                  guestNonVegTaken: item.dinnerGuestNonVegTaken || 0,
                  icon: "moon-outline" as const,
                  labels: {
                    veg: UI_TEXT.dVeg,
                    nonVeg: UI_TEXT.dNonVeg,
                    parcel: UI_TEXT.dParcel,
                    parcelTaken: UI_TEXT.dP_Taken,
                    taken: UI_TEXT.dTaken,
                    guestVeg: UI_TEXT.guestVeg,
                    guestNonVeg: UI_TEXT.guestNonVeg,
                    guestVegTaken: UI_TEXT.guestVegTaken,
                    guestNonVegTaken: UI_TEXT.guestNonVegTaken,
                    vegTaken: UI_TEXT.vegTaken,
                    nonVegTaken: UI_TEXT.nonVegTaken,
                  }
                };

                return (
                  <DashboardMealSection
                    key={mKey}
                    day={day}
                    type={mKey}
                    icon={mealProps.icon}
                    total={mealProps.total}
                    veg={mealProps.veg}
                    nonVeg={mealProps.nonVeg}
                    parcel={mealProps.parcel}
                    parcelTaken={mealProps.parcelTaken}
                    taken={mealProps.taken}
                    flatVegTaken={mealProps.flatVegTaken}
                    flatNonVegTaken={mealProps.flatNonVegTaken}
                    guestVeg={mealProps.guestVeg}
                    guestNonVeg={mealProps.guestNonVeg}
                    guestVegTaken={mealProps.guestVegTaken}
                    guestNonVegTaken={mealProps.guestNonVegTaken}
                    menu={dayMenu[mKey]}
                    userRole={userRole || UserRole.VENDOR}
                    config={dayConfig}
                    onUpdateGuest={updateGuestCount}
                    guestEnabled={guestEnabled}
                    seasonEnabled={seasonEnabled}
                    labels={mealProps.labels}
                  />
                );
              })}
            </View>
          );
        })}
        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
