import React from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { UI_TEXT } from "../../../strings";

interface QuickCheckoutItemCardProps {
  label: string;
  categoryLabel?: string;
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
  categoryLabel,
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
  const controlLabel = categoryLabel ? `${categoryLabel} ${label}` : label;

  return (
    <View style={{
      flex: 1,
      minWidth: 130,
      backgroundColor: theme.colors.surfaceDark,
      borderRadius: 12,
      padding: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      gap: 6,
    }}>
      {/* Header: Label & Concise Rem Count */}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text
          numberOfLines={1}
          style={{ fontSize: 13, fontWeight: '800', color: theme.colors.textPrimary, flex: 1 }}
        >
          {label}
        </Text>
        <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, marginLeft: 4 }}>
          {UI_TEXT.remAbbr || "Rem"}: {remCount}
        </Text>
      </View>

      {/* Stepper Widget Row */}
      <View style={{
        flexDirection: 'row',
        alignItems: 'center',
        height: 38,
        borderRadius: 8,
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
              width: 38,
              height: '100%',
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.border + "22",
            },
            (disabled || value <= 0) && { opacity: 0.3 },
            pressed && { opacity: 0.7 },
          ]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${UI_TEXT.decrease || "Decrease"} ${controlLabel}`}
        >
          <Ionicons name="remove" size={16} color={theme.colors.textPrimary} />
        </Pressable>

        <TextInput
          style={{
            flex: 1,
            minWidth: 32,
            textAlign: 'center',
            fontSize: 14,
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
          accessibilityLabel={`${controlLabel} ${UI_TEXT.quantity || "quantity"}`}
        />

        <Pressable
          onPress={() => onChange(Math.min(max, value + 1))}
          disabled={disabled || value >= max}
          style={({ pressed }) => [
            {
              width: 38,
              height: '100%',
              flexShrink: 0,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: theme.colors.border + "22",
            },
            (disabled || value >= max) && { opacity: 0.3 },
            pressed && { opacity: 0.7 },
          ]}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${UI_TEXT.increase || "Increase"} ${controlLabel}`}
        >
          <Ionicons name="add" size={16} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
};
