/**
 * Report Screen for Admin.
 * Provides various data views like Day wise, Meal wise and Flat wise summaries.
 */
import React, { useMemo, useRef } from "react";
import { View, Text, ScrollView, StatusBar, Pressable, Platform } from "react-native";
import { captureRef } from "react-native-view-shot";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { StatusBarStyleMode, useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import {
  getActiveDays,
  getDayLabel,
  getDayAbbr,
  isMealEnabled,
  getSortedMealKeys,
  getMealLabel,
  isParcelEnabled,
  isMealCurrent,
} from "../constants";
import { ReportType, MealType, AppScreen, UserRole, ActivityModule, ActivityAction, AppThemeMode, ConfigDay, AppConfig, PaymentConfig } from "../domain";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";

// Modular Report Components
import { DayWiseReport } from "../components/report/DayWiseReport";
import { MealWiseReport } from "../components/report/MealWiseReport";
import { GuestWiseReport } from "../components/report/GuestWiseReport";
import { ParcelWiseReport } from "../components/report/ParcelWiseReport";
import { SingleMealReport } from "../components/report/SingleMealReport";
import { PendingReport } from "../components/report/PendingReport";
import { FlatWiseReport } from "../components/report/FlatWiseReport";
import { PaymentSummaryReport } from "../components/report/PaymentSummaryReport";
import { KidsReport } from "../components/report/KidsReport";

// Custom Hook
import { useReportData } from "../hooks/useReportData";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";

export function ReportScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    subscriptions, foodMenu, dayConfig, seasonName, paymentConfig, guestEnabled, kidsEnabled, whatsappCountryCode, mobileEnabled, addActivityLog
  } = useDatabase();
  const { shareQr } = useUI();
  const {
    reportType, setReportType, reportDayId: selectedDayId, setReportDayId: onSetSelectedDayId, reportMealType: selectedMealType, setReportMealType: onSetSelectedMealType,
    navigate, goBack, setSelectedId, setSelectedRecord
  } = useAppNavigation();

  const {
    sortedActiveDays, activeDays, dayWiseData, mealWiseData, flatWiseData, paymentData, getNotTakenData, getKidsMealData
  } = useReportData(subscriptions, foodMenu, dayConfig, guestEnabled, paymentConfig, !!kidsEnabled);

  const styles = useStyles();
  const { s } = useScaling();
  const { theme, themeType } = useAppTheme();

  const onSelectFlat = (id: string) => {
    const match = subscriptions.find((s) => s.id === id);
    if (match) {
      setSelectedId(match.id);
      setSelectedRecord(match);
      navigate(AppScreen.DETAILS);
    }
  };

  const onSetReportType = (type: ReportType) => setReportType(type);

  // Ensure selected day is valid if config changes
  React.useEffect(() => {
    if (activeDays.length > 0 && (!selectedDayId || !activeDays.includes(selectedDayId))) {
      onSetSelectedDayId(activeDays[0]);
    }
  }, [activeDays, selectedDayId, onSetSelectedDayId]);

  // Ensure selected meal is valid for the selected day
  React.useEffect(() => {
    if (selectedDayId && !isMealEnabled(selectedDayId, selectedMealType, dayConfig)) {
      const firstAvailable = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].find(
        (m) => isMealEnabled(selectedDayId, m, dayConfig)
      );
      if (firstAvailable) {
        onSetSelectedMealType(firstAvailable);
      }
    }
  }, [selectedDayId, dayConfig, selectedMealType, onSetSelectedMealType]);

  const reportRef = useRef<View>(null);

  const isParcelEnabledGlobally = useMemo(() => {
    return dayConfig.some(d => d.enabled && (
      (d[MealType.BREAKFAST].enabled && d[MealType.BREAKFAST].parcel) ||
      (d[MealType.LUNCH].enabled && d[MealType.LUNCH].parcel) ||
      (d[MealType.DINNER].enabled && d[MealType.DINNER].parcel)
    ));
  }, [dayConfig]);

  const handleShare = async () => {
    if (reportRef.current) {
      try {
        const uri = await captureRef(reportRef, {
          format: "png",
          quality: 1,
          result: "tmpfile",
        });

        const reportTitle =
          reportType === ReportType.DAY ? UI_TEXT.dayWiseReport :
          reportType === ReportType.MEAL ? UI_TEXT.mealWiseReport :
          reportType === ReportType.GUEST ? UI_TEXT.guestReport :
          reportType === ReportType.KIDS_MEAL ? UI_TEXT.kidsMealReport :
          reportType === ReportType.PARCEL ? UI_TEXT.parcelReport :
          reportType === ReportType.SINGLE ? `${getDayLabel(selectedDayId, dayConfig)} - ${getMealLabel(selectedMealType)}` :
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
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Pressable onPress={handleShare} style={{ padding: 8 }}>
            <Ionicons name={Platform.OS === 'web' ? "download-outline" : "share-social-outline"} size={24} color={theme.colors.primary} />
          </Pressable>
        </View>
        <Text style={styles.title}>{UI_TEXT.reportTitle}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.reportSubtitle}</Text>
      </View>

      <View style={[styles.maxWidthWrapper, { marginTop: 12 }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ flexGrow: 0, marginBottom: 12 }}
          contentContainerStyle={{ gap: 8 }}
        >
          {[
            { id: ReportType.DAY, label: UI_TEXT.day, icon: "calendar-outline" },
            { id: ReportType.MEAL, label: UI_TEXT.meal, icon: "restaurant-outline" },
            { id: ReportType.GUEST, label: UI_TEXT.guestSuffix, icon: "people-circle-outline" },
            { id: ReportType.KIDS_MEAL, label: UI_TEXT.kids, icon: "happy-outline" },
            { id: ReportType.PARCEL, label: UI_TEXT.parcels, icon: "cube-outline" },
            { id: ReportType.SINGLE, label: UI_TEXT.split, icon: "fast-food-outline" },
            {id: ReportType.NOT_TAKEN, label: UI_TEXT.pending, icon: "alert-circle-outline"},
          {id: ReportType.FLAT, label: UI_TEXT.flat, icon: "business-outline"},
          {id: ReportType.PAYMENT, label: UI_TEXT.payment, icon: "card-outline"},
          ].filter(tab =>
            (tab.id !== ReportType.PAYMENT || paymentConfig.enabled) &&
            (tab.id !== ReportType.GUEST || guestEnabled) &&
            (tab.id !== ReportType.PARCEL || isParcelEnabledGlobally) &&
            (tab.id !== ReportType.KIDS_MEAL || kidsEnabled)
          ).map((tab) => (
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
        contentContainerStyle={[styles.content, { paddingTop: 0 }]}
      >
        {(reportType === ReportType.SINGLE || reportType === ReportType.NOT_TAKEN || reportType === ReportType.KIDS_MEAL) && (
          <View style={[styles.card, { marginBottom: 24, marginTop: 10 }]}>
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
                      {getDayAbbr(day, dayConfig)}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </ScrollView>

            <Text style={styles.selectorLabel}>{UI_TEXT.selectMeal}</Text>
            <View style={styles.selectorRow}>
              {getSortedMealKeys(selectedDayId, dayConfig)
                .filter((mKey) => isMealEnabled(selectedDayId, mKey, dayConfig))
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
                      {getMealLabel(mKey)}
                    </Text>
                  </Pressable>
                ))}
            </View>
          </View>
        )}

        <View ref={reportRef} collapsable={false} style={{ backgroundColor: "transparent" }}>
          <View style={[
            styles.card,
            {
              backgroundColor: theme.colors.primary,
              borderColor: theme.colors.primary,
              marginBottom: s(24),
              paddingVertical: s(16)
            }
          ]}>
            <View style={styles.previewTop}>
              <View>
                <Text style={[styles.previewLabel, { color: theme.colors.white, opacity: 0.7 }]}>{seasonName}</Text>
                <Text style={[styles.previewTitle, { color: theme.colors.white, fontSize: 22 }]}>
                  {reportType === ReportType.DAY && UI_TEXT.dayWiseReport}
                  {reportType === ReportType.MEAL && UI_TEXT.mealWiseReport}
                  {reportType === ReportType.GUEST && UI_TEXT.guestReport}
                  {reportType === ReportType.PARCEL && UI_TEXT.parcelReport}
                  {reportType === ReportType.SINGLE && `${getDayLabel(selectedDayId, dayConfig)}${UI_TEXT.space}${UI_TEXT.hyphen}${UI_TEXT.space}${getMealLabel(selectedMealType)}`}
                  {reportType === ReportType.KIDS_MEAL && UI_TEXT.kidsMealReport}
                  {reportType === ReportType.NOT_TAKEN && `${UI_TEXT.notTakenReport}`}
                  {reportType === ReportType.FLAT && UI_TEXT.flatWiseReport}
                  {reportType === ReportType.PAYMENT && UI_TEXT.paymentReport}
                </Text>
              </View>
            </View>
            <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2, marginVertical: 12 }} />
            <Text style={{ color: theme.colors.white, fontWeight: "700", fontSize: 13 }}>
              {new Date().toLocaleDateString()} {UI_TEXT.operationalSummary}
            </Text>
          </View>

          {reportType === ReportType.DAY && (
            <DayWiseReport
              data={dayWiseData}
              dayConfig={dayConfig}
              kidsEnabled={!!kidsEnabled}
            />
          )}

          {reportType === ReportType.MEAL && (
            <MealWiseReport
              data={mealWiseData}
              dayConfig={dayConfig}
              kidsEnabled={!!kidsEnabled}
            />
          )}

          {reportType === ReportType.GUEST && (
            <GuestWiseReport activeDays={activeDays} foodMenu={foodMenu} dayConfig={dayConfig} />
          )}

          {reportType === ReportType.PARCEL && (
            <ParcelWiseReport data={mealWiseData} dayConfig={dayConfig} />
          )}

          {reportType === ReportType.SINGLE && (
            <SingleMealReport
              selectedDayId={selectedDayId}
              selectedMealType={selectedMealType}
              mealWiseData={mealWiseData}
              dayConfig={dayConfig}
              guestEnabled={guestEnabled}
              kidsEnabled={!!kidsEnabled}
            />
          )}

          {reportType === ReportType.KIDS_MEAL && (
            <KidsReport
              data={getKidsMealData(selectedDayId, selectedMealType)}
              selectedDayId={selectedDayId}
              selectedMealType={selectedMealType}
              dayConfig={dayConfig}
              onSelectFlat={onSelectFlat}
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
              whatsappCountryCode={whatsappCountryCode}
              mobileEnabled={!!mobileEnabled}
              addActivityLog={addActivityLog}
            />
          )}

          {reportType === ReportType.FLAT && (
            <FlatWiseReport
              data={flatWiseData}
              dayConfig={dayConfig}
              onSelectFlat={onSelectFlat}
              kidsEnabled={!!kidsEnabled}
            />
          )}

          {reportType === ReportType.PAYMENT && (
            <PaymentSummaryReport data={paymentData} onSelectFlat={onSelectFlat} />
          )}
        </View>
        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
