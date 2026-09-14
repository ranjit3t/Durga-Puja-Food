import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { MealMenu, Day } from "../../types";
import { isDietaryEnabled } from "../../constants";

/**
 * Interactive editor for a single meal's items.
 * Allows adding and removing Veg/Non-veg tags.
 */
export function MealMenuEditor({
  title,
  mealKey,
  dayId,
  config,
  value,
  onChange,
  disabled = false,
}: {
  title: string;
  mealKey: "breakfast" | "lunch" | "dinner";
  dayId: Day;
  config: ConfigDay[];
  value: MealMenu;
  onChange: (next: MealMenu) => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const vegEnabled = isDietaryEnabled(dayId, mealKey, "veg", config);
  const nonVegEnabled = isDietaryEnabled(dayId, mealKey, "nonVeg", config);

  const [newItem, setNewItem] = useState("");
  const [type, setType] = useState<"veg" | "nonVeg">(
    vegEnabled ? "veg" : "nonVeg"
  );

  const veg = value?.veg || [];
  const nonVeg = value?.nonVeg || [];

  const addItem = () => {
    if (!newItem.trim()) return;
    const currentList = type === "veg" ? veg : nonVeg;
    onChange({ ...value, [type]: [...currentList, newItem.trim()] });
    setNewItem("");
  };

  const removeItem = (targetType: "veg" | "nonVeg", index: number) => {
    const currentList = targetType === "veg" ? veg : nonVeg;
    onChange({
      ...value,
      [targetType]: currentList.filter((_, i) => i !== index),
    });
  };

  return (
    <View style={[styles.mealEditor, disabled && { opacity: 0.6 }]}>
      <Text style={styles.mealEditorTitle}>{title}</Text>

      <View style={styles.mealEditorInputs}>
        <TextInput
          style={styles.mealInput}
          value={newItem}
          onChangeText={setNewItem}
          placeholder={
            type === "veg" ? UI_TEXT.addVegItem : UI_TEXT.addNonVegItem
          }
          placeholderTextColor={theme.colors.textMuted}
          editable={!disabled}
        />

        {vegEnabled && nonVegEnabled && (
          <Pressable
            onPress={() => !disabled && setType(type === "veg" ? "nonVeg" : "veg")}
            disabled={disabled}
            style={[
              styles.typeToggle,
              type === "veg" ? styles.vegChoice : styles.nonVegChoice,
            ]}
          >
            <Text style={styles.typeToggleText}>
              {type === "veg" ? UI_TEXT.veg : UI_TEXT.nonVeg}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => !disabled && addItem()}
          disabled={disabled}
          style={[
            styles.addSmall,
            type === "veg" ? styles.vegChoice : styles.nonVegChoice,
            { borderWidth: 0 } // Ensure no border conflict with choice styles
          ]}
        >
          <Ionicons name="add" size={20} color={theme.colors.white} />
        </Pressable>
      </View>

      <View style={styles.itemList}>
        {veg.map((item, i) => (
          <View key={`v-${i}`} style={styles.itemBadge}>
            <View style={[styles.dot, styles.vegChoice]} />
            <Text style={styles.itemBadgeText}>{item}</Text>
            <Pressable onPress={() => !disabled && removeItem("veg", i)} disabled={disabled}>
              <Ionicons name="close-circle" size={14} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        ))}

        {nonVeg.map((item, i) => (
          <View key={`n-${i}`} style={styles.itemBadge}>
            <View style={[styles.dot, styles.nonVegChoice]} />
            <Text style={styles.itemBadgeText}>{item}</Text>
            <Pressable onPress={() => !disabled && removeItem("nonVeg", i)} disabled={disabled}>
              <Ionicons name="close-circle" size={14} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
