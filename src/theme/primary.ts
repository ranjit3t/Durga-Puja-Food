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
    { bg: "rgba(255, 245, 245, 0.6)", border: "#FFE3E3", accent: "#E31837", accentLight: "rgba(255, 245, 245, 0.5)" }, // Red
    { bg: "rgba(231, 245, 255, 0.6)", border: "#D0EBFF", accent: "#007BFF", accentLight: "rgba(231, 245, 255, 0.5)" }, // Blue
    { bg: "rgba(235, 251, 238, 0.6)", border: "#D3F9D8", accent: "#28A745", accentLight: "rgba(235, 251, 238, 0.5)" }, // Green
    { bg: "rgba(255, 244, 230, 0.6)", border: "#FFE8CC", accent: "#FD7E14", accentLight: "rgba(255, 244, 230, 0.5)" }, // Orange
    { bg: "rgba(248, 240, 252, 0.6)", border: "#F3D9FA", accent: "#6F42C1", accentLight: "rgba(248, 240, 252, 0.5)" }, // Purple
    { bg: "rgba(227, 250, 252, 0.6)", border: "#C5F6FA", accent: "#17A2B8", accentLight: "rgba(227, 250, 252, 0.5)" }, // Cyan
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
