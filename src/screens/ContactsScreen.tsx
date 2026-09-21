/**
 * Contacts Screen for Admins.
 * Displays a flat-wise sorted list of residents with registered mobile numbers.
 * Provides WhatsApp chat, WhatsApp call, and mobile call shortcuts.
 */
import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StatusBar,
  FlatList,
  TextInput,
  Pressable,
  Linking,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { AppScreen, ActivityModule, ActivityAction, AppThemeMode, SubscriptionRecord } from "../domain";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";

export function ContactsScreen() {
  const { handleLogout } = useAuth();
  const { subscriptions, addActivityLog, whatsappCountryCode, kidsEnabled } = useDatabase();
  const { navigate, goBack, setSelectedId, setSelectedRecord } = useAppNavigation();

  const styles = useStyles();
  const { s } = useScaling();
  const { theme, themeType } = useAppTheme();

  const [searchText, setSearchText] = useState("");
  const [isAscending, setIsAscending] = useState(true);

  // Filter subscriptions to only those with mobile numbers and sort naturally
  const filteredContacts = useMemo(() => {
    let result = subscriptions.filter(s => !!s.mobile);

    if (searchText) {
      const query = searchText.toLowerCase();
      result = result.filter(s =>
        s.block?.toLowerCase().includes(query) ||
        s.flat?.toLowerCase().includes(query) ||
        String(s.mobile).includes(query)
      );
    }

    result.sort((a, b) => {
      const blockCompare = (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: 'base' });
      const order = isAscending ? 1 : -1;
      if (blockCompare !== 0) return blockCompare * order;
      return (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: 'base' }) * order;
    });

    return result;
  }, [subscriptions, searchText, isAscending]);

  const handleWhatsAppChat = (item: SubscriptionRecord) => {
    if (!item.mobile) return;
    const url = `https://wa.me/${whatsappCountryCode}${item.mobile}`;
    void Linking.openURL(url).then(() => {
      addActivityLog({
        module: ActivityModule.CONTACT,
        action: ActivityAction.CHAT,
        targetId: item.id,
        description: UI_TEXT.logChat.replace("{id}", item.id)
      });
    });
  };

  const handlePhoneCall = (item: SubscriptionRecord) => {
    if (!item.mobile) return;
    const url = `tel:${item.mobile}`;
    void Linking.openURL(url).then(() => {
      addActivityLog({
        module: ActivityModule.CONTACT,
        action: ActivityAction.CALL,
        targetId: item.id,
        description: UI_TEXT.logCall.replace("{id}", item.id)
      });
    });
  };

  const handleSMS = (item: SubscriptionRecord) => {
    if (!item.mobile) return;
    const url = `sms:${item.mobile}`;
    void Linking.openURL(url).then(() => {
      addActivityLog({
        module: ActivityModule.CONTACT,
        action: ActivityAction.SMS,
        targetId: item.id,
        description: UI_TEXT.logSms.replace("{id}", item.id)
      });
    });
  };

  const renderItem = ({ item, index }: { item: SubscriptionRecord, index: number }) => {
    const colorScheme = theme.cardColors[index % theme.cardColors.length];

    return (
      <Pressable
        onPress={() => {
          setSelectedId(item.id);
          setSelectedRecord(item);
          navigate(AppScreen.DETAILS);
        }}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: colorScheme.bg,
            borderColor: colorScheme.border,
            marginBottom: s(12),
            padding: s(16),
            borderLeftWidth: 4,
            borderLeftColor: colorScheme.accent,
          },
          pressed && { opacity: 0.8 }
        ]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.flatLabel, { color: colorScheme.accent, marginBottom: 2 }]}>{UI_TEXT.block} {item.block}</Text>
            <Text style={{ fontSize: s(22), fontWeight: '900', color: theme.colors.textPrimary }}>{UI_TEXT.flatUpper} {item.flat}</Text>
            <Text style={{ fontSize: s(14), color: theme.colors.textSecondary, fontWeight: '700', marginTop: 4 }}>
              {kidsEnabled ? (
                `${item.peopleCount}${UI_TEXT.space}${item.peopleCount === 1 ? UI_TEXT.adult : UI_TEXT.adults}${item.kidsCount ? `${UI_TEXT.plus}${item.kidsCount}${UI_TEXT.space}${item.kidsCount === 1 ? UI_TEXT.kid : UI_TEXT.kids}` : ""}`
              ) : (
                `${item.peopleCount + (item.kidsCount || 0)}${item.peopleCount + (item.kidsCount || 0) === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}`
              )}
            </Text>
          </View>

          <View style={{ gap: s(8), alignItems: 'center' }}>
             <View style={{ flexDirection: 'row', gap: s(10) }}>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleWhatsAppChat(item);
                  }}
                  style={({ pressed }) => [
                    { width: s(44), height: s(44), borderRadius: s(12), backgroundColor: theme.colors.whatsapp + "15", alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.whatsapp + "40" },
                    pressed && { opacity: 0.7, backgroundColor: theme.colors.whatsapp + "30" }
                  ]}
                >
                  <Ionicons name="logo-whatsapp" size={s(22)} color={theme.colors.whatsapp} />
                </Pressable>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handleSMS(item);
                  }}
                  style={({ pressed }) => [
                    { width: s(44), height: s(44), borderRadius: s(12), backgroundColor: theme.colors.success + "15", alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.success + "40" },
                    pressed && { opacity: 0.7, backgroundColor: theme.colors.success + "30" }
                  ]}
                >
                  <Ionicons name="mail-outline" size={s(22)} color={theme.colors.success} />
                </Pressable>
                <Pressable
                  onPress={(e) => {
                    e.stopPropagation();
                    handlePhoneCall(item);
                  }}
                  style={({ pressed }) => [
                    { width: s(44), height: s(44), borderRadius: s(12), backgroundColor: theme.colors.primary + "15", alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.primary + "40" },
                    pressed && { opacity: 0.7, backgroundColor: theme.colors.primary + "30" }
                  ]}
                >
                  <Ionicons name="call-outline" size={s(22)} color={theme.colors.primary} />
                </Pressable>
             </View>
             <View style={{ backgroundColor: theme.colors.surfaceDark, paddingHorizontal: s(12), paddingVertical: s(6), borderRadius: s(10), borderWidth: 1, borderColor: theme.colors.border, width: '100%', alignItems: 'center' }}>
                <Text style={{ fontSize: s(14), fontWeight: '900', color: theme.colors.textPrimary, letterSpacing: 0.5 }}>{item.mobile}</Text>
             </View>
          </View>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={[styles.header, { paddingBottom: s(20) }]}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.contacts}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.contactsSubtitle}</Text>
      </View>

      <View style={{ backgroundColor: theme.colors.surfaceDark + (theme.themeType === 'dark' ? "66" : "80"), borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
        <View style={[styles.maxWidthWrapper, { paddingVertical: 20, gap: 16 }]}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <View style={[styles.searchBox, { flex: 1, marginBottom: 0, height: 52, borderRadius: 14, maxWidth: undefined }]}>
              <Ionicons name="search-outline" size={20} color={theme.colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { fontSize: 15 }]}
                value={searchText}
                onChangeText={setSearchText}
                placeholder={UI_TEXT.searchPlaceholder}
                placeholderTextColor={theme.colors.textMuted}
              />
            </View>
            <Pressable
              onPress={() => setIsAscending(!isAscending)}
              style={({ pressed }) => [
                { width: 52, height: 52, borderRadius: 14, backgroundColor: theme.colors.surfaceDark, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border },
                pressed && { opacity: 0.7 }
              ]}
            >
              <Ionicons name={isAscending ? "arrow-up-outline" : "arrow-down-outline"} size={22} color={theme.colors.primary} />
            </Pressable>
          </View>
        </View>
      </View>

      <FlatList
        data={filteredContacts}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={[styles.content, { paddingTop: 20 }]}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <View style={{ backgroundColor: theme.colors.surfaceDark, padding: 20, borderRadius: 30, marginBottom: 16 }}>
              <Ionicons name="people-outline" size={48} color={theme.colors.border} />
            </View>
            <Text style={{ fontSize: 16, fontWeight: '700', color: theme.colors.textPrimary }}>{UI_TEXT.noRecords}</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
          </View>
        }
      />
    </View>
  );
}
