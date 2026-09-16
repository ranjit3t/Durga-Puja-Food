import React from "react";
import { View, Text, ScrollView, Pressable, StatusBar } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";
import { AppScreen, UserRole } from "../types";
import { getActiveDays, isSeasonDone } from "../constants";
import { ActionLabel } from "../components/common/ActionLabel";
import { LogoutButton } from "../components/common/LogoutButton";

export function HomeScreen() {
  const styles = useStyles();
  const { theme, themeType, toggleTheme } = useAppTheme();
  const { userRole, handleLogout } = useAuth();
  const {
    subscriptions, dayConfig, seasonName, seasonEnabled, guestEnabled, totalPeople, firebaseError, paymentConfig, collections
  } = useDatabase();
  const { navigate, startNew } = useAppNavigation();
  const { showGlobalError } = useUI();

  return (
    <View style={styles.root}>
      <StatusBar style={themeType === "dark" ? "light" : "dark"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 16 }}>
          <Pressable onPress={toggleTheme} style={[styles.backButton, { width: 36, height: 36, borderRadius: 18, paddingHorizontal: 0 }]}>
             <Ionicons name={themeType === "dark" ? "sunny-outline" : "moon-outline"} size={18} color={theme.colors.secondary} />
          </Pressable>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.appName}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.tagline}</Text>
      </View>

      <ScrollView style={{ flex: 1, width: "100%" }} contentContainerStyle={[styles.content, { paddingBottom: 150 }]}>
        {firebaseError ? (
          <Pressable onPress={() => showGlobalError(firebaseError)} style={styles.firebaseBanner}>
            <Text style={styles.firebaseBannerTitle}>{UI_TEXT.offlineMode}</Text>
            <Text style={styles.firebaseBannerText} numberOfLines={1}>{firebaseError}</Text>
          </Pressable>
        ) : null}

        <Pressable onPress={() => navigate(AppScreen.SUBSCRIPTION_LIST)} style={styles.summary}>
          <View>
            {!!seasonName && <Text style={[styles.summaryLabel, { marginBottom: 2, color: theme.colors.secondary }]}>{seasonName}</Text>}
            <Text style={styles.summaryLabel}>{UI_TEXT.activePasses}</Text>
            <Text style={styles.summaryNumber}>{subscriptions.length}</Text>
            <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2, marginVertical: 8 }} />
            <Text style={[styles.summaryLabel, { opacity: 0.8 }]}>{UI_TEXT.totalPeopleLabel}</Text>
            <Text style={[styles.summaryNumber, { fontSize: 24, marginTop: 2 }]}>{totalPeople}</Text>
            {paymentConfig?.enabled && (
              <>
                <View style={{ height: 1, backgroundColor: theme.colors.white, opacity: 0.2, marginVertical: 8 }} />
                <Text style={[styles.summaryLabel, { opacity: 0.8 }]}>{UI_TEXT.totalCollection}</Text>
                <Text style={[styles.summaryNumber, { fontSize: 24, marginTop: 2 }]}>{UI_TEXT.rs} {collections.total.toLocaleString()}</Text>
              </>
            )}
          </View>
          <Ionicons name="ticket-outline" size={64} color={theme.colors.white} style={{ opacity: 0.3 }} />
        </Pressable>

        <View style={styles.compactActions}>
          {userRole === UserRole.ADMIN && seasonEnabled && !isSeasonDone(dayConfig) && (
            <Pressable accessibilityLabel={UI_TEXT.addFlat} onPress={() => startNew(dayConfig, seasonName, paymentConfig, guestEnabled, true, seasonEnabled)} style={[styles.compactSecondary, { backgroundColor: theme.colors.success, borderColor: theme.colors.success }]} disabled={getActiveDays(dayConfig).length === 0}>
              <ActionLabel icon="add-circle-outline" label={UI_TEXT.addFlat} color={theme.colors.white} size={20} vertical />
            </Pressable>
          )}
          {guestEnabled && (
            <Pressable accessibilityLabel={UI_TEXT.guestButton} onPress={() => navigate(AppScreen.GUEST_MANAGEMENT)} style={[styles.compactSecondary, { backgroundColor: theme.cardColors[2].accent, borderColor: theme.cardColors[2].accent }]}>
              <ActionLabel icon="people-circle-outline" label={UI_TEXT.guestButton} color={theme.colors.white} size={20} vertical />
            </Pressable>
          )}
          <Pressable accessibilityLabel={UI_TEXT.subscriptions} onPress={() => navigate(AppScreen.SUBSCRIPTION_LIST)} style={[styles.compactSecondary, { backgroundColor: theme.cardColors[1].accent, borderColor: theme.cardColors[1].accent }]}>
            <ActionLabel icon="list-outline" label={UI_TEXT.subscriptions} color={theme.colors.white} size={20} vertical />
          </Pressable>
          <Pressable accessibilityLabel={UI_TEXT.scanQr} onPress={() => navigate(AppScreen.SCANNER)} style={[styles.compactSecondary, { backgroundColor: theme.cardColors[4].accent, borderColor: theme.cardColors[4].accent }]}>
            <ActionLabel icon="scan-outline" label={UI_TEXT.scanQr} color={theme.colors.white} size={20} vertical />
          </Pressable>
          <Pressable accessibilityLabel={UI_TEXT.dashboard} onPress={() => navigate(AppScreen.DASHBOARD)} style={[styles.compactSecondary, { backgroundColor: theme.cardColors[3].accent, borderColor: theme.cardColors[3].accent }]}>
            <ActionLabel icon="stats-chart-outline" label={UI_TEXT.dashboard} color={theme.colors.white} size={20} vertical />
          </Pressable>
          <Pressable accessibilityLabel={UI_TEXT.report} onPress={() => navigate(AppScreen.REPORT)} style={[styles.compactSecondary, { backgroundColor: theme.cardColors[5].accent, borderColor: theme.cardColors[5].accent }]}>
            <ActionLabel icon="document-text-outline" label={UI_TEXT.report} color={theme.colors.white} size={20} vertical />
          </Pressable>
          <Pressable accessibilityLabel={UI_TEXT.viewMenu} onPress={() => navigate(AppScreen.VIEW_MENU)} style={[styles.compactSecondary, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary }]}>
            <ActionLabel icon="restaurant-outline" label={UI_TEXT.viewMenu} color={theme.colors.white} size={20} vertical />
          </Pressable>
          {userRole === UserRole.ADMIN && (
            <Pressable accessibilityLabel={UI_TEXT.settings} onPress={() => navigate(AppScreen.SETTINGS)} style={[styles.compactSecondary, { backgroundColor: theme.colors.textMuted, borderColor: theme.colors.textMuted }]}>
              <ActionLabel icon="settings-outline" label={UI_TEXT.settings} color={theme.colors.white} size={20} vertical />
            </Pressable>
          )}
        </View>
        <View style={styles.footer}>
          <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
