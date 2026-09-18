import { AppThemeMode } from "../types";
import { AppTheme } from "./types";

export const primaryTheme: AppTheme = {
  themeType: AppThemeMode.LIGHT,
  colors: {
    primary: "#E31837",
    secondary: "#FFB300",
    background: "#FFFFFF",
    surface: "#F8F9FA",
    surfaceDark: "#F1F3F5",
    textPrimary: "#1A1C1E",
    textSecondary: "#6A6E73",
    textMuted: "#ADB5BD",
    white: "#FFFFFF",
    success: "#28A745",
    successLight: "#EBFBEE",
    error: "#DC3545",
    errorLight: "#FFF5F5",
    border: "#E9ECEF",
    shadow: "#000000",
    veg: "#28A745",
    nonVeg: "#DC3545",
    whatsapp: "#25D366",
  },
  cardColors: [
    { bg: "#FFF5F5", border: "#FFE3E3", accent: "#E31837", accentLight: "#FFF5F5" }, // Red
    { bg: "#E7F5FF", border: "#D0EBFF", accent: "#007BFF", accentLight: "#E7F5FF" }, // Blue
    { bg: "#EBFBEE", border: "#D3F9D8", accent: "#28A745", accentLight: "#EBFBEE" }, // Green
    { bg: "#FFF4E6", border: "#FFE8CC", accent: "#FD7E14", accentLight: "#FFF4E6" }, // Orange
    { bg: "#F8F0FC", border: "#F3D9FA", accent: "#6F42C1", accentLight: "#F8F0FC" }, // Purple
    { bg: "#E3FAFC", border: "#C5F6FA", accent: "#17A2B8", accentLight: "#E3FAFC" }, // Cyan
  ],
  sizes: {
    buttonHeight: 52,
    secondaryButtonHeight: 48,
    fabSize: 56,
    fabRadius: 28,
    borderRadiusLarge: 24,
    borderRadiusMedium: 18,
    borderRadiusSmall: 12,
    paddingLarge: 24,
    paddingMedium: 20,
    paddingSmall: 12,
    compactActionHeight: 72,
  },
  typography: {
    titleSize: 32,
    subtitleSize: 16,
    sectionTitleSize: 22,
    primaryButtonTextSize: 17,
    secondaryButtonTextSize: 15,
  }
};
