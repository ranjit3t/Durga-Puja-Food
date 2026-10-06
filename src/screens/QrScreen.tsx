import React, { useRef } from "react";
import { View, Text, Pressable, StatusBar, ScrollView, Platform, useWindowDimensions, Linking } from "react-native";
import { captureRef } from "react-native-view-shot";
import QRCode from "react-native-qrcode-svg";
import { Ionicons } from "@expo/vector-icons";
import { useStyles, useScaling } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { qrValueFor, generateUniquePasscode } from "../constants";
import { AppScreen, AppThemeMode, ActivityModule, ActivityAction, getPassDisplayLabel } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ThemeToggleButton } from "../components/common/ThemeToggleButton";
import { UserGreeting } from "../components/common/UserGreeting";

import { useAuth } from "../context/AuthContext";
import { useCoreDatabase, useActivityLogs } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";

export function QrScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    seasonName, seasonEnabled, mobileEnabled, subscriptions, whatsappCountryCode, kidsEnabled
  } = useCoreDatabase();
  const { addActivityLog } = useActivityLogs();
  const { shareQr } = useUI();
  const { selectedId, selectedRecord, setSelectedId, setSelectedRecord, goBack, navigate } = useAppNavigation();

  const subscription = subscriptions.find(s => s.id === selectedId) || selectedRecord;
  if (!subscription) return null;

  const styles = useStyles();
  const { s } = useScaling();
  const { theme, themeType } = useAppTheme();
  const { width } = useWindowDimensions();
  const qrRef = useRef<View>(null);

  const qrSize = width > 768 ? 220 : Math.min(width * 0.5, 180);
  const canShare = seasonEnabled && userRole === "admin";

  const shareImage = async () => {
    if (qrRef.current && canShare) {
      const passLabel = getPassDisplayLabel(subscription);
      const uri = await captureRef(qrRef, { format: "png", quality: 1 });
      addActivityLog({
        module: ActivityModule.QR,
        action: Platform.OS === "web" ? ActivityAction.DOWNLOAD : ActivityAction.SHARE,
        targetId: subscription.id,
        description: (Platform.OS === "web" ? UI_TEXT.downloadPass : UI_TEXT.shareQrDialog) + " for " + passLabel
      });
      // Share only the image for the generic share button
      shareQr(uri);
    }
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle={themeType === AppThemeMode.DARK ? "light-content" : "dark-content"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", height: 40, marginBottom: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexShrink: 0 }}>
            <ThemeToggleButton />
            <LogoutButton onLogout={handleLogout} />
          </View>
        </View>
        <UserGreeting />
        <Text style={styles.title}>{UI_TEXT.foodPass}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.qrIdentityStay}</Text>
      </View>

      <ScrollView style={{ flex: 1, width: "100%" }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 80, alignItems: "center" }}>
        <View style={styles.qrContent}>
          <View ref={qrRef} collapsable={false} style={styles.qrPassCard}>
            <View style={styles.qrPassHeader}>
              <Text style={styles.qrPassEvent}>{seasonName || UI_TEXT.headerTitle}</Text>
              <Text style={styles.qrPassTitle}>{UI_TEXT.foodPass}</Text>
            </View>

            <QRCode
              value={qrValueFor(subscription.id)}
              size={qrSize}
              color={theme.colors.shadow}
              backgroundColor={theme.colors.white}
            />

            <View style={{ marginTop: 15, alignItems: 'center' }}>
              <Text style={{
                color: theme.cardColors[1].accent, // Theme Blue
                fontWeight: "900",
                fontSize: 18,
              }}>
                {UI_TEXT.passCodeLabel}: {subscription.passcode || generateUniquePasscode(subscriptions, subscription.id, subscription.id)}
              </Text>
            </View>

            <View style={styles.qrPassDetails}>
              <Text style={styles.qrPassFlat}>{subscription.block}{UI_TEXT.hyphen}{subscription.flat}</Text>
            </View>

            <View style={styles.qrPassFooter}>
              <Text style={styles.qrPassInstruction}>
                {UI_TEXT.passInstruction}
              </Text>
              <Text style={styles.qrPassCopyright}>
                {UI_TEXT.footerCopyright}
              </Text>
            </View>
          </View>
          
          {/* Sleek, Perfectly Horizontally Aligned Action Buttons */}
          <View style={{
            flexDirection: "row",
            alignItems: "center",
            width: "100%",
            marginTop: s(16),
            gap: s(8),
          }}>
            {/* 1. View Pass Button */}
            <Pressable
              onPress={() => {
                setSelectedId(subscription.id);
                setSelectedRecord(subscription);
                navigate(AppScreen.DETAILS);
              }}
              style={({ pressed }) => [
                {
                  flex: 1,
                  minWidth: 0,
                  height: s(44),
                  borderRadius: theme.sizes.borderRadiusSmall,
                  borderWidth: 1.5,
                  borderColor: theme.colors.primary,
                  backgroundColor: theme.cardColors[0].accentLight,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: s(6),
                  paddingHorizontal: s(8),
                },
                pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
              ]}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.view}
              accessibilityHint={UI_TEXT.viewPassHint}
            >
              <Ionicons name="eye-outline" size={s(16)} color={theme.colors.primary} />
              <Text style={{
                fontSize: s(13),
                fontWeight: "800",
                color: theme.colors.primary,
              }} numberOfLines={1}>
                {UI_TEXT.view}
              </Text>
            </Pressable>

            {/* 2. WhatsApp Direct Chat Button */}
            {canShare && mobileEnabled && subscription.mobile ? (
              <Pressable
                onPress={async () => {
                  const passCode = subscription.passcode || generateUniquePasscode(subscriptions, subscription.id, subscription.id);
                  const message = `${UI_TEXT.bold}${seasonName || UI_TEXT.headerTitle}${UI_TEXT.bold}${UI_TEXT.newline}${UI_TEXT.newline}${UI_TEXT.bold}${UI_TEXT.passIdLabel}${UI_TEXT.colon}${UI_TEXT.bold}${UI_TEXT.space}${subscription.id}${UI_TEXT.newline}${UI_TEXT.bold}${UI_TEXT.passCodeLabel}${UI_TEXT.colon}${UI_TEXT.bold}${UI_TEXT.space}${passCode}${UI_TEXT.newline}${UI_TEXT.newline}${UI_TEXT.passInstruction}${UI_TEXT.newline}${UI_TEXT.newline}${UI_TEXT.bold}${UI_TEXT.footerText}${UI_TEXT.bold}`;
                  const url = `https://wa.me/${whatsappCountryCode}${subscription.mobile}?text=${encodeURIComponent(message)}`;

                  try {
                    const passLabel = getPassDisplayLabel(subscription);
                    addActivityLog({
                      module: ActivityModule.QR,
                      action: ActivityAction.CHAT,
                      targetId: subscription.id,
                      description: UI_TEXT.logChat.replace("{id}", passLabel) + " (QR)"
                    });
                    await Linking.openURL(url);
                  } catch (err) {
                    console.error("WhatsApp API error:", err);
                    shareImage();
                  }
                }}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    minWidth: 0,
                    height: s(44),
                    borderRadius: theme.sizes.borderRadiusSmall,
                    borderWidth: 1.5,
                    borderColor: theme.colors.whatsapp,
                    backgroundColor: theme.colors.successLight,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: s(6),
                    paddingHorizontal: s(8),
                  },
                  pressed && { opacity: 0.8, transform: [{ scale: 0.97 }] },
                ]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={UI_TEXT.chat}
                accessibilityHint="Opens WhatsApp chat to share digital pass details"
              >
                <Ionicons name="logo-whatsapp" size={s(16)} color={theme.colors.whatsapp} />
                <Text style={{
                  fontSize: s(13),
                  fontWeight: "800",
                  color: theme.colors.whatsapp,
                }} numberOfLines={1}>
                  {UI_TEXT.chat}
                </Text>
              </Pressable>
            ) : null}

            {/* 3. Share / Download Pass Card Button */}
            {canShare && (
              <Pressable
                onPress={shareImage}
                style={({ pressed }) => [
                  {
                    flex: 1,
                    minWidth: 0,
                    height: s(44),
                    borderRadius: theme.sizes.borderRadiusSmall,
                    backgroundColor: theme.colors.primary,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: s(6),
                    paddingHorizontal: s(8),
                  },
                  pressed && { opacity: 0.9, transform: [{ scale: 0.97 }] },
                ]}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={Platform.OS === "web" ? UI_TEXT.download : UI_TEXT.share}
                accessibilityHint={Platform.OS === "web" ? "Downloads digital pass card PNG image" : "Opens system share dialog for pass card image"}
              >
                <Ionicons
                  name={Platform.OS === "web" ? "download-outline" : "share-social-outline"}
                  size={s(16)}
                  color={theme.colors.white}
                />
                <Text style={{
                  fontSize: s(13),
                  fontWeight: "800",
                  color: theme.colors.white,
                }} numberOfLines={1}>
                  {Platform.OS === "web" ? UI_TEXT.download : UI_TEXT.share}
                </Text>
              </Pressable>
            )}
          </View>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
