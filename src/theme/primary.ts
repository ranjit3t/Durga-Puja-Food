import { AppThemeMode } from "../types";
import { AppTheme } from "./types";

export const primaryTheme: AppTheme = {
  themeType: AppThemeMode.LIGHT,
  colors: {
    primary: "#C41E3A", // Festive Royal Crimson Red
    secondary: "#D4AF37", // Satin Warm Gold
    background: "#FAFAFA", // Soft Ivory/Cream Canvas
    surface: "#FFFFFF", // Crisp Clean White Surface
    surfaceDark: "#F1F5F9", // Slate Surface Dark
    textPrimary: "#0F172A", // Deep Navy/Slate Black Text
    textSecondary: "#475569", // Slate Grey Secondary Text
    textMuted: "#64748B", // Slate Grey Muted Text (WCAG AA Compliant 4.6:1)
    white: "#FFFFFF",
    success: "#10B981", // Emerald Veg/Success
    successLight: "#ECFDF5",
    warning: "#D97706", // Amber Warning Accent
    warningLight: "#FEF3C7", // Amber Light Background
    error: "#EF4444", // Crimson Non-Veg/Error
    errorLight: "#FEF2F2",
    border: "#E2E8F0", // Soft Slate Border
    shadow: "#0F172A",
    veg: "#10B981", // FSSAI Standard Veg Emerald Green
    nonVeg: "#EF4444", // FSSAI Standard Non-Veg Crimson Red
    whatsapp: "#25D366",
  },
  cardColors: [
    { bg: "rgba(255, 250, 250, 0.95)", border: "#FECDD3", accent: "#C41E3A", accentLight: "rgba(255, 241, 242, 0.8)" }, // Royal Crimson
    { bg: "rgba(255, 253, 245, 0.95)", border: "#FDE68A", accent: "#D4AF37", accentLight: "rgba(254, 243, 199, 0.8)" }, // Warm Gold
    { bg: "rgba(240, 253, 244, 0.95)", border: "#A7F3D0", accent: "#10B981", accentLight: "rgba(209, 250, 229, 0.8)" }, // Emerald Green
    { bg: "rgba(240, 249, 255, 0.95)", border: "#BAE6FD", accent: "#0284C7", accentLight: "rgba(224, 242, 254, 0.8)" }, // Sapphire Blue
    { bg: "rgba(250, 245, 255, 0.95)", border: "#DDD6FE", accent: "#7C3AED", accentLight: "rgba(237, 233, 254, 0.8)" }, // Amethyst Purple
    { bg: "rgba(245, 245, 244, 0.95)", border: "#E7E5E4", accent: "#78716C", accentLight: "rgba(245, 245, 244, 0.8)" }, // Warm Stone
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
