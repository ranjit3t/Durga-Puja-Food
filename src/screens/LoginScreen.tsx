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

export function LoginScreen() {
  const { handleLogin } = useAuth();
  const { getAuthConfig, addActivityLog } = useDatabase();
  const { showAlert } = useUI();
  const styles = useStyles();
  const { theme, toggleTheme, themeType } = useAppTheme();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const onLoginSubmit = async () => {
    setLoading(true);
    try {
      const authConfig = await getAuthConfig();
      if (!authConfig || !Array.isArray(authConfig.users)) {
        showAlert(UI_TEXT.error, UI_TEXT.authConfigError);
        return;
      }

      const user = authConfig.users.find(
        (u: any) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
      );

      if (user) {
        addActivityLog({
          module: ActivityModule.AUTH,
          action: ActivityAction.LOGIN,
          description: UI_TEXT.logLogin.replace("{role}", user.role)
        }, user.username);
        handleLogin(user.role as UserRole, user.username);
      } else {
        addActivityLog({
          module: ActivityModule.AUTH,
          action: ActivityAction.ERROR,
          description: UI_TEXT.logLoginFail.replace("{user}", username)
        }, username);
        showAlert(UI_TEXT.error, UI_TEXT.invalidCredentials);
      }
    } catch (err) {
      console.error("Login fetch error:", err);
      addActivityLog({
        module: ActivityModule.AUTH,
        action: ActivityAction.ERROR,
        description: UI_TEXT.logError.replace("{module}", ActivityModule.AUTH).replace("{message}", (err as any).message || String(err)),
        stack: (err as any).stack
      }, username);
      showAlert(UI_TEXT.error, UI_TEXT.authServerError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={{ position: 'absolute', top: Platform.OS === 'ios' ? 60 : 40, left: 20, zIndex: 10 }}>
        <Pressable onPress={toggleTheme} style={[styles.backButton, { width: 36, height: 36, borderRadius: 18, paddingHorizontal: 0 }]}>
          <Ionicons name={themeType === AppThemeMode.DARK ? "sunny-outline" : "moon-outline"} size={18} color={theme.colors.secondary} />
        </Pressable>
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

            <View style={{ alignItems: "center", marginBottom: 40 }}>
              <Text style={[styles.title, { textAlign: "center", marginTop: 12 }]}>{UI_TEXT.loginTitle}</Text>
              <Text style={[styles.subtitle, { textAlign: "center" }]}>{UI_TEXT.loginSubtitle}</Text>
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
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 16, padding: 4 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color={theme.colors.textSecondary}
                  />
                </Pressable>
              </View>

              <Pressable
                style={[styles.primary, (!username || !password || loading) && { opacity: 0.5 }, { marginTop: 40 }]}
                onPress={onLoginSubmit}
                disabled={!username || !password || loading}
              >
                <Text style={styles.primaryText}>{loading ? UI_TEXT.loading : UI_TEXT.loginButton}</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
