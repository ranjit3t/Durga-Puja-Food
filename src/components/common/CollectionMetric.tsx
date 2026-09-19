import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";

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
  const styles = useStyles();
  const { theme } = useAppTheme();
  return (
    <View style={styles.collectionMetric}>
      <Ionicons name={icon} size={19} color={theme.colors.primary} />
      <Text style={styles.collectionMetricLabel}>{label}</Text>
      <Text style={styles.collectionMetricValue}>{UI_TEXT.rs} {value.toFixed(0)}</Text>
    </View>
  );
}
