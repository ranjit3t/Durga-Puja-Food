/**
 * Food Package Screen
 * Displays list of food packages with add, edit, delete, and enable/disable capabilities.
 * Supports both Meal-Based Packages and Flat Rate Discount Packages with Minimum Cart Value.
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StatusBar,
  ActivityIndicator,
  FlatList,
  TextInput,
  Platform,
  Modal,
  KeyboardAvoidingView,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import {
  AppScreen,
  FoodPackage,
  PackageApplicability,
  PackageMealItem,
  PackageDiscountType,
  UserRole,
  AppThemeMode,
  MealType,
} from "../domain";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { UserGreeting } from "../components/common/UserGreeting";
import { ActionLabel } from "../components/common/ActionLabel";

import { useAuth } from "../context/AuthContext";
import { useCoreDatabase, useFoodPackages } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";
import { useUI } from "../context/UIContext";
import { getDayLabel, getMealLabel, isMealEnabled, getMealVarieties, isSpecialMeal, getApplicabilityLabel } from "../constants";
import { resolveVarietyPrice } from "../utils/paymentUtils";

export function FoodPackageScreen() {
  const { userRole, handleLogout } = useAuth();
  const { dayConfig, foodMenu, subscriptions, loading, refreshAllData } = useCoreDatabase();
  const { foodPackages, upsertFoodPackage, deleteFoodPackage } = useFoodPackages();
  const { navigate, goBack } = useAppNavigation();
  const { showAlert } = useUI();

  const styles = useStyles();
  const { s, v } = useScaling();
  const { theme, themeType } = useAppTheme();

  const [searchText, setSearchText] = useState("");
  const [filterActiveOnly, setFilterActiveOnly] = useState(false);

  const [editingPackage, setEditingNote] = useState<FoodPackage | null>(null);
  const [viewingPackage, setViewingPackage] = useState<FoodPackage | null>(null);
  const [packageName, setPackageName] = useState("");
  const [packageDesc, setPackageDesc] = useState("");
  const [applicability, setApplicability] = useState<PackageApplicability>("adult");
  const [discountType, setDiscountType] = useState<PackageDiscountType>("meal_package");
  const [isEnabled, setIsEnabled] = useState(true);
  const [selectedMealItems, setSelectedMealItems] = useState<Record<string, PackageMealItem[]>>({});
  const [packagePriceInput, setPackagePriceInput] = useState("");
  const [discountRateInput, setDiscountRateInput] = useState("");
  const [minCartValueInput, setMinCartValueInput] = useState("0");
  const [isSaving, setIsSaving] = useState(false);

  const isAdmin = userRole === UserRole.ADMIN;

  const isPackageInUse = useCallback(
    (packageId: string) => {
      return subscriptions.some((sub) =>
        Object.values(sub.appliedPackages || {}).some((info) => info.packageId === packageId)
      );
    },
    [subscriptions]
  );

  const filteredPackages = useMemo(() => {
    return foodPackages.filter((pkg) => {
      if (filterActiveOnly && !pkg.enabled) return false;
      if (searchText) {
        const query = searchText.trim().toLowerCase();
        const matchName = pkg.name?.toLowerCase().includes(query);
        const matchDesc = pkg.description?.toLowerCase().includes(query);
        const matchApplicability = pkg.applicability?.toLowerCase().includes(query);
        const matchDiscountType = pkg.discountType?.toLowerCase().includes(query);
        const matchPrice = String(pkg.packagePrice ?? "").toLowerCase().includes(query) || String(pkg.currentPrice ?? "").toLowerCase().includes(query) || String(pkg.discountRate ?? "").toLowerCase().includes(query);

        let matchMeals = false;
        const mealItemsMap = pkg.selectedMealItems || {};
        const legacyMealsMap = pkg.selectedMeals || {};
        Object.keys(mealItemsMap).forEach(dayId => {
          const dayLabel = getDayLabel(dayId, dayConfig).toLowerCase();
          if (dayLabel.includes(query)) matchMeals = true;
          (mealItemsMap[dayId] || []).forEach(item => {
            if (item.mealType?.toLowerCase().includes(query) || item.varietyId?.toLowerCase().includes(query)) matchMeals = true;
          });
        });
        Object.keys(legacyMealsMap).forEach(dayId => {
          const dayLabel = getDayLabel(dayId, dayConfig).toLowerCase();
          if (dayLabel.includes(query)) matchMeals = true;
          (legacyMealsMap[dayId] || []).forEach((m: any) => {
            if (String(m).toLowerCase().includes(query)) matchMeals = true;
          });
        });

        if (!matchName && !matchDesc && !matchApplicability && !matchDiscountType && !matchPrice && !matchMeals) {
          return false;
        }
      }
      return true;
    });
  }, [foodPackages, filterActiveOnly, searchText, dayConfig]);

  const calculatedCurrentPrice = useMemo(() => {
    let total = 0;
    const activeDays = dayConfig.filter((d) => d.enabled);

    activeDays.forEach((dayConf) => {
      const dayId = dayConf.id;
      const items = selectedMealItems[dayId] || [];
      const isKid = applicability === "kids";

      items.forEach((item) => {
        if (!item.varietyId || item.varietyId.trim() === "") return;
        if (!isMealEnabled(dayId, item.mealType, dayConfig)) return;
        const price = resolveVarietyPrice(
          dayId,
          item.mealType,
          item.varietyId,
          isKid,
          false,
          applicability,
          dayConfig,
          foodMenu
        );
        total += price;
      });
    });

    return total;
  }, [dayConfig, foodMenu, selectedMealItems, applicability]);

  const parsedPackagePrice = parseFloat(packagePriceInput) || 0;
  const parsedDiscountRate = parseFloat(discountRateInput) || 0;
  const parsedMinCartValue = parseFloat(minCartValueInput) || 0;

  const hasValidMealsSelected = useMemo(() => {
    return Object.values(selectedMealItems).some((arr) =>
      arr && arr.some((item) => item.varietyId && item.varietyId.trim() !== "")
    );
  }, [selectedMealItems]);

  const isPackagePriceValid = useMemo(() => {
    if (discountType === "flat_discount") return true;
    if (packagePriceInput.trim() === "") return true;
    if (calculatedCurrentPrice <= 0) return true;
    return (
      !isNaN(parsedPackagePrice) &&
      parsedPackagePrice >= 0 &&
      parsedPackagePrice < calculatedCurrentPrice
    );
  }, [discountType, packagePriceInput, parsedPackagePrice, calculatedCurrentPrice]);

  const canSavePackage = useMemo(() => {
    if (!packageName.trim() || !packageDesc.trim()) return false;

    if (discountType === "flat_discount") {
      if (parsedDiscountRate <= 0 || parsedDiscountRate > 100 || isNaN(parsedDiscountRate)) return false;
      if (isNaN(parsedMinCartValue) || parsedMinCartValue < 0) return false;
      if (hasValidMealsSelected && calculatedCurrentPrice < parsedMinCartValue) return false;
      return true;
    } else {
      if (!hasValidMealsSelected) return false;
      if (calculatedCurrentPrice <= 0) return false;
      if (isNaN(parsedPackagePrice) || parsedPackagePrice < 0 || parsedPackagePrice >= calculatedCurrentPrice) return false;
      return true;
    }
  }, [packageName, packageDesc, discountType, parsedDiscountRate, parsedMinCartValue, hasValidMealsSelected, calculatedCurrentPrice, parsedPackagePrice]);

  const handleAddPackage = () => {
    setEditingNote({
      id: "",
      name: "",
      description: "",
      applicability: "adult",
      enabled: true,
      discountType: "meal_package",
      selectedMealItems: {},
      packagePrice: 0,
      currentPrice: 0,
      discountRate: 0,
      minCartValue: 0,
      timestamp: Date.now(),
    });
    setPackageName("");
    setPackageDesc("");
    setApplicability("adult");
    setDiscountType("meal_package");
    setIsEnabled(true);
    setSelectedMealItems({});
    setPackagePriceInput("");
    setDiscountRateInput("");
    setMinCartValueInput("0");
  };

  const handleEditPackage = (pkg: FoodPackage) => {
    if (isPackageInUse(pkg.id)) {
      showAlert(UI_TEXT.packageInUseEditTitle, UI_TEXT.packageInUseEditMsg);
      return;
    }
    setEditingNote(pkg);
    setPackageName(pkg.name);
    setPackageDesc(pkg.description);
    setApplicability(pkg.applicability);
    setDiscountType(pkg.discountType || (pkg.discountRate !== undefined ? "flat_discount" : "meal_package"));
    setIsEnabled(pkg.enabled);

    const mealItems = pkg.selectedMealItems || {};
    if (Object.keys(mealItems).length === 0 && pkg?.selectedMeals) {
      const migrated: Record<string, PackageMealItem[]> = {};
      Object.keys(pkg.selectedMeals || {}).forEach((dayId) => {
        migrated[dayId] = ((pkg.selectedMeals || {})[dayId] || []).map((m) => ({ mealType: m, varietyId: "veg_default" }));
      });
      setSelectedMealItems(migrated);
    } else {
      setSelectedMealItems(mealItems);
    }

    setPackagePriceInput(pkg.packagePrice !== undefined ? String(pkg.packagePrice) : "0");
    setDiscountRateInput(pkg.discountRate !== undefined ? String(pkg.discountRate) : "");
    setMinCartValueInput(pkg.minCartValue !== undefined ? String(pkg.minCartValue) : "0");
  };

  const handleToggleMealVariety = (dayId: string, mealType: MealType, varietyId: string) => {
    setSelectedMealItems((prev) => {
      const current = prev[dayId] || [];
      const existingItemIndex = current.findIndex((item) => item.mealType === mealType);

      let updated: PackageMealItem[];
      if (existingItemIndex >= 0) {
        if (current[existingItemIndex].varietyId === varietyId) {
          updated = current.filter((item) => item.mealType !== mealType);
        } else {
          updated = current.map((item, idx) =>
            idx === existingItemIndex ? { mealType, varietyId } : item
          );
        }
      } else {
        updated = [...current, { mealType, varietyId }];
      }

      const next = { ...prev };
      if (updated.length > 0) {
        next[dayId] = updated;
      } else {
        delete next[dayId];
      }
      return next;
    });
  };

  const handleDeletePackage = (id: string) => {
    if (isPackageInUse(id)) {
      showAlert(UI_TEXT.packageInUseDeleteTitle, UI_TEXT.packageInUseDeleteMsg);
      return;
    }
    showAlert(UI_TEXT.deletePackageConfirmTitle, UI_TEXT.deletePackageConfirmMsg, [
      { text: UI_TEXT.cancel, style: "cancel" },
      {
        text: UI_TEXT.deleteButton,
        style: "destructive",
        onPress: async () => {
          try {
            await deleteFoodPackage(id);
          } catch (err) {
            showAlert(UI_TEXT.error, UI_TEXT.packageDeleteError);
          }
        },
      },
    ]);
  };

  const handleToggleEnabled = async (pkg: FoodPackage) => {
    try {
      await upsertFoodPackage({
        ...pkg,
        enabled: !pkg.enabled,
      });
    } catch (err) {
      showAlert(UI_TEXT.error, UI_TEXT.packageSaveError);
    }
  };

  const handleSavePackage = async () => {
    if (!canSavePackage) return;
    setIsSaving(true);
    try {
      const isFlat = discountType === "flat_discount";
      await upsertFoodPackage({
        id: editingPackage?.id || "",
        name: packageName.trim(),
        description: packageDesc.trim(),
        applicability,
        enabled: isEnabled,
        discountType,
        selectedMealItems,
        currentPrice: calculatedCurrentPrice,
        packagePrice: isFlat ? undefined : parsedPackagePrice,
        discountRate: isFlat ? parsedDiscountRate : undefined,
        minCartValue: isFlat ? parsedMinCartValue : undefined,
        timestamp: editingPackage?.id ? editingPackage.timestamp : Date.now(),
      });
      setEditingNote(null);
    } catch (err) {
      showAlert(UI_TEXT.error, UI_TEXT.packageSaveError);
    } finally {
      setIsSaving(false);
    }
  };

  const displayNameOrPrice = (item: FoodPackage) => {
    const isFlat = item.discountType === "flat_discount" || item.discountRate !== undefined;
    if (isFlat) return `${item.discountRate}% ${UI_TEXT.offLabel}`;
    return `${item.packagePrice}`;
  };

  const renderItem = useCallback(
    ({ item, index }: { item: FoodPackage; index: number }) => {
      const colorScheme = theme.cardColors[index % theme.cardColors.length];
      const isFlat = item.discountType === "flat_discount" || item.discountRate !== undefined;

      const mealItemsMap = item.selectedMealItems || {};
      const legacyMealsMap = item.selectedMeals || {};
      const includedDays = Object.keys(mealItemsMap).length > 0 ? Object.keys(mealItemsMap) : Object.keys(legacyMealsMap);
      const mealSummaryParts = includedDays.map((dayId) => {
        const dLabel = getDayLabel(dayId, dayConfig);
        const items: PackageMealItem[] = mealItemsMap[dayId] || (legacyMealsMap[dayId] || []).map((m: any) => ({ mealType: m, varietyId: "" }));
        const details = items.map((i) => {
          const mLabel = getMealLabel(i.mealType);
          const mealConf = dayConfig.find((d) => d.id === dayId)?.[i.mealType];
          const varieties = getMealVarieties(mealConf);
          const v = varieties.find((vr) => vr.id === i.varietyId);
          const isSpecial = isSpecialMeal(dayId, i.mealType, dayConfig);
          const baseStr = v ? `${mLabel} (${v.name})` : mLabel;
          return isSpecial ? `${baseStr} ⭐ (${UI_TEXT.specialMealBadge})` : baseStr;
        }).join(", ");
        return `${dLabel}: ${details}`;
      });

      return (
        <View
          style={[
            styles.card,
            {
              backgroundColor: colorScheme.bg,
              borderColor: colorScheme.border,
              marginBottom: s(12),
              padding: s(16),
              borderLeftWidth: 4,
              borderLeftColor: colorScheme.accent,
              opacity: item.enabled ? 1 : 0.65,
            },
          ]}
        >
          {/* Top Info Row */}
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: s(10) }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: s(8), flexWrap: "wrap", flex: 1 }}>
              <View
                style={{
                  backgroundColor: colorScheme.accentLight,
                  paddingHorizontal: s(10),
                  paddingVertical: s(4),
                  borderRadius: s(8),
                  borderWidth: 1,
                  borderColor: colorScheme.border,
                }}
              >
                <Text style={{ fontSize: s(11), fontWeight: "900", color: colorScheme.accent }}>
                  {getApplicabilityLabel(item.applicability).toUpperCase()}
                </Text>
              </View>

              <View
                style={{
                  backgroundColor: item.enabled ? theme.colors.successLight : theme.colors.surfaceDark,
                  paddingHorizontal: s(8),
                  paddingVertical: s(3),
                  borderRadius: s(6),
                  borderWidth: 1,
                  borderColor: item.enabled ? theme.colors.success : theme.colors.border,
                }}
              >
                <Text
                  style={{
                    fontSize: s(10),
                    fontWeight: "800",
                    color: item.enabled ? theme.colors.success : theme.colors.textMuted,
                  }}
                >
                  {item.enabled ? UI_TEXT.activeLabel : UI_TEXT.disabledLabel}
                </Text>
              </View>

              {isPackageInUse(item.id) && (
                <View
                  style={{
                    backgroundColor: theme.colors.primary + "15",
                    paddingHorizontal: s(8),
                    paddingVertical: s(3),
                    borderRadius: s(6),
                    borderWidth: 1,
                    borderColor: theme.colors.primary,
                  }}
                >
                  <Text
                    style={{
                      fontSize: s(10),
                      fontWeight: "800",
                      color: theme.colors.primary,
                    }}
                  >
                    {UI_TEXT.packageInUseBadge}
                  </Text>
                </View>
              )}
            </View>

            {isAdmin && (
              <View style={{ flexDirection: "row", alignItems: "center", gap: s(10), flexShrink: 0 }}>
                <Pressable
                  onPress={() => handleToggleEnabled(item)}
                  accessible={true}
                  accessibilityRole="switch"
                  accessibilityLabel={`${UI_TEXT.toggle} ${item.name}`}
                  style={({ pressed }) => [{ padding: s(4) }, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons
                    name={item.enabled ? "toggle" : "toggle-outline"}
                    size={s(26)}
                    color={item.enabled ? theme.colors.success : theme.colors.textMuted}
                  />
                </Pressable>

                <Pressable
                  onPress={() => handleEditPackage(item)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${UI_TEXT.editNote} ${item.name}`}
                  style={({ pressed }) => [{ padding: s(4) }, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="pencil-outline" size={s(20)} color={theme.colors.primary} />
                </Pressable>

                <Pressable
                  onPress={() => handleDeletePackage(item.id)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`${UI_TEXT.deleteFoodPackage} ${item.name}`}
                  style={({ pressed }) => [{ padding: s(4) }, pressed && { opacity: 0.6 }]}
                >
                  <Ionicons name="trash-outline" size={s(20)} color={theme.colors.error} />
                </Pressable>
              </View>
            )}
          </View>

          {/* Clickable Card Body Area */}
          <Pressable
            onPress={() => setViewingPackage(item)}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel={`${UI_TEXT.viewFoodPackage}: ${item.name}`}
            style={({ pressed }) => [
              { gap: s(4) },
              pressed && { opacity: 0.85 }
            ]}
          >
            {/* Package Name & Description */}
            <Text style={{ fontSize: s(17), fontWeight: "900", color: theme.colors.textPrimary, marginBottom: s(4) }}>
              {item.name}
            </Text>
            <Text style={{ fontSize: s(13), color: theme.colors.textSecondary, marginBottom: s(12), fontWeight: "500" }}>
              {item.description}
            </Text>

            {/* Meals Included Summary */}
            {mealSummaryParts.length > 0 && (
              <View style={{ backgroundColor: theme.colors.surfaceDark, padding: s(10), borderRadius: s(10), marginBottom: s(12) }}>
                <Text style={{ fontSize: s(11), fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase", marginBottom: s(4) }}>
                  {UI_TEXT.selectMealsForPackage}
                </Text>
                {mealSummaryParts.map((part, pIdx) => (
                  <Text key={pIdx} style={{ fontSize: s(12), fontWeight: "700", color: theme.colors.textPrimary }}>
                    • {part}
                  </Text>
                ))}
              </View>
            )}

            {/* Pricing Details Bar */}
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                backgroundColor: colorScheme.accentLight,
                padding: s(12),
                borderRadius: s(12),
                borderWidth: 1,
                borderColor: colorScheme.border,
              }}
            >
              <View>
                <Text style={{ fontSize: s(10), fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase" }}>
                  {isFlat ? UI_TEXT.minCartValue : UI_TEXT.normalPrice}
                </Text>
                <Text style={{ fontSize: s(14), fontWeight: "800", color: theme.colors.textMuted }}>
                  {isFlat ? (item.minCartValue ?? 0) : item.currentPrice}
                </Text>
              </View>

              <View style={{ alignItems: "center" }}>
                <Text style={{ fontSize: s(10), fontWeight: "800", color: colorScheme.accent, textTransform: "uppercase" }}>
                  {UI_TEXT.packagePrice}
                </Text>
                <Text style={{ fontSize: s(16), fontWeight: "900", color: colorScheme.accent }}>
                  {displayNameOrPrice(item)}
                </Text>
              </View>
            </View>
          </Pressable>
        </View>
      );
    },
    [theme, styles, s, dayConfig, isAdmin, handleToggleEnabled, handleEditPackage, handleDeletePackage, setViewingPackage]
  );

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={[styles.header, { paddingBottom: s(20) }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexShrink: 0 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <UserGreeting />
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={styles.title}>{UI_TEXT.foodPackages}</Text>
            <Text style={styles.subtitle}>{UI_TEXT.foodPackageSubtitle}</Text>
          </View>
          {isAdmin && (
            <Pressable
              onPress={handleAddPackage}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.addFoodPackage}
              style={({ pressed }) => [
                styles.compactSecondary,
                {
                  backgroundColor: theme.colors.primary,
                  borderColor: theme.colors.primary,
                  minWidth: s(110),
                  height: v(s(64)),
                  flexGrow: 0,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <ActionLabel icon="add-circle-outline" label={UI_TEXT.addFoodPackage} color={theme.colors.white} size={s(18)} vertical />
            </Pressable>
          )}
        </View>
      </View>

      {/* Filter and Search Bar */}
      <View style={[styles.maxWidthWrapper, { paddingVertical: 12 }]}>
        <View style={[styles.card, { backgroundColor: theme.colors.surfaceDark + (theme.themeType === AppThemeMode.DARK ? "66" : "80"), marginBottom: 0, gap: 12 }]}>
          <View style={{ flexDirection: "row", gap: 12, alignItems: "center" }}>
            <View style={[styles.searchBox, { flex: 1, marginBottom: 0, height: 52, borderRadius: 14, maxWidth: undefined }]}>
              <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { fontSize: 15 }]}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={UI_TEXT.searchFoodPackages}
                placeholderTextColor={theme.colors.textMuted}
                accessible={true}
                accessibilityLabel={UI_TEXT.searchFoodPackages}
              />
            </View>
            <Pressable
              onPress={() => setFilterActiveOnly(!filterActiveOnly)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.reportFilters}
              style={({ pressed }) => [
                {
                  paddingHorizontal: 12,
                  height: 52,
                  borderRadius: 14,
                  backgroundColor: filterActiveOnly ? theme.colors.primary : theme.colors.surfaceDark,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 1,
                  borderColor: theme.colors.border,
                  flexDirection: "row",
                  gap: 6,
                },
                pressed && { opacity: 0.7 },
              ]}
            >
              <Ionicons name="filter-outline" size={20} color={filterActiveOnly ? theme.colors.white : theme.colors.textPrimary} />
              <Text style={{ color: filterActiveOnly ? theme.colors.white : theme.colors.textPrimary, fontWeight: "800", fontSize: 13 }}>
                {filterActiveOnly ? UI_TEXT.activeLabel : UI_TEXT.reportFilters}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>

      {/* Packages List */}
      {loading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={{ marginTop: 12, color: theme.colors.textSecondary, fontWeight: "600" }}>{UI_TEXT.loading}</Text>
        </View>
      ) : (
        <FlatList
          data={filteredPackages}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.content, { paddingTop: 16 }]}
          refreshing={loading}
          onRefresh={refreshAllData}
          ListEmptyComponent={
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <View style={{ backgroundColor: theme.colors.surfaceDark, padding: 20, borderRadius: 30, marginBottom: 16 }}>
                <Ionicons name="cube-outline" size={48} color={theme.colors.border} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", color: theme.colors.textPrimary }}>
                {UI_TEXT.noPackagesAvailable}
              </Text>
            </View>
          }
          ListFooterComponent={
            <View style={styles.footer}>
              <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
            </View>
          }
        />
      )}

      {/* Add / Edit Food Package Modal */}
      <Modal visible={!!editingPackage} animationType="slide" transparent={true} onRequestClose={() => setEditingNote(null)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1, backgroundColor: theme.colors.shadow + "80", justifyContent: "center", alignItems: "center" }}
        >
          <View style={[styles.card, { width: "92%", maxHeight: "90%", padding: s(20), backgroundColor: theme.colors.surface }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: s(16) }}>
              <Text style={{ fontSize: s(20), fontWeight: "900", color: theme.colors.textPrimary }}>
                {editingPackage?.id ? UI_TEXT.editFoodPackage : UI_TEXT.addFoodPackage}
              </Text>
              <Pressable
                onPress={() => setEditingNote(null)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.close}
                accessibilityHint="Closes package editor modal"
              >
                <Ionicons name="close-outline" size={s(24)} color={theme.colors.textPrimary} />
              </Pressable>
            </View>

            <ScrollView style={{ flexShrink: 1 }} contentContainerStyle={{ gap: s(14) }}>
              {/* Package Name */}
              <View>
                <Text style={styles.label}>{UI_TEXT.packageName}</Text>
                <TextInput
                  style={styles.input}
                  value={packageName}
                  onChangeText={setPackageName}
                  placeholder={UI_TEXT.packageNamePlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  accessible={true}
                  accessibilityLabel={UI_TEXT.packageName}
                />
              </View>

              {/* Package Description */}
              <View>
                <Text style={styles.label}>{UI_TEXT.packageDesc}</Text>
                <TextInput
                  style={[styles.input, { height: s(70), textAlignVertical: "top" }]}
                  value={packageDesc}
                  onChangeText={setPackageDesc}
                  placeholder={UI_TEXT.packageDescPlaceholder}
                  placeholderTextColor={theme.colors.textMuted}
                  multiline
                  accessible={true}
                  accessibilityLabel={UI_TEXT.packageDesc}
                />
              </View>

              {/* Applicability Selector */}
              <View>
                <Text style={styles.label}>{UI_TEXT.applicability}</Text>
                <View style={{ flexDirection: "row", gap: s(8), marginTop: s(4) }}>
                  {(["adult", "kids", "guests", "member"] as PackageApplicability[]).map((appOption) => {
                    const isSelected = applicability === appOption;
                    return (
                      <Pressable
                        key={appOption}
                        onPress={() => setApplicability(appOption)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`${UI_TEXT.applicability}: ${getApplicabilityLabel(appOption)}`}
                        style={({ pressed }) => [
                          {
                            flex: 1,
                            paddingVertical: s(10),
                            alignItems: "center",
                            borderRadius: s(10),
                            borderWidth: 1.5,
                            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                            backgroundColor: isSelected ? theme.colors.primary + "15" : theme.colors.surfaceDark,
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: s(13),
                            fontWeight: "800",
                            color: isSelected ? theme.colors.primary : theme.colors.textPrimary,
                          }}
                        >
                          {getApplicabilityLabel(appOption)}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Discount Type Selector (Meal-Based vs Flat Rate Discount) */}
              <View>
                <Text style={styles.label}>{UI_TEXT.discountType}</Text>
                <View style={{ flexDirection: "row", gap: s(8), marginTop: s(4) }}>
                  {[
                    { id: "meal_package" as PackageDiscountType, label: UI_TEXT.mealBasedPackage },
                    { id: "flat_discount" as PackageDiscountType, label: UI_TEXT.flatRateDiscount },
                  ].map((dt) => {
                    const isSelected = discountType === dt.id;
                    return (
                      <Pressable
                        key={dt.id}
                        onPress={() => setDiscountType(dt.id)}
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityState={{ selected: isSelected }}
                        accessibilityLabel={`${UI_TEXT.discountType}: ${dt.label}`}
                        style={({ pressed }) => [
                          {
                            flex: 1,
                            paddingVertical: s(10),
                            alignItems: "center",
                            borderRadius: s(10),
                            borderWidth: 1.5,
                            borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                            backgroundColor: isSelected ? theme.colors.primary + "15" : theme.colors.surfaceDark,
                          },
                          pressed && { opacity: 0.8 },
                        ]}
                      >
                        <Text
                          style={{
                            fontSize: s(12),
                            fontWeight: "800",
                            color: isSelected ? theme.colors.primary : theme.colors.textPrimary,
                          }}
                        >
                          {dt.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>

              {/* Optional / Required Meal & Variety Selection Matrix */}
              <View>
                <Text style={styles.label}>
                  {UI_TEXT.selectMealsForPackage} {discountType === "flat_discount" ? UI_TEXT.optionalLabel : UI_TEXT.requiredLabel}
                </Text>
                <View style={{ gap: s(10), marginTop: s(6) }}>
                  {dayConfig
                    .filter((d) => d.enabled)
                    .map((day) => {
                      const dayItems = selectedMealItems[day.id] || [];
                      return (
                        <View
                          key={day.id}
                          style={{
                            backgroundColor: theme.colors.surfaceDark,
                            padding: s(12),
                            borderRadius: s(12),
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            gap: s(8),
                          }}
                        >
                          <Text style={{ fontSize: s(14), fontWeight: "800", color: theme.colors.textPrimary }}>
                            {getDayLabel(day.id, dayConfig)}
                          </Text>

                          {[MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]
                            .filter((mKey) => isMealEnabled(day.id, mKey, dayConfig))
                            .map((mKey) => {
                              const mealConf = (day as any)[mKey];
                              const varieties = getMealVarieties(mealConf);
                              const isSpecial = isSpecialMeal(day.id, mKey, dayConfig);

                              return (
                                <View
                                  key={mKey}
                                  style={[
                                    { backgroundColor: theme.colors.surface, padding: s(8), borderRadius: s(8), gap: s(6) },
                                    isSpecial && {
                                      backgroundColor: theme.colors.specialMealBg,
                                      borderColor: theme.colors.specialMealBorder,
                                      borderWidth: 1.5,
                                      borderStyle: "dashed",
                                    }
                                  ]}
                                >
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: s(6), flexWrap: "wrap" }}>
                                    <Text style={{ fontSize: s(12), fontWeight: "800", color: isSpecial ? theme.colors.specialMealText : theme.colors.textSecondary }}>
                                      {getMealLabel(mKey)}
                                    </Text>
                                    {isSpecial && (
                                      <View style={{ backgroundColor: theme.colors.specialMealBorder, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, flexDirection: "row", alignItems: "center", gap: 4 }}>
                                        <Ionicons name="star" size={10} color={theme.colors.white} />
                                        <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.specialMealBadge}</Text>
                                      </View>
                                    )}
                                  </View>
                                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: s(6) }}>
                                    {varieties.map((v) => {
                                      const isChecked = dayItems.some((item) => item.mealType === mKey && item.varietyId === v.id);
                                      return (
                                        <Pressable
                                          key={v.id}
                                          onPress={() => handleToggleMealVariety(day.id, mKey, v.id)}
                                          accessible={true}
                                          accessibilityRole="checkbox"
                                          accessibilityState={{ checked: isChecked }}
                                          accessibilityLabel={`${getDayLabel(day.id, dayConfig)} ${getMealLabel(mKey)} ${v.name}`}
                                          style={({ pressed }) => [
                                            {
                                              paddingVertical: s(6),
                                              paddingHorizontal: s(10),
                                              borderRadius: s(6),
                                              borderWidth: 1.5,
                                              borderColor: isChecked ? theme.colors.primary : theme.colors.border,
                                              backgroundColor: isChecked ? theme.colors.primary : theme.colors.surfaceDark,
                                            },
                                            pressed && { opacity: 0.8 },
                                          ]}
                                        >
                                          <Text
                                            style={{
                                              fontSize: s(11),
                                              fontWeight: "800",
                                              color: isChecked ? theme.colors.white : theme.colors.textPrimary,
                                            }}
                                          >
                                            {v.name}
                                          </Text>
                                        </Pressable>
                                      );
                                    })}
                                  </View>
                                </View>
                              );
                            })}
                        </View>
                      );
                    })}
                </View>
              </View>

              {/* Pricing or Flat Discount Inputs */}
              {discountType === "flat_discount" ? (
                <View style={{ backgroundColor: theme.colors.surfaceDark, padding: s(14), borderRadius: s(14), gap: s(10) }}>
                  <Text style={{ fontSize: s(12), color: theme.colors.textSecondary, fontWeight: "600", lineHeight: s(18) }}>
                    {UI_TEXT.flatDiscountHelper}
                  </Text>

                  <View>
                    <Text style={[styles.label, { marginTop: 0 }]}>{UI_TEXT.discountRate}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.surface }]}
                      value={discountRateInput}
                      onChangeText={setDiscountRateInput}
                      placeholder={UI_TEXT.discountRatePlaceholder}
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="numeric"
                      accessible={true}
                      accessibilityLabel={UI_TEXT.discountRate}
                    />
                  </View>

                  <View>
                    <Text style={styles.label}>{UI_TEXT.minCartValue}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.surface }]}
                      value={minCartValueInput}
                      onChangeText={setMinCartValueInput}
                      placeholder={UI_TEXT.minCartValuePlaceholder}
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="numeric"
                      accessible={true}
                      accessibilityLabel={UI_TEXT.minCartValue}
                    />
                  </View>
                </View>
              ) : (
                <View style={{ backgroundColor: theme.colors.surfaceDark, padding: s(14), borderRadius: s(14), gap: s(10) }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                    <Text style={{ fontSize: s(13), fontWeight: "800", color: theme.colors.textSecondary }}>
                      {UI_TEXT.currentPrice} ({getApplicabilityLabel(applicability)}):
                    </Text>
                    <Text style={{ fontSize: s(16), fontWeight: "900", color: theme.colors.textPrimary }}>
                      {calculatedCurrentPrice}
                    </Text>
                  </View>

                  <View>
                    <Text style={[styles.label, { marginTop: 0 }]}>{UI_TEXT.packagePrice}</Text>
                    <TextInput
                      style={[styles.input, { backgroundColor: theme.colors.surface }]}
                      value={packagePriceInput}
                      onChangeText={setPackagePriceInput}
                      placeholder={UI_TEXT.packagePricePlaceholder}
                      placeholderTextColor={theme.colors.textMuted}
                      keyboardType="numeric"
                      accessible={true}
                      accessibilityLabel={UI_TEXT.packagePrice}
                    />
                    {packagePriceInput.trim() !== "" && !isPackagePriceValid && (
                      <Text style={{ fontSize: s(11), color: theme.colors.error, fontWeight: "700", marginTop: s(4) }}>
                        {UI_TEXT.packagePriceInvalid}
                      </Text>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Save Button */}
            <Pressable
              onPress={handleSavePackage}
              disabled={isSaving || !canSavePackage}
              accessible={true}
              accessibilityRole="button"
              accessibilityState={{ disabled: isSaving || !canSavePackage }}
              accessibilityLabel={UI_TEXT.saveFoodPackage}
              style={[
                styles.primary,
                { height: 50, marginTop: s(16), borderRadius: 14 },
                (isSaving || !canSavePackage) && { opacity: 0.5 },
              ]}
            >
              {isSaving ? (
                <ActivityIndicator color={theme.colors.white} />
              ) : (
                <ActionLabel icon="save-outline" label={UI_TEXT.saveFoodPackage.toUpperCase()} color={theme.colors.white} />
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* View Food Package Read-Only Modal */}
      <Modal visible={!!viewingPackage} animationType="slide" transparent={true} onRequestClose={() => setViewingPackage(null)}>
        <View
          accessibilityViewIsModal={true}
          style={{ flex: 1, backgroundColor: theme.colors.shadow + "80", justifyContent: "center", alignItems: "center", padding: 16 }}
        >
          <View style={[styles.card, { width: "100%", maxWidth: 460, maxHeight: "85%", padding: 20, backgroundColor: theme.colors.surface, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="cube" size={20} color={theme.colors.primary} />
                <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary }}>
                  {UI_TEXT.foodPackage}
                </Text>
              </View>
              <Pressable
                onPress={() => setViewingPackage(null)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.close}
                style={({ pressed }) => [{ padding: 4 }, pressed && { opacity: 0.7 }]}
              >
                <Ionicons name="close-outline" size={22} color={theme.colors.textSecondary} />
              </Pressable>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 14 }}>
              <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                <View style={{ backgroundColor: theme.colors.surfaceDark, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border }}>
                  <Text style={{ fontSize: 11, fontWeight: "900", color: theme.colors.primary }}>
                    {getApplicabilityLabel(viewingPackage?.applicability || "adult").toUpperCase()}
                  </Text>
                </View>
                <View style={{ backgroundColor: viewingPackage?.enabled ? theme.colors.successLight : theme.colors.surfaceDark, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: viewingPackage?.enabled ? theme.colors.success : theme.colors.border }}>
                  <Text style={{ fontSize: 10, fontWeight: "800", color: viewingPackage?.enabled ? theme.colors.success : theme.colors.textMuted }}>
                    {viewingPackage?.enabled ? UI_TEXT.activeLabel : UI_TEXT.disabledLabel}
                  </Text>
                </View>
              </View>

              <Text style={{ fontSize: 20, fontWeight: "900", color: theme.colors.textPrimary }}>
                {viewingPackage?.name}
              </Text>
              <Text style={{ fontSize: 14, color: theme.colors.textSecondary, fontWeight: "500", lineHeight: 20 }}>
                {viewingPackage?.description}
              </Text>

              {viewingPackage?.selectedMealItems && Object.keys(viewingPackage.selectedMealItems).length > 0 && (
                <View style={{ backgroundColor: theme.colors.surfaceDark, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border, gap: 8 }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase" }}>
                    {UI_TEXT.selectMealsForPackage}
                  </Text>
                  {Object.keys(viewingPackage.selectedMealItems).map((dayId) => {
                    const dLabel = getDayLabel(dayId, dayConfig);
                    const items = viewingPackage.selectedMealItems![dayId] || [];
                    return (
                      <View key={dayId} style={{ gap: 4 }}>
                        <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary }}>
                          {dLabel}:
                        </Text>
                        <View style={{ paddingLeft: 8, gap: 4 }}>
                          {items.map((i, idx) => {
                            const mLabel = getMealLabel(i.mealType);
                            const mealConf = dayConfig.find((d) => d.id === dayId)?.[i.mealType];
                            const varieties = getMealVarieties(mealConf);
                            const v = varieties.find((vr) => vr.id === i.varietyId);
                            const isSpecial = isSpecialMeal(dayId, i.mealType, dayConfig);
                            return (
                              <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                                <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary }}>
                                  • {mLabel} {v ? `(${v.name})` : ""}
                                </Text>
                                {isSpecial && (
                                  <View style={{ backgroundColor: theme.colors.specialMealBorder, paddingHorizontal: 5, paddingVertical: 1, borderRadius: 4, flexDirection: "row", alignItems: "center", gap: 3 }}>
                                    <Ionicons name="star" size={9} color={theme.colors.white} />
                                    <Text style={{ color: theme.colors.white, fontSize: 9, fontWeight: "900" }}>{UI_TEXT.specialMealBadge}</Text>
                                  </View>
                                )}
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: theme.colors.surfaceDark, padding: 14, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.border }}>
                <View>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.textMuted, textTransform: "uppercase" }}>
                    {(viewingPackage?.discountType === "flat_discount" || viewingPackage?.discountRate !== undefined) ? UI_TEXT.minCartValue : UI_TEXT.normalPrice}
                  </Text>
                  <Text style={{ fontSize: 15, fontWeight: "900", color: theme.colors.textPrimary, marginTop: 2 }}>
                    {(viewingPackage?.discountType === "flat_discount" || viewingPackage?.discountRate !== undefined) ? (viewingPackage?.minCartValue ?? 0) : viewingPackage?.currentPrice}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.primary, textTransform: "uppercase" }}>
                    {UI_TEXT.packagePrice}
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.primary, marginTop: 2 }}>
                    {(viewingPackage?.discountType === "flat_discount" || viewingPackage?.discountRate !== undefined) ? `${viewingPackage?.discountRate}% ${UI_TEXT.offLabel}` : viewingPackage?.packagePrice}
                  </Text>
                </View>
              </View>
            </ScrollView>

            <Pressable
              onPress={() => setViewingPackage(null)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.close}
              style={{ marginTop: 16, height: 46, borderRadius: 12, backgroundColor: theme.colors.primary, alignItems: "center", justifyContent: "center" }}
            >
              <Text style={{ fontWeight: "900", color: theme.colors.white, fontSize: 14 }}>{UI_TEXT.close}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
