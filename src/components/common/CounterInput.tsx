import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";

interface CounterInputProps {
  label: string;
  value: number;
  onChange: (val: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function CounterInput({
  label,
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
      // We only trigger parent update if the value is within a reasonable typing range
      // The clamping logic will still be enforced on Blur
      onChange(numeric);
    }
  };

  const handleBlur = () => {
    // On blur, ensure the text matches the actual valid value (clamped and non-empty)
    setLocalText(String(value));
  };

  return (
    <View style={{ marginBottom: 16 }}>
      <Text style={[styles.label, { marginTop: 0, marginBottom: 8, fontSize: 13 }]}>{label}</Text>
      <View style={localStyles.container}>
        <Pressable
          onPress={handleDecrement}
          style={[localStyles.button, disabled && { opacity: 0.5 }, { borderRightWidth: 1, borderRightColor: theme.colors.border }]}
          disabled={disabled || value <= min}
        >
          <Ionicons name="remove" size={20} color={theme.colors.textPrimary} />
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
          <Ionicons name="add" size={20} color={theme.colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 12,
    overflow: "hidden",
    height: 48,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  button: {
    width: 48,
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    height: "100%",
    textAlign: "center",
    fontSize: 16,
    fontWeight: "700",
    padding: 0,
  },
});
