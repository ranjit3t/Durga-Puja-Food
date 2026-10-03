/**
 * Food Desk - App Entry Point
 * Initializes Context Providers, Error Boundary, and the App Navigator.
 */
import React from "react";
import { LogBox } from "react-native";
import { ThemeProvider } from "./src/theme";
import { AuthProvider } from "./src/context/AuthContext";
import { DatabaseProvider } from "./src/context/DatabaseContext";
import { NavigationProvider } from "./src/context/NavigationContext";
import { UIProvider, useUI } from "./src/context/UIContext";
import { ChatProvider } from "./src/context/ChatContext";
import { ChatWidget } from "./src/components/chat/ChatWidget";
import { AppNavigator } from "./src/navigation/AppNavigator";
import { CustomAlert } from "./src/components/common/CustomAlert";
import { ErrorBoundary } from "./src/components/common/ErrorBoundary";

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
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <DatabaseProvider>
            <UIProvider>
              <ChatProvider>
                <NavigationProvider>
                  <AppRoot />
                </NavigationProvider>
              </ChatProvider>
            </UIProvider>
          </DatabaseProvider>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

function AppRoot() {
  const { alertConfig, hideAlert } = useUI();

  return (
    <>
      <AppNavigator />
      <ChatWidget />
      <CustomAlert
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        buttons={alertConfig.buttons}
        linkUrl={alertConfig.linkUrl}
        onClose={hideAlert}
      />
    </>
  );
}
