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

  const blockFlatStr = (subscription.block && subscription.flat)
    ? `${UI_TEXT.block} ${subscription.block} - ${UI_TEXT.flatUpper} ${subscription.flat}`
    : `${UI_TEXT.flatUpper} ${subscription.flat || subscription.id}`;

  const titleText = (subscription as any).name || blockFlatStr;

  return (
    <View style={{
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: s(16),
      paddingVertical: s(12),
    }}>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: s(8), marginBottom: s(2) }}>
          <View style={{ backgroundColor: theme.colors.primary + "20", paddingHorizontal: s(8), paddingVertical: s(2), borderRadius: s(6) }}>
            <Text style={{ fontSize: s(10), fontWeight: "900", color: theme.colors.primary }}>
              {UI_TEXT.quickCheckout.toUpperCase()}
            </Text>
          </View>
          {subscription.passcode ? (
            <Text style={{ fontSize: s(11), fontWeight: "700", color: theme.colors.textSecondary }}>
              {UI_TEXT.passCodeLabel}: {subscription.passcode}
            </Text>
          ) : null}
        </View>
        <Text style={{ fontSize: s(18), fontWeight: "900", color: theme.colors.textPrimary }} numberOfLines={1}>
          {titleText}
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
