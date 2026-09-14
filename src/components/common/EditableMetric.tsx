import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { AlertButton } from "./CustomAlert";

interface EditableMetricProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  onSave: (newValue: number) => void;
  validate?: (newValue: number) => boolean | string;
  showAlert?: (title: string, message: string, buttons?: AlertButton[]) => void;
  color?: string;
  disabled?: boolean;
}

/**
 * A metric tile that can be toggled into an input field for manual updates.
 */
export function EditableMetric({
  icon,
  label,
  value,
  onSave,
  validate,
  showAlert,
  color = "#E31837",
  disabled = false,
}: EditableMetricProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const [isEditing, setIsEditing] = useState(false);
  const [localValue, setLocalValue] = useState(String(value));

  // Keep local input in sync with external value changes
  useEffect(() => {
    setLocalValue(String(value));
  }, [value]);

  const handleSave = () => {
    const numericValue = parseInt(localValue) || 0;

    // Optional validation logic
    if (validate) {
      const validationResult = validate(numericValue);
      if (validationResult !== true) {
        if (typeof validationResult === "string" && showAlert) {
          showAlert(UI_TEXT.error, validationResult);
        }
        // Reset to previous valid value on failure
        setLocalValue(String(value));
        setIsEditing(false);
        return;
      }
    }

    onSave(numericValue);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <View style={[styles.metric, { borderColor: color, borderStyle: "dashed", borderWidth: 2 }]}>
        <TextInput
          style={[
            styles.metricValue,
            { marginTop: 0, padding: 0, textAlign: "center", width: "100%", color },
          ]}
          value={localValue}
          onChangeText={(text) => setLocalValue(text.replace(/[^0-9]/g, ""))}
          keyboardType="numeric"
          autoFocus
          onBlur={handleSave}
          returnKeyType="done"
          onSubmitEditing={handleSave}
          selectTextOnFocus
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <Text style={styles.metricLabel}>{label}</Text>
          <Pressable onPress={handleSave}>
            <Ionicons name="checkmark-circle" size={12} color={color} />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable
      style={[
        styles.metric,
        !disabled && {
          borderWidth: 2,
          borderColor: color,
          borderStyle: "dashed",
          backgroundColor: color + "15"
        }
      ]}
      onPress={() => !disabled && setIsEditing(true)}
      disabled={disabled}
    >
      <Ionicons name={icon} size={18} color={color} />
      <Text style={[styles.metricValue, { color }]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
}
