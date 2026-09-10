import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles } from "../../styles";
import { UI_TEXT } from "../../strings";
import { AlertButton } from "./CustomAlert";

interface EditableMetricProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: number;
  onSave: (newValue: number) => void;
  validate?: (newValue: number) => boolean | string;
  showAlert?: (title: string, message: string, buttons?: AlertButton[]) => void;
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
}: EditableMetricProps) {
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
      <View style={[styles.metric, { borderColor: "#c35b3b", borderWidth: 1 }]}>
        <TextInput
          style={[
            styles.metricValue,
            { marginTop: 0, padding: 0, textAlign: "center", width: "100%" },
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
            <Ionicons name="checkmark-circle" size={12} color="#356044" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <Pressable style={styles.metric} onPress={() => setIsEditing(true)}>
      <Ionicons name={icon} size={16} color="#356044" />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </Pressable>
  );
}
