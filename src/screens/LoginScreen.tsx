/**
 * Authentication screen for the application.
 * Handles user login and role assignment (Admin/Vendor).
 */
import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
} from "react-native";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { UserRole, AppThemeMode, ActivityModule, ActivityAction } from "../types";
import { isVersionBehind, isVersionLessOrEqual } from "../constants";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { verifyPassword, encryptPassword } from "../utils/authUtils";
import { createFirebaseRepository } from "../repository";

const repository = createFirebaseRepository();

const failedAttemptsMap = new Map<string, number>();

function recordFailedAttempt(username: string): number {
  const key = username.trim().toLowerCase();
  const count = (failedAttemptsMap.get(key) || 0) + 1;
  failedAttemptsMap.set(key, count);
  return count;
}

function clearFailedAttempts(username: string) {
  const key = username.trim().toLowerCase();
  failedAttemptsMap.delete(key);
}

export function LoginScreen() {
  const { handleLogin, versionAlertShown, markVersionAlertShown } = useAuth();
  const { getAuthConfig, addActivityLog } = useDatabase();
  const { showAlert } = useUI();
  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);

  const [remoteAppVersion, setRemoteAppVersion] = useState<string | null>(null);
  const [deprecatedVersion, setDeprecatedVersion] = useState<string | null>(null);
  const [androidAppLocation, setAndroidAppLocation] = useState<string | undefined>();
  const [iosAppLocation, setIosAppLocation] = useState<string | undefined>();

  useEffect(() => {
    const unsubVersion = repository.onAppVersionChange((info) => {
      if (info) {
        setRemoteAppVersion(info.version);
        setDeprecatedVersion(info.deprecatedVersion || null);
        setAndroidAppLocation(info.androidAppLocation);
        setIosAppLocation(info.iosAppLocation);
      }
    });
    return () => {
      unsubVersion();
    };
  }, []);

  const isDeprecated = Boolean(
    deprecatedVersion && isVersionLessOrEqual(UI_TEXT.appVersion, deprecatedVersion)
  );

  const lastAlertedVersionRef = useRef<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "web" && remoteAppVersion && !isDeprecated) {
      if (
        isVersionBehind(UI_TEXT.appVersion, remoteAppVersion) &&
        lastAlertedVersionRef.current !== remoteAppVersion
      ) {
        lastAlertedVersionRef.current = remoteAppVersion;
        markVersionAlertShown();
        const appLocation = Platform.OS === "android" ? androidAppLocation : (Platform.OS === "ios" ? iosAppLocation : undefined);
        const message = UI_TEXT.appUpdatedMessage
          .replace("{current}", UI_TEXT.appVersion)
          .replace("{remote}", remoteAppVersion);
        showAlert(
          UI_TEXT.appUpdateTitle,
          message,
          [{ text: UI_TEXT.ok, style: "default" }],
          appLocation
        );
      }
    }
  }, [remoteAppVersion, isDeprecated, androidAppLocation, iosAppLocation, markVersionAlertShown, showAlert]);

  const onLoginSubmit = async () => {
    setVerifying(true);
    try {
      const authConfig = await getAuthConfig();
      if (!authConfig || !Array.isArray(authConfig.users)) {
        setVerifying(false);
        showAlert(UI_TEXT.error, UI_TEXT.authConfigError);
        return;
      }

      const user = authConfig.users.find(
        (u: any) => u.username === username
      );

      const isLocked = user && (user.locked === true || user.locked === "true" || user.locked === 1 || user.locked === "1");
      if (user && isLocked) {
        setVerifying(false);
        addActivityLog({
          module: ActivityModule.AUTH,
          action: ActivityAction.ERROR,
          description: UI_TEXT.logAccountLocked.replace("{user}", username)
        }, username);
        showAlert(UI_TEXT.error, UI_TEXT.accountLockedError);
        return;
      }

      const isMatch = user ? verifyPassword(password, user) : false;

      if (user && isMatch) {
        clearFailedAttempts(username);

        const isDeletedOrDisabled = user.deleted === true || user.deleted === "true" || user.deleted === 1 || user.deleted === "1" ||
                                    user.disabled === true || user.disabled === "true" || user.disabled === 1 || user.disabled === "1";
        if (isDeletedOrDisabled) {
          setVerifying(false);
          addActivityLog({
            module: ActivityModule.AUTH,
            action: ActivityAction.ERROR,
            description: UI_TEXT.logAccountDisabled.replace("{user}", username)
          }, username);
          showAlert(UI_TEXT.error, UI_TEXT.accountDisabledError);
          return;
        }

        setVerifying(false);
        setLoading(true);
        const displayName = user.name || user.username;
        const formattedUser = user.name && user.name.toLowerCase() !== user.username.toLowerCase()
          ? `${user.name} (${user.username})`
          : user.username;
        addActivityLog({
          module: ActivityModule.AUTH,
          action: ActivityAction.LOGIN,
          description: UI_TEXT.logLogin.replace("{role}", user.role)
        }, formattedUser, user.role as UserRole);
        handleLogin(user.role as UserRole, displayName, user.username);
      } else {
        setVerifying(false);
        const attempts = recordFailedAttempt(username);
        if (user && attempts >= 3) {
          const updatedUsers = authConfig.users.map((u: any) =>
            u.username.toLowerCase() === username.toLowerCase() ? { ...u, locked: true, disabled: true } : u
          );
          await repository.updateAuthConfig({ ...authConfig, users: updatedUsers }).catch(() => {});
          addActivityLog({
            module: ActivityModule.AUTH,
            action: ActivityAction.ERROR,
            description: `Account auto-locked after 3 failed login attempts: ${username}`
          }, username);
          showAlert(UI_TEXT.error, UI_TEXT.failedLoginLockoutMsg);
        } else {
          addActivityLog({
            module: ActivityModule.AUTH,
            action: ActivityAction.ERROR,
            description: UI_TEXT.logLoginFail.replace("{user}", username)
          }, username);
          showAlert(UI_TEXT.error, UI_TEXT.invalidCredentials);
        }
      }
    } catch (err) {
      setVerifying(false);
      console.error("Login fetch error:", err);
      addActivityLog({
        module: ActivityModule.AUTH,
        action: ActivityAction.ERROR,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.AUTH).replace("{message}", (err as any).message || String(err)),
        stack: (err as any).stack
      }, username);
      showAlert(UI_TEXT.error, UI_TEXT.authServerError);
    } finally {
      // We don't set loading/verifying false here to avoid flickers before screen transition if successful
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, right: 20, zIndex: 10 }}>
        <ThemeToggleButton />
      </View>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={{ flex: 1, width: "100%" }}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 100 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.loginContainer}>
            <View style={styles.loginLogo}>
               <Ionicons name="restaurant" size={48} color={theme.colors.white} />
            </View>

            <View style={{ alignItems: "center", marginBottom: 20 }}>
              <Text style={[styles.title, { textAlign: "center", marginTop: 12 }]}>{UI_TEXT.loginTitle}</Text>
            </View>

            {isDeprecated && (
              <View style={{ backgroundColor: theme.colors.errorLight || "#fee2e2", borderWidth: 1.5, borderColor: theme.colors.error || "#ef4444", borderRadius: 12, padding: 14, marginBottom: 20, gap: 8 }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="warning-outline" size={20} color={theme.colors.error || "#ef4444"} />
                  <Text style={{ fontSize: 14, fontWeight: "900", color: theme.colors.error || "#ef4444" }}>
                    {UI_TEXT.appDeprecationTitle}
                  </Text>
                </View>
                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.textPrimary, lineHeight: 18 }}>
                  {UI_TEXT.appDeprecationMessage
                    .replace("{current}", UI_TEXT.appVersion)
                    .replace("{remote}", remoteAppVersion || deprecatedVersion || "")}
                </Text>
              </View>
            )}

            <View>
              <Text style={styles.label}>{UI_TEXT.username}</Text>
              <TextInput
                style={styles.input}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                placeholder={UI_TEXT.usernamePlaceholder}
                placeholderTextColor={theme.colors.textMuted}
                accessible={true}
                accessibilityLabel={UI_TEXT.username}
                returnKeyType="next"
              />

              <Text style={styles.label}>{UI_TEXT.password}</Text>
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <TextInput
                  style={[styles.input, { paddingRight: 50 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  placeholder={UI_TEXT.passwordPlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  accessible={true}
                  accessibilityLabel={UI_TEXT.password}
                  returnKeyType="done"
                  onSubmitEditing={onLoginSubmit}
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 16, padding: 4 }}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={UI_TEXT.password}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>
              </View>

              <Pressable
                style={[styles.primary, (!username || !password || loading || verifying || isDeprecated) && { opacity: 0.5 }, { marginTop: 40 }]}
                onPress={isDeprecated ? () => {
                  const appLocation = Platform.OS === "android" ? androidAppLocation : (Platform.OS === "ios" ? iosAppLocation : undefined);
                  const message = UI_TEXT.appDeprecationMessage
                    .replace("{current}", UI_TEXT.appVersion)
                    .replace("{remote}", remoteAppVersion || deprecatedVersion || "");
                  showAlert(UI_TEXT.appDeprecationTitle, message, [{ text: UI_TEXT.ok, style: "default" }], appLocation);
                } : onLoginSubmit}
                disabled={!username || !password || loading || verifying || isDeprecated}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={verifying ? UI_TEXT.verifying : loading ? UI_TEXT.loading : UI_TEXT.loginButton}
                accessibilityState={{ disabled: !username || !password || loading || verifying || isDeprecated }}
              >
                <Text style={styles.primaryText}>
                  {verifying ? UI_TEXT.verifying : loading ? UI_TEXT.loading : UI_TEXT.loginButton}
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
