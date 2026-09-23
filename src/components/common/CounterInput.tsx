import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";

interface CounterInputProps {
  label: string;
  description?: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function CounterInput({
  label,
  description,
  value,
  onChange,
  min = 0,
  max = 9999,
  disabled = false,
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

  return (
    <View style={{ marginBottom: 8 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6, paddingHorizontal: 2 }}>
        <Text style={[styles.label, { marginTop: 0, marginBottom: 0, fontSize: 13 }]}>{label}</Text>
        {description ? (
          <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.primary }}>
            {description}
          </Text>
        ) : null}
      </View>
      <View style={[localStyles.container, { backgroundColor: theme.colors.surfaceDark, borderColor: theme.colors.border }]}>
        <Pressable
          onPress={handleDecrement}
          style={[localStyles.button, disabled && { opacity: 0.5 }, { borderRightWidth: 1, borderRightColor: theme.colors.border }]}
          disabled={disabled || value <= min}
        >
          <Ionicons name="remove" size={18} color={theme.colors.textPrimary} />
        </Pressable>

        <TextInput
          style={[localStyles.input, { color: theme.colors.textPrimary }]}
          value={localText}
          onChangeText={handleTextChange}
          onBlur={handleBlur}
          keyboardType="numeric"
          editable={!disabled}
          selectTextOnFocus
        />

        <Pressable
          onPress={handleIncrement}
          style={[localStyles.button, disabled && { opacity: 0.5 }, { borderLeftWidth: 1, borderLeftColor: theme.colors.border }]}
          disabled={disabled || value >= max}
        >
          <Ionicons name="add" size={18} color={theme.colors.textPrimary} />
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
  },
  button: {
    width: 44,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    height: "100%",
    textAlign: "center",
    fontSize: 15,
    fontWeight: "700",
    padding: 0,
  },
});
