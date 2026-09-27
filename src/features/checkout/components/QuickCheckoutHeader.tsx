import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI_TEXT } from "../../../strings";
import { Subscription } from "../../../types";

interface QuickCheckoutHeaderProps {
  subscription: Subscription | null;
  currentMealLabel: string;
  onClose: () => void;
  theme: any;
  s: (n: number) => number;
}

export const QuickCheckoutHeader: React.FC<QuickCheckoutHeaderProps> = ({
  subscription,
  currentMealLabel,
  onClose,
  theme,
  s,
}) => {
  if (!subscription) return null;
  const displayName = (subscription as any).name || `${UI_TEXT.flat} #${subscription.id} (${subscription.block || ""}-${subscription.flat})`;
  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: s(20),
      paddingVertical: s(16),
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border + "44",
    }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: s(8), marginBottom: s(4) }}>
          <View style={{ backgroundColor: theme.colors.primary + "20", paddingHorizontal: s(8), paddingVertical: s(2), borderRadius: s(6) }}>
            <Text style={{ fontSize: s(10), fontWeight: "900", color: theme.colors.primary }}>{subscription.id}</Text>
          </View>
          <Text style={{ fontSize: s(13), fontWeight: "800", color: theme.colors.textSecondary }}>{currentMealLabel}</Text>
        </View>
        <Text style={{ fontSize: s(18), fontWeight: "900", color: theme.colors.textPrimary }} numberOfLines={1}>
          {displayName}
        </Text>
      </View>

      <Pressable
        onPress={onClose}
        style={({ pressed }) => [
          {
            width: s(36),
            height: s(36),
            borderRadius: s(18),
            backgroundColor: theme.colors.surfaceDark,
            alignItems: "center",
            justifyContent: "center",
            borderWidth: 1,
            borderColor: theme.colors.border,
          },
          pressed && { opacity: 0.7 },
        ]}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={UI_TEXT.close}
      >
        <Ionicons name="close" size={s(20)} color={theme.colors.textPrimary} />
      </Pressable>
    </View>
  );
};
