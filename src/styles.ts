/**
 * Global StyleSheet for the Application
 * Modern, sleek UI inspired by premium food delivery apps.
 * Utilizes a theme-based approach for easy customization.
 */
import { StyleSheet, Platform, useWindowDimensions } from "react-native";
import { useMemo } from "react";
import { primaryTheme as defaultTheme } from "./theme/primary";
import { AppTheme } from "./theme/types";
import { useAppTheme } from "./theme";

export const useScaling = () => {
  const { width } = useWindowDimensions();
  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 768;
  const isDesktop = width > 1200;

  const scalingFactor = isWeb ? (isDesktop ? 1.3 : (isLargeScreen ? 1.2 : 1.1)) : 1;
  const s = (size: number) => Math.round(size * scalingFactor);
  const v = (size: number) => isWeb ? Math.round(size * (isDesktop ? 0.85 : 0.9)) : size;

  return { s, v, scalingFactor, isWeb, isLargeScreen, isDesktop };
};

export const createStyles = (theme: AppTheme, width: number, height: number) => {
  const COLORS = theme?.colors || defaultTheme.colors;
  const SIZES = theme?.sizes || defaultTheme.sizes;
  const TYPOGRAPHY = theme?.typography || defaultTheme.typography;

  const isWeb = Platform.OS === 'web';
  const isLargeScreen = width > 768;
  const isDesktop = width > 1200;

  // Responsive scaling for Web: Increased legibility but balanced for vertical space
  const scalingFactor = isWeb ? (isDesktop ? 1.3 : (isLargeScreen ? 1.2 : 1.1)) : 1;
  const s = (size: number) => Math.round(size * scalingFactor);

  // Vertical compact factor for web to help fit content in viewport
  const v = (size: number) => isWeb ? Math.round(size * (isDesktop ? 0.85 : 0.9)) : size;

  const MAX_WIDTH = isWeb ? undefined : 600;

  const maxWidthStyle = {
    width: "100%" as any,
    maxWidth: MAX_WIDTH,
    alignSelf: "center" as const,
  };

  if (!theme) return {} as any;

  return StyleSheet.create({
    // Root Containers
    root: {
      flex: 1,
      backgroundColor: "transparent",
    },
    rootMainContainer: {
      flex: 1,
      backgroundColor: COLORS.background,
    },
    bgBlob1: {
      position: "absolute",
      top: -240,
      right: -160,
      width: s(500),
      height: s(500),
      borderRadius: s(250),
      backgroundColor: theme?.themeType === 'dark' ? "rgba(0, 123, 255, 0.18)" : "rgba(0, 123, 255, 0.24)",
      pointerEvents: "none" as any,
    },
    bgBlob2: {
      position: "absolute",
      bottom: -100,
      left: -120,
      width: s(460),
      height: s(460),
      borderRadius: s(230),
      backgroundColor: theme?.themeType === 'dark' ? "rgba(255, 179, 0, 0.2)" : "rgba(255, 179, 0, 0.26)",
      pointerEvents: "none" as any,
    },
    bgBlob3: {
      position: "absolute",
      top: "30%" as any,
      left: -150,
      width: s(390),
      height: s(390),
      borderRadius: s(195),
      backgroundColor: theme?.themeType === 'dark' ? "rgba(227, 24, 55, 0.18)" : "rgba(227, 24, 55, 0.24)",
      pointerEvents: "none" as any,
    },
    bgBlob4: {
      position: "absolute",
      bottom: "35%" as any,
      right: -150,
      width: s(410),
      height: s(410),
      borderRadius: s(205),
      backgroundColor: theme?.themeType === 'dark' ? "rgba(111, 66, 193, 0.2)" : "rgba(111, 66, 193, 0.25)",
      pointerEvents: "none" as any,
    },
    bgBlob5: {
      position: "absolute",
      top: -240,
      left: -160,
      width: s(500),
      height: s(500),
      borderRadius: s(250),
      backgroundColor: theme?.themeType === 'dark' ? "rgba(255, 179, 0, 0.16)" : "rgba(255, 179, 0, 0.24)",
      pointerEvents: "none" as any,
    },
    bgBlobWeb1: {
      position: "absolute",
      top: "45%" as any,
      left: "40%" as any,
      width: isWeb ? s(600) : 0,
      height: isWeb ? s(600) : 0,
      borderRadius: isWeb ? s(300) : 0,
      backgroundColor: theme?.themeType === 'dark' ? "rgba(255, 179, 0, 0.12)" : "rgba(255, 179, 0, 0.16)",
      pointerEvents: "none" as any,
      opacity: isWeb ? 1 : 0,
    },
    bgBlobWeb2: {
      position: "absolute",
      top: "50%" as any,
      right: "35%" as any,
      width: isWeb ? s(550) : 0,
      height: isWeb ? s(550) : 0,
      borderRadius: isWeb ? s(275) : 0,
      backgroundColor: theme?.themeType === 'dark' ? "rgba(227, 24, 55, 0.12)" : "rgba(227, 24, 55, 0.16)",
      pointerEvents: "none" as any,
      opacity: isWeb ? 1 : 0,
    },
    bgBlobWebTop: {
      position: "absolute",
      top: -180,
      left: "30%" as any,
      width: isWeb ? s(700) : 0,
      height: isWeb ? s(700) : 0,
      borderRadius: isWeb ? s(350) : 0,
      backgroundColor: theme?.themeType === 'dark' ? "rgba(111, 66, 193, 0.14)" : "rgba(111, 66, 193, 0.18)",
      pointerEvents: "none" as any,
      opacity: isWeb ? 1 : 0,
    },
    rootOverlay: {
      flex: 1,
      backgroundColor: theme?.themeType === 'dark' ? COLORS.shadow + "D9" : COLORS.white + "EB",
      width: "100%" as any,
    },
    center: { justifyContent: "center", alignItems: "center" },
    backgroundImage: { opacity: 0.15 },
    loadingText: {
      marginTop: 12,
      color: COLORS.textSecondary,
      fontWeight: "600",
      fontSize: s(16),
    },

    // Header & Navigation
    header: {
      backgroundColor: "transparent",
      paddingTop: Platform.OS === "ios" ? 64 : (isWeb ? 16 : 54),
      paddingHorizontal: s(SIZES.paddingMedium),
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      ...maxWidthStyle,
      width: (isWeb ? "100%" : maxWidthStyle.width) as any,
    },
    title: {
      color: COLORS.textPrimary,
      fontSize: s(TYPOGRAPHY.titleSize),
      fontWeight: "900",
      marginTop: 8,
      letterSpacing: -0.5,
    },
    subtitle: {
      color: COLORS.textSecondary,
      fontSize: s(TYPOGRAPHY.subtitleSize),
      marginTop: 6,
      lineHeight: s(22),
    },
    backButton: {
      height: s(36),
      paddingHorizontal: s(12),
      borderRadius: s(18),
      backgroundColor: COLORS.surface,
      alignItems: "center",
      justifyContent: "center",
    },

    // Main Content
    content: {
      flexGrow: 1,
      padding: s(SIZES.paddingMedium),
      paddingBottom: v(150),
      ...maxWidthStyle,
      width: (isWeb ? "100%" : maxWidthStyle.width) as any,
    },

    // Fixed width wrapper for elements outside scrollviews/flatlists
    maxWidthWrapper: {
      ...maxWidthStyle,
      paddingHorizontal: s(SIZES.paddingMedium),
    },

    // Cards (Modern "Sleek" Look)
    card: {
      backgroundColor: COLORS.surface,
      padding: s(SIZES.paddingMedium),
      borderRadius: s(SIZES.borderRadiusLarge),
      marginBottom: s(16),
      borderWidth: 1,
      borderColor: COLORS.border,
      ...Platform.select({
        ios: {
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
        },
        android: {
          elevation: 3,
        },
        web: {
          boxShadow: '0 4px 10px rgba(0,0,0,0.1)',
        }
      }),
    },

    // Search & Inputs
    searchBox: {
      backgroundColor: COLORS.surfaceDark,
      borderRadius: s(16),
      paddingHorizontal: s(16),
      flexDirection: "row",
      alignItems: "center",
      marginBottom: s(24),
      height: s(56),
      borderWidth: 1,
      borderColor: COLORS.border,
      ...maxWidthStyle,
    },
    searchInput: {
      flex: 1,
      paddingVertical: s(12),
      paddingLeft: s(12),
      color: COLORS.textPrimary,
      fontSize: s(16),
      fontWeight: "500",
    },

    input: {
      backgroundColor: COLORS.surfaceDark,
      borderRadius: s(14),
      padding: s(16),
      fontSize: s(16),
      color: COLORS.textPrimary,
      borderWidth: 1,
      borderColor: COLORS.border,
      height: s(56),
    },

    label: {
      color: COLORS.textPrimary,
      fontSize: s(14),
      fontWeight: "700",
      marginTop: s(20),
      marginBottom: s(8),
      marginLeft: s(4),
    },

    helper: {
      color: COLORS.textSecondary,
      fontSize: s(13),
      marginBottom: s(12),
      marginLeft: s(4),
    },

    row: {
      flexDirection: "row",
      gap: s(16),
      flexWrap: isLargeScreen ? "wrap" : "nowrap",
    },
    fieldHalf: {
      flex: 1,
      minWidth: isLargeScreen ? 300 : undefined,
    },

    // Stats & Summary (Swiggy-style summary tiles)
    summary: {
      backgroundColor: COLORS.primary,
      borderRadius: s(SIZES.borderRadiusLarge),
      padding: v(s(SIZES.paddingLarge)),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: v(s(28)),
      ...Platform.select({
        ios: {
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.3,
          shadowRadius: 15,
        },
        android: {
          elevation: 8,
        },
        web: {
          boxShadow: `0 6px 12px ${COLORS.primary}33`,
        }
      }),
    },
    summaryLabel: {
      color: COLORS.white + "CC",
      fontSize: s(12),
      fontWeight: "800",
      letterSpacing: 1.5,
      textTransform: "uppercase",
    },
    summaryNumber: {
      color: COLORS.white,
      fontSize: s(44),
      fontWeight: "900",
      marginTop: 4,
    },

    collectionMetric: {
      backgroundColor: COLORS.surface,
      borderRadius: s(16),
      padding: s(12),
      flex: 1,
      alignItems: "center",
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    collectionMetricLabel: {
      color: COLORS.textSecondary,
      fontSize: s(11),
      fontWeight: "600",
      marginTop: 4,
    },
    collectionMetricValue: {
      color: COLORS.success,
      fontSize: s(18),
      fontWeight: "800",
    },

    // Section Management
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      marginBottom: s(32),
      gap: s(16),
    },
    sectionTitle: {
      color: COLORS.textPrimary,
      fontSize: s(TYPOGRAPHY.sectionTitleSize),
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    compactActions: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: v(s(10)),
    },

    // Dashboard Sections
    dashboardCard: {
      backgroundColor: COLORS.surface,
      borderRadius: s(SIZES.borderRadiusLarge),
      padding: v(s(SIZES.paddingMedium)),
      marginBottom: v(s(20)),
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    dashboardCardTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      marginBottom: v(s(16)),
    },
    dashboardDay: {
      fontSize: s(18),
      fontWeight: "800",
      color: COLORS.textPrimary,
    },
    dashboardMealSection: {
      backgroundColor: COLORS.surfaceDark,
      borderRadius: s(20),
      padding: v(s(16)),
      marginBottom: v(s(16)),
    },

    // Metric Components
    metricGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: v(s(8)),
      justifyContent: "space-between"
    },
    metric: {
      backgroundColor: COLORS.surface,
      borderRadius: s(12),
      padding: v(s(8)),
      width: isDesktop ? "18%" : (isLargeScreen ? "23%" : "31%"),
      flexGrow: 1,
      alignItems: "center",
      borderWidth: 1,
      borderColor: COLORS.border,
      minHeight: v(s(60)),
      justifyContent: "center",
    },
    metricValue: { color: COLORS.textPrimary, fontSize: s(18), fontWeight: "800" },
    metricLabel: { color: COLORS.textSecondary, fontSize: s(10), fontWeight: "600", marginTop: 2, textAlign: "center" },

    // List Items
    flatTitle: {
      color: COLORS.textPrimary,
      fontSize: s(24),
      fontWeight: "800",
      letterSpacing: -0.5,
    },
    flatLabel: {
      color: COLORS.textSecondary,
      fontSize: s(12),
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
    },
    pill: {
      backgroundColor: COLORS.successLight,
      borderRadius: s(10),
      paddingVertical: s(6),
      paddingHorizontal: s(10),
    },
    pillText: { color: COLORS.success, fontSize: s(12), fontWeight: "700" },

    // Choice & Status Indicators
    dot: { width: s(8), height: s(8), borderRadius: s(4) },
    vegChoice: { backgroundColor: COLORS.veg, borderColor: COLORS.veg },
    nonVegChoice: { backgroundColor: COLORS.nonVeg, borderColor: COLORS.nonVeg },
    slotSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    checkOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

    // Buttons
    primary: {
      backgroundColor: COLORS.success,
      borderRadius: s(SIZES.borderRadiusMedium),
      height: s(SIZES.buttonHeight),
      alignItems: "center",
      justifyContent: "center",
      marginTop: s(24),
      paddingHorizontal: s(24),
      ...Platform.select({
        ios: {
          shadowColor: COLORS.success,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },
        android: {
          elevation: 4,
        },
        web: {
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          boxShadow: `0 4px 10px ${COLORS.success}40`,
        }
      }),
    },
    primaryText: { color: COLORS.white, fontSize: s(TYPOGRAPHY.primaryButtonTextSize), fontWeight: "800" },
    secondary: {
      backgroundColor: COLORS.surface,
      borderColor: COLORS.border,
      borderWidth: 1.5,
      borderRadius: s(SIZES.borderRadiusMedium),
      height: s(SIZES.secondaryButtonHeight),
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: s(16),
      ...Platform.select({
        web: {
          cursor: 'pointer',
        }
      }),
    },
    secondaryText: { color: COLORS.textPrimary, fontSize: s(TYPOGRAPHY.secondaryButtonTextSize), fontWeight: "700" },

    deleteButton: {
      backgroundColor: COLORS.error,
      borderRadius: s(SIZES.borderRadiusMedium),
      height: s(SIZES.buttonHeight),
      alignItems: "center",
      justifyContent: "center",
      marginTop: s(24),
      ...Platform.select({
        ios: {
          shadowColor: COLORS.error,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.25,
          shadowRadius: 10,
        },
        android: {
          elevation: 4,
        },
        web: {
          cursor: 'pointer',
          boxShadow: `0 4px 10px ${COLORS.error}40`,
        }
      }),
    },

    addButton: {
      backgroundColor: COLORS.primary,
      height: s(48),
      paddingHorizontal: s(SIZES.paddingMedium),
      borderRadius: s(14),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: s(8),
      ...Platform.select({
        web: { cursor: 'pointer' }
      }),
    },

    selectorRow: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: s(SIZES.paddingSmall),
      marginBottom: s(4),
    },
    selector: {
      backgroundColor: COLORS.surface,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      borderRadius: s(SIZES.borderRadiusSmall),
      paddingVertical: s(SIZES.paddingSmall),
      paddingHorizontal: s(16),
      marginBottom: s(8),
      minWidth: s(100),
      alignItems: "center",
      justifyContent: "center",
    },
    selectorOn: {
      backgroundColor: COLORS.primary,
      borderColor: COLORS.primary
    },
    selectorText: { color: COLORS.textSecondary, fontSize: s(14), fontWeight: "700" },
    selectorTextOn: { color: COLORS.white },

    choiceRow: { flexDirection: "row", gap: s(10), marginTop: s(4) },
    choice: {
      borderWidth: 1.5,
      borderColor: COLORS.border,
      borderRadius: s(14),
      padding: s(14),
      flex: 1,
      alignItems: "center",
      backgroundColor: COLORS.surface,
    },
    choiceText: { color: COLORS.textSecondary, fontWeight: "700", fontSize: s(15) },
    choiceTextOn: { color: COLORS.white },

    // Menu Management
    menuDayCard: {
      backgroundColor: COLORS.surface,
      borderRadius: s(24),
      marginBottom: s(20),
      borderWidth: 1,
      borderColor: COLORS.border,
      overflow: "hidden",
    },
    menuDayHeader: {
      backgroundColor: COLORS.surfaceDark,
      paddingVertical: s(14),
      paddingHorizontal: s(SIZES.paddingMedium),
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    menuDayTitle: { color: COLORS.textPrimary, fontSize: s(20), fontWeight: "800" },
    menuDayBody: { padding: s(20), gap: s(20) },
    mealDisplayRow: {
      paddingBottom: s(16),
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    mealDisplayHeader: { flexDirection: "row", alignItems: "center", gap: s(10), marginBottom: s(12) },
    mealDisplayTitle: { color: COLORS.primary, fontSize: s(18), fontWeight: "800" },
    mealItemsContainer: { gap: v(s(8)), paddingLeft: s(32) },
    mealTypeSection: { flexDirection: "row", gap: s(10), alignItems: "center" },
    mealItemsText: {
      color: COLORS.textPrimary,
      fontSize: s(15),
      lineHeight: s(22),
      flex: 1,
      fontWeight: "500",
    },

    // Menu Editor
    mealEditor: { marginBottom: s(24) },
    mealEditorTitle: {
      color: COLORS.textSecondary,
      fontSize: s(14),
      fontWeight: "700",
      textTransform: "uppercase",
      letterSpacing: 1,
      marginBottom: s(12),
    },
    mealEditorInputs: {
      flexDirection: "row",
      gap: s(10),
      alignItems: "center",
      marginBottom: s(16),
    },
    mealInput: {
      flex: 1,
      backgroundColor: COLORS.surfaceDark,
      borderRadius: s(SIZES.borderRadiusSmall),
      padding: s(14),
      fontSize: s(15),
      color: COLORS.textPrimary,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    typeToggle: {
      paddingHorizontal: s(SIZES.paddingSmall),
      height: s(48),
      borderRadius: s(SIZES.borderRadiusSmall),
      justifyContent: "center",
      alignItems: "center",
      minWidth: s(80),
    },
    typeToggleText: { color: COLORS.white, fontSize: s(12), fontWeight: "800" },
    addSmall: {
      backgroundColor: COLORS.primary,
      width: s(48),
      height: s(48),
      borderRadius: s(24),
      alignItems: "center",
      justifyContent: "center",
    },
    itemList: { flexDirection: "row", flexWrap: "wrap", gap: s(8) },
    itemBadge: {
      backgroundColor: COLORS.surfaceDark,
      borderRadius: s(10),
      paddingVertical: s(8),
      paddingHorizontal: s(SIZES.paddingSmall),
      flexDirection: "row",
      alignItems: "center",
      gap: s(8),
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    itemBadgeText: { color: COLORS.textPrimary, fontSize: s(14), fontWeight: "600" },

    // Summary Inline
    mealSummaryRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: s(8),
      marginBottom: s(4),
    },
    menuSummaryLabel: { color: COLORS.textPrimary, fontSize: s(14), fontWeight: "800", minWidth: s(20) },
    inlineItemList: {
      flexDirection: "row",
      alignItems: "center",
      gap: s(6),
      flexWrap: "wrap",
      flex: 1,
    },
    menuSummaryText: {
      color: COLORS.textSecondary,
      fontSize: s(14),
      fontWeight: "500",
    },
    menuBox: {
      backgroundColor: COLORS.surface,
      borderRadius: s(SIZES.borderRadiusSmall),
      padding: s(SIZES.paddingSmall),
      borderWidth: 1,
      borderColor: COLORS.border,
    },

    // QR & Scanning
    qrContent: {
      alignItems: "center",
      padding: s(SIZES.paddingMedium),
      ...maxWidthStyle,
    },
    qrBox: {
      backgroundColor: COLORS.white,
      padding: s(20),
      borderRadius: s(32),
      marginTop: s(20),
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        ios: {
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: 0.1,
          shadowRadius: 20,
        },
        android: {
          elevation: 10,
        },
        web: {
          boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
        }
      }),
    },
    qrCaption: {
      color: COLORS.textPrimary,
      fontWeight: "800",
      fontSize: s(18),
      marginTop: s(32),
      textAlign: "center",
    },
    qrLink: {
      color: COLORS.textSecondary,
      fontSize: s(12),
      marginTop: s(12),
      textAlign: "center",
    },

    // Global Footer
    footer: { paddingVertical: v(s(40)), alignItems: "center", ...maxWidthStyle },
    footerText: { color: COLORS.textMuted, fontSize: s(13), fontWeight: "600" },

    // Login specific
    loginContainer: {
      padding: s(SIZES.paddingLarge),
      paddingTop: v(s(120)),
      paddingBottom: v(s(150)),
      backgroundColor: "transparent",
      ...maxWidthStyle,
    },
    loginLogo: {
      width: s(100),
      height: s(100),
      borderRadius: s(50),
      backgroundColor: COLORS.primary,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "center",
      marginBottom: s(32),
    },

    // Floating Action Button
    fab: {
      position: "absolute",
      bottom: isWeb ? 40 : 90,
      right: isWeb ? 40 : 20,
      backgroundColor: COLORS.primary,
      width: s(SIZES.fabSize),
      height: s(SIZES.fabSize),
      borderRadius: s(SIZES.fabRadius),
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        ios: {
          shadowColor: COLORS.primary,
          shadowOffset: { width: 0, height: 6 },
          shadowOpacity: 0.4,
          shadowRadius: 8,
        },
        android: {
          elevation: 8,
        },
        web: {
          cursor: 'pointer',
          boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
        }
      })
    },

    // Custom Components
    firebaseBanner: {
      backgroundColor: COLORS.errorLight,
      borderColor: COLORS.error,
      borderWidth: 1,
      borderRadius: s(16),
      padding: s(16),
      marginBottom: s(20),
      ...maxWidthStyle,
    },
    firebaseBannerTitle: { color: COLORS.error, fontSize: s(14), fontWeight: "800" },
    firebaseBannerText: { color: COLORS.error, fontSize: s(13), marginTop: s(4) },

    compactSecondary: {
      backgroundColor: COLORS.surface,
      borderColor: COLORS.border,
      borderWidth: 1,
      borderRadius: s(14),
      padding: s(6),
      flexGrow: 1,
      minWidth: isDesktop ? "18%" : "23%",
      height: v(s(64)),
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        ios: {
          shadowColor: COLORS.shadow,
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
        },
        android: {
          elevation: 2,
        },
        web: {
          cursor: 'pointer',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
        }
      }),
    },
    actionLabel: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: s(8),
    },
    actionLabelText: {
      fontSize: s(15),
      fontWeight: "700",
    },

    // Modal
    dropdownModalBackdrop: {
      flex: 1,
      backgroundColor: COLORS.shadow + "99",
      justifyContent: isWeb ? "center" : "flex-end",
      alignItems: isWeb ? "center" : undefined,
    },
    dropdownModalCard: {
      backgroundColor: COLORS.surface,
      borderTopLeftRadius: isWeb ? s(32) : 32,
      borderTopRightRadius: isWeb ? s(32) : 32,
      borderRadius: isWeb ? s(32) : undefined,
      padding: s(SIZES.paddingLarge),
      paddingBottom: s(40),
      maxHeight: "85%",
      width: isWeb ? Math.min(width * 0.9, 500) : "100%",
    },
    dropdownWrap: {
      marginBottom: 0,
    },
    dropdownButton: {
      backgroundColor: COLORS.surfaceDark,
      borderRadius: s(14),
      paddingHorizontal: s(16),
      height: s(56),
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      borderWidth: 1,
      borderColor: COLORS.border,
      ...Platform.select({
        web: { cursor: 'pointer' }
      })
    },
    dropdownValue: {
      fontSize: s(16),
      color: COLORS.textPrimary,
      fontWeight: "600",
    },
    dropdownChevron: {
      fontSize: s(12),
      color: COLORS.textSecondary,
    },
    dropdownModalTitle: {
      fontSize: s(20),
      fontWeight: "900",
      color: COLORS.textPrimary,
      marginBottom: s(20),
      textAlign: "center",
    },
    dropdownModalList: {
      marginBottom: s(20),
    },
    dropdownOption: {
      paddingVertical: s(18),
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
      ...Platform.select({
        web: { cursor: 'pointer' }
      })
    },
    dropdownOptionSelected: {
      backgroundColor: COLORS.successLight,
      borderRadius: s(SIZES.borderRadiusSmall),
      borderBottomColor: "transparent",
      paddingHorizontal: s(SIZES.paddingSmall),
    },
    dropdownOptionText: {
      fontSize: s(18),
      color: COLORS.textSecondary,
      fontWeight: "600",
      textAlign: "center",
    },
    dropdownOptionTextSelected: {
      color: COLORS.success,
      fontWeight: "800",
    },
    dropdownModalCancel: {
      marginTop: s(10),
      height: s(48),
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.surfaceDark,
      borderRadius: s(16),
      ...Platform.select({
        web: { cursor: 'pointer' }
      })
    },

    // Subscription Details
    dayMenuSection: {
      paddingVertical: s(SIZES.paddingSmall),
      borderBottomWidth: 1,
      borderBottomColor: COLORS.border,
    },
    menuSummaryInline: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: s(SIZES.paddingSmall),
      marginTop: s(8),
    },
    personDays: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: s(8),
    },
    personDay: {
      borderWidth: 1.5,
      borderColor: COLORS.border,
      borderRadius: s(14),
      paddingVertical: s(8),
      paddingHorizontal: s(10),
      alignItems: "center",
      justifyContent: "center",
      minWidth: s(55),
      backgroundColor: COLORS.surface,
    },
    personDayText: {
      color: COLORS.textSecondary,
      fontSize: s(11),
      fontWeight: "800",
      textTransform: "uppercase",
    },
    qrPassCard: {
      backgroundColor: COLORS.white,
      padding: s(SIZES.paddingLarge),
      borderRadius: s(32),
      alignItems: "center",
      width: isLargeScreen ? s(400) : Math.min(width * 0.9, 320),
      borderWidth: 1,
      borderColor: COLORS.border,
      ...Platform.select({
        web: {
          boxShadow: '0 15px 40px rgba(0,0,0,0.1)',
        }
      })
    },
    qrPassHeader: {
      alignItems: "center",
      marginBottom: s(20),
    },
    qrPassEvent: {
      color: COLORS.primary,
      fontSize: s(14),
      fontWeight: "900",
      letterSpacing: 2,
    },
    qrPassTitle: {
      color: COLORS.textPrimary,
      fontSize: s(24),
      fontWeight: "900",
      marginTop: s(4),
    },
    qrPassDetails: {
      alignItems: "center",
      marginTop: s(20),
      gap: s(4),
    },
    qrPassFlat: {
      fontSize: s(28),
      fontWeight: "900",
      color: COLORS.primary,
    },
    qrPassPeople: {
      fontSize: s(16),
      fontWeight: "700",
      color: COLORS.textSecondary,
    },
    qrPassSummary: {
      fontSize: s(13),
      fontWeight: "600",
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: s(8),
    },
    qrPassFooter: {
      marginTop: s(SIZES.paddingLarge),
      paddingTop: s(16),
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      width: "100%",
      alignItems: "center",
    },
      qrPassInstruction: {
      fontSize: s(11),
      fontWeight: "700",
      color: COLORS.textSecondary,
      textAlign: "center",
      marginBottom: s(10),
    },
    qrPassCopyright: {
      fontSize: s(14),
      fontWeight: "800",
      color: COLORS.textSecondary,
      textAlign: "center",
      marginTop: s(10),
    },

    // Preview Cards (Live Preview / Pass Identity)
    previewTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    previewLabel: {
      fontSize: s(12),
      fontWeight: "800",
      letterSpacing: 1.2,
      textTransform: "uppercase",
      marginBottom: s(4),
    },
    previewTitle: {
      fontSize: s(24),
      fontWeight: "900",
      letterSpacing: -0.5,
    },
    previewAmount: {
      fontWeight: "900",
      fontSize: s(18),
    },
    previewMeta: {
      fontSize: s(14),
      fontWeight: "700",
      opacity: 0.9,
    },
  });
};

export const useStyles = () => {
  const { theme } = useAppTheme();
  const { width, height } = useWindowDimensions();
  return useMemo(() => createStyles(theme, width, height), [theme, width, height]);
};

// Fallback for static imports (deprecated)
export const styles = createStyles(defaultTheme, 375, 812);
export const CARD_COLORS = defaultTheme.cardColors;
