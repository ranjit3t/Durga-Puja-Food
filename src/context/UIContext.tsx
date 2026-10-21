import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { Share, Platform } from "react-native";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { AlertButton } from "../components/common/CustomAlert";
import { UI_TEXT } from "../strings";

interface UIContextType {
  alertConfig: { visible: boolean; title: string; message: string; buttons?: AlertButton[]; linkUrl?: string };
  showAlert: (title: string, message: string, buttons?: AlertButton[], linkUrl?: string) => void;
  showGlobalError: (message: string) => void;
  hideAlert: () => void;
  shareQr: (uri: string, message?: string, fileName?: string) => Promise<void>;
  printPass: (html: string) => Promise<void>;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export function UIProvider({ children }: { children: React.ReactNode }) {
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons?: AlertButton[];
    linkUrl?: string;
  }>({
    visible: false,
    title: "",
    message: "",
  });

  const showAlert = useCallback((title: string, message: string, buttons?: AlertButton[], linkUrl?: string) => {
    setAlertConfig({ visible: true, title, message, buttons, linkUrl });
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

  const shareQr = useCallback(async (uri: string, message?: string, fileName?: string) => {
    if (Platform.OS === "web") {
      try {
        const link = document.createElement("a");
        link.href = uri;
        const fallbackName = UI_TEXT.exportPassFileName.replace("{id}", "Pass").replace("{date}", new Date().toISOString().slice(0, 10));
        link.download = fileName || fallbackName;
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
    if (Platform.OS === "web") {
      const styleEl = document.createElement("style");
      styleEl.id = "app-print-style-override";
      styleEl.innerHTML = `
        @media print {
          body > *:not(#app-print-frame) {
            display: none !important;
          }
          #app-print-frame {
            display: block !important;
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100vw !important;
            height: 100vh !important;
            border: none !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
            z-index: 999999 !important;
          }
        }
      `;
      document.head.appendChild(styleEl);

      const iframe = document.createElement("iframe");
      iframe.id = "app-print-frame";
      iframe.style.position = "fixed";
      iframe.style.right = "0";
      iframe.style.bottom = "0";
      iframe.style.width = "0";
      iframe.style.height = "0";
      iframe.style.border = "0";
      document.body.appendChild(iframe);

      const doc = iframe.contentWindow?.document || iframe.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();

        const cleanup = () => {
          try {
            if (document.head.contains(styleEl)) document.head.removeChild(styleEl);
            if (document.body.contains(iframe)) document.body.removeChild(iframe);
          } catch (e) {
            // ignore
          }
        };

        const triggerPrint = () => {
          try {
            iframe.contentWindow?.focus();
            iframe.contentWindow?.print();
          } catch (e) {
            console.error("Print error:", e);
          }
          setTimeout(cleanup, 1000);
        };

        const img = doc.querySelector("img");
        if (img && !img.complete) {
          img.onload = triggerPrint;
          img.onerror = triggerPrint;
        } else {
          setTimeout(triggerPrint, 150);
        }
      }
      return;
    }

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
