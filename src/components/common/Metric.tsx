import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";

/**
 * Basic read-only metric component with an icon.
 */
export function Metric({
  icon,
  label,
  value,
  color,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color?: string;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const finalColor = color || theme.colors.primary;
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={18} color={finalColor} />
      <Text style={[styles.metricValue, { color: finalColor }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}
