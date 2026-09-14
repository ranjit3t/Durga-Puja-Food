import { AppTheme } from "./types";

export const darkTheme: AppTheme = {
  themeType: "dark",
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
  },
  cardColors: [
    { bg: "#2D1B1B", border: "#4A2626", accent: "#FF4D6D" }, // Deep Red
    { bg: "#1B2433", border: "#2A394D", accent: "#60A5FA" }, // Deep Blue
    { bg: "#1B2D24", border: "#264A35", accent: "#34D399" }, // Deep Green
    { bg: "#2D241B", border: "#4A3926", accent: "#FB923C" }, // Deep Orange
    { bg: "#241B2D", border: "#39264A", accent: "#A78BFA" }, // Deep Purple
    { bg: "#1B2D2D", border: "#264A4A", accent: "#22D3EE" }, // Deep Cyan
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
    compactActionHeight: 80,
  },
  typography: {
    titleSize: 32,
    subtitleSize: 16,
    sectionTitleSize: 22,
    primaryButtonTextSize: 17,
    secondaryButtonTextSize: 15,
  }
};
