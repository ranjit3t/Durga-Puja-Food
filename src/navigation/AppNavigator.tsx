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
import { NotesScreen } from "../screens/NotesScreen";

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

  let screenComponent;

  if (screen === AppScreen.LOGIN || !userRole) {
    screenComponent = <LoginScreen />;
  } else {
    // --- Router ---
    switch (screen) {
      case AppScreen.FORM:
        screenComponent = <SubscriptionForm />;
        break;
      case AppScreen.DETAILS:
        screenComponent = <DetailsScreen />;
        break;
      case AppScreen.QR:
        screenComponent = <QrScreen />;
        break;
      case AppScreen.SCANNER:
        screenComponent = <ScannerScreen />;
        break;
      case AppScreen.DASHBOARD:
        screenComponent = <DashboardScreen />;
        break;
      case AppScreen.GUEST_MANAGEMENT:
        screenComponent = <GuestManagementScreen />;
        break;
      case AppScreen.VIEW_MENU:
        screenComponent = <ViewMenuScreen />;
        break;
      case AppScreen.MENU:
        screenComponent = <MenuEditorScreen />;
        break;
      case AppScreen.REPORT:
        screenComponent = <ReportScreen />;
        break;
      case AppScreen.SETTINGS:
        screenComponent = <SettingsScreen />;
        break;
      case AppScreen.ACTIVITY_LOG:
        screenComponent = <ActivityLogScreen />;
        break;
      case AppScreen.NOTES:
        screenComponent = <NotesScreen />;
        break;
      case AppScreen.SUBSCRIPTION_LIST:
        screenComponent = <SubscriptionListScreen />;
        break;
      case AppScreen.HOME:
      default:
        screenComponent = <HomeScreen />;
        break;
    }
  }

  return (
    <View style={styles.rootMainContainer}>
      <View style={styles.bgBlob1} />
      <View style={styles.bgBlob2} />
      <View style={styles.bgBlob3} />
      <View style={styles.bgBlob4} />
      <View style={styles.bgBlob5} />
      <View style={styles.bgBlob6} />
      <View style={styles.bgBlobWeb1} />
      <View style={styles.bgBlobWeb2} />
      <View style={styles.bgBlobWebTop} />
      {screenComponent}
    </View>
  );
}
