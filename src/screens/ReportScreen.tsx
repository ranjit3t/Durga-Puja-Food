/**
 * Report Screen for Admin.
 * Provides various data views like Day wise, Meal wise and Flat wise summaries.
 */
import React, { useState, useMemo, useRef } from "react";
import { View, Text, ScrollView, StatusBar, Pressable } from "react-native";
import { captureRef } from "react-native-view-shot";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../styles";
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
import { Subscription, FoodMenu, Day, ConfigDay } from "../types";
import { BackButton } from "../components/common/BackButton";
import { ActionLabel } from "../components/common/ActionLabel";

type ReportType = "day" | "meal" | "flat" | "payment" | "single";

export function ReportScreen({
  subscriptions,
  menu,
  config,
  onBack,
  onShare,
}: {
  subscriptions: Subscription[];
  menu: FoodMenu;
  config: ConfigDay[];
  onBack: () => void;
  onShare: (uri: string) => void;
}) {
  const activeDays = getActiveDays(config);
  const [reportType, setReportType] = useState<ReportType>("day");
  const [selectedDayId, setSelectedDayId] = useState<Day>(activeDays[0] || "");
  const [selectedMealType, setSelectedMealType] = useState<
    "breakfast" | "lunch" | "dinner"
  >("breakfast");

  // Ensure selected day is valid if config changes
  React.useEffect(() => {
    if (activeDays.length > 0 && !activeDays.includes(selectedDayId)) {
      setSelectedDayId(activeDays[0]);
    }
  }, [config]);

  // Ensure selected meal is valid for the selected day
  React.useEffect(() => {
    if (selectedDayId && !isMealEnabled(selectedDayId, selectedMealType, config)) {
      const firstAvailable = (["breakfast", "lunch", "dinner"] as const).find(
        (m) => isMealEnabled(selectedDayId, m, config)
      );
      if (firstAvailable) {
        setSelectedMealType(firstAvailable);
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
        onShare(uri);
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
        parcel: 0,
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
              totals.parcel += 1;
            }
          });
        });
      });

      // Add Guest data from menu
      const dayMenu = menu[day];
      if (dayMenu) {
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
          parcel: 0,
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
          parcel: 0,
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
          parcel: 0,
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
            )
              meals[mKey].parcel += 1;
          });
        });
      });

      // Add Guest data from menu
      const dayMenu = menu[day];
      if (dayMenu) {
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

                slots.forEach((s, idx) => {
                  const choice = s[m];
                  if (choice === "None") return;
                  if (!isMealEnabled(day, m, config)) return;

                  const diet = choice === "Veg" ? "veg" : "nonVeg";
                  if (!isDietaryEnabled(day, m, diet, config)) return;

                  const t = taken[idx];
                  const isTaken = !!t?.[m];

                  if (choice === "Veg") {
                    veg++;
                    if (isTaken) vegTaken++;
                  } else {
                    nonVeg++;
                    if (isTaken) nonVegTaken++;
                  }
                });

                return { type: m, veg, nonVeg, vegTaken, nonVegTaken };
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
    const summary = {
      UPI: { count: 0, total: 0 },
      Cash: { count: 0, total: 0 },
    };

    subscriptions.forEach((sub) => {
      const mode = sub.paymentMode === "UPI" ? "UPI" : "Cash";
      summary[mode].count += 1;
      summary[mode].total += parseFloat(sub.amount) || 0;
    });

    return [
      { mode: "UPI", ...summary.UPI },
      { mode: "Cash", ...summary.Cash },
    ];
  }, [subscriptions]);

  if (activeDays.length === 0) {
    return (
      <View style={styles.root}>
        <StatusBar style="light" />
        <View style={styles.header}>
          <BackButton onPress={onBack} />
          <Text style={styles.title}>Reports</Text>
        </View>
        <View style={[styles.content, styles.center]}>
          <Text style={styles.emptyState}>No active days configured. Please add days in Settings.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.root}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <BackButton onPress={onBack} />
          <Pressable onPress={handleShare} style={{ padding: 8 }}>
            <Ionicons name="share-social-outline" size={24} color="#f0c977" />
          </Pressable>
        </View>
        <Text style={styles.eyebrow}>{UI_TEXT.operations}</Text>
        <Text style={styles.title}>{UI_TEXT.reportTitle}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.reportSubtitle}</Text>
      </View>

      <View style={[styles.selectorRow, { padding: 20, paddingBottom: 0 }]}>
        <Pressable
          onPress={() => setReportType("day")}
          style={[styles.selector, reportType === "day" && styles.selectorOn]}
        >
          <Text
            style={[
              styles.selectorText,
              reportType === "day" && styles.selectorTextOn,
            ]}
          >
            {UI_TEXT.dayWiseReport}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setReportType("meal")}
          style={[styles.selector, reportType === "meal" && styles.selectorOn]}
        >
          <Text
            style={[
              styles.selectorText,
              reportType === "meal" && styles.selectorTextOn,
            ]}
          >
            {UI_TEXT.mealWiseReport}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setReportType("single")}
          style={[styles.selector, reportType === "single" && styles.selectorOn]}
        >
          <Text
            style={[
              styles.selectorText,
              reportType === "single" && styles.selectorTextOn,
            ]}
          >
            {UI_TEXT.singleMealReport}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setReportType("flat")}
          style={[styles.selector, reportType === "flat" && styles.selectorOn]}
        >
          <Text
            style={[
              styles.selectorText,
              reportType === "flat" && styles.selectorTextOn,
            ]}
          >
            {UI_TEXT.flatWiseReport}
          </Text>
        </Pressable>
        <Pressable
          onPress={() => setReportType("payment")}
          style={[
            styles.selector,
            reportType === "payment" && styles.selectorOn,
          ]}
        >
          <Text
            style={[
              styles.selectorText,
              reportType === "payment" && styles.selectorTextOn,
            ]}
          >
            {UI_TEXT.paymentReport}
          </Text>
        </Pressable>
      </View>

      <View style={{ alignItems: "center", marginTop: 10 }}>
        <Pressable onPress={handleShare} style={styles.compactSecondary}>
          <ActionLabel icon="share-social-outline" label="Share Report" />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {reportType === "single" && (
          <View style={[styles.peoplePanel, { marginBottom: 16, padding: 12 }]}>
            <Text style={[styles.selectorLabel, { marginTop: 0 }]}>Select Day:</Text>
            <View style={[styles.selectorRow, { marginBottom: 12 }]}>
              {activeDays.map((day) => (
                <Pressable
                  key={day}
                  onPress={() => setSelectedDayId(day)}
                  style={[styles.selector, selectedDayId === day && styles.selectorOn]}
                >
                  <Text style={[styles.selectorText, selectedDayId === day && styles.selectorTextOn]}>
                    {getDayAbbr(day, config)}
                  </Text>
                </Pressable>
              ))}
            </View>
            <Text style={styles.selectorLabel}>Select Meal:</Text>
            <View style={styles.selectorRow}>
              {(["breakfast", "lunch", "dinner"] as const)
                .filter((mKey) => isMealEnabled(selectedDayId, mKey, config))
                .map((mKey) => (
                  <Pressable
                    key={mKey}
                    onPress={() => setSelectedMealType(mKey)}
                    style={[
                      styles.selector,
                      selectedMealType === mKey && styles.selectorOn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.selectorText,
                        selectedMealType === mKey && styles.selectorTextOn,
                      ]}
                    >
                      {mKey.charAt(0).toUpperCase() + mKey.slice(1)}
                    </Text>
                  </Pressable>
                ))}
            </View>
          </View>
        )}

        <View ref={reportRef} collapsable={false} style={{ backgroundColor: "#f5f1e9", padding: 4, borderRadius: 8 }}>
          <View style={{ paddingBottom: 16 }}>
            <Text style={[styles.title, { color: '#253d35', fontSize: 24 }]}>
              {reportType === "day" && UI_TEXT.dayWiseReport}
              {reportType === "meal" && UI_TEXT.mealWiseReport}
              {reportType === "single" && `${getDayLabel(selectedDayId, config)} - ${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)}`}
              {reportType === "flat" && UI_TEXT.flatWiseReport}
              {reportType === "payment" && UI_TEXT.paymentReport}
            </Text>
            <Text style={[styles.subtitle, { color: '#675f55' }]}>{new Date().toLocaleDateString()} Summary</Text>
          </View>

          {reportType === "single" && (
            <View style={{ gap: 12 }}>
              {(() => {
                const dayData = mealWiseData.find(d => d.day === selectedDayId);
                if (!dayData) return null;
                const m = dayData.meals[selectedMealType];
                const vegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, "veg", config);
                const nonVegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, "nonVeg", config);
                const parcelEnabled = isParcelEnabled(selectedDayId, selectedMealType, config);
                const mealEnabled = isMealEnabled(selectedDayId, selectedMealType, config);

                if (!mealEnabled) {
                  return <Text style={styles.emptyState}>This meal is disabled for the selected day.</Text>;
                }

                const tVeg = m.veg + m.guestVeg;
                const tNonVeg = m.nonVeg + m.guestNonVeg;
                const tTakenVeg = m.vegTaken + m.guestVegTaken;
                const tTakenNonVeg = m.nonVegTaken + m.guestNonVegTaken;

                const totalDemand = tVeg + tNonVeg;
                const totalTaken = tTakenVeg + tTakenNonVeg;
                const totalNotTaken = totalDemand - totalTaken;

                return (
                  <View style={styles.dashboardCard}>
                    <View style={[styles.dashboardCardTop, { borderBottomWidth: 1, borderBottomColor: "#eee" }]}>
                      <Text style={styles.dashboardDay}>{getDayLabel(selectedDayId, config)}</Text>
                      <Text style={styles.dashboardPeople}>
                        {totalDemand} Plates Demand
                      </Text>
                    </View>
                    <View style={{ marginTop: 12, gap: 10 }}>
                      {/* Demand Split */}
                      <View style={[styles.dayRow, { alignItems: 'flex-start' }]}>
                        <Text style={[styles.dayName, { flex: 1 }]}>Demand Split</Text>
                        <View style={{ alignItems: 'flex-end', flex: 2 }}>
                          {vegEnabled && (
                            <Text style={[styles.helper, { marginBottom: 2 }]}>Veg: {tVeg} (Res:{m.veg}, Guest:{m.guestVeg})</Text>
                          )}
                          {nonVegEnabled && (
                            <Text style={[styles.helper, { marginBottom: 0 }]}>Non-Veg: {tNonVeg} (Res:{m.nonVeg}, Guest:{m.guestNonVeg})</Text>
                          )}
                        </View>
                      </View>

                      {/* Meal Taken Detail */}
                      <View style={[styles.dayRow, { backgroundColor: "#f0f7f2", borderRadius: 8, padding: 8, alignItems: 'flex-start' }]}>
                        <Text style={[styles.dayName, { color: "#356044", flex: 1 }]}>Meal Taken</Text>
                        <View style={{ alignItems: 'flex-end', flex: 2 }}>
                          <Text style={[styles.amount, { color: "#356044", fontSize: 18 }]}>{totalTaken}</Text>
                          <View style={{ marginTop: 4 }}>
                            {vegEnabled && (
                              <Text style={[styles.helper, { color: '#356044', marginBottom: 2, textAlign: 'right' }]}>
                                Veg: {tTakenVeg} (Res:{m.vegTaken}, Guest:{m.guestVegTaken})
                              </Text>
                            )}
                            {nonVegEnabled && (
                              <Text style={[styles.helper, { color: '#356044', marginBottom: 0, textAlign: 'right' }]}>
                                Non-Veg: {tTakenNonVeg} (Res:{m.nonVegTaken}, Guest:{m.guestNonVegTaken})
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Meal Not Taken Detail */}
                      <View style={[styles.dayRow, { backgroundColor: "#fff5f5", borderRadius: 8, padding: 8, alignItems: 'flex-start' }]}>
                        <Text style={[styles.dayName, { color: "#c35b3b", flex: 1 }]}>Meal Not Taken</Text>
                        <View style={{ alignItems: 'flex-end', flex: 2 }}>
                          <Text style={[styles.amount, { color: "#c35b3b", fontSize: 18 }]}>{totalNotTaken}</Text>
                          <View style={{ marginTop: 4 }}>
                            {vegEnabled && (
                              <Text style={[styles.helper, { color: '#c35b3b', marginBottom: 2, textAlign: 'right' }]}>
                                Veg: {tVeg - tTakenVeg} (Res:{m.veg - m.vegTaken}, Guest:{m.guestVeg - m.guestVegTaken})
                              </Text>
                            )}
                            {nonVegEnabled && (
                              <Text style={[styles.helper, { color: '#c35b3b', marginBottom: 0, textAlign: 'right' }]}>
                                Non-Veg: {tNonVeg - tTakenNonVeg} (Res:{m.nonVeg - m.nonVegTaken}, Guest:{m.guestNonVeg - m.guestNonVegTaken})
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {parcelEnabled && (
                        <View style={styles.dayRow}>
                          <Text style={styles.dayName}>Parcels Needed</Text>
                          <Text style={styles.amount}>{m.parcel} P</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })()}
            </View>
          )}

          {reportType === "day" && (
            <View style={{ gap: 12 }}>
              {dayWiseData.map((item) => {
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

                return (
                  <View key={item.day} style={styles.dashboardCard}>
                    <View
                      style={[
                        styles.dashboardCardTop,
                        { borderBottomWidth: 1, borderBottomColor: "#eee" },
                      ]}
                    >
                      <Text style={styles.dashboardDay}>
                        {getDayLabel(item.day, config)}
                      </Text>
                      <Text style={styles.dashboardPeople}>
                        {totalDemand} Plates Demand
                      </Text>
                    </View>

                    <View style={{ marginTop: 10, gap: 8 }}>
                      {/* Total Demand Section */}
                      <View style={[styles.dayRow, { alignItems: 'flex-start' }]}>
                        <Text style={[styles.dayName, { flex: 1 }]}>Total Demand</Text>
                        <View style={{ alignItems: 'flex-end', flex: 2 }}>
                          {vegEnabled && (
                            <Text style={[styles.helper, { marginBottom: 2 }]}>Veg: {totalVeg} (Res:{item.veg}, Guest:{item.guestVeg})</Text>
                          )}
                          {nonVegEnabled && (
                            <Text style={[styles.helper, { marginBottom: 0 }]}>Non-Veg: {totalNonVeg} (Res:{item.nonVeg}, Guest:{item.guestNonVeg})</Text>
                          )}
                        </View>
                      </View>

                      {/* Meal Taken Section */}
                      <View
                        style={[
                          styles.dayRow,
                          { backgroundColor: "#f0f7f2", borderRadius: 8, padding: 8, alignItems: 'flex-start' },
                        ]}
                      >
                        <Text style={[styles.dayName, { color: "#356044", flex: 1 }]}>
                          Meal Taken
                        </Text>
                        <View style={{ alignItems: 'flex-end', flex: 2 }}>
                          <Text style={[styles.amount, { color: "#356044", fontSize: 18 }]}>
                            {totalTaken}
                          </Text>
                          <View style={{ marginTop: 4 }}>
                            {vegEnabled && (
                              <Text style={[styles.helper, { color: '#356044', marginBottom: 2, textAlign: 'right' }]}>
                                Veg: {totalVegTaken} (Res:{item.vegTaken}, Guest:{item.guestVegTaken})
                              </Text>
                            )}
                            {nonVegEnabled && (
                              <Text style={[styles.helper, { color: '#356044', marginBottom: 0, textAlign: 'right' }]}>
                                Non-Veg: {totalNonVegTaken} (Res:{item.nonVegTaken}, Guest:{item.guestNonVegTaken})
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {/* Meal Not Taken Section */}
                      <View
                        style={[
                          styles.dayRow,
                          { backgroundColor: "#fff5f5", borderRadius: 8, padding: 8, alignItems: 'flex-start' },
                        ]}
                      >
                        <Text style={[styles.dayName, { color: "#c35b3b", flex: 1 }]}>
                          Meal Not Taken
                        </Text>
                        <View style={{ alignItems: 'flex-end', flex: 2 }}>
                          <Text style={[styles.amount, { color: "#c35b3b", fontSize: 18 }]}>
                            {totalNotTaken}
                          </Text>
                          <View style={{ marginTop: 4 }}>
                            {vegEnabled && (
                              <Text style={[styles.helper, { color: '#c35b3b', marginBottom: 2, textAlign: 'right' }]}>
                                Veg: {totalVeg - totalVegTaken} (Res:{item.veg - item.vegTaken}, Guest:{item.guestVeg - item.guestVegTaken})
                              </Text>
                            )}
                            {nonVegEnabled && (
                              <Text style={[styles.helper, { color: '#c35b3b', marginBottom: 0, textAlign: 'right' }]}>
                                Non-Veg: {totalNonVeg - totalNonVegTaken} (Res:{item.nonVeg - item.nonVegTaken}, Guest:{item.guestNonVeg - item.guestNonVegTaken})
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>

                      {hasParcelSupport && (
                        <View style={styles.dayRow}>
                          <Text style={styles.dayName}>Total Parcels</Text>
                          <Text style={styles.amount}>{item.parcel} P</Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {reportType === "meal" && (
            <View style={{ gap: 12 }}>
              {mealWiseData.map((item) => (
                <View key={item.day} style={styles.dashboardCard}>
                  <Text
                    style={[
                      styles.dashboardDay,
                      { borderBottomWidth: 1, borderBottomColor: "#eee" },
                    ]}
                  >
                    {getDayLabel(item.day, config)}
                  </Text>
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
                            marginTop: 12,
                            paddingTop: 8,
                          }}
                        >
                          <Text
                            style={[
                              styles.label,
                              { marginTop: 0, color: "#7b5a2d" },
                            ]}
                          >
                            {mKey.charAt(0).toUpperCase() + mKey.slice(1)}
                          </Text>
                          <View style={{ gap: 8, marginTop: 4 }}>
                            {/* Detailed split for this meal slot */}
                            {vegEnabled && (
                              <View>
                                <Text style={[styles.helper, { fontWeight: '700' }]}>Veg Demand: {tVeg} (Res:{m.veg}, Guest:{m.guestVeg})</Text>
                                <Text style={[styles.helper, { color: '#356044', paddingLeft: 8 }]}>└ Taken: {tTakenVeg} (Res:{m.vegTaken}, Guest:{m.guestVegTaken})</Text>
                                <Text style={[styles.helper, { color: '#c35b3b', paddingLeft: 8 }]}>└ Not Taken: {tVeg - tTakenVeg} (Res:{m.veg - m.vegTaken}, Guest:{m.guestVeg - m.guestVegTaken})</Text>
                              </View>
                            )}
                            {nonVegEnabled && (
                              <View>
                                <Text style={[styles.helper, { fontWeight: '700' }]}>Non-Veg Demand: {tNonVeg} (Res:{m.nonVeg}, Guest:{m.guestNonVeg})</Text>
                                <Text style={[styles.helper, { color: '#356044', paddingLeft: 8 }]}>└ Taken: {tTakenNonVeg} (Res:{m.nonVegTaken}, Guest:{m.guestNonVegTaken})</Text>
                                <Text style={[styles.helper, { color: '#c35b3b', paddingLeft: 8 }]}>└ Not Taken: {tNonVeg - tTakenNonVeg} (Res:{m.nonVeg - m.nonVegTaken}, Guest:{m.guestNonVeg - m.guestNonVegTaken})</Text>
                              </View>
                            )}
                            {parcelEnabled && (
                              <Text style={[styles.helper, { fontWeight: '700' }]}>
                                Parcels: {m.parcel} P
                              </Text>
                            )}
                            <View style={{ borderTopWidth: 1, borderTopColor: '#eee', paddingTop: 4 }}>
                              <Text style={[styles.helper, { color: '#356044', fontWeight: '800' }]}>
                                Total: {tVeg + tNonVeg} Demand | {tTakenVeg + tTakenNonVeg} Meal Taken
                              </Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                </View>
              ))}
            </View>
          )}

          {reportType === "flat" && (
            <View style={{ gap: 16 }}>
              {flatWiseData.map((item) => (
                <View key={item.id} style={styles.dashboardCard}>
                  <View
                    style={[
                      styles.dashboardCardTop,
                      {
                        borderBottomWidth: 1,
                        borderBottomColor: "#eee",
                        paddingBottom: 8,
                      },
                    ]}
                  >
                    <Text style={styles.dashboardDay}>
                      {item.block}-{item.flat}
                    </Text>
                    <Text style={styles.amount}>Rs {item.amount}</Text>
                  </View>
                  <Text style={[styles.helper, { marginTop: 4 }]}>
                    {item.people} People Registered
                  </Text>

                  {item.dayStats.map((ds) => (
                    <View key={ds.day} style={{ marginTop: 12 }}>
                      <Text
                        style={{
                          fontWeight: "800",
                          fontSize: 14,
                          color: "#7b5a2d",
                        }}
                      >
                        {getDayLabel(ds.day, config)}
                      </Text>
                      <View style={{ gap: 6, marginTop: 4 }}>
                        {ds.meals.map((m) => {
                          const parts = [];
                          const vegEnabled = isDietaryEnabled(ds.day, m.type, "veg", config);
                          const nonVegEnabled = isDietaryEnabled(
                            ds.day,
                            m.type,
                            "nonVeg",
                            config
                          );

                          if (vegEnabled && m.veg > 0) {
                            parts.push(
                              `Veg: ${m.vegTaken} Taken, ${
                                m.veg - m.vegTaken
                              } Not Taken`
                            );
                          }
                          if (nonVegEnabled && m.nonVeg > 0) {
                            parts.push(
                              `Non-Veg: ${m.nonVegTaken} Taken, ${
                                m.nonVeg - m.nonVegTaken
                              } Not Taken`
                            );
                          }

                          return (
                            <View key={m.type} style={{ paddingLeft: 10 }}>
                              <Text
                                style={{
                                  fontSize: 13,
                                  fontWeight: "600",
                                  color: "#333",
                                }}
                              >
                                {m.type.charAt(0).toUpperCase() +
                                  m.type.slice(1)}
                              </Text>
                              <Text
                                style={{
                                  fontSize: 12,
                                  color: "#666",
                                  paddingLeft: 4,
                                }}
                              >
                                {parts.join(" | ")}
                              </Text>
                            </View>
                          );
                        })}
                      </View>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          )}

          {reportType === "payment" && (
            <View style={styles.peoplePanel}>
              {paymentData.map((item) => (
                <View key={item.mode} style={styles.dayRow}>
                  <View>
                    <Text style={styles.dayName}>{item.mode}</Text>
                    <Text style={styles.helper}>{item.count} Subscriptions</Text>
                  </View>
                  <Text style={styles.amount}>Rs {item.total.toFixed(2)}</Text>
                </View>
              ))}
              <View style={[styles.dayRow, { borderBottomWidth: 0, marginTop: 12 }]}>
                <Text style={[styles.dayName, { fontWeight: '800' }]}>Total Collection</Text>
                <Text style={[styles.amount, { fontSize: 20 }]}>
                  Rs {paymentData.reduce((acc, curr) => acc + curr.total, 0).toFixed(2)}
                </Text>
              </View>
            </View>
          )}
        </View>

        <View style={styles.footer} />
      </ScrollView>
    </View>
  );
}
