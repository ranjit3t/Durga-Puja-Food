import React, { useState } from "react";
import { View, Text, Pressable, Modal, ScrollView } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";

/**
 * Custom Dropdown component that uses a Modal for the selection list.
 */
export function Dropdown({
  label,
  value,
  options,
  onChange,
  disabled,
}: {
  label?: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const [open, setOpen] = useState(false);

  return (
    <View style={styles.dropdownWrap}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        onPress={() => !disabled && setOpen(true)}
        style={[styles.dropdownButton, disabled && { opacity: 0.6, backgroundColor: theme.colors.surface }]}
        disabled={disabled}
        accessible={true}
        accessibilityRole="combobox"
        accessibilityLabel={label || UI_TEXT.dropdownLabel}
        accessibilityValue={{ text: value || UI_TEXT.notSelected }}
        accessibilityState={{ expanded: open, disabled: !!disabled }}
        accessibilityHint={UI_TEXT.chooseOptionHint}
      >
        <Text style={styles.dropdownValue}>
          {value || `${UI_TEXT.selectPrefix} ${(label ?? UI_TEXT.optionDefault).toLowerCase()}`}
        </Text>
        {!disabled && <Text style={styles.dropdownChevron} importantForAccessibility="no">▼</Text>}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <View style={styles.dropdownModalBackdrop} accessibilityViewIsModal={true}>
          <View style={styles.dropdownModalCard}>
            <Text style={styles.dropdownModalTitle} accessibilityRole="header">
              {UI_TEXT.selectPrefix} {label ?? UI_TEXT.optionDefault}
            </Text>

            <ScrollView
              style={styles.dropdownModalList}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator
            >
              {options.map((option) => (
                <Pressable
                  key={option}
                  onPress={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                  accessible={true}
                  accessibilityRole="menuitem"
                  accessibilityLabel={option}
                  accessibilityState={{ selected: option === value }}
                  style={[
                    styles.dropdownOption,
                    option === value && styles.dropdownOptionSelected,
                  ]}
                >
                  <Text
                    style={[
                      styles.dropdownOptionText,
                      option === value && styles.dropdownOptionTextSelected,
                    ]}
                  >
                    {option}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Pressable
              onPress={() => setOpen(false)}
              style={styles.dropdownModalCancel}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.cancel}
            >
              <Text style={styles.secondaryText}>{UI_TEXT.cancel}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
