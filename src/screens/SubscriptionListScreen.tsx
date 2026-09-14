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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { mealSummary } from "../constants";
import { Subscription, ConfigDay, PaymentConfig, UserRole } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { getActiveDays } from "../constants";

export function SubscriptionListScreen({
  subscriptions,
  config,
  paymentConfig,
  userRole,
  searchText,
  onSearchChange,
  onBack,
  onHome,
  onSelect,
  onAdd,
  onLogout,
  seasonEnabled,
}: {
  subscriptions: Subscription[];
  config: ConfigDay[];
  paymentConfig: PaymentConfig;
  userRole: UserRole;
  searchText: string;
  onSearchChange: (text: string) => void;
  onBack: () => void;
  onHome: () => void;
  onSelect: (sub: Subscription) => void;
  onAdd: () => void;
  onLogout: () => void;
  seasonEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const isAdmin = userRole === "admin";
  const canAdd = getActiveDays(config).length > 0 && seasonEnabled;

  const visibleSubscriptions = useMemo(() => {
    if (!searchText) return subscriptions;
    return subscriptions.filter(
      (s) =>
        s.flat.toLowerCase().includes(searchText.toLowerCase()) ||
        s.block.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [subscriptions, searchText]);


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
              <BackButton onPress={onBack} />
              <HomeButton onPress={onHome} />
            </View>
            <LogoutButton onLogout={onLogout} />
          </View>
          <Text style={styles.title}>{UI_TEXT.subscriptions}</Text>
          <Text style={styles.subtitle}>{UI_TEXT.activePasses}: {subscriptions.length}</Text>
        </View>

        <View style={[styles.searchBox, { marginHorizontal: 20, marginTop: 20 }]}>
          <Ionicons name="search-outline" size={22} color={theme.colors.textSecondary} />
          <TextInput
            value={searchText}
            onChangeText={onSearchChange}
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
                    <Text style={[styles.flatLabel, { color: colorScheme.accent, opacity: 0.8 }]}>{UI_TEXT.block} {item.block}</Text>
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
                        <Text style={{ fontWeight: "700", color: theme.colors.textPrimary }}>{item.paymentMode}</Text>
                      </>
                    )}
                  </View>
                  {paymentConfig.enabled && (
                    <Text style={{ fontSize: 18, fontWeight: "900", color: colorScheme.accent }}>
                      {UI_TEXT.rs} {item.amount || "0"}
                    </Text>
                  )}
                </View>
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
