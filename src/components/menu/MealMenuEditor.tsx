import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { MealMenu, Day, ConfigDay, MealType, DietType } from "../../types";
import { isDietaryEnabled, isMealCurrent } from "../../constants";

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
  foodPriceEnabled,
}: {
  title: string;
  mealKey: MealType;
  dayId: Day;
  config: ConfigDay[];
  value: MealMenu;
  onChange: (next: MealMenu) => void;
  disabled?: boolean;
  foodPriceEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const vegEnabled = isDietaryEnabled(dayId, mealKey, DietType.VEG, config);
  const nonVegEnabled = isDietaryEnabled(dayId, mealKey, DietType.NON_VEG, config);
  const isBothEnabled = vegEnabled && nonVegEnabled;
  const isCurrent = isMealCurrent(dayId, mealKey, config);

  const dayConf = config.find(d => d.id === dayId);
  const mConf = dayConf ? dayConf[mealKey] : null;

  const [newItem, setNewItem] = useState("");
  const [type, setType] = useState<DietType>(
    vegEnabled ? DietType.VEG : DietType.NON_VEG
  );

  const veg = value?.veg || [];
  const nonVeg = value?.nonVeg || [];

  const addItem = () => {
    if (!newItem.trim()) return;
    const currentList = type === DietType.VEG ? veg : nonVeg;
    onChange({ ...value, [type]: [...currentList, newItem.trim()] });
    setNewItem("");
  };

  const removeItem = (targetType: DietType, index: number) => {
    const currentList = targetType === DietType.VEG ? veg : nonVeg;
    onChange({
      ...value,
      [targetType]: currentList.filter((_, i) => i !== index),
    });
  };

  return (
    <View style={[styles.mealEditor, disabled && { opacity: 0.6 }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <Text style={[styles.mealEditorTitle, { marginBottom: 0, color: isCurrent ? theme.colors.primary : theme.colors.textSecondary }]}>{title}</Text>
          {isCurrent && (
            <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.live.toUpperCase()}</Text>
            </View>
          )}
          {!isBothEnabled && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: vegEnabled ? theme.colors.veg + "15" : theme.colors.nonVeg + "15", paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: vegEnabled ? theme.colors.veg : theme.colors.nonVeg }}>
              <Ionicons name={vegEnabled ? "leaf" : "flame"} size={10} color={vegEnabled ? theme.colors.veg : theme.colors.nonVeg} />
              <Text style={{ color: vegEnabled ? theme.colors.veg : theme.colors.nonVeg, fontSize: 10, fontWeight: "800" }}>
                {(vegEnabled ? UI_TEXT.vegOnly : UI_TEXT.nonVegOnly).toUpperCase()}
              </Text>
            </View>
          )}
        </View>
      </View>

      {foodPriceEnabled && (
        <View style={{ gap: 8, marginBottom: 16 }}>
          <View style={styles.row}>
            {vegEnabled && (
              <View style={styles.fieldHalf}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 4 }}>{UI_TEXT.vegPriceLabel.toUpperCase()}</Text>
                <TextInput
                  style={{
                    backgroundColor: theme.colors.surfaceDark,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 14,
                    color: theme.colors.textPrimary,
                    fontWeight: "700"
                  }}
                  value={value.vegPrice ?? ""}
                  onChangeText={(val) => onChange({ ...value, vegPrice: val.replace(/[^0-9]/g, "") })}
                  keyboardType="numeric"
                  placeholder={UI_TEXT.zero}
                  editable={!disabled}
                />
              </View>
            )}
            {nonVegEnabled && (
              <View style={styles.fieldHalf}>
                <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 4 }}>{UI_TEXT.nonVegPriceLabel.toUpperCase()}</Text>
                <TextInput
                  style={{
                    backgroundColor: theme.colors.surfaceDark,
                    borderWidth: 1,
                    borderColor: theme.colors.border,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    fontSize: 14,
                    color: theme.colors.textPrimary,
                    fontWeight: "700"
                  }}
                  value={value.nonVegPrice ?? ""}
                  onChangeText={(val) => onChange({ ...value, nonVegPrice: val.replace(/[^0-9]/g, "") })}
                  keyboardType="numeric"
                  placeholder={UI_TEXT.zero}
                  editable={!disabled}
                />
              </View>
            )}
          </View>

          {/* Parcel Prices */}
          {mConf?.parcel && (
            <View style={styles.row}>
              {vegEnabled && (
                <View style={styles.fieldHalf}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 4 }}>{UI_TEXT.vegParcelPriceLabel.toUpperCase()}</Text>
                  <TextInput
                    style={{
                      backgroundColor: theme.colors.surfaceDark,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 14,
                      color: theme.colors.textPrimary,
                      fontWeight: "700"
                    }}
                    value={value.vegParcelPrice ?? ""}
                    onChangeText={(val) => onChange({ ...value, vegParcelPrice: val.replace(/[^0-9]/g, "") })}
                    keyboardType="numeric"
                    placeholder={UI_TEXT.zero}
                    editable={!disabled}
                  />
                </View>
              )}
              {nonVegEnabled && (
                <View style={styles.fieldHalf}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, marginBottom: 4 }}>{UI_TEXT.nonVegParcelPriceLabel.toUpperCase()}</Text>
                  <TextInput
                    style={{
                      backgroundColor: theme.colors.surfaceDark,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      borderRadius: 8,
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      fontSize: 14,
                      color: theme.colors.textPrimary,
                      fontWeight: "700"
                    }}
                    value={value.nonVegParcelPrice ?? ""}
                    onChangeText={(val) => onChange({ ...value, nonVegParcelPrice: val.replace(/[^0-9]/g, "") })}
                    keyboardType="numeric"
                    placeholder={UI_TEXT.zero}
                    editable={!disabled}
                  />
                </View>
              )}
            </View>
          )}
        </View>
      )}

      <View style={styles.mealEditorInputs}>
        <TextInput
          style={styles.mealInput}
          value={newItem}
          onChangeText={setNewItem}
          placeholder={
            type === DietType.VEG ? UI_TEXT.addVegItem : UI_TEXT.addNonVegItem
          }
          placeholderTextColor={theme.colors.textMuted}
          editable={!disabled}
        />

        {vegEnabled && nonVegEnabled && (
          <Pressable
            onPress={() => !disabled && setType(type === DietType.VEG ? DietType.NON_VEG : DietType.VEG)}
            disabled={disabled}
            style={[
              styles.typeToggle,
              type === DietType.VEG ? styles.vegChoice : styles.nonVegChoice,
            ]}
          >
            <Text style={styles.typeToggleText}>
              {type === DietType.VEG ? UI_TEXT.veg : UI_TEXT.nonVeg}
            </Text>
          </Pressable>
        )}

        <Pressable
          onPress={() => !disabled && addItem()}
          disabled={disabled}
          style={[
            styles.addSmall,
            type === DietType.VEG ? styles.vegChoice : styles.nonVegChoice,
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
            <Pressable onPress={() => !disabled && removeItem(DietType.VEG, i)} disabled={disabled}>
              <Ionicons name="close-circle" size={14} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        ))}

        {nonVeg.map((item, i) => (
          <View key={`n-${i}`} style={styles.itemBadge}>
            <View style={[styles.dot, styles.nonVegChoice]} />
            <Text style={styles.itemBadgeText}>{item}</Text>
            <Pressable onPress={() => !disabled && removeItem(DietType.NON_VEG, i)} disabled={disabled}>
              <Ionicons name="close-circle" size={14} color={theme.colors.textSecondary} />
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  );
}
