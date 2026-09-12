import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../styles";

/**
 * Basic read-only metric component with an icon.
 */
export function Metric({
  icon,
  label,
  value,
  color = "#E31837",
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <View style={styles.metric}>
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}
