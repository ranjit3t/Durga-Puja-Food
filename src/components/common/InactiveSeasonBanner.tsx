import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useScaling } from "../../styles";
import { useAppTheme } from "../../theme";
import { useAppNavigation } from "../../context/NavigationContext";
import { useAuth } from "../../context/AuthContext";
import { AppScreen, UserRole } from "../../types";
import { UI_TEXT } from "../../strings";

export function InactiveSeasonBanner() {
  const { navigate } = useAppNavigation();
  const { userRole } = useAuth();
  const { theme } = useAppTheme();
  const { s } = useScaling();

  const isAdmin = userRole === UserRole.ADMIN;

  return (
    <View
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${UI_TEXT.inactiveSeasonTitle}. ${isAdmin ? UI_TEXT.inactiveSeasonAdminBody : UI_TEXT.inactiveSeasonNonAdminBody}`}
      style={{
        backgroundColor: theme.colors.surface,
        borderRadius: s(16),
        padding: s(24),
        margin: s(16),
        borderWidth: 1.5,
        borderColor: theme.colors.warning || theme.colors.primary,
        alignItems: "center",
        gap: s(12),
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3
      }}
    >
      <Ionicons name="calendar-outline" size={s(40)} color={theme.colors.warning || theme.colors.primary} />
      <Text style={{ fontSize: s(17), fontWeight: "900", color: theme.colors.textPrimary, textAlign: "center" }}>
        {UI_TEXT.inactiveSeasonTitle}
      </Text>
      <Text style={{ fontSize: s(12), color: theme.colors.textSecondary, textAlign: "center", fontWeight: "600", lineHeight: s(18) }}>
        {isAdmin ? UI_TEXT.inactiveSeasonAdminBody : UI_TEXT.inactiveSeasonNonAdminBody}
      </Text>
      {isAdmin && (
        <Pressable
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={UI_TEXT.openSystemSettings}
          onPress={() => navigate(AppScreen.SETTINGS)}
          style={({ pressed }) => [
            {
              backgroundColor: theme.colors.primary,
              paddingHorizontal: s(18),
              paddingVertical: s(10),
              borderRadius: s(10),
              marginTop: s(4)
            },
            pressed && { opacity: 0.8 }
          ]}
        >
          <Text style={{ color: theme.colors.white, fontWeight: "800", fontSize: s(13) }}>
            {UI_TEXT.openSystemSettings}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
