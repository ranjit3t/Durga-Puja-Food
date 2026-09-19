import React from "react";
import {
  View,
  ImageBackground,
  ActivityIndicator,
  Text,
} from "react-native";

import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";
import { UI_TEXT } from "../strings";
import { AppScreen } from "../types";
import { useStyles } from "../styles";
import { useAppTheme } from "../theme";

// Screens
import { LoginScreen } from "../screens/LoginScreen";
import { DashboardScreen } from "../screens/DashboardScreen";
import { SubscriptionForm } from "../screens/SubscriptionForm";
import { SubscriptionListScreen } from "../screens/SubscriptionListScreen";
import { DetailsScreen } from "../screens/DetailsScreen";
import { QrScreen } from "../screens/QrScreen";
import { ScannerScreen } from "../screens/ScannerScreen";
import { ViewMenuScreen } from "../screens/ViewMenuScreen";
import { MenuEditorScreen } from "../screens/MenuEditorScreen";
import { ReportScreen } from "../screens/ReportScreen";
import { SettingsScreen } from "../screens/SettingsScreen";
import { GuestManagementScreen } from "../screens/GuestManagementScreen";
import { ActivityLogScreen } from "../screens/ActivityLogScreen";

import { HomeScreen } from "../screens/HomeScreen";

export function AppNavigator() {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const { userRole } = useAuth();
  const { loading } = useDatabase();
  const { screen } = useAppNavigation();

  if (loading) {
    return (
      <ImageBackground source={{ uri: "https://picsum.photos/id/1080/1200/1800" }} style={styles.root} imageStyle={styles.backgroundImage}>
        <View style={[styles.rootOverlay, styles.center]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{UI_TEXT.loading}</Text>
        </View>
      </ImageBackground>
    );
  }

  if (screen === AppScreen.LOGIN || !userRole) {
    return <LoginScreen />;
  }

  // --- Router ---
  switch (screen) {
    case AppScreen.FORM:
      return <SubscriptionForm />;
    case AppScreen.DETAILS:
      return <DetailsScreen />;
    case AppScreen.QR:
      return <QrScreen />;
    case AppScreen.SCANNER:
      return <ScannerScreen />;
    case AppScreen.DASHBOARD:
      return <DashboardScreen />;
    case AppScreen.GUEST_MANAGEMENT:
      return <GuestManagementScreen />;
    case AppScreen.VIEW_MENU:
      return <ViewMenuScreen />;
    case AppScreen.MENU:
      return <MenuEditorScreen />;
    case AppScreen.REPORT:
      return <ReportScreen />;
    case AppScreen.SETTINGS:
      return <SettingsScreen />;
    case AppScreen.ACTIVITY_LOG:
      return <ActivityLogScreen />;
    case AppScreen.SUBSCRIPTION_LIST:
      return <SubscriptionListScreen />;
    case AppScreen.HOME:
    default:
      return <HomeScreen />;
  }
}
