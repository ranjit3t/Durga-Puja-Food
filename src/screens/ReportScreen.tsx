/**
 * Report Screen for Admin.
 * Provides various data views like Day wise, Meal wise and Flat wise summaries.
 */
import React, { useState, useMemo, useRef } from "react";
import { View, Text, ScrollView, StatusBar, Pressable, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import {
  getActiveDays,
  getDayLabel,
  getDayAbbr,
  isMealEnabled,
  isDietaryEnabled,
  isDietaryEnabledForDay,
  isParcelEnabled,
} from "../constants";
import { Subscription, FoodMenu, Day, ConfigDay, ReportType, PaymentConfig } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";


export function ReportScreen({
  subscriptions,
  menu,
  config,
  seasonName,
  paymentConfig,
  guestEnabled,
  reportType,
  selectedDayId,
  selectedMealType,
  onBack,
  onHome,
  onShare,
  onLogout,
  onSelectFlat,
  onSetReportType,
  onSetSelectedDayId,
  onSetSelectedMealType,
  seasonEnabled,
}: {
  subscriptions: Subscription[];
  menu: FoodMenu;
  config: ConfigDay[];
  seasonName: string;
  paymentConfig: PaymentConfig;
  guestEnabled: boolean;
  reportType: ReportType;
  selectedDayId: Day;
  selectedMealType: "breakfast" | "lunch" | "dinner";
  onBack: () => void;
  onHome: () => void;
  onShare: (uri: string, message?: string) => void;
  onLogout: () => void;
  onSelectFlat: (id: string) => void;
  onSetReportType: (type: ReportType) => void;
  onSetSelectedDayId: (dayId: Day) => void;
  onSetSelectedMealType: (meal: "breakfast" | "lunch" | "dinner") => void;
  seasonEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const activeDays = getActiveDays(config);

  // Ensure selected day is valid if config changes
  React.useEffect(() => {
    if (activeDays.length > 0 && (!selectedDayId || !activeDays.includes(selectedDayId))) {
      onSetSelectedDayId(activeDays[0]);
    }
  }, [config]);

  // Ensure selected meal is valid for the selected day
  React.useEffect(() => {
    if (selectedDayId && !isMealEnabled(selectedDayId, selectedMealType, config)) {
      const firstAvailable = (["breakfast", "lunch", "dinner"] as const).find(
        (m) => isMealEnabled(selectedDayId, m, config)
      );
      if (firstAvailable) {
        onSetSelectedMealType(firstAvailable);
      }
    }
  }, [selectedDayId, config]);

  const reportRef = useRef<View>(null);

  const handleShare = async () => {
    if (reportRef.current) {
      try {
        const uri = await captureRef(reportRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });

        const reportTitle =
          reportType === "day" ? UI_TEXT.dayWiseReport :
          reportType === "meal" ? UI_TEXT.mealWiseReport :
          reportType === "single" ? `${getDayLabel(selectedDayId, config)} - ${selectedMealType}` :
          reportType === "notTaken" ? UI_TEXT.notTakenReport :
          reportType === "flat" ? UI_TEXT.flatWiseReport :
          UI_TEXT.paymentReport;

        const message = `${seasonName || UI_TEXT.headerTitle} - ${reportTitle}\n${UI_TEXT.day}: ${new Date().toLocaleDateString()}`;
        onShare(uri, message);
      } catch (err) {
        console.error("Failed to capture report", err);
      }
    }
  };

  const dayWiseData = useMemo(() => {
    return activeDays.map((day) => {
      const totals = {
        veg: 0,
        nonVeg: 0,
        vegTaken: 0,
        nonVegTaken: 0,
        vegParcel: 0,
        nonVegParcel: 0,
        guestVeg: 0,
        guestNonVeg: 0,
        guestVegTaken: 0,
        guestNonVegTaken: 0,
      };

      subscriptions.forEach((sub) => {
        const slots = sub.mealSlots[day] || [];
        const taken = sub.takenByPerson[day] || [];

        slots.forEach((s, idx) => {
          if (!s) return;

          const meals = [
            { choice: s.breakfast, type: "breakfast" },
            { choice: s.lunch, type: "lunch" },
            { choice: s.dinner, type: "dinner" },
          ] as const;

          meals.forEach(({ choice, type }) => {
            if (choice === "None") return;
            if (!isMealEnabled(day, type, config)) return;

            const diet = choice === "Veg" ? "veg" : "nonVeg";
            if (!isDietaryEnabled(day, type, diet, config)) return;

            const isVeg = choice === "Veg";
            const hasTaken = taken[idx]?.[type];

            if (isVeg) {
              totals.veg += 1;
              if (hasTaken) totals.vegTaken += 1;
            } else {
              totals.nonVeg += 1;
              if (hasTaken) totals.nonVegTaken += 1;
            }

            if (isParcelEnabled(day, type, config) && s[`${type}Parcel` as keyof typeof s]) {
              if (isVeg) totals.vegParcel += 1;
              else totals.nonVegParcel += 1;
            }
          });
        });
      });

      // Add Guest data from menu
      const dayMenu = menu[day];
      if (guestEnabled && dayMenu) {
        (["breakfast", "lunch", "dinner"] as const).forEach((m) => {
          const gm = dayMenu[m];
          if (gm) {
            totals.guestVeg += gm.guestVeg || 0;
            totals.guestNonVeg += gm.guestNonVeg || 0;
            totals.guestVegTaken += gm.guestVegTaken || 0;
            totals.guestNonVegTaken += gm.guestNonVegTaken || 0;
          }
        });
      }

      return { day, ...totals };
    });
  }, [subscriptions, menu, config]);

  const mealWiseData = useMemo(() => {
    return activeDays.map((day) => {
      const meals = {
        breakfast: {
          veg: 0,
          nonVeg: 0,
          vegTaken: 0,
          nonVegTaken: 0,
          vegParcel: 0,
          nonVegParcel: 0,
          guestVeg: 0,
          guestNonVeg: 0,
          guestVegTaken: 0,
          guestNonVegTaken: 0,
        },
        lunch: {
          veg: 0,
          nonVeg: 0,
          vegTaken: 0,
          nonVegTaken: 0,
          vegParcel: 0,
          nonVegParcel: 0,
          guestVeg: 0,
          guestNonVeg: 0,
          guestVegTaken: 0,
          guestNonVegTaken: 0,
        },
        dinner: {
          veg: 0,
          nonVeg: 0,
          vegTaken: 0,
          nonVegTaken: 0,
          vegParcel: 0,
          nonVegParcel: 0,
          guestVeg: 0,
          guestNonVeg: 0,
          guestVegTaken: 0,
          guestNonVegTaken: 0,
        },
      };

      subscriptions.forEach((sub) => {
        const slots = sub.mealSlots[day] || [];
        const taken = sub.takenByPerson[day] || [];

        slots.forEach((s, idx) => {
          const t = taken[idx];
          if (!s) return;

          (["breakfast", "lunch", "dinner"] as const).forEach((mKey) => {
            const choice = s[mKey];
            if (choice === "None") return;
            if (!isMealEnabled(day, mKey, config)) return;

            const diet = choice === "Veg" ? "veg" : "nonVeg";
            if (!isDietaryEnabled(day, mKey, diet, config)) return;

            const isVeg = choice === "Veg";
            if (isVeg) {
              meals[mKey].veg += 1;
              if (t?.[mKey]) meals[mKey].vegTaken += 1;
            } else {
              meals[mKey].nonVeg += 1;
              if (t?.[mKey]) meals[mKey].nonVegTaken += 1;
            }
            if (
              isParcelEnabled(day, mKey, config) &&
              s[`${mKey}Parcel` as keyof typeof s]
            ) {
              if (isVeg) meals[mKey].vegParcel += 1;
              else meals[mKey].nonVegParcel += 1;
            }
          });
        });
      });

      // Add Guest data from menu
      const dayMenu = menu[day];
      if (guestEnabled && dayMenu) {
        (["breakfast", "lunch", "dinner"] as const).forEach((m) => {
          const gm = dayMenu[m];
          if (gm) {
            meals[m].guestVeg += gm.guestVeg || 0;
            meals[m].guestNonVeg += gm.guestNonVeg || 0;
            meals[m].guestVegTaken += gm.guestVegTaken || 0;
            meals[m].guestNonVegTaken += gm.guestNonVegTaken || 0;
          }
        });
      }

      return { day, meals };
    });
  }, [subscriptions, menu, config]);

  const flatWiseData = useMemo(() => {
    return subscriptions
      .map((sub) => {
        const dayStats = activeDays
          .map((day) => {
            const slots = sub.mealSlots[day] || [];
            const taken = sub.takenByPerson[day] || [];

            const meals = (["breakfast", "lunch", "dinner"] as const)
              .filter((m) => isMealEnabled(day, m, config))
              .map((m) => {
                let veg = 0;
                let nonVeg = 0;
                let vegTaken = 0;
                let nonVegTaken = 0;
                let vegParcel = 0;
                let nonVegParcel = 0;

                slots.forEach((s, idx) => {
                  const choice = s[m];
                  if (choice === "None") return;
                  if (!isMealEnabled(day, m, config)) return;

                  const diet = choice === "Veg" ? "veg" : "nonVeg";
                  if (!isDietaryEnabled(day, m, diet, config)) return;

                  const t = taken[idx];
                  const isTaken = !!t?.[m];
                  const isParcel = isParcelEnabled(day, m, config) && !!s[`${m}Parcel` as keyof typeof s];

                  if (choice === "Veg") {
                    veg++;
                    if (isTaken) vegTaken++;
                    if (isParcel) vegParcel++;
                  } else {
                    nonVeg++;
                    if (isTaken) nonVegTaken++;
                    if (isParcel) nonVegParcel++;
                  }
                });

                return { type: m, veg, nonVeg, vegTaken, nonVegTaken, vegParcel, nonVegParcel };
              })
              .filter((m) => m.veg + m.nonVeg > 0);

            return { day, meals };
          })
          .filter((d) => d.meals.length > 0);

        return {
          id: sub.id,
          flat: sub.flat,
          block: sub.block,
          people: sub.peopleCount,
          amount: sub.amount,
          dayStats,
        };
      })
      .sort(
        (left, right) =>
          left.block.localeCompare(right.block, undefined, {
            numeric: true,
          }) || left.flat.localeCompare(right.flat, undefined, { numeric: true })
      );
  }, [subscriptions, config]);

  const paymentData = useMemo(() => {
    const summary: Record<string, { count: number; total: number }> = {
      UPI: { count: 0, total: 0 },
      Cash: { count: 0, total: 0 },
      "Bank transfer": { count: 0, total: 0 },
    };

    subscriptions.forEach((sub) => {
      const mode = sub.paymentMode || "Cash";
      if (!summary[mode]) {
        summary[mode] = { count: 0, total: 0 };
      }
      summary[mode].count += 1;
      summary[mode].total += parseFloat(sub.amount) || 0;
    });

    const enabledMethods = [];
    if (paymentConfig.options.upi) enabledMethods.push({ mode: "UPI", ...summary.UPI });
    if (paymentConfig.options.cash) enabledMethods.push({ mode: "Cash", ...summary.Cash });
    if (paymentConfig.options.bankTransfer) enabledMethods.push({ mode: "Bank transfer", ...summary["Bank transfer"] });

    return enabledMethods;
  }, [subscriptions, paymentConfig]);

  const notTakenData = useMemo(() => {
    if (reportType !== "notTaken") return [];

    return subscriptions
      .map((sub) => {
        const slots = sub.mealSlots[selectedDayId] || [];
        const taken = sub.takenByPerson[selectedDayId] || [];

        let vegNotTaken = 0;
        let nonVegNotTaken = 0;

        slots.forEach((s, idx) => {
          const choice = s[selectedMealType];
          if (choice !== "None" && isMealEnabled(selectedDayId, selectedMealType, config)) {
            const diet = choice === "Veg" ? "veg" : "nonVeg";
            if (isDietaryEnabled(selectedDayId, selectedMealType, diet, config)) {
              if (!taken[idx]?.[selectedMealType]) {
                if (choice === "Veg") vegNotTaken++;
                else nonVegNotTaken++;
              }
            }
          }
        });

        return {
          id: sub.id,
          block: sub.block,
          flat: sub.flat,
          veg: vegNotTaken,
          nonVeg: nonVegNotTaken,
          count: vegNotTaken + nonVegNotTaken,
        };
      })
      .filter((item) => item.count > 0)
      .sort((a, b) => a.block.localeCompare(b.block, undefined, { numeric: true }) || a.flat.localeCompare(b.flat, undefined, { numeric: true }));
  }, [subscriptions, reportType, selectedDayId, selectedMealType, config]);

  return (
    <View style={styles.root}>
      <StatusBar style={themeType === "dark" ? "light" : "dark"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={onBack} />
            <HomeButton onPress={onHome} />
          </View>
          <LogoutButton onLogout={onLogout} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={handleShare} style={{ padding: 8 }}>
            <Ionicons name={Platform.OS === 'web' ? "download-outline" : "share-social-outline"} size={24} color={theme.colors.primary} />
          </Pressable>
        </View>
        <Text style={styles.title}>{UI_TEXT.reportTitle}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.reportSubtitle}</Text>
      </View>

      <View style={{ marginTop: 12 }}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 12 }}
          contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
        >
          {[
            { id: "day", label: UI_TEXT.day, icon: "calendar-outline" },
            { id: "meal", label: UI_TEXT.meal, icon: "restaurant-outline" },
            { id: "single", label: UI_TEXT.split, icon: "fast-food-outline" },
            { id: "notTaken", label: UI_TEXT.pending, icon: "alert-circle-outline" },
            { id: "flat", label: UI_TEXT.flat, icon: "business-outline" },
            { id: "payment", label: UI_TEXT.payment, icon: "card-outline" },
          ].filter(tab => tab.id !== "payment" || paymentConfig.enabled).map((tab) => (
            <Pressable
              key={tab.id}
              onPress={() => onSetReportType(tab.id as ReportType)}
              style={{
                backgroundColor: reportType === tab.id ? theme.colors.primary : theme.colors.surface,
                borderRadius: 12,
                height: 36,
                paddingHorizontal: 16,
                justifyContent: 'center',
                alignItems: 'center',
                borderWidth: 1.5,
                borderColor: theme.colors.primary,
                flexDirection: 'row',
                ...Platform.select({
                  ios: {
                    shadowColor: theme.colors.shadow,
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                  },
                  android: {
                    elevation: 2,
                  },
                }),
              }}
            >
              <ActionLabel
                icon={tab.icon as any}
                label={tab.label}
                color={reportType === tab.id ? theme.colors.white : theme.colors.primary}
              />
            </Pressable>
          ))}
        </ScrollView>
      </View>

      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={styles.content}
      >
        {(reportType === "single" || reportType === "notTaken") && (
          <View style={[styles.card, { marginBottom: 24 }]}>
            <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12 }]}>{UI_TEXT.reportFilters}</Text>

            <Text style={[styles.selectorLabel, { marginTop: 0 }]}>{UI_TEXT.selectDay}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 16 }}>
              <View style={styles.selectorRow}>
                {activeDays.map((day) => (
                  <Pressable
                    key={day}
                    onPress={() => onSetSelectedDayId(day)}
                    style={[
                      styles.selector,
                      selectedDayId === day && styles.selectorOn,
                      { minWidth: 60, paddingHorizontal: 12 }
                    ]}
                  >
                    <Text style={[styles.selectorText, selectedDayId === day && styles.selectorTextOn]}>
                      {getDayAbbr(day, config)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.selectorLabel}>{UI_TEXT.selectMeal}</Text>
            <View style={styles.selectorRow}>
              {(["breakfast", "lunch", "dinner"] as const)
                .filter((mKey) => isMealEnabled(selectedDayId, mKey, config))
                .map((mKey) => (
                  <Pressable
                    key={mKey}
                    onPress={() => onSetSelectedMealType(mKey)}
                    style={[
                      styles.selector,
                      selectedMealType === mKey && styles.selectorOn,
                      { minWidth: 80, paddingHorizontal: 10 }
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectorText,
                        selectedMealType === mKey && styles.selectorTextOn,
                        { fontSize: 12 }
                      ]}
                    >
                      {mKey.charAt(0).toUpperCase() + mKey.slice(1)}
                    </Text>
                  </Pressable>
                ))}
            </View>
          </View>
        )}

        <View ref={reportRef} collapsable={false} style={{ backgroundColor: theme.colors.background }}>
          <View style={[styles.card, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, elevation: 6, marginBottom: 24, paddingVertical: 16 }]}>
            <View style={styles.previewTop}>
              <View>
                <Text style={[styles.previewLabel, { color: "rgba(255,255,255,0.7)" }]}>{seasonName || UI_TEXT.appName}</Text>
                <Text style={[styles.previewTitle, { color: theme.colors.white, fontSize: 22 }]}>
                  {reportType === "day" && UI_TEXT.dayWiseReport}
                  {reportType === "meal" && UI_TEXT.mealWiseReport}
                  {reportType === "single" && `${getDayLabel(selectedDayId, config)} - ${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}`}
                  {reportType === "notTaken" && `${UI_TEXT.notTakenReport}`}
                  {reportType === "flat" && UI_TEXT.flatWiseReport}
                  {reportType === "payment" && UI_TEXT.paymentReport}
                </Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: "rgba(255,255,255,0.2)", marginVertical: 12 }} />
            <Text style={{ color: theme.colors.white, fontWeight: "700", fontSize: 13 }}>
              {new Date().toLocaleDateString()} {UI_TEXT.operationalSummary}
            </Text>
          </View>

          {reportType === "notTaken" && (
            <View style={{ gap: 12 }}>
              {notTakenData.length === 0 ? (
                <Text style={styles.emptyState}>{UI_TEXT.noMealsSelected}</Text>
              ) : (
                notTakenData.map((item, index) => {
                  const colorScheme = theme.cardColors[index % theme.cardColors.length];
                  const vegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, "veg", config);
                  const nonVegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, "nonVeg", config);

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
                        <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{item.block}-{item.flat}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={[styles.amount, { color: colorScheme.accent, fontWeight: '900' }]}>
                            {item.count} {item.count === 1 ? UI_TEXT.personNotTaken : UI_TEXT.personsNotTaken}
                          </Text>
                          <Text style={[styles.helper, { fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary }]}>
                            (
                            {vegEnabled && item.veg > 0 && <Text style={{ color: theme.colors.veg }}>{item.veg} {UI_TEXT.veg}</Text>}
                            {vegEnabled && item.veg > 0 && nonVegEnabled && item.nonVeg > 0 && <Text>, </Text>}
                            {nonVegEnabled && item.nonVeg > 0 && <Text style={{ color: theme.colors.nonVeg }}>{item.nonVeg} {UI_TEXT.nonVeg}</Text>}
                            )
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })
              )}
            </View>
          )}

          {reportType === "single" && (
            <View style={{ gap: 16 }}>
              {(() => {
                const dayData = mealWiseData.find(d => d.day === selectedDayId);
                if (!dayData) return null;
                const m = dayData.meals[selectedMealType];
                const vegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, "veg", config);
                const nonVegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, "nonVeg", config);
                const parcelEnabled = isParcelEnabled(selectedDayId, selectedMealType, config);
                const mealEnabled = isMealEnabled(selectedDayId, selectedMealType, config);

                if (!mealEnabled) {
                  return <Text style={styles.emptyState}>{UI_TEXT.mealDisabled}</Text>;
                }

                const tVeg = m.veg + m.guestVeg;
                const tNonVeg = m.nonVeg + m.guestNonVeg;
                const tTakenVeg = m.vegTaken + m.guestVegTaken;
                const tTakenNonVeg = m.nonVegTaken + m.guestNonVegTaken;

                const totalDemand = tVeg + tNonVeg;
                const totalTaken = tTakenVeg + tTakenNonVeg;
                const totalNotTaken = totalDemand - totalTaken;
                const colorScheme = theme.cardColors[2]; // Use Green for single meal

                return (
                  <View style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
                    <View style={[styles.dashboardCardTop, { borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 16 }]}>
                      <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{getDayLabel(selectedDayId, config)}</Text>
                      <View style={[styles.pill, { backgroundColor: colorScheme.accent + "20" }]}>
                        <Text style={[styles.pillText, { color: colorScheme.accent }]}>{totalDemand} {UI_TEXT.totalDemand}</Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 20, gap: 12 }}>
                      {/* Demand Split */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.demandSplit}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          {vegEnabled && (
                            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.veg, marginBottom: 2 }}>{UI_TEXT.veg}: {tVeg} {guestEnabled && `(${UI_TEXT.resSuffix}:${m.veg}, ${UI_TEXT.guestSuffix}:${m.guestVeg})`}</Text>
                          )}
                          {nonVegEnabled && (
                            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.nonVeg }}>{UI_TEXT.nonVeg}: {tNonVeg} {guestEnabled && `(${UI_TEXT.resSuffix}:${m.nonVeg}, ${UI_TEXT.guestSuffix}:${m.guestNonVeg})`}</Text>
                          )}
                        </View>
                      </View>

                      <View style={{ backgroundColor: theme.colors.successLight, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: theme.colors.veg, fontWeight: "800", fontSize: 16 }}>{UI_TEXT.mealTaken}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: theme.colors.veg, fontSize: 24, fontWeight: "900" }}>{totalTaken}</Text>
                          <View style={{ marginTop: 4 }}>
                            {vegEnabled && (
                              <Text style={{ color: theme.colors.veg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                                {UI_TEXT.veg}: {tTakenVeg} {guestEnabled && `(${UI_TEXT.resSuffix}:${m.vegTaken}, ${UI_TEXT.guestSuffix}:${m.guestVegTaken})`}
                              </Text>
                            )}
                            {nonVegEnabled && (
                              <Text style={{ color: theme.colors.nonVeg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                                {UI_TEXT.nonVeg}: {tTakenNonVeg} {guestEnabled && `(${UI_TEXT.resSuffix}:${m.nonVegTaken}, ${UI_TEXT.guestSuffix}:${m.guestNonVegTaken})`}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      <View style={{ backgroundColor: theme.colors.errorLight, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: theme.colors.nonVeg, fontWeight: "800", fontSize: 16 }}>{UI_TEXT.mealNotTaken}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: theme.colors.nonVeg, fontSize: 24, fontWeight: "900" }}>{totalNotTaken}</Text>
                          <View style={{ marginTop: 4 }}>
                            {vegEnabled && (
                              <Text style={{ color: theme.colors.veg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                                {UI_TEXT.veg}: {tVeg - tTakenVeg} {guestEnabled && `(${UI_TEXT.resSuffix}:${m.veg - m.vegTaken}, ${UI_TEXT.guestSuffix}:${m.guestVeg - m.guestVegTaken})`}
                              </Text>
                            )}
                            {nonVegEnabled && (
                              <Text style={{ color: theme.colors.nonVeg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                                {UI_TEXT.nonVeg}: {tNonVeg - tTakenNonVeg} {guestEnabled && `(${UI_TEXT.resSuffix}:${m.nonVeg - m.nonVegTaken}, ${UI_TEXT.guestSuffix}:${m.nonVeg - m.nonVegTaken})`}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {parcelEnabled && (m.vegParcel + m.nonVegParcel) > 0 ? (
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colorScheme.border, paddingTop: 16 }}>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.parcelsNeeded}</Text>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.primary }}>{m.vegParcel + m.nonVegParcel} P</Text>
                            {(() => {
                              return (
                                <Text style={{ fontSize: 11, fontWeight: "600" }}>
                                  (
                                  {vegEnabled && m.vegParcel > 0 && <Text style={{ color: theme.colors.veg }}>{m.vegParcel} {UI_TEXT.veg}</Text>}
                                  {vegEnabled && m.vegParcel > 0 && nonVegEnabled && m.nonVegParcel > 0 && <Text>, </Text>}
                                  {nonVegEnabled && m.nonVegParcel > 0 && <Text style={{ color: theme.colors.nonVeg }}>{m.nonVegParcel} {UI_TEXT.nonVeg}</Text>}
                                  )
                                </Text>
                              );
                            })()}
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })()}
            </View>
          )}

          {reportType === "day" && (
            <View style={{ gap: 16 }}>
              {dayWiseData.map((item, index) => {
                const vegEnabled = isDietaryEnabledForDay(item.day, "veg", config);
                const nonVegEnabled = isDietaryEnabledForDay(
                  item.day,
                  "nonVeg",
                  config
                );
                const hasParcelSupport =
                  isParcelEnabled(item.day, "breakfast", config) ||
                  isParcelEnabled(item.day, "lunch", config) ||
                  isParcelEnabled(item.day, "dinner", config);

                const totalVeg = item.veg + item.guestVeg;
                const totalNonVeg = item.nonVeg + item.guestNonVeg;
                const totalVegTaken = item.vegTaken + item.guestVegTaken;
                const totalNonVegTaken =
                  item.nonVegTaken + item.guestNonVegTaken;

                const totalDemand = totalVeg + totalNonVeg;
                const totalTaken = totalVegTaken + totalNonVegTaken;
                const totalNotTaken = totalDemand - totalTaken;
                const colorScheme = theme.cardColors[index % theme.cardColors.length];

                return (
                  <View key={item.day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
                    <View
                      style={[
                        styles.dashboardCardTop,
                        { borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 16 },
                      ]}
                    >
                      <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>
                        {getDayLabel(item.day, config)}
                      </Text>
                      <View style={[styles.pill, { backgroundColor: colorScheme.accent + "20" }]}>
                        <Text style={[styles.pillText, { color: colorScheme.accent }]}>{totalDemand} {UI_TEXT.platesDemand}</Text>
                      </View>
                    </View>

                    <View style={{ marginTop: 20, gap: 12 }}>
                      {/* Total Demand Section */}
                      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.totalDemand}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          {vegEnabled && (
                            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.veg, marginBottom: 2 }}>{UI_TEXT.veg}: {totalVeg} {guestEnabled && `(${UI_TEXT.resSuffix}:${item.veg}, ${UI_TEXT.guestSuffix}:${item.guestVeg})`}</Text>
                          )}
                          {nonVegEnabled && (
                            <Text style={{ fontSize: 13, fontWeight: "600", color: theme.colors.nonVeg }}>{UI_TEXT.nonVeg}: {totalNonVeg} {guestEnabled && `(${UI_TEXT.resSuffix}:${item.nonVeg}, ${UI_TEXT.guestSuffix}:${item.guestNonVeg})`}</Text>
                          )}
                        </View>
                      </View>

                      {/* Meal Taken Section */}
                      <View style={{ backgroundColor: theme.colors.successLight, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: theme.colors.veg, fontWeight: "800", fontSize: 16 }}>{UI_TEXT.mealTaken}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: theme.colors.veg, fontSize: 24, fontWeight: "900" }}>{totalTaken}</Text>
                          <View style={{ marginTop: 4 }}>
                            {vegEnabled && (
                              <Text style={{ color: theme.colors.veg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                                {UI_TEXT.veg}: {totalVegTaken} {guestEnabled && `(${UI_TEXT.resSuffix}:${item.vegTaken}, ${UI_TEXT.guestSuffix}:${item.guestVegTaken})`}
                              </Text>
                            )}
                            {nonVegEnabled && (
                              <Text style={{ color: theme.colors.nonVeg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                                {UI_TEXT.nonVeg}: {totalNonVegTaken} {guestEnabled && `(${UI_TEXT.resSuffix}:${item.nonVegTaken}, ${UI_TEXT.guestSuffix}:${item.guestNonVegTaken})`}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Meal Not Taken Section */}
                      <View style={{ backgroundColor: theme.colors.errorLight, borderRadius: 16, padding: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                        <Text style={{ color: theme.colors.nonVeg, fontWeight: "800", fontSize: 16 }}>{UI_TEXT.mealNotTaken}</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={{ color: theme.colors.nonVeg, fontSize: 24, fontWeight: "900" }}>{totalNotTaken}</Text>
                          <View style={{ marginTop: 4 }}>
                            {vegEnabled && (
                              <Text style={{ color: theme.colors.veg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                                {UI_TEXT.veg}: {totalVeg - totalVegTaken} {guestEnabled && `(${UI_TEXT.resSuffix}:${item.veg - item.vegTaken}, ${UI_TEXT.guestSuffix}:${item.guestVeg - item.guestVegTaken})`}
                              </Text>
                            )}
                            {nonVegEnabled && (
                              <Text style={{ color: theme.colors.nonVeg, fontSize: 12, fontWeight: "700", textAlign: 'right' }}>
                                {UI_TEXT.nonVeg}: {totalNonVeg - totalNonVegTaken} {guestEnabled && `(${UI_TEXT.resSuffix}:${item.nonVegTaken - item.nonVegTaken}, ${UI_TEXT.guestSuffix}:${item.guestNonVeg - item.guestNonVegTaken})`}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {hasParcelSupport && (item.vegParcel + item.nonVegParcel) > 0 ? (
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderTopWidth: 1, borderTopColor: colorScheme.border, paddingTop: 16 }}>
                          <Text style={{ fontSize: 15, fontWeight: "700", color: theme.colors.textSecondary }}>{UI_TEXT.totalParcels}</Text>
                          <View style={{ alignItems: 'flex-end' }}>
                            <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.primary }}>{item.vegParcel + item.nonVegParcel} {UI_TEXT.parcelAbbr}</Text>
                            {(() => {
                              return (
                                <Text style={{ fontSize: 11, fontWeight: "600" }}>
                                  (
                                  {vegEnabled && item.vegParcel > 0 && <Text style={{ color: theme.colors.veg }}>{item.vegParcel} {UI_TEXT.veg}</Text>}
                                  {vegEnabled && item.vegParcel > 0 && nonVegEnabled && item.nonVegParcel > 0 && <Text>, </Text>}
                                  {nonVegEnabled && item.nonVegParcel > 0 && <Text style={{ color: theme.colors.nonVeg }}>{item.nonVegParcel} {UI_TEXT.nonVeg}</Text>}
                                  )
                                </Text>
                              );
                            })()}
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {reportType === "meal" && (
            <View style={{ gap: 16 }}>
              {mealWiseData.map((item, index) => {
                const colorScheme = theme.cardColors[index % theme.cardColors.length];
                return (
                  <View key={item.day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
                    <View style={{ borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 12, marginBottom: 12 }}>
                      <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{getDayLabel(item.day, config)}</Text>
                    </View>

                  {(["breakfast", "lunch", "dinner"] as const)
                    .filter((mKey) => isMealEnabled(item.day, mKey, config))
                    .map((mKey) => {
                      const m = item.meals[mKey];
                      const vegEnabled = isDietaryEnabled(
                        item.day,
                        mKey,
                        "veg",
                        config
                      );
                      const nonVegEnabled = isDietaryEnabled(
                        item.day,
                        mKey,
                        "nonVeg",
                        config
                      );
                      const parcelEnabled = isParcelEnabled(
                        item.day,
                        mKey,
                        config
                      );

                      if (!vegEnabled && !nonVegEnabled) return null;

                      const tVeg = m.veg + m.guestVeg;
                      const tNonVeg = m.nonVeg + m.guestNonVeg;
                      const tTakenVeg = m.vegTaken + m.guestVegTaken;
                      const tTakenNonVeg = m.nonVegTaken + m.guestNonVegTaken;

                      return (
                    <View
                          key={mKey}
                          style={{
                            backgroundColor: theme.colors.surface,
                            borderRadius: 20,
                            padding: 16,
                            marginBottom: 16,
                          }}
                        >
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
                            <Ionicons
                              name={mKey === "breakfast" ? "sunny-outline" : mKey === "lunch" ? "restaurant-outline" : "moon-outline"}
                              size={18}
                              color={theme.colors.primary}
                            />
                            <Text style={{ color: theme.colors.primary, fontWeight: "800", fontSize: 16, textTransform: "capitalize" }}>
                              {mKey}
                            </Text>
                          </View>

                          <View style={{ gap: 10 }}>
                            {/* Detailed split for this meal slot */}
                            {vegEnabled && (
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <Text style={{ color: theme.colors.veg, fontWeight: "700", fontSize: 13 }}>{UI_TEXT.veg}</Text>
                                <View style={{ alignItems: "flex-end" }}>
                                   <Text style={{ fontSize: 12, color: theme.colors.veg, fontWeight: "600" }}>{UI_TEXT.demand}: {tVeg} {guestEnabled && `(${UI_TEXT.resSuffix}:${m.veg}, ${UI_TEXT.guestSuffix}:${m.guestVeg})`}</Text>
                                   <Text style={{ fontSize: 12, color: theme.colors.veg, fontWeight: "700" }}>{UI_TEXT.taken}: {tTakenVeg} {guestEnabled && `(${UI_TEXT.resSuffix}:${m.vegTaken}, ${UI_TEXT.guestSuffix}:${m.guestVegTaken})`}</Text>
                                   <Text style={{ fontSize: 12, color: theme.colors.veg, fontWeight: "700" }}>{UI_TEXT.missed}: {tVeg - tTakenVeg}</Text>
                                </View>
                              </View>
                            )}
                            {nonVegEnabled && (
                              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", borderTopWidth: 1, borderTopColor: theme.colors.border, paddingTop: 8 }}>
                                <Text style={{ color: theme.colors.nonVeg, fontWeight: "700", fontSize: 13 }}>{UI_TEXT.nonVeg}</Text>
                                <View style={{ alignItems: "flex-end" }}>
                                   <Text style={{ fontSize: 12, color: theme.colors.nonVeg, fontWeight: "600" }}>{UI_TEXT.demand}: {tNonVeg} {guestEnabled && `(${UI_TEXT.resSuffix}:${m.nonVeg}, ${UI_TEXT.guestSuffix}:${m.guestNonVeg})`}</Text>
                                   <Text style={{ fontSize: 12, color: theme.colors.nonVeg, fontWeight: "700" }}>{UI_TEXT.taken}: {tTakenNonVeg} {guestEnabled && `(${UI_TEXT.resSuffix}:${m.nonVegTaken}, ${UI_TEXT.guestSuffix}:${m.guestNonVegTaken})`}</Text>
                                   <Text style={{ fontSize: 12, color: theme.colors.nonVeg, fontWeight: "700" }}>{UI_TEXT.missed}: {tNonVeg - tTakenNonVeg}</Text>
                                </View>
                              </View>
                            )}

                            {parcelEnabled && (m.vegParcel + m.nonVegParcel) > 0 && (
                              <View style={{ borderTopWidth: 1, borderTopColor: colorScheme.border, paddingTop: 8, flexDirection: "row", justifyContent: "space-between" }}>
                                <Text style={{ color: theme.colors.textSecondary, fontWeight: "700", fontSize: 13 }}>{UI_TEXT.parcels}</Text>
                                <Text style={{ fontSize: 13, color: colorScheme.accent, fontWeight: "800" }}>
                                  <Text>{m.vegParcel + m.nonVegParcel} P</Text>
                                  {(() => {
                                     return (
                                       <Text>
                                         (
                                         {vegEnabled && m.vegParcel > 0 && <Text style={{ color: theme.colors.veg }}>{m.vegParcel} {UI_TEXT.veg}</Text>}
                                         {vegEnabled && m.vegParcel > 0 && nonVegEnabled && m.nonVegParcel > 0 && <Text>, </Text>}
                                         {nonVegEnabled && m.nonVegParcel > 0 && <Text style={{ color: theme.colors.nonVeg }}>{m.nonVegParcel} {UI_TEXT.nonVeg}</Text>}
                                         )
                                       </Text>
                                     );
                                  })()}
                                </Text>
                              </View>
                            )}

                            <View style={{ borderTopWidth: 1, borderTopColor: colorScheme.border, paddingTop: 10, flexDirection: "row", justifyContent: "space-between" }}>
                              <Text style={{ color: theme.colors.textPrimary, fontWeight: "900", fontSize: 14 }}>{UI_TEXT.total}</Text>
                              <Text style={{ color: theme.colors.veg, fontWeight: "900", fontSize: 14 }}>
                                {tVeg + tNonVeg} {UI_TEXT.demand} | {tTakenVeg + tTakenNonVeg} {UI_TEXT.taken}
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                </View>
              );
            })}
            </View>
          )}

          {reportType === "flat" && (
            <View style={{ gap: 16 }}>
              {flatWiseData.map((item, index) => {
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
                    <View
                      style={[
                        styles.dashboardCardTop,
                        {
                          borderBottomWidth: 1,
                          borderBottomColor: colorScheme.border,
                          paddingBottom: 12,
                          marginBottom: 12
                        },
                      ]}
                    >
                      <View>
                         <Text style={[styles.flatLabel, { color: colorScheme.accent }]}>{UI_TEXT.block} {item.block}</Text>
                         <Text style={[styles.dashboardDay, { fontSize: 24, color: theme.colors.textPrimary }]}>{UI_TEXT.flatUpper} {item.flat}</Text>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                         {paymentConfig.enabled && <Text style={{ color: colorScheme.accent, fontSize: 20, fontWeight: "900" }}>{UI_TEXT.rs} {item.amount}</Text>}
                         <Text style={{ color: theme.colors.textSecondary, fontWeight: "600", fontSize: 12, marginTop: 4 }}>{item.people} {UI_TEXT.people}</Text>
                      </View>
                    </View>

                  {item.dayStats.map((ds) => (
                    <View key={ds.day} style={{ marginBottom: 16 }}>
                      <Text style={{ fontWeight: "800", fontSize: 14, color: colorScheme.accent, marginBottom: 8 }}>
                        {getDayLabel(ds.day, config)}
                      </Text>
                      <View style={{ gap: 8 }}>
                        {ds.meals.map((m) => {
                          const mealParts = [];
                          const parcelParts = [];
                          const vegEnabled = isDietaryEnabled(ds.day, m.type, "veg", config);
                          const nonVegEnabled = isDietaryEnabled(
                            ds.day,
                            m.type,
                            "nonVeg",
                            config
                          );
                          const parcelEnabled = isParcelEnabled(ds.day, m.type, config);

                          if (vegEnabled && m.veg > 0) {
                            mealParts.push(
                              `Veg: ${m.vegTaken}/${m.veg}`
                            );
                            if (parcelEnabled && m.vegParcel > 0) {
                              parcelParts.push(`${m.vegParcel} Veg`);
                            }
                          }
                          if (nonVegEnabled && m.nonVeg > 0) {
                            mealParts.push(
                              `Non-Veg: ${m.nonVegTaken}/${m.nonVeg}`
                            );
                            if (parcelEnabled && m.nonVegParcel > 0) {
                              parcelParts.push(`${m.nonVegParcel} Non-Veg`);
                            }
                          }

                          return (
                            <View key={m.type} style={{ backgroundColor: theme.colors.surface, borderRadius: 12, padding: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                              <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary, textTransform: "capitalize", width: 80 }}>
                                {m.type}
                              </Text>
                              <View style={{ flex: 1, alignItems: "flex-end" }}>
                                <Text style={{ fontSize: 12, fontWeight: "700" }}>
                                  {vegEnabled && m.veg > 0 && <Text style={{ color: theme.colors.veg }}>Veg: {m.vegTaken}/{m.veg}</Text>}
                                  {vegEnabled && m.veg > 0 && nonVegEnabled && m.nonVeg > 0 && <Text> | </Text>}
                                  {nonVegEnabled && m.nonVeg > 0 && <Text style={{ color: theme.colors.nonVeg }}>Non-Veg: {m.nonVegTaken}/{m.nonVeg}</Text>}
                                </Text>
                                {(m.vegParcel + m.nonVegParcel) > 0 && (
                                  <Text style={{ fontSize: 11, fontWeight: '700', marginTop: 2 }}>
                                    {UI_TEXT.parcels}: {m.vegParcel + m.nonVegParcel}{UI_TEXT.parcelAbbr} (
                                    {vegEnabled && m.vegParcel > 0 && <Text style={{ color: theme.colors.veg }}>{m.vegParcel} {UI_TEXT.veg}</Text>}
                                    {vegEnabled && m.vegParcel > 0 && nonVegEnabled && m.nonVegParcel > 0 && <Text>, </Text>}
                                    {nonVegEnabled && m.nonVegParcel > 0 && <Text style={{ color: theme.colors.nonVeg }}>{m.nonVegParcel} {UI_TEXT.nonVeg}</Text>}
                                    )
                                  </Text>
                                )}
                              </View>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                  </Pressable>
                );
              })}
            </View>
          )}

          {reportType === "payment" && (
            <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
              {paymentData.map((item, idx) => (
                <View key={item.mode} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
                  <View>
                    <Text style={{ fontSize: 18, fontWeight: "800", color: theme.colors.textPrimary }}>{item.mode}</Text>
                    <Text style={{ color: theme.colors.textSecondary, fontWeight: "600", fontSize: 13, marginTop: 4 }}>{item.count} Subscriptions</Text>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.textPrimary }}>{UI_TEXT.rs} {item.total.toFixed(2)}</Text>
                </View>
              ))}
              <View style={{ backgroundColor: theme.colors.primary, padding: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18 }}>{UI_TEXT.totalCollection}</Text>
                <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 24 }}>
                  {UI_TEXT.rs} {paymentData.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
