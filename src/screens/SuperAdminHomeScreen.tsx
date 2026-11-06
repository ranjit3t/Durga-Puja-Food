/**
 * SuperAdmin Home Screen
 * Dedicated portal for Super Administrators featuring system-wide summary cards
 * and management shortcuts for Tenant Management and Version Management.
 * Fully accessible, mobile-friendly, theme-aware, and localized via UI_TEXT.
 */
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { View, Text, ScrollView, Pressable, StatusBar, useWindowDimensions, TextInput, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { useAuth } from "../context/AuthContext";
import { useActivityLogs, useCoreDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";
import { AppScreen, AppThemeMode, ActivityModule, ActivityAction } from "../types";
import { ActionLabel } from "../components/common/ActionLabel";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { UserGreeting } from "../components/common/UserGreeting";
import { createFirebaseRepository } from "../repository";
import { TenantRecord, UserRecord } from "./TenantManagementScreen";

const repository = createFirebaseRepository();

export function SuperAdminHomeScreen() {
  const styles = useStyles();
  const { s, isWeb } = useScaling();
  const { theme, themeType } = useAppTheme();
  const { handleLogout } = useAuth();
  const {
    firebaseError, remoteAppVersion, androidAppLocation, iosAppLocation, seasons
  } = useCoreDatabase();
  const { navigate } = useAppNavigation();
  const { addActivityLog } = useActivityLogs();
  const { showAlert, showGlobalError } = useUI();
  const { width } = useWindowDimensions();

  const [tenants, setTenants] = useState<Record<string, TenantRecord>>({});
  const [tenantAdmins, setTenantAdmins] = useState<UserRecord[]>([]);

  // Version Management State
  const [androidLoc, setAndroidLoc] = useState(androidAppLocation || "");
  const [iosLoc, setIosLoc] = useState(iosAppLocation || "");
  const [appVer, setAppVer] = useState(remoteAppVersion || "");
  const [depVer, setDepVer] = useState("");
  const [savingVersion, setSavingVersion] = useState(false);
  const [isVersionManagementModalOpen, setIsVersionManagementModalOpen] = useState(false);

  const fetchSuperAdminData = useCallback(async () => {
    try {
      const [tList, authCfg, verInfo] = await Promise.all([
        repository.listTenants(),
        repository.getAuthConfig(),
        repository.getAppVersion(),
      ]);
      setTenants((tList as Record<string, TenantRecord>) || {});
      if (authCfg && Array.isArray(authCfg.users)) {
        setTenantAdmins(authCfg.users as UserRecord[]);
      }
      if (verInfo) {
        setAndroidLoc(verInfo.androidAppLocation || "");
        setIosLoc(verInfo.iosAppLocation || "");
        setAppVer(verInfo.version || "");
        setDepVer(verInfo.deprecatedVersion || "");
      }
    } catch (err: unknown) {
      console.error("SuperAdmin fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchSuperAdminData();
    const unsubAuth = repository.onAuthConfigChange((cfg) => {
      if (cfg && Array.isArray(cfg.users)) {
        setTenantAdmins(cfg.users as UserRecord[]);
      }
    });
    return () => {
      unsubAuth();
    };
  }, [fetchSuperAdminData]);

  const totalTenantsCount = useMemo(() => Object.keys(tenants).length, [tenants]);
  const totalSeasonsCount = useMemo(() => (seasons && seasons.length > 0 ? seasons.length : 1), [seasons]);
  const activeSeasonsCount = useMemo(() => (seasons && seasons.length > 0 ? seasons.filter((s: { seasonEnabled?: boolean; seasonCompleted?: boolean }) => s.seasonEnabled && !s.seasonCompleted).length : 1), [seasons]);
  const totalUsersCount = useMemo(() => tenantAdmins.length, [tenantAdmins]);
  const onlineUsersCount = useMemo(() => tenantAdmins.filter((u: UserRecord) => !u.disabled && !u.deleted && !u.locked).length, [tenantAdmins]);

  const handleSaveVersion = async () => {
    try {
      setSavingVersion(true);
      await repository.updateAppVersionInfo({
        androidAppLocation: androidLoc.trim(),
        iosAppLocation: iosLoc.trim(),
        version: appVer.trim(),
        deprecatedVersion: depVer.trim(),
      });
      addActivityLog({
        module: ActivityModule.CONFIG,
        action: ActivityAction.UPDATE,
        targetId: "app_version",
        description: `Updated global app version to ${appVer.trim()}`,
      });
      showAlert(UI_TEXT.success, UI_TEXT.settingsUpdated);
    } catch (err: unknown) {
      const error = err as Error;
      showAlert(UI_TEXT.error, error.message || UI_TEXT.authServerError);
    } finally {
      setSavingVersion(false);
    }
  };

  const isNarrow = width < 400;
  const cardPadding = isWeb ? s(12) : (isNarrow ? 14 : s(16));
  const mainFontSize = isNarrow ? 20 : (isWeb ? s(22) : s(24));
  const secondaryFontSize = isNarrow ? 16 : (isWeb ? s(18) : s(20));
  const labelFontSize = isNarrow ? 10 : (isWeb ? s(11) : s(11));
  const rowGap = isWeb ? s(4) : (isNarrow ? 6 : s(6));
  const iconSize = s(18);
  const actionIconSizeLarge = s(150);

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <UserGreeting />
        <Text style={styles.title}>{UI_TEXT.headerTitle}</Text>
      </View>

      <ScrollView style={{ flex: 1, width: "100%" }} contentContainerStyle={[styles.content, { paddingBottom: 150 }]}>
        {firebaseError ? (
          <Pressable onPress={() => showGlobalError(firebaseError)} style={styles.firebaseBanner}>
            <Text style={styles.firebaseBannerTitle}>{UI_TEXT.offlineMode}</Text>
            <Text style={styles.firebaseBannerText} numberOfLines={1}>{firebaseError}</Text>
          </Pressable>
        ) : null}

        {/* Top Red Summary Card for SuperAdmin */}
        <View
          style={[styles.summary, { padding: cardPadding, marginBottom: s(16), overflow: 'hidden', backgroundColor: theme.colors.primary, borderRadius: 16 }]}
        >
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', opacity: 0.08 }}>
            <Ionicons name="shield-checkmark-outline" size={isNarrow ? 120 : actionIconSizeLarge} color={theme.colors.white} />
          </View>

          <View style={{ flex: 1, justifyContent: 'center', gap: rowGap }}>
            <Text style={[styles.summaryLabel, { color: theme.colors.secondary, fontSize: isNarrow ? 9 : s(11), textTransform: "uppercase", letterSpacing: 0.5 }]}>
              {UI_TEXT.superAdminTitle || "Super Administrator Portal"}
            </Text>

            <View style={{ flexDirection: "row", alignItems: "center", gap: s(12), flexWrap: 'wrap' }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: s(4) }}>
                <Text style={[styles.summaryLabel, { fontSize: labelFontSize }]}>Tenants:</Text>
                <Text style={[styles.summaryNumber, { fontSize: mainFontSize, marginTop: 0, lineHeight: mainFontSize + 2 }]}>
                  {totalTenantsCount}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: s(4) }}>
                <Text style={[styles.summaryLabel, { fontSize: labelFontSize }]}>Seasons:</Text>
                <Text style={[styles.summaryNumber, { fontSize: mainFontSize, marginTop: 0, lineHeight: mainFontSize + 2 }]}>
                  {totalSeasonsCount} ({activeSeasonsCount} Active)
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: s(12), flexWrap: 'wrap', marginTop: 2 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: s(4) }}>
                <Text style={[styles.summaryLabel, { fontSize: labelFontSize }]}>Users:</Text>
                <Text style={[styles.summaryNumber, { fontSize: secondaryFontSize, marginTop: 0, lineHeight: secondaryFontSize + 2 }]}>
                  {totalUsersCount} ({onlineUsersCount} Active)
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Buttons for SuperAdmin */}
        <View style={styles.compactActions}>
          <Pressable
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={UI_TEXT.manageTenantsSection || "Tenant Management"}
            onPress={() => navigate(AppScreen.TENANT_MANAGEMENT)}
            style={[styles.compactSecondary, { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary, flex: 1, height: 60 }]}
          >
            <ActionLabel icon="business-outline" label={UI_TEXT.manageTenantsSection || "Tenant Management"} color={theme.colors.white} size={iconSize} vertical />
          </Pressable>

          <Pressable
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={UI_TEXT.versionManagementSection || "Version Management"}
            onPress={() => setIsVersionManagementModalOpen(true)}
            style={[styles.compactSecondary, { backgroundColor: theme.cardColors[2].accent || theme.colors.secondary, borderColor: theme.cardColors[2].accent || theme.colors.secondary, flex: 1, height: 60 }]}
          >
            <ActionLabel icon="cloud-upload-outline" label={UI_TEXT.versionManagementSection || "Version Management"} color={theme.colors.white} size={iconSize} vertical />
          </Pressable>

          <Pressable
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={UI_TEXT.activityLog || "Audit Logs"}
            onPress={() => navigate(AppScreen.ACTIVITY_LOG)}
            style={[styles.compactSecondary, { backgroundColor: theme.cardColors[3].accent || theme.colors.primary, borderColor: theme.cardColors[3].accent || theme.colors.primary, flex: 1, height: 60 }]}
          >
            <ActionLabel icon="time-outline" label={UI_TEXT.activityLog || "Audit Logs"} color={theme.colors.white} size={iconSize} vertical />
          </Pressable>

          <Pressable
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={UI_TEXT.notes || "Operational Notes"}
            onPress={() => navigate(AppScreen.NOTES)}
            style={[styles.compactSecondary, { backgroundColor: theme.cardColors[0].accent || theme.colors.primary, borderColor: theme.cardColors[0].accent || theme.colors.primary, flex: 1, height: 60 }]}
          >
            <ActionLabel icon="document-text-outline" label={UI_TEXT.notes || "Operational Notes"} color={theme.colors.white} size={iconSize} vertical />
          </Pressable>
        </View>

        {/* Version Management Modal */}
        <Modal visible={isVersionManagementModalOpen} transparent={true} animationType="fade" onRequestClose={() => setIsVersionManagementModalOpen(false)}>
          <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.6)", justifyContent: "center", alignItems: "center", padding: 20 }}>
            <View style={{ backgroundColor: theme.colors.surface, borderRadius: 20, padding: 20, width: "100%", maxWidth: 500, gap: 16, borderWidth: 1.5, borderColor: theme.colors.border }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text style={{ fontSize: 18, fontWeight: '900', color: theme.colors.textPrimary }}>
                  {UI_TEXT.versionManagementSection}
                </Text>
                <Pressable onPress={() => setIsVersionManagementModalOpen(false)} accessible={true} accessibilityRole="button">
                  <Ionicons name="close-circle-outline" size={24} color={theme.colors.textMuted} />
                </Pressable>
              </View>

              <View style={{ gap: 12 }}>
                <View>
                  <Text style={styles.selectorLabel}>{UI_TEXT.appVersionLabel || "Latest App Version"}</Text>
                  <TextInput
                    style={styles.input}
                    value={appVer}
                    onChangeText={setAppVer}
                    placeholder="e.g. 1.0.2"
                    placeholderTextColor={theme.colors.textMuted}
                    selectTextOnFocus
                  />
                </View>

                <View>
                  <Text style={styles.selectorLabel}>{UI_TEXT.deprecatedVersionLabel || "Deprecated Version (Minimum Required)"}</Text>
                  <TextInput
                    style={styles.input}
                    value={depVer}
                    onChangeText={setDepVer}
                    placeholder="e.g. 1.0.0"
                    placeholderTextColor={theme.colors.textMuted}
                    selectTextOnFocus
                  />
                </View>

                <View>
                  <Text style={styles.selectorLabel}>{UI_TEXT.androidAppLocationLabel || "Android App Location / APK URL"}</Text>
                  <TextInput
                    style={styles.input}
                    value={androidLoc}
                    onChangeText={setAndroidLoc}
                    placeholder="https://..."
                    placeholderTextColor={theme.colors.textMuted}
                    selectTextOnFocus
                  />
                </View>

                <View>
                  <Text style={styles.selectorLabel}>{UI_TEXT.iosAppLocationLabel || "iOS App Location / IPA URL"}</Text>
                  <TextInput
                    style={styles.input}
                    value={iosLoc}
                    onChangeText={setIosLoc}
                    placeholder="https://..."
                    placeholderTextColor={theme.colors.textMuted}
                    selectTextOnFocus
                  />
                </View>

                <View style={{ flexDirection: "row", gap: 12, marginTop: 12 }}>
                  <Pressable
                    onPress={() => setIsVersionManagementModalOpen(false)}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        height: 46,
                        borderRadius: 12,
                        borderWidth: 1.5,
                        borderColor: theme.colors.border,
                        backgroundColor: theme.colors.surfaceDark,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={UI_TEXT.cancel}
                  >
                    <Text style={{ fontWeight: "800", color: theme.colors.textPrimary, fontSize: 14 }}>
                      {UI_TEXT.cancel}
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={async () => {
                      await handleSaveVersion();
                      setIsVersionManagementModalOpen(false);
                    }}
                    disabled={savingVersion}
                    style={({ pressed }) => [
                      {
                        flex: 1,
                        height: 46,
                        borderRadius: 12,
                        backgroundColor: theme.colors.primary,
                        alignItems: "center",
                        justifyContent: "center",
                      },
                      savingVersion && { opacity: 0.5 },
                      pressed && { opacity: 0.8 },
                    ]}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={UI_TEXT.saveChanges}
                  >
                    <Text style={{ fontWeight: "900", color: theme.colors.white, fontSize: 14 }}>
                      {savingVersion ? UI_TEXT.saving : UI_TEXT.saveChanges}
                    </Text>
                  </Pressable>
                </View>
              </View>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
}
