import React from "react";
import {
  View,
  Image,
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
import { FreeMealManagementScreen } from "../screens/FreeMealManagementScreen";
import { ActivityLogScreen } from "../screens/ActivityLogScreen";
import { NotesScreen } from "../screens/NotesScreen";
import { ContactsScreen } from "../screens/ContactsScreen";
import { FoodPackageScreen } from "../screens/FoodPackageScreen";
import { CatererIncomeExpenseScreen } from "../screens/CatererIncomeExpenseScreen";
import { UserManagementScreen } from "../screens/UserManagementScreen";

import { HomeScreen } from "../screens/HomeScreen";

export function AppNavigator() {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const { userRole } = useAuth();
  const { loading } = useDatabase();
  const { screen } = useAppNavigation();

  if (loading) {
    return (
      <View style={styles.root}>
        <Image
          source={{ uri: "https://picsum.photos/id/1080/1200/1800" }}
          style={[styles.backgroundImage, { position: "absolute", width: "100%", height: "100%" }]}
        />
        <View style={[styles.rootOverlay, styles.center]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={styles.loadingText}>{UI_TEXT.loading}</Text>
        </View>
      </View>
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
      case AppScreen.FREE_MEAL_MANAGEMENT:
        screenComponent = <FreeMealManagementScreen />;
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
      case AppScreen.CONTACTS:
        screenComponent = <ContactsScreen />;
        break;
      case AppScreen.NOTES:
        screenComponent = <NotesScreen />;
        break;
      case AppScreen.FOOD_PACKAGE:
        screenComponent = <FoodPackageScreen />;
        break;
      case AppScreen.CATERER_INCOME_EXPENSE:
        screenComponent = <CatererIncomeExpenseScreen />;
        break;
      case AppScreen.USER_MANAGEMENT:
        screenComponent = <UserManagementScreen />;
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
