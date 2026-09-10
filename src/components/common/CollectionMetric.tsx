import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../styles";

/**
 * Metric component specifically for displaying financial collections.
 */
export function CollectionMetric({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
}) {
  return (
    <View style={styles.collectionMetric}>
      <Ionicons name={icon} size={19} color="#356044" />
      <Text style={styles.collectionMetricLabel}>{label}</Text>
      <Text style={styles.collectionMetricValue}>Rs {value.toFixed(2)}</Text>
    </View>
  );
}
