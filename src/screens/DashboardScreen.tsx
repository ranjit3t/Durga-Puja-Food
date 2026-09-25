/**
 * Operational Dashboard for tracking meal demands and collections.
 * Provides aggregated counts for kitchen planning and guest entry management.
 */
import React, { memo, useMemo, useRef } from "react";
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Pressable,
} from "react-native";
import { captureRef } from "react-native-view-shot";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { useAppTheme, StatusBarStyleMode } from "../theme";
import { UI_TEXT } from "../strings";
import {
  getDayLabel,
  isMealEnabled,
  isMealDone,
  isDietaryEnabled,
  isParcelEnabled,
  isMealCurrent,
  isMealInFuture,
  getSortedMealKeys,
  getMealLabel,
} from "../constants";
import { MealMenu, UserRole, ConfigDay, MealType, DietType, AppScreen, AppThemeMode } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { MealSummaryInline } from "../components/menu/MealSummaryInline";
import { MealMetricGrid } from "../components/dashboard/MealMetricGrid";
import { MealBarChart } from "../components/dashboard/MealBarChart";

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
  kidsTotal: number;
  kidsVeg: number;
  kidsNonVeg: number;
  kidsTaken: number;
  kidsVegTaken: number;
  kidsNonVegTaken: number;
  kidsEnabled: boolean;
  guestVeg: number;
  guestNonVeg: number;
  guestVegTaken: number;
  guestNonVegTaken: number;
  menu: MealMenu;
  userRole: UserRole;
  config: ConfigDay[];
  guestEnabled: boolean;
  seasonEnabled: boolean;
  seasonName: string;
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
    kidsTotal,
    kidsVeg,
    kidsNonVeg,
    kidsTaken,
    kidsVegTaken,
    kidsNonVegTaken,
    kidsEnabled,
    guestVeg,
    guestNonVeg,
    guestVegTaken,
    guestNonVegTaken,
    menu,
    config,
    guestEnabled,
    labels,
    seasonName,
  }: MealSectionProps) => {
    const styles = useStyles();
    const { s, v } = useScaling();
    const { theme } = useAppTheme();
    const { shareQr } = useUI();
    const mealRef = useRef<View>(null);

    const mealLabel = getMealLabel(type);
    const isCurrent = isMealCurrent(day, type, config);
    const isDone = isMealDone(day, type, config);
    const isFuture = isMealInFuture(day, type, config) && !isDone;

    const initialViewMode = isFuture ? "planned" : "grid";
    const [viewMode, setViewMode] = React.useState<"grid" | "planned" | "chart">(initialViewMode);

    React.useEffect(() => {
      setViewMode(isFuture ? "planned" : "grid");
    }, [isFuture]);

    const [maxContentHeight, setMaxContentHeight] = React.useState<number>(s(200));
    const vegItems = menu?.veg || [];
    const nonVegItems = menu?.nonVeg || [];

    const isVegEnabled = isDietaryEnabled(day, type, DietType.VEG, config);
    const isNonVegEnabled = isDietaryEnabled(day, type, DietType.NON_VEG, config);
    const isBothEnabled = isVegEnabled && isNonVegEnabled;

    const totalVegTaken = flatVegTaken + kidsVegTaken + guestVegTaken;
    const totalNonVegTaken = flatNonVegTaken + kidsNonVegTaken + guestNonVegTaken;
    const totalMealTaken = totalVegTaken + totalNonVegTaken;

    /**
     * Captures the current meal section as a PNG and shares it via WhatsApp.
     * Includes seasonal branding and localized operational summary captions.
     */
    const handleShare = async () => {
      if (mealRef.current) {
        try {
          const uri = await captureRef(mealRef, {
            format: "png",
            quality: 1,
            result: "tmpfile",
          });
          const message = `${seasonName || UI_TEXT.headerTitle}\n${getDayLabel(day, config)}${UI_TEXT.space}${UI_TEXT.hyphen}${UI_TEXT.space}${mealLabel}${UI_TEXT.space}${UI_TEXT.operationalSummary}\n${UI_TEXT.total}${UI_TEXT.colon}${UI_TEXT.space}${total}${UI_TEXT.space}${UI_TEXT.pipe}${UI_TEXT.space}${UI_TEXT.taken}${UI_TEXT.colon}${UI_TEXT.space}${totalMealTaken}`;
          await shareQr(uri, message);
        } catch (err) {
          console.error("Meal share error:", err);
        }
      }
    };

    return (
      <View
        style={[
          styles.dashboardMealSection,
          { borderWidth: 1, borderColor: theme.colors.border, padding: 0, overflow: 'hidden' },
          isCurrent && { borderColor: theme.colors.primary, borderWidth: 1.5 },
          isDone && { opacity: 0.5 }
        ]}
      >
        <View
          ref={mealRef}
          collapsable={false}
          style={{ padding: v(s(16)), backgroundColor: theme.colors.surface }}
        >
          <View style={[styles.mealDisplayHeader, { marginBottom: s(12), justifyContent: "space-between", flexWrap: 'wrap', gap: s(8) }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: s(8), flex: 1, minWidth: '60%' }}>
              <Ionicons name={icon} size={s(22)} color={isCurrent ? theme.colors.primary : theme.colors.textSecondary} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6), flexWrap: 'wrap', flex: 1 }}>
                <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: s(18), color: isCurrent ? theme.colors.primary : theme.colors.textPrimary }]}>
                  {mealLabel}
                </Text>
                {isCurrent && (
                  <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: s(6), paddingVertical: s(2), borderRadius: s(4) }}>
                      <Text style={{ color: theme.colors.white, fontSize: s(10), fontWeight: "900" }}>{UI_TEXT.live.toUpperCase()}</Text>
                  </View>
                )}
                {!isBothEnabled && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(4), backgroundColor: isVegEnabled ? theme.colors.successLight : theme.colors.errorLight, paddingHorizontal: s(6), paddingVertical: s(2), borderRadius: s(4), borderWidth: 0.5, borderColor: isVegEnabled ? theme.colors.veg : theme.colors.nonVeg }}>
                      <Ionicons name={isVegEnabled ? "leaf" : "flame"} size={s(10)} color={isVegEnabled ? theme.colors.veg : theme.colors.nonVeg} />
                      <Text style={{ color: isVegEnabled ? theme.colors.veg : theme.colors.nonVeg, fontSize: s(10), fontWeight: "800" }}>
                        {(isVegEnabled ? UI_TEXT.vegOnly : UI_TEXT.nonVegOnly).toUpperCase()}
                      </Text>
                    </View>
                )}
              </View>
            </View>
            <View style={[styles.pill, { backgroundColor: isCurrent ? theme.colors.surfaceDark : theme.colors.surface, alignSelf: 'center' }]}>
              <Text style={[styles.pillText, { color: isCurrent ? theme.colors.primary : theme.colors.textSecondary, fontSize: s(12) }]}>{total} {UI_TEXT.plates}</Text>
            </View>
          </View>

          {/* Menu Quick-View */}
          {(vegItems.length > 0 || nonVegItems.length > 0) ? (
            <View style={{ gap: s(8), marginBottom: s(16) }}>
              {isVegEnabled && vegItems.length > 0 ? (
                <View style={[styles.menuBox, { borderLeftWidth: s(4), borderLeftColor: theme.colors.veg, paddingVertical: s(8) }]}>
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
                    style={[styles.menuBox, { borderLeftWidth: s(4), borderLeftColor: theme.colors.nonVeg, paddingVertical: s(8) }]}
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

          {/* Aggregated Demand Metrics / Chart */}
          <View
            style={{
              minHeight: maxContentHeight,
              justifyContent: 'flex-end',
              paddingBottom: viewMode === "chart" ? s(10) : 0,
            }}
            onLayout={(e) => {
              const h = Math.round(e.nativeEvent.layout.height);
              if (h > 0 && h > maxContentHeight) {
                setMaxContentHeight(h);
              }
            }}
          >
            {viewMode === "chart" ? (
              <MealBarChart
                day={day} type={type} total={total} veg={veg} nonVeg={nonVeg}
                kidsTotal={kidsTotal} kidsVeg={kidsVeg} kidsNonVeg={kidsNonVeg}
                kidsTaken={kidsTaken} kidsVegTaken={kidsVegTaken} kidsNonVegTaken={kidsNonVegTaken}
                parcel={parcel} parcelTaken={parcelTaken} totalVegTaken={totalVegTaken}
                totalNonVegTaken={totalNonVegTaken} guestVeg={guestVeg} guestNonVeg={guestNonVeg}
                guestVegTaken={guestVegTaken} guestNonVegTaken={guestNonVegTaken}
                totalMealTaken={totalMealTaken} kidsEnabled={kidsEnabled} guestEnabled={guestEnabled}
                isParcelEnabled={isParcelEnabled(day, type, config)}
                isBothEnabled={isBothEnabled} labels={labels as any}
              />
            ) : (
              <MealMetricGrid
                day={day} type={type} total={total} veg={veg} nonVeg={nonVeg}
                kidsTotal={kidsTotal} kidsVeg={kidsVeg} kidsNonVeg={kidsNonVeg}
                kidsTaken={kidsTaken} kidsVegTaken={kidsVegTaken} kidsNonVegTaken={kidsNonVegTaken}
                parcel={parcel} parcelTaken={parcelTaken} totalVegTaken={totalVegTaken}
                totalNonVegTaken={totalNonVegTaken} guestVeg={guestVeg} guestNonVeg={guestNonVeg}
                guestVegTaken={guestVegTaken} guestNonVegTaken={guestNonVegTaken}
                totalMealTaken={totalMealTaken} kidsEnabled={kidsEnabled} guestEnabled={guestEnabled}
                isParcelEnabled={isParcelEnabled(day, type, config)}
                isBothEnabled={isBothEnabled} labels={labels as any}
                showPlannedOnly={viewMode === "planned"}
              />
            )}
          </View>
        </View>

        {/* Action Bar - Positioned at bottom of card, below the captured area */}
        <View style={{
          borderTopWidth: 1,
          borderTopColor: theme.colors.border,
          paddingHorizontal: s(12),
          paddingVertical: s(8),
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          backgroundColor: theme.colors.surfaceDark
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8) }}>
            {/* 1. PLANNED BUTTON */}
            <Pressable
              onPress={() => setViewMode("planned")}
              accessibilityLabel={UI_TEXT.plannedOnly}
              style={({ pressed }) => [
                {
                  width: s(36),
                  height: s(36),
                  borderRadius: s(18),
                  backgroundColor: viewMode === "planned" ? theme.colors.primary : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: viewMode === "planned" ? theme.colors.primary : theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons name="clipboard-outline" size={s(18)} color={viewMode === "planned" ? theme.colors.white : theme.colors.textSecondary} />
            </Pressable>

            {/* 2. COMPLETE BUTTON (Hidden for future meals) */}
            {!isFuture && (
              <Pressable
                onPress={() => setViewMode("grid")}
                accessibilityLabel={UI_TEXT.fullGrid}
                style={({ pressed }) => [
                  {
                    width: s(36),
                    height: s(36),
                    borderRadius: s(18),
                    backgroundColor: viewMode === "grid" ? theme.colors.primary : theme.colors.surface,
                    borderWidth: 1,
                    borderColor: viewMode === "grid" ? theme.colors.primary : theme.colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                  },
                  pressed && { opacity: 0.7 }
                ]}
              >
                <Ionicons name="grid-outline" size={s(18)} color={viewMode === "grid" ? theme.colors.white : theme.colors.textSecondary} />
              </Pressable>
            )}

            {/* 3. CHART BUTTON */}
            <Pressable
              onPress={() => setViewMode("chart")}
              accessibilityLabel={UI_TEXT.chartView}
              style={({ pressed }) => [
                {
                  width: s(36),
                  height: s(36),
                  borderRadius: s(18),
                  backgroundColor: viewMode === "chart" ? theme.colors.primary : theme.colors.surface,
                  borderWidth: 1,
                  borderColor: viewMode === "chart" ? theme.colors.primary : theme.colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons name="bar-chart-outline" size={s(18)} color={viewMode === "chart" ? theme.colors.white : theme.colors.textSecondary} />
            </Pressable>
          </View>

          {/* 4. SHARE BUTTON */}
          <Pressable
            onPress={handleShare}
            accessibilityLabel="Share on WhatsApp"
            style={({ pressed }) => [
              {
                width: s(36),
                height: s(36),
                borderRadius: s(18),
                backgroundColor: theme.colors.whatsapp + "20",
                borderWidth: 1,
                borderColor: theme.colors.whatsapp + "40",
                alignItems: 'center',
                justifyContent: 'center',
              },
              pressed && { opacity: 0.7 }
            ]}
          >
            <Ionicons name="logo-whatsapp" size={s(18)} color={theme.colors.whatsapp} />
          </Pressable>
        </View>
      </View>
    );
  }
);

export function DashboardScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    foodMenu, dayConfig, seasonName, paymentConfig, guestEnabled, seasonEnabled,
    dashboardData, collections, updateGuestCount, kidsEnabled
  } = useDatabase();

  const { navigate, goBack } = useAppNavigation();
  const { showAlert } = useUI();

  const styles = useStyles();
  const { s } = useScaling();
  const { theme, themeType } = useAppTheme();
  const scrollRef = useRef<ScrollView>(null);
  const sectionRefs = useRef<Record<string, number>>({});

  const focusSection = (key: string) => {
    const y = sectionRefs.current[key];
    if (y !== undefined && scrollRef.current) {
      scrollRef.current.scrollTo({ y: y - s(20), animated: true });
    }
  };

  const sortedActiveDays = useMemo(() => {
    const active = dayConfig.filter((d) => d.enabled).map((d) => d.id);
    return [...active].sort((a, b) => {
      const aHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(a, m, dayConfig));
      const bHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(b, m, dayConfig));

      if (aHasCurrent && !bHasCurrent) return -1;
      if (!aHasCurrent && bHasCurrent) return 1;

      // Maintain original order for other days
      const aIdx = dayConfig.findIndex(d => d.id === a);
      const bIdx = dayConfig.findIndex(d => d.id === b);
      return aIdx - bIdx;
    });
  }, [dayConfig]);

  const summaryTotals = useMemo(() => {
    return dashboardData.reduce((acc, day) => {
      // Member totals (Adults + Kids)
      const mealTotal = (day.breakfast || 0) + (day.lunch || 0) + (day.dinner || 0);
      const mealTaken = (day.breakfastTaken || 0) + (day.lunchTaken || 0) + (day.dinnerTaken || 0);

      acc.total += mealTotal;
      acc.taken += mealTaken;

      acc.veg += (day.breakfastVeg || 0) + (day.lunchVeg || 0) + (day.dinnerVeg || 0);
      acc.nonVeg += (day.breakfastNonVeg || 0) + (day.lunchNonVeg || 0) + (day.dinnerNonVeg || 0);

      acc.adultTaken += (day.breakfastFlatVegTaken || 0) + (day.breakfastFlatNonVegTaken || 0) +
                        (day.lunchFlatVegTaken || 0) + (day.lunchFlatNonVegTaken || 0) +
                        (day.dinnerFlatVegTaken || 0) + (day.dinnerFlatNonVegTaken || 0);

      acc.kidsVeg += (day.breakfastKidsVeg || 0) + (day.lunchKidsVeg || 0) + (day.dinnerKidsVeg || 0);
      acc.kidsNonVeg += (day.breakfastKidsNonVeg || 0) + (day.lunchKidsNonVeg || 0) + (day.dinnerKidsNonVeg || 0);
      acc.kidsTotal += (day.breakfastKidsTotal || 0) + (day.lunchKidsTotal || 0) + (day.dinnerKidsTotal || 0);
      acc.kidsTaken += (day.breakfastKidsTaken || 0) + (day.lunchKidsTaken || 0) + (day.dinnerKidsTaken || 0);

      if (guestEnabled) {
        const gVeg = (day.breakfastGuestVeg || 0) + (day.lunchGuestVeg || 0) + (day.dinnerGuestVeg || 0);
        const gNonVeg = (day.breakfastGuestNonVeg || 0) + (day.lunchGuestNonVeg || 0) + (day.dinnerGuestNonVeg || 0);
        const mealGuests = gVeg + gNonVeg;
        const mealGuestsTaken = (day.breakfastGuestVegTaken || 0) + (day.breakfastGuestNonVegTaken || 0) +
                                (day.lunchGuestVegTaken || 0) + (day.lunchGuestNonVegTaken || 0) +
                                (day.dinnerGuestVegTaken || 0) + (day.dinnerGuestNonVegTaken || 0);

        acc.guestTotal += mealGuests;
        acc.guestVeg += gVeg;
        acc.guestNonVeg += gNonVeg;
        acc.guestTaken += mealGuestsTaken;

        // Add guests to grand totals for Plates and Taken counts
        acc.total += mealGuests;
        acc.taken += mealGuestsTaken;
      }

      return acc;
    }, { total: 0, veg: 0, nonVeg: 0, adultTaken: 0, kidsVeg: 0, kidsNonVeg: 0, kidsTotal: 0, kidsTaken: 0, taken: 0, guestTotal: 0, guestVeg: 0, guestNonVeg: 0, guestTaken: 0 });
  }, [dashboardData, guestEnabled]);

  const currentMealSummary = useMemo(() => {
    const active = dayConfig.filter((d) => d.enabled);
    for (const d of active) {
      for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
        if (isMealCurrent(d.id, mType, dayConfig) && isMealEnabled(d.id, mType, dayConfig)) {
          const item = dashboardData.find(dashDay => dashDay.dayId === d.id);
          if (!item) return null;

          const mLabel = getMealLabel(mType);

          let total = 0, veg = 0, nonVeg = 0, taken = 0, kidsVeg = 0, kidsNonVeg = 0, kidsTotal = 0, kidsTaken = 0;
          let guestTotal = 0, guestTaken = 0, guestVeg = 0, guestNonVeg = 0, adultsTaken = 0;

          if (mType === MealType.BREAKFAST) {
            total = item.breakfast || 0;
            veg = item.breakfastVeg || 0;
            nonVeg = item.breakfastNonVeg || 0;
            kidsVeg = item.breakfastKidsVeg || 0;
            kidsNonVeg = item.breakfastKidsNonVeg || 0;
            kidsTotal = item.breakfastKidsTotal || 0;
            kidsTaken = item.breakfastKidsTaken || 0;
            taken = item.breakfastTaken || 0;
            guestVeg = item.breakfastGuestVeg || 0;
            guestNonVeg = item.breakfastGuestNonVeg || 0;
            guestTotal = guestVeg + guestNonVeg;
            guestTaken = (item.breakfastGuestVegTaken || 0) + (item.breakfastGuestNonVegTaken || 0);
            adultsTaken = (item.breakfastFlatVegTaken || 0) + (item.breakfastFlatNonVegTaken || 0);
          } else if (mType === MealType.LUNCH) {
            total = item.lunch || 0;
            veg = item.lunchVeg || 0;
            nonVeg = item.lunchNonVeg || 0;
            kidsVeg = item.lunchKidsVeg || 0;
            kidsNonVeg = item.lunchKidsNonVeg || 0;
            kidsTotal = item.lunchKidsTotal || 0;
            kidsTaken = item.lunchKidsTaken || 0;
            taken = item.lunchTaken || 0;
            guestVeg = item.lunchGuestVeg || 0;
            guestNonVeg = item.lunchGuestNonVeg || 0;
            guestTotal = guestVeg + guestNonVeg;
            guestTaken = (item.lunchGuestVegTaken || 0) + (item.lunchGuestNonVegTaken || 0);
            adultsTaken = (item.lunchFlatVegTaken || 0) + (item.lunchFlatNonVegTaken || 0);
          } else {
            total = item.dinner || 0;
            veg = item.dinnerVeg || 0;
            nonVeg = item.dinnerNonVeg || 0;
            kidsVeg = item.dinnerKidsVeg || 0;
            kidsNonVeg = item.dinnerKidsNonVeg || 0;
            kidsTotal = item.dinnerKidsTotal || 0;
            kidsTaken = item.dinnerKidsTaken || 0;
            taken = item.dinnerTaken || 0;
            guestVeg = item.dinnerGuestVeg || 0;
            guestNonVeg = item.dinnerGuestNonVeg || 0;
            guestTotal = guestVeg + guestNonVeg;
            guestTaken = (item.dinnerGuestVegTaken || 0) + (item.dinnerGuestNonVegTaken || 0);
            adultsTaken = (item.dinnerFlatVegTaken || 0) + (item.dinnerFlatNonVegTaken || 0);
          }

          const mConf = d[mType];
          const isVeg = d.vegOnly || mConf.veg;
          const isNonVeg = !d.vegOnly && mConf.nonVeg;

          return {
            dayLabel: getDayLabel(d.id, dayConfig),
            mealLabel: mLabel,
            total: total + guestTotal, // Grand total plates for current meal
            veg,
            nonVeg,
            adultsTaken,
            kidsVeg,
            kidsNonVeg,
            kidsTotal,
            kidsTaken,
            taken: taken + guestTaken, // Grand total taken for current meal
            guestVeg,
            guestNonVeg,
            guestTotal,
            guestTaken,
            isVegEnabled: isVeg,
            isNonVegEnabled: isNonVeg
          };
        }
      }
    }
    return null;
  }, [dayConfig, dashboardData]);

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
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : s(20)}
    >
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: s(16) }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(8) }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <Text style={styles.title}>{UI_TEXT.dashboardTitle}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.dashboardSubtitle}</Text>
      </View>
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Event Summary Card */}
        <Pressable
          onPress={() => navigate(AppScreen.REPORT)}
          style={({ pressed }) => [
            styles.card,
            {
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.primary,
              padding: s(12),
              marginBottom: s(16),
              ...Platform.select({
                ios: {
                  shadowColor: theme.colors.primary,
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: 0.25,
                  shadowRadius: 5,
                },
                android: {
                  elevation: 5,
                },
                web: {
                  boxShadow: `0 3px 10px ${theme.colors.primary}33`,
                }
              })
            },
            pressed && { opacity: 0.8 }
          ]}
        >
          <View style={[styles.previewTop, { flexWrap: 'wrap', gap: s(6) }]}>
            <View style={{ flex: 1, paddingRight: s(8), minWidth: '60%' }}>
              <Text style={[styles.previewLabel, { color: theme.colors.white, opacity: 0.7, fontSize: s(11) }]}>{UI_TEXT.dailyDemandSummary}</Text>
              {!!seasonName && (
                <Text style={[styles.previewTitle, { color: theme.colors.white, fontSize: s(18) }]} numberOfLines={1}>
                  {seasonName}
                </Text>
              )}
            </View>
            <View style={{ alignItems: 'flex-end', justifyContent: 'center' }}>
               <Text style={[styles.previewAmount, { color: theme.colors.white, fontSize: s(24) }]}>
                 {summaryTotals.total}
               </Text>
               <Text style={{ color: theme.colors.white, opacity: 0.8, fontSize: s(10), fontWeight: "700" }}>{UI_TEXT.plates.toUpperCase()}</Text>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2, marginVertical: s(8) }} />

          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: s(6) }}>
              <View style={{ flexShrink: 1 }}>
                <View style={{ gap: s(2) }}>
                   <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6) }}>
                      <Text style={{ fontSize: s(12), fontWeight: '800', color: theme.colors.white }}>{kidsEnabled ? UI_TEXT.adults : UI_TEXT.members}:</Text>
                      <Text style={{ fontSize: s(13), fontWeight: '900', color: theme.colors.white }}>
                        {summaryTotals.veg + summaryTotals.nonVeg}
                      </Text>
                      <Text style={{ fontSize: s(10), fontWeight: '700', color: theme.colors.white, opacity: 0.85 }}>
                        ({summaryTotals.veg}{UI_TEXT.vegAbbrLabel}{UI_TEXT.pipe}{summaryTotals.nonVeg}{UI_TEXT.nonVegAbbrLabel}) ({UI_TEXT.taken}{UI_TEXT.colon}{UI_TEXT.space}{summaryTotals.adultTaken})
                      </Text>
                   </View>

                  {kidsEnabled && summaryTotals.kidsTotal > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6) }}>
                      <Text style={{ fontSize: s(11), fontWeight: '800', color: theme.colors.white, opacity: 0.9 }}>{UI_TEXT.kids}:</Text>
                      <Text style={{ fontSize: s(11), fontWeight: '900', color: theme.colors.white, opacity: 0.9 }}>
                        {summaryTotals.kidsTotal}
                      </Text>
                      <Text style={{ fontSize: s(10), fontWeight: '700', color: theme.colors.white, opacity: 0.8 }}>
                        ({summaryTotals.kidsVeg}{UI_TEXT.vegAbbrLabel}{UI_TEXT.pipe}{summaryTotals.kidsNonVeg}{UI_TEXT.nonVegAbbrLabel}) ({UI_TEXT.taken}{UI_TEXT.colon}{UI_TEXT.space}{summaryTotals.kidsTaken})
                      </Text>
                    </View>
                  )}

                  {guestEnabled && summaryTotals.guestTotal > 0 && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6) }}>
                      <Text style={{ fontSize: s(11), fontWeight: '800', color: theme.colors.white, opacity: 0.9 }}>{UI_TEXT.guest}:</Text>
                      <Text style={{ fontSize: s(11), fontWeight: '900', color: theme.colors.white, opacity: 0.9 }}>
                        {summaryTotals.guestTotal}
                      </Text>
                      <Text style={{ fontSize: s(10), fontWeight: '700', color: theme.colors.white, opacity: 0.8 }}>
                        ({summaryTotals.guestVeg}{UI_TEXT.vegAbbrLabel}{UI_TEXT.pipe}{summaryTotals.guestNonVeg}{UI_TEXT.nonVegAbbrLabel}) ({UI_TEXT.taken}{UI_TEXT.colon}{UI_TEXT.space}{summaryTotals.guestTaken})
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(4) }}>
               <Ionicons name="checkmark-done-circle" size={s(15)} color={theme.colors.white} />
               <Text style={{ color: theme.colors.white, fontWeight: "800", fontSize: s(13) }}>
                 {summaryTotals.taken} {UI_TEXT.taken.toUpperCase()}
               </Text>
            </View>
          </View>

          {currentMealSummary && (
            <>
              <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2, marginVertical: s(8) }} />
              <View style={{ gap: s(6) }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6), flexWrap: 'wrap' }}>
                    <Text style={{ color: theme.colors.white, fontSize: s(10), fontWeight: '800', opacity: 0.85, textTransform: 'uppercase' }}>
                       {currentMealSummary.dayLabel}{UI_TEXT.space}{UI_TEXT.hyphen}{UI_TEXT.space}{currentMealSummary.mealLabel}
                    </Text>
                    {(!currentMealSummary.isVegEnabled || !currentMealSummary.isNonVegEnabled) && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(4), backgroundColor: theme.colors.white + "33", paddingHorizontal: s(6), paddingVertical: s(1), borderRadius: s(4) }}>
                        <Ionicons name={currentMealSummary.isVegEnabled ? "leaf" : "flame"} size={s(8)} color={theme.colors.white} />
                        <Text style={{ color: theme.colors.white, fontSize: s(8), fontWeight: "900" }}>
                          {(currentMealSummary.isVegEnabled ? UI_TEXT.vegOnly : UI_TEXT.nonVegOnly).toUpperCase()}
                        </Text>
                      </View>
                    )}
                 </View>

                 <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: s(6) }}>
                      <Text style={{ color: theme.colors.white, fontSize: s(16), fontWeight: '900' }}>
                         {currentMealSummary.total}
                      </Text>
                      <Text style={{ color: theme.colors.white, fontSize: s(10), fontWeight: '700', opacity: 0.8 }}>
                         {UI_TEXT.plates.toUpperCase()}
                      </Text>
                    </View>

                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(4) }}>
                       <Ionicons name="checkmark-done-circle" size={s(15)} color={theme.colors.white} />
                       <Text style={{ color: theme.colors.white, fontSize: s(15), fontWeight: '900' }}>
                          {currentMealSummary.taken}
                       </Text>
                       <Text style={{ color: theme.colors.white, fontSize: s(10), fontWeight: '700', opacity: 0.8 }}>
                          {UI_TEXT.taken.toUpperCase()}
                       </Text>
                    </View>
                 </View>

                 <View style={{ gap: s(6) }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6) }}>
                       <Text style={{ fontSize: s(13), fontWeight: '800', color: theme.colors.white }}>{kidsEnabled ? UI_TEXT.adults : UI_TEXT.members}:</Text>
                       <Text style={{ fontSize: s(14), fontWeight: '900', color: theme.colors.white }}>
                          {currentMealSummary.veg + currentMealSummary.nonVeg}
                       </Text>
                       <Text style={{ fontSize: s(11), fontWeight: '700', color: theme.colors.white, opacity: 0.8 }}>
                          {currentMealSummary.isVegEnabled && currentMealSummary.isNonVegEnabled && (
                            `(${currentMealSummary.veg}${UI_TEXT.vegAbbrLabel}${UI_TEXT.pipe}${currentMealSummary.nonVeg}${UI_TEXT.nonVegAbbrLabel})${UI_TEXT.space}`
                          )}
                          ({UI_TEXT.taken}{UI_TEXT.colon}{UI_TEXT.space}{currentMealSummary.adultsTaken})
                       </Text>
                    </View>

                    {kidsEnabled && currentMealSummary.kidsTotal > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6) }}>
                         <Text style={{ fontSize: s(12), fontWeight: '800', color: theme.colors.white, opacity: 0.9 }}>{UI_TEXT.kids}:</Text>
                         <Text style={{ fontSize: s(12), fontWeight: '900', color: theme.colors.white, opacity: 0.9 }}>
                            {currentMealSummary.kidsTotal}
                         </Text>
                         <Text style={{ fontSize: s(10), fontWeight: '700', color: theme.colors.white, opacity: 0.7 }}>
                            {currentMealSummary.isVegEnabled && currentMealSummary.isNonVegEnabled && (
                               `(${currentMealSummary.kidsVeg}${UI_TEXT.vegAbbrLabel}${UI_TEXT.pipe}${currentMealSummary.kidsNonVeg}${UI_TEXT.nonVegAbbrLabel})${UI_TEXT.space}`
                            )}
                            ({UI_TEXT.taken}{UI_TEXT.colon}{UI_TEXT.space}{currentMealSummary.kidsTaken})
                         </Text>
                      </View>
                    )}

                    {guestEnabled && currentMealSummary.guestTotal > 0 && (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: s(6) }}>
                         <Text style={{ fontSize: s(12), fontWeight: '800', color: theme.colors.white, opacity: 0.9 }}>{UI_TEXT.guest}:</Text>
                         <Text style={{ fontSize: s(12), fontWeight: '900', color: theme.colors.white, opacity: 0.9 }}>
                            {currentMealSummary.guestTotal}
                         </Text>
                         <Text style={{ fontSize: s(10), fontWeight: '700', color: theme.colors.white, opacity: 0.7 }}>
                            {currentMealSummary.isVegEnabled && currentMealSummary.isNonVegEnabled && (
                               `(${currentMealSummary.guestVeg}${UI_TEXT.vegAbbrLabel}${UI_TEXT.pipe}${currentMealSummary.guestNonVeg}${UI_TEXT.nonVegAbbrLabel})${UI_TEXT.space}`
                            )}
                            ({UI_TEXT.taken}{UI_TEXT.colon}{UI_TEXT.space}{currentMealSummary.guestTaken})
                         </Text>
                      </View>
                    )}
                 </View>
              </View>
            </>
          )}
        </Pressable>

        <Text style={[styles.sectionTitle, { marginBottom: s(16), fontSize: s(22) }]}>{UI_TEXT.dailyMealDemand}</Text>

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
            <View
              key={day}
              style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5, padding: s(20), marginBottom: s(20) }]}
              onLayout={(e) => {
                sectionRefs.current[day] = e.nativeEvent.layout.y;
              }}
            >
              <View style={[styles.dashboardCardTop, { marginBottom: s(16) }]}>
                <Text style={[styles.dashboardDay, { color: colorScheme.accent, fontSize: s(18) }]}>{getDayLabel(day, dayConfig)}</Text>
              </View>

              {sortedMeals.map((mKey) => {
                if (!isMealEnabled(day, mKey, dayConfig)) return null;

                const mealKey = `${day}-${mKey}`;
                const gTotal = (item[`${mKey}GuestVeg` as keyof typeof item] || 0) + (item[`${mKey}GuestNonVeg` as keyof typeof item] || 0);
                const mealProps = mKey === MealType.BREAKFAST ? {
                  total: (item.breakfast || 0) + gTotal,
                  veg: item.breakfastVeg || 0,
                  nonVeg: item.breakfastNonVeg || 0,
                  kidsTotal: item.breakfastKidsTotal || 0,
                  kidsVeg: item.breakfastKidsVeg || 0,
                  kidsNonVeg: item.breakfastKidsNonVeg || 0,
                  kidsTaken: item.breakfastKidsTaken || 0,
                  kidsVegTaken: item.breakfastKidsVegTaken || 0,
                  kidsNonVegTaken: item.breakfastKidsNonVegTaken || 0,
                  parcel: item.breakfastParcel || 0,
                  parcelTaken: item.breakfastParcelTaken || 0,
                  taken: (item.breakfastTaken || 0) + (item.breakfastGuestTaken || 0),
                  flatVegTaken: item.breakfastFlatVegTaken || 0,
                  flatNonVegTaken: item.breakfastFlatNonVegTaken || 0,
                  guestVeg: item.breakfastGuestVeg || 0,
                  guestNonVeg: item.breakfastGuestNonVeg || 0,
                  guestVegTaken: item.breakfastGuestVegTaken || 0,
                  guestNonVegTaken: item.breakfastGuestNonVegTaken || 0,
                  icon: "sunny-outline" as const,
                  labels: {
                    veg: kidsEnabled ? UI_TEXT.adultVeg : UI_TEXT.bVeg,
                    nonVeg: kidsEnabled ? UI_TEXT.adultNonVeg : UI_TEXT.bNonVeg,
                    kidsVeg: UI_TEXT.kidsVeg,
                    kidsNonVeg: UI_TEXT.kidsNonVeg,
                    kidsTotal: UI_TEXT.kidsTotal,
                    kidsTaken: UI_TEXT.kidsTaken,
                    kidsVegTaken: UI_TEXT.kidsVegTaken,
                    kidsNonVegTaken: UI_TEXT.kidsNonVegTaken,
                    parcel: UI_TEXT.bParcel,
                    parcelTaken: UI_TEXT.bP_Taken,
                    taken: UI_TEXT.bTaken,
                    guestVeg: UI_TEXT.guestVeg,
                    guestNonVeg: UI_TEXT.guestNonVeg,
                    guestVegTaken: UI_TEXT.guestVegTaken,
                    guestNonVegTaken: UI_TEXT.guestNonVegTaken,
                    vegTaken: kidsEnabled ? UI_TEXT.adultVegTaken : UI_TEXT.vegTaken,
                    nonVegTaken: kidsEnabled ? UI_TEXT.adultNonVegTaken : UI_TEXT.nonVegTaken,
                  }
                } : mKey === MealType.LUNCH ? {
                  total: (item.lunch || 0) + gTotal,
                  veg: item.lunchVeg || 0,
                  nonVeg: item.lunchNonVeg || 0,
                  kidsTotal: item.lunchKidsTotal || 0,
                  kidsVeg: item.lunchKidsVeg || 0,
                  kidsNonVeg: item.lunchKidsNonVeg || 0,
                  kidsTaken: item.lunchKidsTaken || 0,
                  kidsVegTaken: item.lunchKidsVegTaken || 0,
                  kidsNonVegTaken: item.lunchKidsNonVegTaken || 0,
                  parcel: item.lunchParcel || 0,
                  parcelTaken: item.lunchParcelTaken || 0,
                  taken: (item.lunchTaken || 0) + (item.lunchGuestTaken || 0),
                  flatVegTaken: item.lunchFlatVegTaken || 0,
                  flatNonVegTaken: item.lunchFlatNonVegTaken || 0,
                  guestVeg: item.lunchGuestVeg || 0,
                  guestNonVeg: item.lunchGuestNonVeg || 0,
                  guestVegTaken: item.lunchGuestVegTaken || 0,
                  guestNonVegTaken: item.lunchGuestNonVegTaken || 0,
                  icon: "restaurant-outline" as const,
                  labels: {
                    veg: kidsEnabled ? UI_TEXT.adultVeg : UI_TEXT.lVeg,
                    nonVeg: kidsEnabled ? UI_TEXT.adultNonVeg : UI_TEXT.lNonVeg,
                    kidsVeg: UI_TEXT.kidsVeg,
                    kidsNonVeg: UI_TEXT.kidsNonVeg,
                    kidsTotal: UI_TEXT.kidsTotal,
                    kidsTaken: UI_TEXT.kidsTaken,
                    kidsVegTaken: UI_TEXT.kidsVegTaken,
                    kidsNonVegTaken: UI_TEXT.kidsNonVegTaken,
                    parcel: UI_TEXT.lParcel,
                    parcelTaken: UI_TEXT.lP_Taken,
                    taken: UI_TEXT.lTaken,
                    guestVeg: UI_TEXT.guestVeg,
                    guestNonVeg: UI_TEXT.guestNonVeg,
                    guestVegTaken: UI_TEXT.guestVegTaken,
                    guestNonVegTaken: UI_TEXT.guestNonVegTaken,
                    vegTaken: kidsEnabled ? UI_TEXT.adultVegTaken : UI_TEXT.vegTaken,
                    nonVegTaken: kidsEnabled ? UI_TEXT.adultNonVegTaken : UI_TEXT.nonVegTaken,
                  }
                } : {
                  total: (item.dinner || 0) + gTotal,
                  veg: item.dinnerVeg || 0,
                  nonVeg: item.dinnerNonVeg || 0,
                  kidsTotal: item.dinnerKidsTotal || 0,
                  kidsVeg: item.dinnerKidsVeg || 0,
                  kidsNonVeg: item.dinnerKidsNonVeg || 0,
                  kidsTaken: item.dinnerKidsTaken || 0,
                  kidsVegTaken: item.dinnerKidsVegTaken || 0,
                  kidsNonVegTaken: item.dinnerKidsNonVegTaken || 0,
                  parcel: item.dinnerParcel || 0,
                  parcelTaken: item.dinnerParcelTaken || 0,
                  taken: (item.dinnerTaken || 0) + (item.dinnerGuestTaken || 0),
                  flatVegTaken: item.dinnerFlatVegTaken || 0,
                  flatNonVegTaken: item.dinnerFlatNonVegTaken || 0,
                  guestVeg: item.dinnerGuestVeg || 0,
                  guestNonVeg: item.dinnerGuestNonVeg || 0,
                  guestVegTaken: item.dinnerGuestVegTaken || 0,
                  guestNonVegTaken: item.dinnerGuestNonVegTaken || 0,
                  icon: "moon-outline" as const,
                  labels: {
                    veg: kidsEnabled ? UI_TEXT.adultVeg : UI_TEXT.dVeg,
                    nonVeg: kidsEnabled ? UI_TEXT.adultNonVeg : UI_TEXT.dNonVeg,
                    kidsVeg: UI_TEXT.kidsVeg,
                    kidsNonVeg: UI_TEXT.kidsNonVeg,
                    kidsTotal: UI_TEXT.kidsTotal,
                    kidsTaken: UI_TEXT.kidsTaken,
                    kidsVegTaken: UI_TEXT.kidsVegTaken,
                    kidsNonVegTaken: UI_TEXT.kidsNonVegTaken,
                    parcel: UI_TEXT.dParcel,
                    parcelTaken: UI_TEXT.dP_Taken,
                    taken: UI_TEXT.dTaken,
                    guestVeg: UI_TEXT.guestVeg,
                    guestNonVeg: UI_TEXT.guestNonVeg,
                    guestVegTaken: UI_TEXT.guestVegTaken,
                    guestNonVegTaken: UI_TEXT.guestNonVegTaken,
                    vegTaken: kidsEnabled ? UI_TEXT.adultVegTaken : UI_TEXT.vegTaken,
                    nonVegTaken: kidsEnabled ? UI_TEXT.adultNonVegTaken : UI_TEXT.nonVegTaken,
                  }
                };

                return (
                  <View
                    key={mKey}
                    onLayout={(e) => {
                      const dayY = sectionRefs.current[day] || 0;
                      sectionRefs.current[`${day}-${mKey}`] = dayY + e.nativeEvent.layout.y + s(40);
                    }}
                  >
                    <DashboardMealSection
                      day={day}
                      type={mKey}
                      icon={mealProps.icon}
                      total={mealProps.total}
                      veg={mealProps.veg}
                      nonVeg={mealProps.nonVeg}
                      kidsTotal={mealProps.kidsTotal}
                      kidsVeg={mealProps.kidsVeg}
                      kidsNonVeg={mealProps.kidsNonVeg}
                      kidsTaken={mealProps.kidsTaken}
                      kidsVegTaken={mealProps.kidsVegTaken}
                      kidsNonVegTaken={mealProps.kidsNonVegTaken}
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
                      kidsEnabled={!!kidsEnabled}
                      guestEnabled={guestEnabled}
                      seasonEnabled={seasonEnabled}
                      labels={mealProps.labels as any}
                      seasonName={seasonName}
                    />
                  </View>
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
