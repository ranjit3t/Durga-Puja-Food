import React, { useRef, useMemo } from "react";
import { View, Text, ScrollView, Pressable, Platform, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { getDayLabel, isMealEnabled, isMealCurrent, isMealInFuture, getMealLabel, isParcelEnabled } from "../constants";
import { ReportType, MealType, AppScreen, AppThemeMode } from "../domain";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { UserGreeting } from "../components/common/UserGreeting";
import { ActionLabel } from "../components/common/ActionLabel";

// Modular Report Components
import { DayWiseReport } from "../components/report/DayWiseReport";
import { MealWiseReport } from "../components/report/MealWiseReport";
import { FreeMealWiseReport } from "../components/report/FreeMealWiseReport";
import { ParcelWiseReport } from "../components/report/ParcelWiseReport";
import { PendingReport } from "../components/report/PendingReport";
import { FlatWiseReport } from "../components/report/FlatWiseReport";
import { PaymentSummaryReport } from "../components/report/PaymentSummaryReport";
import { MembersReport } from "../components/report/MembersReport";
import { PackagePassesReport } from "../components/report/PackagePassesReport";

// Custom Hook
import { useReportData } from "../hooks/useReportData";

import { useAuth } from "../context/AuthContext";
import { useCoreDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";

export function ReportScreen() {
  const { handleLogout } = useAuth();
  const {
    subscriptions, foodMenu, dayConfig, seasonName, paymentConfig, freeMealEnabled, kidsEnabled, guestsEnabled
  } = useCoreDatabase();
  const { shareQr } = useUI();
  const {
    reportType, setReportType, reportDayId: selectedDayId, setReportDayId: onSetSelectedDayId, reportMealType: selectedMealType, setReportMealType: onSetSelectedMealType,
    navigate, goBack, setSelectedId, setSelectedRecord
  } = useAppNavigation();

  const {
    activeDays, dayWiseData, mealWiseData, flatWiseData, paymentData, getNotTakenData, getMembersMealData, getMissedParcelData, packagePassesData
  } = useReportData(subscriptions, foodMenu, dayConfig, freeMealEnabled, paymentConfig, !!kidsEnabled, !!guestsEnabled, reportType);

  const [selectedPersonCategory, setSelectedPersonCategory] = React.useState<"all" | "adult" | "kids" | "guests">("all");

  const styles = useStyles();
  const { s } = useScaling();
  const { theme, themeType } = useAppTheme();

  const dayScrollRef = useRef<ScrollView>(null);
  const dayOffsets = useRef<Record<string, number>>({});

  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (selectedDayId && dayOffsets.current[selectedDayId] !== undefined) {
        dayScrollRef.current?.scrollTo({ x: dayOffsets.current[selectedDayId] - s(20), animated: true });
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [selectedDayId, s, reportType]);

  const onSelectFlat = (id: string) => {
    const match = subscriptions.find((s) => s.id === id);
    if (match) {
      setSelectedId(match.id);
      setSelectedRecord(match);
      navigate(AppScreen.DETAILS);
    }
  };

  const onSetReportType = (type: ReportType) => {
    setReportType(type);
    if (type === ReportType.DAY || type === ReportType.NOT_TAKEN || type === ReportType.MEMBERS_MEAL || type === ReportType.PARCEL) {
      const active = activeDays;
      for (const dId of active) {
        for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
          if (isMealCurrent(dId, mType, dayConfig) && isMealEnabled(dId, mType, dayConfig)) {
            onSetSelectedDayId(dId);
            onSetSelectedMealType(mType);
            return;
          }
        }
      }
      if (active.length > 0) {
        const targetDay = selectedDayId && active.includes(selectedDayId) ? selectedDayId : active[0];
        onSetSelectedDayId(targetDay);
        for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
          if (isMealEnabled(targetDay, mType, dayConfig)) {
            onSetSelectedMealType(mType);
            break;
          }
        }
      }
    }
  };

  // Ensure selected day is valid and focuses current active meal if available
  React.useEffect(() => {
    if (activeDays.length > 0) {
      const needsMealSelection = reportType === ReportType.DAY || reportType === ReportType.NOT_TAKEN || reportType === ReportType.MEMBERS_MEAL || reportType === ReportType.PARCEL;
      if (needsMealSelection) {
        let foundCurrent = false;
        for (const dId of activeDays) {
          for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
            if (isMealCurrent(dId, mType, dayConfig) && isMealEnabled(dId, mType, dayConfig)) {
              if (!selectedDayId || !isMealEnabled(selectedDayId, selectedMealType, dayConfig)) {
                onSetSelectedDayId(dId);
                onSetSelectedMealType(mType);
              }
              foundCurrent = true;
              break;
            }
          }
          if (foundCurrent) break;
        }
        if (!foundCurrent) {
          const targetDay = selectedDayId && activeDays.includes(selectedDayId) ? selectedDayId : activeDays[0];
          if (!selectedDayId) onSetSelectedDayId(targetDay);
          if (!selectedMealType || !isMealEnabled(targetDay, selectedMealType, dayConfig)) {
            for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
              if (isMealEnabled(targetDay, mType, dayConfig)) {
                onSetSelectedMealType(mType);
                break;
              }
            }
          }
        }
      }
    }
  }, [activeDays, dayConfig, selectedDayId, selectedMealType, reportType, onSetSelectedDayId, onSetSelectedMealType]);

  const isParcelEnabledGlobally = useMemo(() => {
    return (dayConfig || []).some(d =>
      [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isParcelEnabled(d.id, m, dayConfig))
    );
  }, [dayConfig]);

  const reportRef = useRef<View>(null);

  const handleShare = async () => {
    if (reportRef.current) {
      try {
        const { captureRef } = await import("react-native-view-shot");
        const uri = await captureRef(reportRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });

        const reportTitle =
          reportType === ReportType.DAY ? UI_TEXT.dayWiseReport :
          reportType === ReportType.MEAL ? UI_TEXT.mealWiseReport :
          reportType === ReportType.FREE_MEAL ? UI_TEXT.freeMealReport :
          reportType === ReportType.MEMBERS_MEAL ? UI_TEXT.membersMealReport :
          reportType === ReportType.PARCEL ? UI_TEXT.parcelReport :
          reportType === ReportType.NOT_TAKEN ? UI_TEXT.notTakenReport :
          reportType === ReportType.FLAT ? UI_TEXT.flatWiseReport :
          UI_TEXT.paymentReport;

        const message = `${seasonName || UI_TEXT.headerTitle} - ${reportTitle}\n${UI_TEXT.day}: ${new Date().toLocaleDateString()}`;
        shareQr(uri, message);
      } catch (err) {
        console.error("Failed to capture report", err);
      }
    }
  };

  const notTakenData = useMemo(() => {
    if (reportType !== ReportType.NOT_TAKEN) return [];
    return getNotTakenData(selectedDayId, selectedMealType);
  }, [reportType, selectedDayId, selectedMealType, getNotTakenData]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <UserGreeting />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={styles.title}>{UI_TEXT.reportTitle}</Text>
            <Text style={styles.subtitle}>{UI_TEXT.reportSubtitle}</Text>
          </View>
          <Pressable
            onPress={handleShare}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={Platform.OS === 'web' ? UI_TEXT.downloadReport : UI_TEXT.shareReport}
            accessibilityHint={UI_TEXT.viewPassHint}
            style={({ pressed }) => [
              {
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                backgroundColor: theme.colors.primary,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 12,
                elevation: 2,
                shadowColor: theme.colors.primary,
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                alignSelf: 'flex-start',
              },
              pressed && { opacity: 0.8 }
            ]}
          >
            <Ionicons
              name={Platform.OS === 'web' ? "download-outline" : "share-social-outline"}
              size={18}
              color={theme.colors.white}
            />
            <Text style={{ color: theme.colors.white, fontWeight: '800', fontSize: 13 }}>
              {Platform.OS === 'web' ? UI_TEXT.downloadReport : UI_TEXT.shareReport}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.maxWidthWrapper, { marginTop: 12 }]}>
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 12, width: '100%' }}>
          {[
            { id: ReportType.DAY, label: UI_TEXT.day, icon: "calendar-outline" },
            { id: ReportType.MEAL, label: UI_TEXT.meal, icon: "restaurant-outline" },
            { id: ReportType.FREE_MEAL, label: UI_TEXT.freeMealSuffix, icon: "people-circle-outline" },
            { id: ReportType.MEMBERS_MEAL, label: UI_TEXT.members, icon: "people-outline" },
            { id: ReportType.PARCEL, label: UI_TEXT.parcels, icon: "cube-outline" },
            { id: ReportType.NOT_TAKEN, label: UI_TEXT.pending, icon: "alert-circle-outline" },
            { id: ReportType.FLAT, label: UI_TEXT.flat, icon: "business-outline" },
            { id: ReportType.PAYMENT, label: UI_TEXT.payment, icon: "card-outline" },
            { id: ReportType.PACKAGE, label: UI_TEXT.packageReport, icon: "pricetag-outline" },
          ].filter(tab =>
            (tab.id !== ReportType.PAYMENT || paymentConfig.enabled) &&
            (tab.id !== ReportType.FREE_MEAL || freeMealEnabled) &&
            (tab.id !== ReportType.PARCEL || isParcelEnabledGlobally)
          ).map((tab) => {
            const isSelected = reportType === tab.id;
            return (
              <Pressable
                key={tab.id}
                onPress={() => onSetReportType(tab.id as ReportType)}
                accessible={true}
                accessibilityRole="tab"
                accessibilityLabel={tab.label}
                accessibilityState={{ selected: isSelected }}
                style={[
                  styles.selector,
                  isSelected && styles.selectorOn,
                  { paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 100, marginBottom: 0 }
                ]}
              >
                <Ionicons
                  name={tab.icon as any}
                  size={16}
                  color={isSelected ? theme.colors.white : theme.colors.primary}
                />
                <Text style={[styles.selectorText, isSelected && styles.selectorTextOn, { fontSize: 13, fontWeight: '800' }]}>
                  {tab.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={[styles.content, { paddingTop: 0 }]}
      >
        {(reportType === ReportType.DAY || reportType === ReportType.NOT_TAKEN || reportType === ReportType.MEMBERS_MEAL || reportType === ReportType.PARCEL) && (
          <View style={[styles.card, { marginBottom: 24, marginTop: 10 }]}>
            <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 12 }]}>{UI_TEXT.reportFilters}</Text>

            <Text style={[styles.selectorLabel, { marginTop: 0 }]}>{UI_TEXT.selectDay}</Text>
            <ScrollView
              ref={dayScrollRef}
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 16, width: '100%' }}
              contentContainerStyle={{ paddingRight: s(24) }}
            >
              <View style={[styles.selectorRow, { flexWrap: 'nowrap' }]}>
                {activeDays
                  .filter((day) => {
                    if (reportType !== ReportType.NOT_TAKEN && reportType !== ReportType.PARCEL) return true;
                    // For "Not Taken" and "Parcel" (Missed view) reports, only show days that have at least one meal that is NOT in the future
                    const meals = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER];
                    return meals.some(m => isMealEnabled(day, m, dayConfig) && !isMealInFuture(day, m, dayConfig));
                  })
                  .map((day) => {
                    const isSelected = selectedDayId === day;
                    return (
                      <Pressable
                        key={day}
                        onLayout={(e) => {
                          dayOffsets.current[day] = e.nativeEvent.layout.x;
                        }}
                        onPress={() => onSetSelectedDayId(day)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={getDayLabel(day, dayConfig)}
                        accessibilityState={{ selected: isSelected }}
                        style={[
                          styles.selector,
                          isSelected && styles.selectorOn,
                          { minWidth: s(90), paddingVertical: s(10), marginBottom: 0 }
                        ]}
                      >
                        <Text style={[styles.selectorText, isSelected && styles.selectorTextOn, { fontSize: 13, fontWeight: '800' }]}>
                          {getDayLabel(day, dayConfig)}
                        </Text>
                      </Pressable>
                    );
                  })}
              </View>
            </ScrollView>

            <Text style={styles.selectorLabel}>{UI_TEXT.selectMeal}</Text>
            <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
              {[MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
                .filter((mType) => isMealEnabled(selectedDayId, mType, dayConfig))
                .map((mType) => {
                  const isSelected = selectedMealType === mType;
                  return (
                    <Pressable
                      key={mType}
                      onPress={() => onSetSelectedMealType(mType)}
                      accessible={true}
                      accessibilityRole="button"
                      accessibilityLabel={getMealLabel(mType)}
                      accessibilityState={{ selected: isSelected }}
                      style={[
                        styles.selector,
                        isSelected && styles.selectorOn,
                        { flex: 1, minWidth: 90, paddingVertical: 10, marginBottom: 0 }
                      ]}
                    >
                      <Text style={[styles.selectorText, isSelected && styles.selectorTextOn, { fontSize: 13, fontWeight: '800' }]}>
                        {getMealLabel(mType)}
                      </Text>
                    </Pressable>
                  );
                })}
            </View>

            {reportType === ReportType.MEMBERS_MEAL && (
              <>
                <Text style={[styles.selectorLabel, { marginTop: 14 }]}>Person Category</Text>
                <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { id: "all", label: UI_TEXT.all },
                    { id: "adult", label: UI_TEXT.adults },
                    ...(kidsEnabled ? [{ id: "kids", label: UI_TEXT.kids }] : []),
                    ...(guestsEnabled ? [{ id: "guests", label: UI_TEXT.guests }] : []),
                  ].map((cat) => {
                    const isSelected = selectedPersonCategory === cat.id;
                    return (
                      <Pressable
                        key={cat.id}
                        onPress={() => setSelectedPersonCategory(cat.id as any)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={cat.label}
                        accessibilityState={{ selected: isSelected }}
                        style={[
                          styles.selector,
                          isSelected && styles.selectorOn,
                          { flex: 1, minWidth: 70, paddingVertical: 8, marginBottom: 0 }
                        ]}
                      >
                        <Text style={[styles.selectorText, isSelected && styles.selectorTextOn, { fontSize: 12, fontWeight: '800' }]}>
                          {cat.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
        )}

        {/* Report Content Container (Captured for sharing/download) */}
        <View ref={reportRef} collapsable={false} style={{ backgroundColor: theme.colors.background, padding: 2, gap: 16 }}>
          {reportType === ReportType.DAY && (
            <DayWiseReport
              data={dayWiseData.map(d => ({ day: d.dayId, ...d.totals }) as any)}
              selectedDayId={selectedDayId}
              selectedMealType={selectedMealType}
              mealWiseData={mealWiseData}
              dayConfig={dayConfig}
              kidsEnabled={!!kidsEnabled}
              guestsEnabled={!!guestsEnabled}
              freeMealEnabled={freeMealEnabled}
            />
          )}

          {reportType === ReportType.MEAL && (
            <MealWiseReport
              data={mealWiseData}
              dayConfig={dayConfig}
              kidsEnabled={!!kidsEnabled}
              guestsEnabled={!!guestsEnabled}
            />
          )}

          {reportType === ReportType.FREE_MEAL && (
            <FreeMealWiseReport
              activeDays={activeDays}
              foodMenu={foodMenu}
              dayConfig={dayConfig}
            />
          )}

          {reportType === ReportType.MEMBERS_MEAL && (
            <MembersReport
              data={getMembersMealData(selectedDayId, selectedMealType, selectedPersonCategory)}
              selectedDayId={selectedDayId}
              selectedMealType={selectedMealType}
              dayConfig={dayConfig}
              onSelectFlat={onSelectFlat}
            />
          )}

          {reportType === ReportType.PARCEL && (
            <ParcelWiseReport
              data={mealWiseData}
              dayConfig={dayConfig}
              getMissedParcelData={getMissedParcelData}
              selectedDayId={selectedDayId}
              selectedMealType={selectedMealType}
              onSelectFlat={onSelectFlat}
              kidsEnabled={!!kidsEnabled}
              guestsEnabled={!!guestsEnabled}
            />
          )}

          {reportType === ReportType.NOT_TAKEN && (
            <PendingReport
              data={notTakenData}
              selectedDayId={selectedDayId}
              selectedMealType={selectedMealType}
              dayConfig={dayConfig}
              onSelectFlat={onSelectFlat}
              kidsEnabled={!!kidsEnabled}
            />
          )}

          {reportType === ReportType.FLAT && (
            <FlatWiseReport
              data={flatWiseData}
              dayConfig={dayConfig}
              onSelectFlat={onSelectFlat}
              kidsEnabled={!!kidsEnabled}
              guestsEnabled={!!guestsEnabled}
            />
          )}

          {reportType === ReportType.PAYMENT && (
            <PaymentSummaryReport
              data={paymentData}
              onSelectFlat={onSelectFlat}
              kidsEnabled={!!kidsEnabled}
              guestsEnabled={!!guestsEnabled}
            />
          )}

          {reportType === ReportType.PACKAGE && (
            <PackagePassesReport
              data={packagePassesData}
              onSelectFlat={onSelectFlat}
              kidsEnabled={!!kidsEnabled}
              guestsEnabled={!!guestsEnabled}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
