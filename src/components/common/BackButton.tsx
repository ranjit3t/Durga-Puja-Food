import React from "react";
import { Pressable, View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../styles";
import { UI_TEXT } from "../../strings";

/**
 * Standard back navigation button with icon and text.
 */
export function BackButton({ onPress }: { onPress: () => void }) {
  return (
    <Pressable
      accessibilityLabel={UI_TEXT.back}
      accessibilityRole="button"
      onPress={onPress}
      style={styles.backButton}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
        <Ionicons name="chevron-back-outline" size={24} color="#f0c977" />
        <Text
          style={[
            styles.eyebrow,
            {
              color: "#f0c977",
              marginBottom: 0,
              letterSpacing: 0,
              fontSize: 12,
              textTransform: "none"
            },
          ]}
        >
          {UI_TEXT.back}
        </Text>
      </View>
    </Pressable>
  );
}
