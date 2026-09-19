import { AppThemeMode } from "../types";
import { AppTheme } from "./types";

export const darkTheme: AppTheme = {
  themeType: AppThemeMode.DARK,
  colors: {
    primary: "#FF4D6D", // Lighter red for dark mode
    secondary: "#FFD60A", // Bright gold
    background: "#121212", // Pure black/grey
    surface: "#1E1E1E", // Elevated surface
    surfaceDark: "#2C2C2C",
    textPrimary: "#E9ECEF", // Off-white
    textSecondary: "#ADB5BD", // Muted grey
    textMuted: "#6C757D",
    white: "#FFFFFF",
    success: "#34D399",
    successLight: "rgba(52, 211, 153, 0.1)",
    error: "#F87171",
    errorLight: "rgba(248, 113, 113, 0.1)",
    border: "#333333",
    shadow: "#000000",
    veg: "#34D399",
    nonVeg: "#F87171",
    whatsapp: "#25D366",
  },
  cardColors: [
    { bg: "rgba(45, 27, 27, 0.4)", border: "#4A2626", accent: "#FF4D6D", accentLight: "rgba(255, 77, 109, 0.15)" }, // Deep Red
    { bg: "rgba(27, 36, 51, 0.4)", border: "#2A394D", accent: "#60A5FA", accentLight: "rgba(96, 165, 250, 0.15)" }, // Deep Blue
    { bg: "rgba(27, 45, 36, 0.4)", border: "#264A35", accent: "#34D399", accentLight: "rgba(52, 211, 153, 0.15)" }, // Deep Green
    { bg: "rgba(45, 36, 27, 0.4)", border: "#4A3926", accent: "#FB923C", accentLight: "rgba(251, 146, 60, 0.15)" }, // Deep Orange
    { bg: "rgba(36, 27, 45, 0.4)", border: "#39264A", accent: "#A78BFA", accentLight: "rgba(167, 139, 250, 0.15)" }, // Deep Purple
    { bg: "rgba(27, 45, 45, 0.4)", border: "#264A4A", accent: "#22D3EE", accentLight: "rgba(34, 211, 238, 0.15)" }, // Deep Cyan
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
