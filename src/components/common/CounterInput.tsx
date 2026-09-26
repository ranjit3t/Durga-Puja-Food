import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";

interface CounterInputProps {
  label: string;
  description?: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  compact?: boolean;
}

export function CounterInput({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 9999,
  disabled = false,
  compact = false,
}: CounterInputProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  // Local state for the text input to allow empty string while typing
  const [localText, setLocalText] = useState(String(value));

  // Sync local text with external value changes
  useEffect(() => {
    setLocalText(String(value));
  }, [value]);

  const handleIncrement = () => {
    if (value < max) onChange(value + 1);
  };

  const handleDecrement = () => {
    if (value > min) onChange(value - 1);
  };

  const handleTextChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, "");
    setLocalText(clean);

    if (clean !== "") {
      const numeric = parseInt(clean, 10);
      const clamped = Math.max(min, Math.min(max, numeric));
      onChange(clamped);
    }
  };

  const handleBlur = () => {
    const numeric = parseInt(localText, 10);
    const clamped = isNaN(numeric) ? min : Math.max(min, Math.min(max, numeric));
    setLocalText(String(clamped));
    onChange(clamped);
  };

  if (compact) {
    return (
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", minHeight: 38, marginVertical: 2, minWidth: 0, flexShrink: 1 }}>
        <View style={{ flex: 1, paddingRight: 8, justifyContent: "center" }}>
          <Text style={[styles.label, { marginTop: 0, marginBottom: 0, fontSize: 13, fontWeight: "800" }]} numberOfLines={1} ellipsizeMode="tail">
            {label}
          </Text>
          {description ? (
            <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.primary, marginTop: 1 }}>
              {description}
            </Text>
          ) : null}
        </View>
        <View style={[localStyles.container, { width: 114, height: 36, backgroundColor: theme.colors.surfaceDark, borderColor: theme.colors.border }]}>
          <Pressable
            onPress={handleDecrement}
            style={[localStyles.button, disabled && { opacity: 0.5 }, { width: 34, borderRightWidth: 1, borderRightColor: theme.colors.border }]}
            disabled={disabled || value <= min}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${UI_TEXT.decrease}${UI_TEXT.space}${label}`}
            accessibilityHint={UI_TEXT.decrementsValue.replace("{label}", label).replace("{value}", String(value))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="remove" size={16} color={theme.colors.textPrimary} />
          </Pressable>

          <TextInput
            style={[localStyles.input, { color: theme.colors.textPrimary, fontSize: 14 }]}
            value={localText}
            onChangeText={handleTextChange}
            onBlur={handleBlur}
            keyboardType="numeric"
            editable={!disabled}
            selectTextOnFocus
            accessible={true}
            accessibilityLabel={`${label}${UI_TEXT.space}${UI_TEXT.quantity}`}
            accessibilityValue={{ min, max, now: value }}
          />

          <Pressable
            onPress={handleIncrement}
            style={[localStyles.button, disabled && { opacity: 0.5 }, { width: 34, borderLeftWidth: 1, borderLeftColor: theme.colors.border }]}
            disabled={disabled || value >= max}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${UI_TEXT.increase}${UI_TEXT.space}${label}`}
            accessibilityHint={UI_TEXT.incrementsValue.replace("{label}", label).replace("{value}", String(value))}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="add" size={16} color={theme.colors.textPrimary} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ marginBottom: 8, minWidth: 0, flexShrink: 1 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, paddingHorizontal: 2, gap: 4 }}>
        <Text style={[styles.label, { marginTop: 0, marginBottom: 0, fontSize: 12, flex: 1 }]} numberOfLines={1} ellipsizeMode="tail">
          {label}
        </Text>
        {description ? (
          <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.primary, flexShrink: 0 }}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={[localStyles.container, { backgroundColor: theme.colors.surfaceDark, borderColor: theme.colors.border }]}>
        <Pressable
          onPress={handleDecrement}
          style={[localStyles.button, disabled && { opacity: 0.5 }, { borderRightWidth: 1, borderRightColor: theme.colors.border }]}
          disabled={disabled || value <= min}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${UI_TEXT.decrease}${UI_TEXT.space}${label}`}
          accessibilityHint={UI_TEXT.decrementsValue.replace("{label}", label).replace("{value}", String(value))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="remove" size={16} color={theme.colors.textPrimary} />
        </Pressable>

        <TextInput
          style={[localStyles.input, { color: theme.colors.textPrimary }]}
          value={localText}
          onChangeText={handleTextChange}
          onBlur={handleBlur}
          keyboardType="numeric"
          editable={!disabled}
          selectTextOnFocus
          accessible={true}
          accessibilityLabel={`${label}${UI_TEXT.space}${UI_TEXT.quantity}`}
          accessibilityValue={{ min, max, now: value }}
        />

        <Pressable
          onPress={handleIncrement}
          style={[localStyles.button, disabled && { opacity: 0.5 }, { borderLeftWidth: 1, borderLeftColor: theme.colors.border }]}
          disabled={disabled || value >= max}
          accessible={true}
          accessibilityRole="button"
          accessibilityLabel={`${UI_TEXT.increase}${UI_TEXT.space}${label}`}
          accessibilityHint={UI_TEXT.incrementsValue.replace("{label}", label).replace("{value}", String(value))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={16} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    overflow: "hidden",
    height: 42,
    borderWidth: 1,
    width: "100%",
  },
  button: {
    width: 36,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  input: {
    flex: 1,
    minWidth: 24,
    height: "100%",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    padding: 0,
  },
});
