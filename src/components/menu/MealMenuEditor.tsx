import React, { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { MealMenu, Day, ConfigDay, MealType, DietType, DietaryVariety, VarietyMenu } from "../../types";
import { isDietaryEnabled, isMealCurrent, isKidsParcelEnabled, getMealVarieties, isSpecialMeal, isGuestsParcelEnabled } from "../../constants";

export function MealMenuEditor({
  title,
  mealKey,
  dayId,
  config,
  value,
  onChange,
  onSave,
  isDirty = false,
  disabled = false,
  foodPriceEnabled,
  kidsEnabled,
  guestsEnabled,
}: {
  title: string;
  mealKey: MealType;
  dayId: Day;
  config: ConfigDay[];
  value: MealMenu;
  onChange: (next: MealMenu) => void;
  onSave?: () => void;
  isDirty?: boolean;
  disabled?: boolean;
  foodPriceEnabled: boolean;
  kidsEnabled: boolean;
  guestsEnabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const isCurrent = isMealCurrent(dayId, mealKey, config);

  const dayConf = config.find((d) => d.id === dayId);
  const mConf = dayConf ? dayConf[mealKey] : null;
  const varieties = getMealVarieties(mConf || undefined);

  const [newItemText, setNewItemText] = useState<Record<string, string>>({});

  const getVarietyItems = (v: DietaryVariety): string[] => {
    let raw: any = [];
    if (v.id === "veg_default") raw = value?.veg;
    else if (v.id === "nonVeg_default") raw = value?.nonVeg;
    else raw = value?.varieties?.[v.id]?.items;

    if (Array.isArray(raw)) {
      return raw.filter((i) => typeof i === "string" || typeof i === "number").map(String);
    }
    if (raw && typeof raw === "object") {
      return Object.values(raw).filter((i) => typeof i === "string" || typeof i === "number").map(String);
    }
    if (typeof raw === "string" && raw.trim().length > 0) {
      return [raw.trim()];
    }
    return [];
  };

  const getVarietyPrice = (v: DietaryVariety, field: 'adultPrice' | 'kidsPrice' | 'guestPrice' | 'parcelPrice' | 'kidsParcelPrice' | 'guestParcelPrice'): string => {
    if (v.id === "veg_default") {
      if (field === "adultPrice") return value?.vegPrice ?? "";
      if (field === "kidsPrice") return value?.kidsVegPrice ?? "";
      if (field === "guestPrice") return value?.guestsVegPrice ?? "";
      if (field === "parcelPrice") return value?.vegParcelPrice ?? "";
      if (field === "kidsParcelPrice") return value?.kidsVegParcelPrice ?? "";
      if (field === "guestParcelPrice") return value?.guestsVegParcelPrice ?? "";
    }
    if (v.id === "nonVeg_default") {
      if (field === "adultPrice") return value?.nonVegPrice ?? "";
      if (field === "kidsPrice") return value?.kidsNonVegPrice ?? "";
      if (field === "guestPrice") return value?.guestsNonVegPrice ?? "";
      if (field === "parcelPrice") return value?.nonVegParcelPrice ?? "";
      if (field === "kidsParcelPrice") return value?.kidsNonVegParcelPrice ?? "";
      if (field === "guestParcelPrice") return value?.guestsVegParcelPrice ?? "";
    }
    const val = value?.varieties?.[v.id]?.[field as keyof VarietyMenu];
    return typeof val === 'string' ? val : "";
  };

  const updateVarietyField = (
    v: DietaryVariety,
    field: keyof VarietyMenu,
    val: string
  ) => {
    const nextMenu = { ...value };
    const nextVarieties = { ...(nextMenu.varieties || {}) };
    const currentVar = { ...(nextVarieties[v.id] || { items: getVarietyItems(v) }) };

    (currentVar as any)[field] = val;
    nextVarieties[v.id] = currentVar;
    nextMenu.varieties = nextVarieties;

    // Legacy sync
    if (v.id === "veg_default") {
      if (field === "adultPrice") nextMenu.vegPrice = val;
      if (field === "kidsPrice") nextMenu.kidsVegPrice = val;
      if (field === "guestPrice") nextMenu.guestsVegPrice = val;
      if (field === "parcelPrice") nextMenu.vegParcelPrice = val;
      if (field === "kidsParcelPrice") nextMenu.kidsVegParcelPrice = val;
      if (field === "guestParcelPrice") nextMenu.guestsVegParcelPrice = val;
    } else if (v.id === "nonVeg_default") {
      if (field === "adultPrice") nextMenu.nonVegPrice = val;
      if (field === "kidsPrice") nextMenu.kidsNonVegPrice = val;
      if (field === "guestPrice") nextMenu.guestsNonVegPrice = val;
      if (field === "parcelPrice") nextMenu.nonVegParcelPrice = val;
      if (field === "kidsParcelPrice") nextMenu.kidsNonVegParcelPrice = val;
      if (field === "guestParcelPrice") nextMenu.guestsVegParcelPrice = val;
    }

    onChange(nextMenu);
  };

  const addItemForVariety = (v: DietaryVariety) => {
    const text = (newItemText[v.id] || "").trim();
    if (!text) return;

    const currentItems = getVarietyItems(v);
    const nextItems = [...currentItems, text];

    const nextMenu = { ...value };
    const nextVarieties = { ...(nextMenu.varieties || {}) };
    const currentVar = { ...(nextVarieties[v.id] || {}), items: [...nextItems] };
    nextVarieties[v.id] = currentVar;
    nextMenu.varieties = nextVarieties;

    if (v.id === "veg_default") nextMenu.veg = [...nextItems];
    if (v.id === "nonVeg_default") nextMenu.nonVeg = [...nextItems];

    onChange(nextMenu);
    setNewItemText((prev) => ({ ...prev, [v.id]: "" }));
  };

  const removeItemForVariety = (v: DietaryVariety, index: number) => {
    const currentItems = getVarietyItems(v);
    const nextItems = currentItems.filter((_, i) => i !== index);

    const nextMenu = { ...value };
    const nextVarieties = { ...(nextMenu.varieties || {}) };
    const currentVar = { ...(nextVarieties[v.id] || {}), items: [...nextItems] };
    nextVarieties[v.id] = currentVar;
    nextMenu.varieties = nextVarieties;

    if (v.id === "veg_default") nextMenu.veg = [...nextItems];
    if (v.id === "nonVeg_default") nextMenu.nonVeg = [...nextItems];

    onChange(nextMenu);
  };

  const isSpecial = isSpecialMeal(dayId, mealKey, config);

  return (
    <View
      style={[
        styles.mealEditor,
        disabled && { opacity: 0.6 },
        isSpecial && {
          backgroundColor: theme.colors.specialMealBg,
          borderColor: theme.colors.specialMealBorder,
          borderWidth: 2,
          borderStyle: "dashed",
          borderRadius: 16,
          padding: 12,
          marginBottom: 16,
        }
      ]}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap", flex: 1 }}>
          <Text style={[styles.mealEditorTitle, { marginBottom: 0, color: isCurrent ? theme.colors.primary : isSpecial ? theme.colors.specialMealText : theme.colors.textSecondary }]}>{title}</Text>
          {isSpecial && (
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: theme.colors.specialMealBorder, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Ionicons name="star" size={10} color={theme.colors.white} />
              <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900", letterSpacing: 0.5 }}>{UI_TEXT.specialMealBadge}</Text>
            </View>
          )}
          {isCurrent && (
            <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
              <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.live.toUpperCase()}</Text>
            </View>
          )}
        </View>
      </View>

      {/* Render dedicated input block for each dietary sub-category */}
      {varieties.map((v) => {
        const vItems = getVarietyItems(v);
        const vColor = v.color || (v.type === DietType.VEG ? theme.colors.veg : theme.colors.nonVeg);

        return (
          <View
            key={v.id}
            style={{
              backgroundColor: theme.colors.surface,
              borderRadius: 14,
              padding: 12,
              marginBottom: 16,
              borderWidth: 1.5,
              borderColor: vColor,
              gap: 12,
            }}
          >
            {/* Variety Sub-Category Header */}
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: vColor }} />
                <Text style={{ fontSize: 15, fontWeight: "900", color: theme.colors.textPrimary }}>
                  {v.name}
                </Text>
                <View style={{ backgroundColor: theme.colors.surfaceDark, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                    {v.type}
                  </Text>
                </View>
              </View>
            </View>

            {/* Pricing Section per Sub-Category */}
            {foodPriceEnabled && (
              <View style={{ gap: 8 }}>
                <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
                  <View style={{ flex: 1, minWidth: 100 }}>
                    <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, marginBottom: 4 }}>
                      {UI_TEXT.adultPriceLabel.toUpperCase()}
                    </Text>
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
                        fontWeight: "700",
                      }}
                      value={getVarietyPrice(v, "adultPrice")}
                      onChangeText={(val) => updateVarietyField(v, "adultPrice", val.replace(/[^0-9]/g, ""))}
                      keyboardType="numeric"
                      placeholder={UI_TEXT.zero}
                      editable={!disabled}
                    />
                  </View>

                  {kidsEnabled && (
                    <View style={{ flex: 1, minWidth: 100 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, marginBottom: 4 }}>
                        {UI_TEXT.kidsPriceLabel.toUpperCase()}
                      </Text>
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
                          fontWeight: "700",
                        }}
                        value={getVarietyPrice(v, "kidsPrice")}
                        onChangeText={(val) => updateVarietyField(v, "kidsPrice", val.replace(/[^0-9]/g, ""))}
                        keyboardType="numeric"
                        placeholder={UI_TEXT.zero}
                        editable={!disabled}
                      />
                    </View>
                  )}

                  {guestsEnabled && (
                    <View style={{ flex: 1, minWidth: 100 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, marginBottom: 4 }}>
                        {UI_TEXT.guestPriceLabel.toUpperCase()}
                      </Text>
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
                          fontWeight: "700",
                        }}
                        value={getVarietyPrice(v, "guestPrice")}
                        onChangeText={(val) => updateVarietyField(v, "guestPrice", val.replace(/[^0-9]/g, ""))}
                        keyboardType="numeric"
                        placeholder={UI_TEXT.zero}
                        editable={!disabled}
                      />
                    </View>
                  )}
                </View>

                {mConf?.parcel && (
                  <View style={[styles.row, { flexWrap: "wrap", gap: 8 }]}>
                    <View style={{ flex: 1, minWidth: 100 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, marginBottom: 4 }}>
                        {UI_TEXT.parcelPriceLabel.toUpperCase()}
                      </Text>
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
                          fontWeight: "700",
                        }}
                        value={getVarietyPrice(v, "parcelPrice")}
                        onChangeText={(val) => updateVarietyField(v, "parcelPrice", val.replace(/[^0-9]/g, ""))}
                        keyboardType="numeric"
                        placeholder={UI_TEXT.zero}
                        editable={!disabled}
                      />
                    </View>

                    {kidsEnabled && isKidsParcelEnabled(dayId, mealKey, config, kidsEnabled) && (
                      <View style={{ flex: 1, minWidth: 100 }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, marginBottom: 4 }}>
                          {UI_TEXT.kidsParcelPriceLabel.toUpperCase()}
                        </Text>
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
                            fontWeight: "700",
                          }}
                          value={getVarietyPrice(v, "kidsParcelPrice")}
                          onChangeText={(val) => updateVarietyField(v, "kidsParcelPrice", val.replace(/[^0-9]/g, ""))}
                          keyboardType="numeric"
                          placeholder={UI_TEXT.zero}
                          editable={!disabled}
                        />
                      </View>
                    )}

                    {guestsEnabled && isGuestsParcelEnabled(dayId, mealKey, config, guestsEnabled) && (
                      <View style={{ flex: 1, minWidth: 100 }}>
                        <Text style={{ fontSize: 10, fontWeight: "700", color: theme.colors.textSecondary, marginBottom: 4 }}>
                          {UI_TEXT.guestsParcelPriceLabel.toUpperCase()}
                        </Text>
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
                            fontWeight: "700",
                          }}
                          value={getVarietyPrice(v, "guestParcelPrice")}
                          onChangeText={(val) => updateVarietyField(v, "guestParcelPrice", val.replace(/[^0-9]/g, ""))}
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

            {/* Menu Items Input Row */}
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput
                style={[styles.mealInput, { flex: 1 }]}
                value={newItemText[v.id] || ""}
                onChangeText={(txt) => setNewItemText((prev) => ({ ...prev, [v.id]: txt }))}
                placeholder={`Add item to ${v.name}...`}
                placeholderTextColor={theme.colors.textMuted}
                editable={!disabled}
              />
              <Pressable
                onPress={() => !disabled && addItemForVariety(v)}
                disabled={disabled}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${UI_TEXT.add} ${v.name}`}
                style={[
                  styles.addSmall,
                  { backgroundColor: vColor, borderWidth: 0 },
                ]}
              >
                <Ionicons name="add" size={20} color={theme.colors.white} />
              </Pressable>
            </View>

            {/* Food Items Badges */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
              {vItems.map((item, i) => (
                <View key={`${v.id}-${i}`} style={styles.itemBadge}>
                  <View style={[styles.dot, { backgroundColor: vColor }]} />
                  <Text style={styles.itemBadgeText}>{item}</Text>
                  <Pressable
                    onPress={() => !disabled && removeItemForVariety(v, i)}
                    disabled={disabled}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={UI_TEXT.removeMenuItem.replace("{item}", item)}
                  >
                    <Ionicons name="close-circle" size={14} color={theme.colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
              {vItems.length === 0 && (
                <Text style={{ fontSize: 12, fontStyle: "italic", color: theme.colors.textMuted }}>
                  {UI_TEXT.noItemsListed}
                </Text>
              )}
            </View>
          </View>
        );
      })}

      {onSave && (
        <Pressable
          onPress={onSave}
          disabled={!isDirty || disabled}
          style={({ pressed }) => [
            styles.primary,
            { height: 40, marginTop: 12 },
            !isDirty && { backgroundColor: theme.colors.surfaceDark, opacity: 0.5 },
            pressed && { opacity: 0.7 },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name="save-outline" size={18} color={isDirty ? theme.colors.white : theme.colors.textMuted} />
            <Text style={{ color: isDirty ? theme.colors.white : theme.colors.textMuted, fontWeight: "800", fontSize: 14 }}>
              {UI_TEXT.saveChanges.toUpperCase()}
            </Text>
          </View>
        </Pressable>
      )}
    </View>
  );
}
