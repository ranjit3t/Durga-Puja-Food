import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../styles";

/**
 * A reusable label component combining an icon and a text label.
 */
export function ActionLabel({
  icon,
  label,
  color = "#4c5d51",
  size = 16,
  vertical = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  size?: number;
  vertical?: boolean;
}) {
  return (
    <View style={[styles.actionLabel, vertical && { flexDirection: 'column', gap: 6 }]}>
      <Ionicons name={icon} size={size} color={color} />
      <Text style={[styles.actionLabelText, { color }, vertical && { fontSize: 13, textAlign: 'center' }]}>{label}</Text>
    </View>
  );
}
