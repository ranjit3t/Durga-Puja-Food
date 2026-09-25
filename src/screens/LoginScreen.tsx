/**
 * Authentication screen for the application.
 * Handles user login and role assignment (Admin/Vendor).
 */
import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { useStyles } from "../styles";
import { useAppTheme, StatusBarStyleMode } from "../theme";
import { UI_TEXT } from "../strings";
import { UserRole, AppThemeMode, ActivityModule, ActivityAction } from "../types";
import { Ionicons } from "@expo/vector-icons";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";

export function LoginScreen() {
  const { handleLogin } = useAuth();
  const { getAuthConfig, addActivityLog } = useDatabase();
  const { showAlert } = useUI();
  const styles = useStyles();
  const { theme, toggleTheme, themeType } = useAppTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [loading, setLoading] = useState(false);

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
        (u: any) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
      );

      if (user) {
        setVerifying(false);
        setLoading(true);
        addActivityLog({
          module: ActivityModule.AUTH,
          action: ActivityAction.LOGIN,
          description: UI_TEXT.logLogin.replace("{role}", user.role)
        }, user.username, user.role as UserRole);
        handleLogin(user.role as UserRole, user.username);
      } else {
        setVerifying(false);
        addActivityLog({
          module: ActivityModule.AUTH,
          action: ActivityAction.ERROR,
          description: UI_TEXT.logLoginFail.replace("{user}", username)
        }, username);
        showAlert(UI_TEXT.error, UI_TEXT.invalidCredentials);
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
                style={[styles.primary, (!username || !password || loading || verifying) && { opacity: 0.5 }, { marginTop: 40 }]}
                onPress={onLoginSubmit}
                disabled={!username || !password || loading || verifying}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={verifying ? UI_TEXT.verifying : loading ? UI_TEXT.loading : UI_TEXT.loginButton}
                accessibilityState={{ disabled: !username || !password || loading || verifying }}
              >
                <Text style={styles.primaryText}>{verifying ? UI_TEXT.verifying : loading ? UI_TEXT.loading : UI_TEXT.loginButton}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
