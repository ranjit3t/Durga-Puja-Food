import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { Share, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { AlertButton } from "../components/common/CustomAlert";
import { UI_TEXT } from "../strings";

interface UIContextType {
  alertConfig: { visible: boolean; title: string; message: string; buttons?: AlertButton[] };
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  showGlobalError: (message: string) => void;
  hideAlert: () => void;
  shareQr: (uri: string, message?: string) => Promise<void>;
  printPass: (html: string) => Promise<void>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons?: AlertButton[];
  }>({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = useCallback((title: string, message: string, buttons?: AlertButton[]) => {
    setAlertConfig({ visible: true, title, message, buttons });
  }, []);

  const showGlobalError = useCallback((message: string) => {
    setAlertConfig({
      visible: true,
      title: UI_TEXT.error,
      message,
      buttons: [{ text: UI_TEXT.ok, style: "default" }]
    });
  }, []);

  const hideAlert = useCallback(() => {
    setAlertConfig(prev => ({ ...prev, visible: false }));
  }, []);

  const shareQr = useCallback(async (uri: string, message?: string) => {
    if (Platform.OS === "web") {
      try {
        const link = document.createElement("a");
        link.href = uri;
        link.download = `Pass-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        return;
      } catch (err) {
        console.error("Web download error:", err);
        showAlert(UI_TEXT.error, UI_TEXT.downloadError);
        return;
      }
    }

    if (!(await Sharing.isAvailableAsync())) {
      showAlert(UI_TEXT.error, UI_TEXT.shareError);
      return;
    }

    try {
      if (Platform.OS === 'ios') {
        await Share.share({ message, url: uri });
      } else {
        // Android & Web
        await Sharing.shareAsync(uri, {
          dialogTitle: message || UI_TEXT.shareQrDialog,
          mimeType: 'image/png',
          UTI: 'public.png',
        });
      }
    } catch (err) {
      console.error("Share error:", err);
    }
  }, [showAlert]);

  const printPass = useCallback(async (html: string) => {
    try {
      await Print.printAsync({ html });
    } catch (err) {
      showAlert(UI_TEXT.error, UI_TEXT.printError);
    }
  }, [showAlert]);

  const value = useMemo(() => ({
    alertConfig, showAlert, showGlobalError, hideAlert, shareQr, printPass
  }), [alertConfig, showAlert, showGlobalError, hideAlert, shareQr, printPass]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI() {
  const context = useContext(UIContext);
  if (!context) throw new Error("useUI must be used within UIProvider");
  return context;
}
