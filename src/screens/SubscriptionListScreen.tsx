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
import { styles } from "../styles";
import { UI_TEXT } from "../strings";
import { mealSummary } from "../constants";
import { Subscription, ConfigDay, PaymentConfig, UserRole } from "../types";
import { BackButton } from "../components/common/BackButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";
import { getActiveDays } from "../constants";

export function SubscriptionListScreen({
  subscriptions,
  config,
  paymentConfig,
  userRole,
  onBack,
  onSelect,
  onAdd,
  onLogout,
}: {
  subscriptions: Subscription[];
  config: ConfigDay[];
  paymentConfig: PaymentConfig;
  userRole: UserRole;
  onBack: () => void;
  onSelect: (sub: Subscription) => void;
  onAdd: () => void;
  onLogout: () => void;
}) {
  const isAdmin = userRole === "admin";
  const [searchText, setSearchText] = useState("");
  const canAdd = getActiveDays(config).length > 0;

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
        <StatusBar style="dark" />
        <View style={styles.header}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <BackButton onPress={onBack} />
            <LogoutButton onLogout={onLogout} />
          </View>
          <Text style={styles.eyebrow}>{UI_TEXT.operations}</Text>
          <Text style={styles.title}>{UI_TEXT.subscriptions}</Text>
          <Text style={styles.subtitle}>{UI_TEXT.activePasses}: {subscriptions.length}</Text>
        </View>

        <View style={[styles.searchBox, { marginHorizontal: 20, marginTop: 20 }]}>
          <Ionicons name="search-outline" size={22} color="#6A6E73" />
          <TextInput
            value={searchText}
            onChangeText={setSearchText}
            placeholder={UI_TEXT.searchPlaceholder}
            placeholderTextColor="#ADB5BD"
            style={styles.searchInput}
            autoCapitalize="characters"
            clearButtonMode="while-editing"
          />
        </View>

        <FlatList
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
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              style={styles.card}
            >
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.flatLabel}>{UI_TEXT.block} {item.block}</Text>
                  <Text style={styles.flatTitle}>{UI_TEXT.flatUpper} {item.flat}</Text>
                  <Text style={{ color: "#6A6E73", marginTop: 4, fontWeight: "600" }}>
                    {item.peopleCount} {item.peopleCount === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}
                  </Text>
                </View>
                <View style={styles.pill}>
                  <Text style={styles.pillText}>{mealSummary(item, config) || UI_TEXT.flexibleMeals}</Text>
                </View>
              </View>

              <View style={{ height: 1, backgroundColor: "#E9ECEF", marginVertical: 16 }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  {paymentConfig.enabled && (
                    <>
                      <Ionicons name="card-outline" size={16} color="#E31837" />
                      <Text style={{ fontWeight: "700", color: "#1A1C1E" }}>{item.paymentMode}</Text>
                    </>
                  )}
                </View>
                {paymentConfig.enabled && (
                  <Text style={{ fontSize: 18, fontWeight: "900", color: "#E31837" }}>
                    {UI_TEXT.rs} {item.amount || "0"}
                  </Text>
                )}
              </View>
            </Pressable>
          )}
        />
        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </KeyboardAvoidingView>

      {isAdmin ? (
        <Pressable
          style={[styles.fab, !canAdd && { opacity: 0.4 }]}
          onPress={onAdd}
          disabled={!canAdd}
        >
          <Ionicons name="add" size={32} color="#FFF" />
        </Pressable>
      ) : null}
    </View>
  );
}
