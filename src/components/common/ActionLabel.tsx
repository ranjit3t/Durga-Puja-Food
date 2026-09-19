import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../../styles";
import { useAppTheme } from "../../theme";

/**
 * A reusable label component combining an icon and a text label.
 */
export function ActionLabel({
  icon,
  label,
  color,
  size = 16,
  vertical = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  size?: number;
  vertical?: boolean;
}) {
  const styles = useStyles();
  const { s, v } = useScaling();
  const { theme } = useAppTheme();
  const finalColor = color || theme.colors.textSecondary;
  const iconSize = s(size);

  return (
    <View style={[styles.actionLabel, vertical && { flexDirection: 'column', gap: v(s(4)) }]}>
      <Ionicons name={icon} size={iconSize} color={finalColor} />
      <Text style={[styles.actionLabelText, { color: finalColor }, vertical && { fontSize: s(11), textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}
