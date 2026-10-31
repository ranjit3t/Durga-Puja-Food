import React, { useState, useEffect } from "react";
import { View, Text, Pressable, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useScaling } from "../../styles";
import { useAppTheme } from "../../theme";
import { useAuth } from "../../context/AuthContext";
import { useAppNavigation } from "../../context/NavigationContext";
import { AppThemeMode } from "../../types";
import { UI_TEXT } from "../../strings";
import { createFirebaseRepository } from "../../repository";

const repository = createFirebaseRepository();

/**
 * Personalized welcome message badge.
 * Placed in the upper header section right below the control buttons row.
 * Tapping the greeting opens the global Account & Password settings modal for active authenticated users.
 * Listens to Firebase RTDB in real time: hides the pencil edit icon and disables tapping if the user is marked disabled, deleted, or locked out.
 */
export function UserGreeting() {
  const { theme } = useAppTheme();
  const { userName, userAccountName } = useAuth();
  const { openAccountModal } = useAppNavigation();
  const { s, isWeb } = useScaling();
  const { width } = useWindowDimensions();

  const [isAccountBlocked, setIsAccountBlocked] = useState(false);

  useEffect(() => {
    if (!userAccountName) {
      setIsAccountBlocked(false);
      return;
    }

    const unsub = repository.onAuthConfigChange((cfg) => {
      if (cfg && Array.isArray(cfg.users)) {
        const clean = userAccountName.toLowerCase();
        const found = cfg.users.find((u: any) => u.username && u.username.toLowerCase() === clean);
        if (found) {
          const blocked = Boolean(
            found.disabled === true || found.disabled === "true" || found.disabled === 1 ||
            found.deleted === true || found.deleted === "true" || found.deleted === 1 ||
            found.locked === true || found.locked === "true" || found.locked === 1
          );
          setIsAccountBlocked(blocked);
        }
      }
    });

    return () => {
      unsub();
    };
  }, [userAccountName]);

  const displayName = userName || "";
  if (!displayName) return null;

  const isDark = theme.themeType === AppThemeMode.DARK;
  const maxBadgeWidth = Math.max(120, Math.min(isWeb ? 400 : 260, width - 40));

  // Extract prefix and name placeholder from localized string template "Welcome, {name}"
  const template = UI_TEXT.userGreeting;
  const nameIndex = template.indexOf("{name}");
  const prefix = nameIndex !== -1 ? template.substring(0, nameIndex) : "";

  return (
    <View style={{ flexDirection: "row", justifyContent: "flex-end", alignItems: "center", marginBottom: s(8) }}>
      {isAccountBlocked ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: s(6),
            backgroundColor: isDark ? "rgba(251, 191, 36, 0.12)" : "rgba(196, 30, 58, 0.06)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(251, 191, 36, 0.3)" : "rgba(196, 30, 58, 0.2)",
            borderRadius: s(16),
            paddingHorizontal: s(12),
            paddingVertical: s(4),
            height: s(30),
            maxWidth: maxBadgeWidth,
          }}
        >
          <Ionicons
            name="person-circle-outline"
            size={s(14)}
            color={theme.colors.secondary}
            style={{ flexShrink: 0 }}
          />
          <Text
            style={{
              fontSize: s(12),
              flexShrink: 1,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            <Text style={{ fontWeight: "500", color: theme.colors.textSecondary }}>
              {prefix}
            </Text>
            <Text style={{ fontWeight: "800", color: isDark ? theme.colors.secondary : theme.colors.primary }}>
              {displayName}
            </Text>
          </Text>
        </View>
      ) : (
        <Pressable
          onPress={openAccountModal}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={UI_TEXT.accountSettingsButton}
          accessibilityHint="Tap to update your profile name and password"
          style={({ pressed }) => [
            {
              flexDirection: "row",
              alignItems: "center",
              gap: s(6),
              backgroundColor: isDark ? "rgba(251, 191, 36, 0.12)" : "rgba(196, 30, 58, 0.06)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(251, 191, 36, 0.3)" : "rgba(196, 30, 58, 0.2)",
              borderRadius: s(16),
              paddingHorizontal: s(12),
              paddingVertical: s(4),
              height: s(30),
              maxWidth: maxBadgeWidth,
            },
            pressed && { opacity: 0.8 },
          ]}
        >
          <Ionicons
            name="person-circle-outline"
            size={s(14)}
            color={theme.colors.secondary}
            style={{ flexShrink: 0 }}
          />
          <Text
            style={{
              fontSize: s(12),
              flexShrink: 1,
            }}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            <Text style={{ fontWeight: "500", color: theme.colors.textSecondary }}>
              {prefix}
            </Text>
            <Text style={{ fontWeight: "800", color: isDark ? theme.colors.secondary : theme.colors.primary }}>
              {displayName}
            </Text>
          </Text>
          <Ionicons
            name="pencil-outline"
            size={s(11)}
            color={theme.colors.textMuted}
            style={{ flexShrink: 0, marginLeft: 2 }}
          />
        </Pressable>
      )}
    </View>
  );
}
