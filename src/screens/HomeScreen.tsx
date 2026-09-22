import React from "react";
import { View, Text, ScrollView, Pressable, StatusBar, useWindowDimensions, Linking } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { useAppTheme, StatusBarStyleMode } from "../theme";
import { UI_TEXT } from "../strings";
import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";
import { AppScreen, UserRole, MealType, AppThemeMode, DietaryOption, DietType } from "../types";
import { getActiveDays, isSeasonDone, isMealCurrent, getDayLabel, isMealEnabled, isDietaryEnabled, getMealLabel } from "../constants";
import { ActionLabel } from "../components/common/ActionLabel";
import { LogoutButton } from "../components/common/LogoutButton";

export function HomeScreen() {
  const styles = useStyles();
  const { s, v, isWeb } = useScaling();
  const { theme, themeType, toggleTheme } = useAppTheme();
  const { userRole, handleLogout, versionAlertShown, markVersionAlertShown } = useAuth();
  const {
    subscriptions, dayConfig, seasonName, seasonEnabled, guestEnabled, totalPeople, firebaseError, paymentConfig, collections, kidsEnabled, foodMenu, remoteAppVersion, loading
  } = useDatabase();
  const { navigate, startNew } = useAppNavigation();
  const { showAlert, showGlobalError } = useUI();
  const { width } = useWindowDimensions();

  React.useEffect(() => {
    if (
      !loading &&
      !versionAlertShown &&
      remoteAppVersion &&
      remoteAppVersion.trim() !== UI_TEXT.appVersion.trim()
    ) {
      markVersionAlertShown();
      showAlert(
        UI_TEXT.appUpdateTitle,
        UI_TEXT.appUpdatedMessage,
        [{ text: UI_TEXT.ok, style: "default" }]
      );
    }
  }, [remoteAppVersion, loading, versionAlertShown, markVersionAlertShown, showAlert]);

  const isNarrow = width < 400;
  const cardPadding = isNarrow ? 22 : s(30);
  const cardMinHeight = isNarrow ? 120 : (isWeb ? s(140) : s(160));
  const mainFontSize = isNarrow ? 24 : s(32);
  const secondaryFontSize = isNarrow ? 20 : s(26);
  const labelFontSize = isNarrow ? 11 : s(13);
  const rowGap = isNarrow ? 12 : s(15);
  const iconSize = s(18);
  const actionIconSize = s(140);
  const actionIconSizeLarge = s(180);

  // Find if there is an active current meal going on right now
  const summaryCounts = React.useMemo(() => {
    let adults = 0;
    let kids = 0;
    let vegPlates = 0;
    let nonVegPlates = 0;

    const activeDays = getActiveDays(dayConfig);

    subscriptions.forEach((sub) => {
      adults += (sub.peopleCount || 0);
      kids += (sub.kidsCount || 0);

      activeDays.forEach(dayId => {
        const slots = sub.mealSlots[dayId] || [];
        slots.forEach((slot) => {
          [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach(mType => {
            if (!isMealEnabled(dayId, mType, dayConfig)) return;

            const choice = slot[mType];
            if (choice === DietaryOption.VEG && isDietaryEnabled(dayId, mType, DietType.VEG, dayConfig)) {
              vegPlates++;
            } else if (choice === DietaryOption.NON_VEG && isDietaryEnabled(dayId, mType, DietType.NON_VEG, dayConfig)) {
              nonVegPlates++;
            }
          });
        });
      });
    });

    // Add Guest counts if enabled
    if (guestEnabled) {
      Object.keys(foodMenu).forEach(dayId => {
        if (!activeDays.includes(dayId)) return;
        const dayMenu = foodMenu[dayId];
        [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach(mType => {
          if (!isMealEnabled(dayId, mType, dayConfig)) return;
          const meal = dayMenu[mType];
          if (meal) {
            vegPlates += (meal.guestVeg || 0);
            nonVegPlates += (meal.guestNonVeg || 0);
          }
        });
      });
    }

    return { adults, kids, vegPlates, nonVegPlates, totalPlates: vegPlates + nonVegPlates };
  }, [subscriptions, dayConfig, foodMenu, guestEnabled]);

  const { isVegEnabledGlobally, isNonVegEnabledGlobally } = React.useMemo(() => {
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

  const guestSummary = React.useMemo(() => {
    let seasonTotal = 0;
    let currentMealTotal = 0;

    Object.keys(foodMenu).forEach(dayId => {
      const dayMenu = foodMenu[dayId];
      [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].forEach(mType => {
        const meal = dayMenu[mType];
        if (meal) {
          const mGuest = (meal.guestVeg || 0) + (meal.guestNonVeg || 0);
          seasonTotal += mGuest;

          if (isMealCurrent(dayId, mType, dayConfig) && isMealEnabled(dayId, mType, dayConfig)) {
            currentMealTotal = mGuest;
          }
        }
      });
    });

    return { seasonTotal, currentMealTotal };
  }, [foodMenu, dayConfig]);

  const currentMealInfo = React.useMemo(() => {
    const active = getActiveDays(dayConfig);
    for (const dId of active) {
      for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
        if (isMealCurrent(dId, mType, dayConfig) && isMealEnabled(dId, mType, dayConfig)) {
          return { dayLabel: getDayLabel(dId, dayConfig), mealLabel: getMealLabel(mType) };
        }
      }
    }
    return null;
  }, [dayConfig]);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 16 }}>
          <Pressable onPress={toggleTheme} style={[styles.backButton, { width: 36, height: 36, borderRadius: 18, paddingHorizontal: 0 }]}>
             <Ionicons name={themeType === AppThemeMode.DARK ? "sunny-outline" : "moon-outline"} size={18} color={theme.colors.secondary} />
          </Pressable>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.headerTitle}</Text>
      </View>

      <ScrollView style={{ flex: 1, width: "100%" }} contentContainerStyle={[styles.content, { paddingBottom: 150 }]}>
        {firebaseError ? (
          <Pressable onPress={() => showGlobalError(firebaseError)} style={styles.firebaseBanner}>
            <Text style={styles.firebaseBannerTitle}>{UI_TEXT.offlineMode}</Text>
            <Text style={styles.firebaseBannerText} numberOfLines={1}>{firebaseError}</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={navigate.bind(null, AppScreen.SUBSCRIPTION_LIST)} style={[styles.summary, { padding: cardPadding, marginBottom: s(16), overflow: 'hidden', minHeight: cardMinHeight }]}>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', opacity: 0.08 }}>
            <Ionicons name="ticket-outline" size={isNarrow ? 140 : actionIconSizeLarge} color={theme.colors.white} />
          </View>

          <View style={{ flex: 1, justifyContent: 'center' }}>
            {!!seasonName && <Text style={[styles.summaryLabel, { marginBottom: isNarrow ? 10 : s(16), color: theme.colors.secondary, fontSize: isNarrow ? 9 : s(11) }]}>{seasonName}</Text>}

            <View style={{ gap: rowGap }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: s(12), flexWrap: 'wrap' }}>
                <Text style={[styles.summaryLabel, { fontSize: labelFontSize }]}>{UI_TEXT.activePasses}:</Text>
                <Text style={[styles.summaryNumber, { fontSize: mainFontSize, marginTop: 0, lineHeight: mainFontSize + 4 }]}>{subscriptions.length}</Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: s(12), flexWrap: 'wrap' }}>
                <Text style={[styles.summaryLabel, { opacity: 0.8, fontSize: labelFontSize }]}>{UI_TEXT.totalPeopleLabel}:</Text>
                <Text style={[styles.summaryNumber, { fontSize: secondaryFontSize, marginTop: 0, lineHeight: secondaryFontSize + 4 }]}>
                  {totalPeople}
                </Text>
                {kidsEnabled && (
                  <Text style={{ fontSize: labelFontSize, color: theme.colors.white, opacity: 0.7, fontWeight: '700', marginLeft: s(-4) }}>
                    {UI_TEXT.openParen}
                    {summaryCounts.adults}{UI_TEXT.space}{summaryCounts.adults === 1 ? UI_TEXT.adult : UI_TEXT.adults}
                    {UI_TEXT.plus}
                    {summaryCounts.kids}{UI_TEXT.space}{summaryCounts.kids === 1 ? UI_TEXT.kid : UI_TEXT.kids}
                    {UI_TEXT.closeParen}
                  </Text>
                )}
              </View>

              {guestEnabled && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: s(12), flexWrap: 'wrap' }}>
                  <Text style={[styles.summaryLabel, { opacity: 0.8, fontSize: labelFontSize }]}>{UI_TEXT.totalGuests}{UI_TEXT.colon}</Text>
                  <Text style={[styles.summaryNumber, { fontSize: secondaryFontSize, marginTop: 0, lineHeight: secondaryFontSize + 4 }]}>
                    {guestSummary.seasonTotal}
                  </Text>
                </View>
              )}

              <View style={{ flexDirection: "row", alignItems: "center", gap: s(12), flexWrap: 'wrap' }}>
                <Text style={[styles.summaryLabel, { opacity: 0.8, fontSize: labelFontSize }]}>{UI_TEXT.totalPlates.toUpperCase()}:</Text>
                <Text style={[styles.summaryNumber, { fontSize: secondaryFontSize, marginTop: 0, lineHeight: secondaryFontSize + 4 }]}>
                  {summaryCounts.totalPlates}
                </Text>
                {isVegEnabledGlobally && isNonVegEnabledGlobally && (
                  <Text style={{ fontSize: labelFontSize, color: theme.colors.white, opacity: 0.7, fontWeight: '700', marginLeft: s(-4) }}>
                    {UI_TEXT.openParen}
                    {summaryCounts.vegPlates}{UI_TEXT.space}{UI_TEXT.vegLabel}
                    {UI_TEXT.pipe}
                    {summaryCounts.nonVegPlates}{UI_TEXT.space}{UI_TEXT.nonVegLabel}
                    {UI_TEXT.closeParen}
                  </Text>
                )}
              </View>

              {paymentConfig?.enabled && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: s(12), flexWrap: 'wrap' }}>
                  <Text style={[styles.summaryLabel, { opacity: 0.8, fontSize: labelFontSize }]}>{UI_TEXT.totalCollection}{UI_TEXT.colon}</Text>
                  <Text style={[styles.summaryNumber, { fontSize: secondaryFontSize, marginTop: 0, lineHeight: secondaryFontSize + 4 }]}>{UI_TEXT.rs}{UI_TEXT.space}{collections.total.toLocaleString()}</Text>
                </View>
              )}
            </View>
          </View>

          <View style={{ position: 'absolute', top: cardPadding, right: cardPadding }}>
            {currentMealInfo ? (
              <Pressable
                onPress={() => navigate(AppScreen.DASHBOARD)}
                style={{ flexDirection: "row", alignItems: "center", gap: s(4), backgroundColor: theme.colors.white + "33", paddingHorizontal: isNarrow ? 8 : s(10), paddingVertical: s(5), borderRadius: s(8) }}
              >
                <View style={{ width: s(5), height: s(5), borderRadius: s(2.5), backgroundColor: theme.colors.success }} />
                <Text style={{ fontSize: isNarrow ? 9 : s(10), fontWeight: "900", color: theme.colors.white }}>
                  {currentMealInfo.dayLabel.toUpperCase()}{UI_TEXT.space}{currentMealInfo.mealLabel.toUpperCase()}
                </Text>
              </Pressable>
            ) : null}
          </View>
        </Pressable>

        <View style={styles.compactActions}>
          {userRole === UserRole.ADMIN && seasonEnabled && !isSeasonDone(dayConfig) && (
            <Pressable accessibilityLabel={UI_TEXT.addFlat} onPress={() => startNew(dayConfig, seasonName, paymentConfig, guestEnabled, true, seasonEnabled)} style={[styles.compactSecondary, { backgroundColor: theme.colors.success, borderColor: theme.colors.success }]} disabled={getActiveDays(dayConfig).length === 0}>
              <ActionLabel icon="add-circle-outline" label={UI_TEXT.addFlat} color={theme.colors.white} size={iconSize} vertical />
            </Pressable>
          )}
          {guestEnabled && (
            <Pressable accessibilityLabel={UI_TEXT.guestButton} onPress={() => navigate(AppScreen.GUEST_MANAGEMENT)} style={[styles.compactSecondary, { backgroundColor: theme.cardColors[2].accent, borderColor: theme.cardColors[2].accent }]}>
              <ActionLabel icon="people-circle-outline" label={UI_TEXT.guestButton} color={theme.colors.white} size={iconSize} vertical />
            </Pressable>
          )}
          <Pressable accessibilityLabel={UI_TEXT.subscriptions} onPress={() => navigate(AppScreen.SUBSCRIPTION_LIST)} style={[styles.compactSecondary, { backgroundColor: theme.cardColors[1].accent, borderColor: theme.cardColors[1].accent }]}>
            <ActionLabel icon="list-outline" label={UI_TEXT.subscriptions} color={theme.colors.white} size={iconSize} vertical />
          </Pressable>
          <Pressable accessibilityLabel={UI_TEXT.scanQr} onPress={() => navigate(AppScreen.SCANNER)} style={[styles.compactSecondary, { backgroundColor: theme.cardColors[4].accent, borderColor: theme.cardColors[4].accent }]}>
            <ActionLabel icon="scan-outline" label={UI_TEXT.scanQr} color={theme.colors.white} size={iconSize} vertical />
          </Pressable>
          <Pressable accessibilityLabel={UI_TEXT.dashboard} onPress={() => navigate(AppScreen.DASHBOARD)} style={[styles.compactSecondary, { backgroundColor: theme.cardColors[3].accent, borderColor: theme.cardColors[3].accent }]}>
            <ActionLabel icon="stats-chart-outline" label={UI_TEXT.dashboard} color={theme.colors.white} size={iconSize} vertical />
          </Pressable>
          <Pressable accessibilityLabel={UI_TEXT.report} onPress={() => navigate(AppScreen.REPORT)} style={[styles.compactSecondary, { backgroundColor: theme.cardColors[5].accent, borderColor: theme.cardColors[5].accent }]}>
            <ActionLabel icon="document-text-outline" label={UI_TEXT.report} color={theme.colors.white} size={iconSize} vertical />
          </Pressable>
          <Pressable accessibilityLabel={UI_TEXT.viewMenu} onPress={() => navigate(AppScreen.VIEW_MENU)} style={[styles.compactSecondary, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
            <ActionLabel icon="restaurant-outline" label={UI_TEXT.viewMenu} color={theme.colors.white} size={iconSize} vertical />
          </Pressable>
          <Pressable accessibilityLabel={UI_TEXT.notes} onPress={() => navigate(AppScreen.NOTES)} style={[styles.compactSecondary, { backgroundColor: theme.cardColors[0].accent, borderColor: theme.cardColors[0].accent }]}>
            <ActionLabel icon="document-text-outline" label={UI_TEXT.notes} color={theme.colors.white} size={iconSize} vertical />
          </Pressable>
          {userRole === UserRole.ADMIN && (
            <>
              <Pressable accessibilityLabel={UI_TEXT.contacts} onPress={() => navigate(AppScreen.CONTACTS)} style={[styles.compactSecondary, { backgroundColor: theme.cardColors[2].accent, borderColor: theme.cardColors[2].accent }]}>
                <ActionLabel icon="people-outline" label={UI_TEXT.contacts} color={theme.colors.white} size={iconSize} vertical />
              </Pressable>
              <Pressable accessibilityLabel={UI_TEXT.activityLog} onPress={() => navigate(AppScreen.ACTIVITY_LOG)} style={[styles.compactSecondary, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
                <ActionLabel icon="time-outline" label={UI_TEXT.activityLog} color={theme.colors.white} size={iconSize} vertical />
              </Pressable>
              <Pressable accessibilityLabel={UI_TEXT.settings} onPress={() => navigate(AppScreen.SETTINGS)} style={[styles.compactSecondary, { backgroundColor: theme.colors.textMuted, borderColor: theme.colors.textMuted }]}>
                <ActionLabel icon="settings-outline" label={UI_TEXT.settings} color={theme.colors.white} size={iconSize} vertical />
              </Pressable>
              <Pressable
                accessibilityLabel={UI_TEXT.reportBug}
                onPress={() => Linking.openURL(`mailto:${UI_TEXT.supportEmail}?subject=${encodeURIComponent(UI_TEXT.bugReportSubject)}`)}
                style={[styles.compactSecondary, { backgroundColor: theme.colors.error, borderColor: theme.colors.error }]}
              >
                <ActionLabel icon="bug-outline" label={UI_TEXT.reportBug} color={theme.colors.white} size={iconSize} vertical />
              </Pressable>
            </>
          )}
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
