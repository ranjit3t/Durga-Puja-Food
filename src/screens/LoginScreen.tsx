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
} from "react-native";
import { styles } from "../styles";
import { UI_TEXT } from "../strings";
import { UserRole } from "../types";
import { AlertButton } from "../components/common/CustomAlert";
import { Ionicons } from "@expo/vector-icons";
import { SubscriptionRepository } from "../repository";

export function LoginScreen({
  onLogin,
  showAlert,
  repository,
}: {
  onLogin: (role: UserRole) => void;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  repository: SubscriptionRepository;
}) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const authConfig = await repository.getAuthConfig();

      if (!authConfig || !Array.isArray(authConfig.users)) {
        showAlert(UI_TEXT.error, "Internal Error: Auth config missing in database.");
        return;
      }

      const user = authConfig.users.find(
        (u: any) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
      );

      if (user) {
        onLogin(user.role as UserRole);
      } else {
        showAlert(UI_TEXT.error, UI_TEXT.invalidCredentials);
      }
    } catch (err) {
      console.error("Login fetch error:", err);
      showAlert(UI_TEXT.error, "Could not connect to authentication server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
          <View style={styles.loginContainer}>
            <View style={styles.loginLogo}>
               <Ionicons name="restaurant" size={48} color="#FFF" />
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
                placeholder="Enter username"
                placeholderTextColor="#ADB5BD"
              />

              <Text style={styles.label}>{UI_TEXT.password}</Text>
              <View style={{ position: 'relative', justifyContent: 'center' }}>
                <TextInput
                  style={[styles.input, { paddingRight: 50 }]}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  placeholder="Enter password"
                  placeholderTextColor="#ADB5BD"
                />
                <Pressable
                  onPress={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 16, padding: 4 }}
                >
                  <Ionicons
                    name={showPassword ? "eye-off-outline" : "eye-outline"}
                    size={22}
                    color="#6A6E73"
                  />
                </Pressable>
              </View>

              <Pressable
                style={[styles.primary, (!username || !password || loading) && { opacity: 0.5 }, { marginTop: 40 }]}
                onPress={handleLogin}
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
