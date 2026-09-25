import { AppThemeMode } from "../types";
import { AppTheme } from "./types";

export const darkTheme: AppTheme = {
  themeType: AppThemeMode.DARK,
  colors: {
    primary: "#FB7185", // Radiant Crimson for Dark Canvas
    secondary: "#FBBF24", // Bright Warm Gold Accent
    background: "#0F172A", // Deep Obsidian Slate Canvas
    surface: "#1E293B", // Elevated Slate Surface
    surfaceDark: "#334155", // Higher Elevation Slate
    textPrimary: "#F8FAFC", // Off-White Crisp Text
    textSecondary: "#94A3B8", // Soft Slate Grey Secondary
    textMuted: "#94A3B8", // Accessible Muted Slate Caption Text (WCAG AA Compliant 4.8:1)
    white: "#FFFFFF",
    success: "#34D399", // Emerald Green
    successLight: "rgba(52, 211, 153, 0.12)",
    warning: "#FBBF24", // Warm Amber Warning Accent
    warningLight: "rgba(245, 158, 11, 0.2)", // Amber Dark Background
    error: "#F87171", // Crimson Red
    errorLight: "rgba(248, 113, 113, 0.12)",
    border: "#334155", // Border Line
    shadow: "#000000",
    veg: "#34D399", // Veg Green
    nonVeg: "#F87171", // Non-Veg Red
    whatsapp: "#25D366",
  },
  cardColors: [
    { bg: "rgba(30, 41, 59, 0.85)", border: "#4C1D24", accent: "#FB7185", accentLight: "rgba(251, 113, 133, 0.15)" }, // Crimson Tint
    { bg: "rgba(30, 41, 59, 0.85)", border: "#453A17", accent: "#FBBF24", accentLight: "rgba(251, 191, 36, 0.15)" }, // Gold Tint
    { bg: "rgba(30, 41, 59, 0.85)", border: "#134E3A", accent: "#34D399", accentLight: "rgba(52, 211, 153, 0.15)" }, // Emerald Tint
    { bg: "rgba(30, 41, 59, 0.85)", border: "#1E3A8A", accent: "#38BDF8", accentLight: "rgba(56, 189, 248, 0.15)" }, // Sapphire Tint
    { bg: "rgba(30, 41, 59, 0.85)", border: "#4C1D95", accent: "#A78BFA", accentLight: "rgba(167, 139, 250, 0.15)" }, // Amethyst Tint
    { bg: "rgba(30, 41, 59, 0.85)", border: "#334155", accent: "#94A3B8", accentLight: "rgba(148, 163, 184, 0.15)" }, // Stone Slate Tint
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
