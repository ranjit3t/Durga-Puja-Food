/**
 * Subscription List Screen.
 * Displays all flat records with search and filtering capabilities.
 */
import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";
import { getActiveDays, getPaymentModeLabel, isMealCurrent, isMealEnabled } from "../constants";
import { AppScreen, Subscription, PaymentMode, UserRole, MealType, DietaryOption } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";

export function SubscriptionListScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    subscriptions, dayConfig, paymentConfig, seasonEnabled, whatsappCountryCode
  } = useDatabase();

  const {
    subscriptionSearch, setSubscriptionSearch, navigate, goBack, startNew,
    setSelectedId, setSelectedRecord
  } = useAppNavigation();

  const onSelect = (sub: Subscription) => {
    setSelectedId(sub.id);
    setSelectedRecord(sub);
    navigate(AppScreen.DETAILS);
  };

  const onAdd = () => startNew(dayConfig, "", paymentConfig, true, true, seasonEnabled);

  const styles = useStyles();
  const { theme } = useAppTheme();
  const isAdmin = userRole === UserRole.ADMIN;
  const canAdd = getActiveDays(dayConfig).length > 0 && seasonEnabled;

  const currentMealInfo = useMemo(() => {
    const active = getActiveDays(dayConfig);
    for (const dId of active) {
      for (const mType of [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER]) {
        if (isMealCurrent(dId, mType, dayConfig) && isMealEnabled(dId, mType, dayConfig)) {
          return { dayId: dId, type: mType };
        }
      }
    }
    return null;
  }, [dayConfig]);

  const [filterMode, setFilterMode] = useState<"all" | "subscribed">("all");

  const visibleSubscriptions = useMemo(() => {
    let filtered = subscriptions;

    if (currentMealInfo && filterMode === "subscribed") {
      filtered = filtered.filter((sub) =>
        (sub.mealSlots?.[currentMealInfo.dayId] || []).some(
          (slot) =>
            slot[currentMealInfo.type] === DietaryOption.VEG ||
            slot[currentMealInfo.type] === DietaryOption.NON_VEG
        )
      );
    }

    if (!subscriptionSearch) return filtered;
    return filtered.filter(
      (s) =>
        s.flat.toLowerCase().includes(subscriptionSearch.toLowerCase()) ||
        s.block.toLowerCase().includes(subscriptionSearch.toLowerCase())
    );
  }, [subscriptions, subscriptionSearch, filterMode, currentMealInfo]);


  return (
    <View style={styles.root}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar style={theme.themeType === "dark" ? "light" : "dark"} />
        <View style={styles.header}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <BackButton onPress={goBack} />
              <HomeButton onPress={() => navigate(AppScreen.HOME)} />
            </View>
            <LogoutButton onLogout={handleLogout} />
          </View>
          <Text style={styles.title}>{UI_TEXT.subscriptions}</Text>
          <Text style={styles.subtitle}>{UI_TEXT.activePasses}: {subscriptions.length}</Text>
        </View>

        {currentMealInfo && (
          <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 20, marginTop: 20 }}>
            <Pressable
              onPress={() => setFilterMode("all")}
              style={[
                styles.selector,
                { flex: 1, marginBottom: 0 },
                filterMode === "all" && styles.selectorOn
              ]}
            >
              <Text style={[styles.selectorText, filterMode === "all" && styles.selectorTextOn]}>
                {UI_TEXT.all || "All"}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setFilterMode("subscribed")}
              style={[
                styles.selector,
                { flex: 1, marginBottom: 0 },
                filterMode === "subscribed" && styles.selectorOn
              ]}
            >
              <Text style={[styles.selectorText, filterMode === "subscribed" && styles.selectorTextOn]}>
                {UI_TEXT.mealSubscriberMarker}
              </Text>
            </Pressable>
          </View>
        )}

        <View style={[styles.searchBox, { marginHorizontal: 20, marginTop: currentMealInfo ? 12 : 20 }]}>
          <Ionicons name="search-outline" size={22} color={theme.colors.textSecondary} />
          <TextInput
            value={subscriptionSearch}
            onChangeText={setSubscriptionSearch}
            placeholder={UI_TEXT.searchPlaceholder}
            placeholderTextColor={theme.colors.textMuted}
            style={styles.searchInput}
            autoCapitalize="characters"
            clearButtonMode="while-editing"
          />
        </View>

        <FlatList
          style={{ flex: 1, width: "100%" }}
          data={visibleSubscriptions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.content, { paddingTop: 10 }]}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          initialNumToRender={10}
          maxToRenderPerBatch={10}
          windowSize={5}
          ListEmptyComponent={
            <Text style={styles.emptyState}>
              {subscriptions.length === 0
                ? UI_TEXT.noRecords
                : UI_TEXT.noMatches}
            </Text>
          }
          ListFooterComponent={
            <View style={styles.footer}>
               <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
            </View>
          }
          renderItem={({ item, index }) => {
            const colorScheme = theme.cardColors[index % theme.cardColors.length];

            const hasCurrentMeal = currentMealInfo && (item.mealSlots?.[currentMealInfo.dayId] || []).some(personSlots =>
              personSlots[currentMealInfo.type] === DietaryOption.VEG ||
              personSlots[currentMealInfo.type] === DietaryOption.NON_VEG
            );

            return (
              <Pressable
                onPress={() => onSelect(item)}
                style={[
                  styles.card,
                  {
                    backgroundColor: colorScheme.bg,
                    borderColor: colorScheme.border,
                    borderWidth: 1.5
                  }
                ]}
              >
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Text style={[styles.flatLabel, { color: colorScheme.accent, opacity: 0.8 }]}>{UI_TEXT.block} {item.block}</Text>
                      {hasCurrentMeal && (
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: theme.colors.success + "20", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.success + "40" }}>
                          <Ionicons name="restaurant" size={12} color={theme.colors.success} />
                          <Text style={{ color: theme.colors.success, fontSize: 10, fontWeight: "900", textTransform: 'uppercase' }}>{UI_TEXT.mealSubscriberMarker}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.flatTitle, { color: theme.colors.textPrimary }]}>{UI_TEXT.flatUpper} {item.flat}</Text>
                    <Text style={{ color: theme.colors.textSecondary, marginTop: 4, fontWeight: "600" }}>
                      {item.peopleCount} {item.peopleCount === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}
                    </Text>
                  </View>
                </View>

                <View style={{ height: 1, backgroundColor: colorScheme.border, marginVertical: 16 }} />

                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    {paymentConfig.enabled && (
                      <>
                        <Ionicons name="card-outline" size={16} color={colorScheme.accent} />
                        <Text style={{ fontWeight: "700", color: theme.colors.textPrimary }}>{getPaymentModeLabel(item.payments && item.payments.length > 0 ? item.payments[0].mode : (item.paymentMode as PaymentMode || PaymentMode.CASH))}</Text>
                      </>
                    )}
                  </View>
                  {paymentConfig.enabled && (
                    <Text style={{ fontSize: 18, fontWeight: "900", color: colorScheme.accent }}>
                      {UI_TEXT.rs} {item.amount || (item.payments && item.payments.reduce((sum: number, p: any) => sum + (parseFloat(p.amount) || 0), 0)) || "0"}
                    </Text>
                  )}
                </View>

                {item.mobile && (
                  <>
                    <View style={{ height: 1, backgroundColor: colorScheme.border, marginVertical: 12, opacity: 0.5 }} />
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Pressable
                        onPress={() => Linking.openURL(`https://wa.me/${whatsappCountryCode || "91"}${item.mobile}`)}
                        style={({ pressed }) => [
                          { padding: 6, borderRadius: 20, backgroundColor: theme.colors.success + "10" },
                          pressed && { opacity: 0.7 }
                        ]}
                      >
                        <Ionicons name="logo-whatsapp" size={20} color={theme.colors.success} />
                      </Pressable>

                      <Pressable
                        onPress={() => Linking.openURL(`tel:${item.mobile}`)}
                        style={({ pressed }) => [
                          { padding: 6, borderRadius: 20, backgroundColor: theme.colors.primary + "10" },
                          pressed && { opacity: 0.7 }
                        ]}
                      >
                        <Ionicons name="call" size={20} color={theme.colors.primary} />
                      </Pressable>
                    </View>
                  </>
                )}
              </Pressable>
            );
          }}
        />
      </KeyboardAvoidingView>

      {isAdmin && seasonEnabled ? (
        <Pressable
          style={[styles.fab, !canAdd && { opacity: 0.4 }]}
          onPress={onAdd}
          disabled={!canAdd}
        >
          <Ionicons name="add" size={32} color={theme.colors.white} />
        </Pressable>
      ) : null}
    </View>
  );
}
