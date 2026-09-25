import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme";
import { AppThemeMode } from "../../types";
import { UI_TEXT } from "../../strings";

export function ThemeToggleButton() {
  const { theme, themeType, toggleTheme } = useAppTheme();

  return (
    <Pressable
      onPress={toggleTheme}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={themeType === AppThemeMode.DARK ? UI_TEXT.switchToLight : UI_TEXT.switchToDark}
      accessibilityHint={UI_TEXT.toggleThemeHint}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      style={({ pressed }) => [
        {
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: theme.colors.surfaceDark,
          alignItems: "center",
          justifyContent: "center",
          borderWidth: 1,
          borderColor: theme.colors.border,
        },
        pressed && { opacity: 0.7 },
      ]}
    >
      <Ionicons
        name={themeType === AppThemeMode.DARK ? "sunny-outline" : "moon-outline"}
        size={18}
        color={theme.colors.secondary}
      />
    </Pressable>
  );
}
