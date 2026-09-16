/**
 * Food Desk - App Entry Point
 * Initializes Context Providers and the App Navigator.
 */
import React from "react";
import { LogBox } from "react-native";
import { ThemeProvider } from "./src/theme";
import { AuthProvider } from "./src/context/AuthContext";
import { DatabaseProvider } from "./src/context/DatabaseContext";
import { NavigationProvider } from "./src/context/NavigationContext";
import { UIProvider, useUI } from "./src/context/UIContext";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { CustomAlert } from "./src/components/common/CustomAlert";

// Suppress framework noise from older libraries used in Expo Go / peer dependencies
LogBox.ignoreLogs([
  "ProgressBarAndroid has been extracted",
  "SafeAreaView has been deprecated",
  "Clipboard has been extracted",
  "InteractionManager has been deprecated",
  "PushNotificationIOS has been extracted",
]);

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <DatabaseProvider>
          <UIProvider>
            <NavigationProvider>
              <AppRoot />
            </NavigationProvider>
          </UIProvider>
        </DatabaseProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

function AppRoot() {
  const { alertConfig, hideAlert } = useUI();

  return (
    <>
      <AppNavigator />
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        onClose={hideAlert}
      />
    </>
  );
}
