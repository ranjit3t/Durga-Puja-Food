import React from "react";
import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";

/**
 * Standard home navigation button for screen headers.
 */
export function HomeButton({ onPress }: { onPress: () => void }) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={UI_TEXT.home}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.backButton, { width: 36, height: 36, borderRadius: 18, paddingHorizontal: 0 }]}
    >
      <Ionicons name="home-outline" size={18} color={theme.colors.secondary} />
    </Pressable>
  );
}
