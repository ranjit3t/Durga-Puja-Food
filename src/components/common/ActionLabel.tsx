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
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.actionLabel}>
      <Ionicons name={icon} size={17} color={color} />
      <Text style={[styles.actionLabelText, { color }]}>{label}</Text>
    </View>
  );
}
