import React from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI_TEXT } from "../../../strings";

interface QuickCheckoutItemCardProps {
  label: string;
  plannedCount: number;
  servedCount: number;
  remCount: number;
  value: number;
  onChange: (val: number) => void;
  max: number;
  disabled?: boolean;
  theme: any;
  s: (n: number) => number;
}

export const QuickCheckoutItemCard: React.FC<QuickCheckoutItemCardProps> = ({
  label,
  plannedCount,
  servedCount,
  remCount,
  value,
  onChange,
  max,
  disabled = false,
  theme,
  s,
}) => {
  return (
    <View style={{
      backgroundColor: theme.colors.surfaceDark,
      borderRadius: s(14),
      padding: s(14),
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: s(10),
    }}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: s(14), fontWeight: '800', color: theme.colors.textPrimary }}>{label}</Text>
          <Text style={{ fontSize: s(11), color: theme.colors.textSecondary, fontWeight: '600', marginTop: s(2) }}>
            {UI_TEXT.planned}: {plannedCount} | {UI_TEXT.served}: {servedCount} | {UI_TEXT.remaining}: {remCount}
          </Text>
        </View>
      </View>

      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: s(40),
        borderRadius: s(10),
        borderWidth: 1,
        borderColor: theme.colors.border,
        overflow: 'hidden',
        backgroundColor: theme.colors.surface,
      }}>
        <Pressable
          onPress={() => onChange(Math.max(0, value - 1))}
          disabled={disabled || value <= 0}
          style={({ pressed }) => [
            {
              width: s(40),
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.border + "22",
            },
            (disabled || value <= 0) && { opacity: 0.3 },
            pressed && { opacity: 0.7 },
          ]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${UI_TEXT.decrease || "Decrease"} ${label}`}
        >
          <Ionicons name="remove" size={s(16)} color={theme.colors.textPrimary} />
        </Pressable>

        <TextInput
          style={{
            flex: 1,
            textAlign: 'center',
            fontSize: s(15),
            fontWeight: '900',
            color: theme.colors.textPrimary,
            padding: 0,
          }}
          value={String(value)}
          onChangeText={(txt) => {
            const clean = txt.replace(/[^0-9]/g, "");
            if (clean === "") {
              onChange(0);
            } else {
              const num = parseInt(clean, 10);
              onChange(Math.max(0, Math.min(max, num)));
            }
          }}
          keyboardType="numeric"
          editable={!disabled}
          selectTextOnFocus
          accessible={true}
          accessibilityLabel={`${label} ${UI_TEXT.quantity || "quantity"}`}
        />

        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          style={({ pressed }) => [
            {
              width: s(40),
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.border + "22",
            },
            (disabled || value >= max) && { opacity: 0.3 },
            pressed && { opacity: 0.7 },
          ]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${UI_TEXT.increase || "Increase"} ${label}`}
        >
          <Ionicons name="add" size={s(16)} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
};
