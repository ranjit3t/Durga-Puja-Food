export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  surface: string;
  surfaceDark: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  white: string;
  success: string;
  successLight: string;
  error: string;
  errorLight: string;
  border: string;
  shadow: string;
  veg: string;
  nonVeg: string;
}

export interface CardColor {
  bg: string;
  border: string;
  accent: string;
}

export interface ThemeSizes {
  buttonHeight: number;
  secondaryButtonHeight: number;
  fabSize: number;
  fabRadius: number;
  borderRadiusLarge: number;
  borderRadiusMedium: number;
  borderRadiusSmall: number;
  paddingLarge: number;
  paddingMedium: number;
  paddingSmall: number;
  compactActionHeight: number;
}

export interface ThemeTypography {
  titleSize: number;
  subtitleSize: number;
  sectionTitleSize: number;
  primaryButtonTextSize: number;
  secondaryButtonTextSize: number;
}

export interface AppTheme {
  themeType: "primary" | "dark";
  colors: ThemeColors;
  cardColors: CardColor[];
  sizes: ThemeSizes;
  typography: ThemeTypography;
}
