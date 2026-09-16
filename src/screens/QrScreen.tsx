import React, { useRef } from "react";
import { View, Text, Pressable, StatusBar, ScrollView, Platform, useWindowDimensions, Linking } from "react-native";
import { captureRef } from "react-native-view-shot";
import QRCode from "react-native-qrcode-svg";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { qrValueFor } from "../constants";
import { AppScreen } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { ActionLabel } from "../components/common/ActionLabel";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useUI } from "../context/UIContext";
import { useAppNavigation } from "../context/NavigationContext";

export function QrScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    dayConfig, seasonName, seasonEnabled, mobileEnabled, subscriptions, whatsappCountryCode
  } = useDatabase();
  const { shareQr } = useUI();
  const { selectedId, selectedRecord, goBack, navigate } = useAppNavigation();

  const subscription = subscriptions.find(s => s.id === selectedId) || selectedRecord;
  if (!subscription) return null;

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();
  const { width } = useWindowDimensions();
  const qrRef = useRef<View>(null);

  const qrSize = width > 768 ? 220 : Math.min(width * 0.5, 180);
  const canShare = seasonEnabled && userRole === "admin";

  const shareImage = async () => {
    if (qrRef.current && canShare) {
      const uri = await captureRef(qrRef, { format: "png", quality: 1 });
      // Share only the image for the generic share button
      shareQr(uri);
    }
  };
  return (
    <View style={styles.root}>
      <StatusBar style={themeType === "dark" ? "light" : "dark"} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.foodPass}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.qrIdentityStay}</Text>
      </View>
      <ScrollView style={{ flex: 1, width: "100%" }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 80 }}>
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

            <View style={styles.qrPassDetails}>
              <Text style={styles.qrPassFlat}>{subscription.block}{UI_TEXT.hyphen}{subscription.flat}</Text>
              <Text style={styles.qrPassPeople}>
                {subscription.peopleCount} {subscription.peopleCount === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}
              </Text>
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
          
          <View style={{ width: "100%", marginTop: 15 }}>
            {canShare && mobileEnabled && subscription.mobile ? (
              <Pressable
                onPress={async () => {
                  const message = `*${seasonName || UI_TEXT.headerTitle}*\n*${UI_TEXT.flatUpper}:* ${subscription.block}${UI_TEXT.hyphen}${subscription.flat}\n*${UI_TEXT.passIdLabel}:* ${subscription.id}\n\n${UI_TEXT.passInstruction}`;
                  const url = `https://wa.me/${whatsappCountryCode}${subscription.mobile}?text=${encodeURIComponent(message)}`;

                  try {
                    await Linking.openURL(url);
                  } catch (err) {
                    console.error("WhatsApp API error:", err);
                    // Fallback to image sharing if the URL fails
                    shareImage();
                  }
                }}
                style={[styles.secondary, { borderColor: theme.colors.whatsapp }]}
              >
                <ActionLabel
                  icon="logo-whatsapp"
                  label={`${UI_TEXT.sendToWhatsApp}`}
                  color={theme.colors.whatsapp}
                />
              </Pressable>
            ) : null}
            
            {canShare && (
              <Pressable onPress={shareImage} style={styles.primary}>
                <ActionLabel
                  icon={Platform.OS === "web" ? "download-outline" : "share-social-outline"}
                  label={Platform.OS === "web" ? UI_TEXT.downloadPass : UI_TEXT.shareQrDialog}
                  color={theme.colors.white}
                />
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
