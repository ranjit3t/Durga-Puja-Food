/**
 * Authentication screen for the application.
 * Handles user login and role assignment (Admin/Vendor).
 */
import React, { useState } from "react";
import { View, Text, TextInput, Pressable, ImageBackground, KeyboardAvoidingView, Platform, StatusBar } from "react-native";
import { styles } from "../styles";
import { UI_TEXT } from "../strings";
import { AUTH_CONFIG } from "../config";
import { UserRole } from "../types";
import { ActionLabel } from "../components/common/ActionLabel";
import { AlertButton } from "../components/common/CustomAlert";

export function LoginScreen({ onLogin, showAlert }: { onLogin: (role: UserRole) => void, showAlert: (title: string, message: string, buttons?: AlertButton[]) => void }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = () => {
    const user = AUTH_CONFIG.users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (user) {
      onLogin(user.role as UserRole);
    } else {
      showAlert(UI_TEXT.error, UI_TEXT.invalidCredentials);
    }
  };

  return (
    <ImageBackground
      source={{ uri: "https://source.unsplash.com/featured/1200x1800/?durga,puja,festival" }}
      style={styles.root}
      imageStyle={styles.backgroundImage}
    >
      <KeyboardAvoidingView
        style={styles.rootOverlay}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar style="light" />
        <View style={styles.header}>
          <Text style={styles.eyebrow}>{UI_TEXT.eventTitle}</Text>
          <Text style={styles.title}>{UI_TEXT.loginTitle}</Text>
          <Text style={styles.subtitle}>{UI_TEXT.loginSubtitle}</Text>
        </View>

        <View style={[styles.content, { justifyContent: "center" }]}>
          <View style={styles.card}>
            <Text style={styles.label}>{UI_TEXT.username}</Text>
            <TextInput
              style={styles.input}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />

            <Text style={styles.label}>{UI_TEXT.password}</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
            />

            <Pressable
              style={[styles.primary, (!username || !password) && { opacity: 0.5 }]}
              onPress={handleLogin}
              disabled={!username || !password}
            >
              <ActionLabel icon="log-in-outline" label={UI_TEXT.loginButton} color="#fff" />
            </Pressable>
          </View>

          <View style={styles.footer} />
        </View>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}
