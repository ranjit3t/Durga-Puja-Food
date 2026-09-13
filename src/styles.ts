/**
 * Global StyleSheet for the Application
 * Modern, sleek UI inspired by premium food delivery apps.
 * Palette: Vibrant Red, Deep Grays, and Clean White surfaces.
 */
import { StyleSheet, Platform } from "react-native";

const COLORS = {
  primary: "#E31837", // Vibrant Food Red
  secondary: "#FFB300", // Festive Gold
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
};

export const styles = StyleSheet.create({
  // Root Containers
  root: { flex: 1, backgroundColor: COLORS.background },
  rootOverlay: { flex: 1, backgroundColor: "rgba(255, 255, 255, 0.92)" },
  center: { justifyContent: "center", alignItems: "center" },
  backgroundImage: { opacity: 0.15 },

  // Header & Navigation
  header: {
    backgroundColor: COLORS.white,
    paddingTop: Platform.OS === "ios" ? 64 : 54,
    paddingHorizontal: 20,
    paddingBottom: 24,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerFestive: {
    backgroundColor: COLORS.primary,
    paddingTop: Platform.OS === "ios" ? 64 : 54,
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  eyebrow: {
    color: COLORS.secondary,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  eyebrowLight: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  title: {
    color: COLORS.textPrimary,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 8,
    letterSpacing: -0.5,
  },
  titleLight: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: "900",
    marginTop: 8,
    letterSpacing: -0.5,
  },
  subtitle: {
    color: COLORS.textSecondary,
    fontSize: 16,
    marginTop: 6,
    lineHeight: 22,
  },
  subtitleLight: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 16,
    marginTop: 6,
    lineHeight: 22,
  },
  backButton: {
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  backButtonLight: {
    height: 40,
    paddingHorizontal: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Main Content
  content: { padding: 20, paddingBottom: 120 },

  // Cards (Modern "Sleek" Look)
  card: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 24,
    marginBottom: 16,
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
    }),
  },

  // Search & Inputs
  searchBox: {
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    height: 56,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    paddingLeft: 12,
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "500",
  },

  input: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    padding: 16,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 56,
  },

  label: {
    color: COLORS.textPrimary,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 20,
    marginBottom: 8,
    marginLeft: 4,
  },

  helper: {
    color: COLORS.textSecondary,
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 4,
  },

  row: {
    flexDirection: "row",
    gap: 16,
  },
  fieldHalf: {
    flex: 1,
  },

  // Stats & Summary (Swiggy-style summary tiles)
  summary: {
    backgroundColor: COLORS.primary,
    borderRadius: 24,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 28,
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
    }),
  },
  summaryLabel: {
    color: "rgba(255, 255, 255, 0.8)",
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  summaryNumber: {
    color: COLORS.white,
    fontSize: 44,
    fontWeight: "900",
    marginTop: 4,
  },

  // Dashboard Financial Card (Sleek Look)
  collectionCard: {
    backgroundColor: "#FDFCFB", // Very light cream
    borderRadius: 28,
    padding: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
    marginBottom: 32, // More gap from demand section
    borderWidth: 1,
    borderColor: "#F1F3F5",
    ...Platform.select({
      ios: {
        shadowColor: "#7B5A2D",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  collectionLabel: {
    color: "#7B5A2D", // Earthy brown for sleek look
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    opacity: 0.7,
  },
  collectionAmount: {
    color: "#1A1C1E",
    fontSize: 32,
    fontWeight: "900",
    marginTop: 2,
    letterSpacing: -0.5,
  },
  collectionBreakdown: {
    color: "#6A6E73",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 6,
    opacity: 0.9,
  },

  // Section Management
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    marginBottom: 32,
    gap: 16,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  compactActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  // Dashboard Sections
  dashboardCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dashboardCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dashboardDay: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  dashboardMealSection: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },

  // Metric Components
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metric: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 12,
    minWidth: "30%",
    flexGrow: 1,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  metricValue: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "800" },
  metricLabel: { color: COLORS.textSecondary, fontSize: 11, fontWeight: "600", marginTop: 4, textAlign: "center" },

  // List Items
  flatTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  flatLabel: {
    color: COLORS.textSecondary,
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  pill: {
    backgroundColor: COLORS.successLight,
    borderRadius: 10,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  pillText: { color: COLORS.success, fontSize: 12, fontWeight: "700" },

  // Choice & Status Indicators
  dot: { width: 8, height: 8, borderRadius: 4 },
  vegChoice: { backgroundColor: COLORS.veg, borderColor: COLORS.veg },
  nonVegChoice: { backgroundColor: COLORS.nonVeg, borderColor: COLORS.nonVeg },
  slotSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  checkOn: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },

  // Buttons
  primary: {
    backgroundColor: COLORS.success,
    borderRadius: 18,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
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
    }),
  },
  primaryText: { color: COLORS.white, fontSize: 18, fontWeight: "800" },
  secondary: {
    backgroundColor: COLORS.white,
    borderColor: COLORS.border,
    borderWidth: 1.5,
    borderRadius: 18,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryText: { color: COLORS.textPrimary, fontSize: 16, fontWeight: "700" },

  deleteButton: {
    backgroundColor: COLORS.error,
    borderRadius: 18,
    height: 60,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
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
    }),
  },

  addButton: {
    backgroundColor: COLORS.primary,
    height: 48,
    paddingHorizontal: 20,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },

  selectorRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 4,
  },
  selector: {
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
    minWidth: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorOn: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary
  },
  selectorText: { color: COLORS.textSecondary, fontSize: 14, fontWeight: "700" },
  selectorTextOn: { color: COLORS.white },

  choiceRow: { flexDirection: "row", gap: 10, marginTop: 4 },
  choice: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    padding: 14,
    flex: 1,
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  choiceText: { color: COLORS.textSecondary, fontWeight: "700", fontSize: 15 },
  choiceTextOn: { color: COLORS.white },

  // Menu Management
  menuDayCard: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  menuDayHeader: {
    backgroundColor: COLORS.surface,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuDayTitle: { color: COLORS.textPrimary, fontSize: 20, fontWeight: "800" },
  menuDayBody: { padding: 20, gap: 20 },
  mealDisplayRow: {
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  mealDisplayHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 12 },
  mealDisplayTitle: { color: COLORS.primary, fontSize: 18, fontWeight: "800" },
  mealItemsContainer: { gap: 8, paddingLeft: 32 },
  mealTypeSection: { flexDirection: "row", gap: 10, alignItems: "center" },
  mealItemsText: {
    color: COLORS.textPrimary,
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
    fontWeight: "500",
  },
  dot: { width: 8, height: 8, borderRadius: 4 },

  // Menu Editor
  mealEditor: { marginBottom: 24 },
  mealEditorTitle: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 12,
  },
  mealEditorInputs: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 16,
  },
  mealInput: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  typeToggle: {
    paddingHorizontal: 12,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    minWidth: 80,
  },
  typeToggleText: { color: COLORS.white, fontSize: 12, fontWeight: "800" },
  addSmall: {
    backgroundColor: COLORS.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  itemList: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  itemBadge: {
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemBadgeText: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "600" },

  // Summary Inline
  mealSummaryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  menuSummaryLabel: { color: COLORS.textPrimary, fontSize: 14, fontWeight: "800", minWidth: 20 },
  inlineItemList: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
    flex: 1,
  },
  menuSummaryText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "500",
  },
  menuBox: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // QR & Scanning
  qrContent: {
    alignItems: "center",
    padding: 20,
  },
  qrBox: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 32,
    marginTop: 20,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  qrCaption: {
    color: COLORS.textPrimary,
    fontWeight: "800",
    fontSize: 18,
    marginTop: 32,
    textAlign: "center",
  },
  qrLink: {
    color: COLORS.textSecondary,
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },

  // Global Footer
  footer: { paddingVertical: 40, alignItems: "center" },
  footerText: { color: COLORS.textMuted, fontSize: 13, fontWeight: "600" },

  // Login specific
  loginContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: COLORS.white,
    justifyContent: "center",
  },
  loginLogo: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 32,
  },

  // Floating Action Button
  fab: {
    position: "absolute",
    bottom: 90,
    right: 20,
    backgroundColor: COLORS.primary,
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
  },

  // Custom Components
  firebaseBanner: {
    backgroundColor: COLORS.errorLight,
    borderColor: COLORS.error,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
  },
  firebaseBannerTitle: { color: COLORS.error, fontSize: 14, fontWeight: "800" },
  firebaseBannerText: { color: COLORS.error, fontSize: 13, marginTop: 4 },

  compactSecondary: {
    backgroundColor: "#FDFCFB",
    borderColor: "#F1F3F5",
    borderWidth: 1,
    borderRadius: 20,
    padding: 16,
    flexGrow: 1,
    minWidth: "45%",
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  actionLabel: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  actionLabelText: {
    fontSize: 16,
    fontWeight: "700",
  },

  // Modal
  dropdownModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "flex-end",
  },
  dropdownModalCard: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  dropdownWrap: {
    marginBottom: 0,
  },
  dropdownButton: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    paddingHorizontal: 16,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dropdownValue: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  dropdownChevron: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  dropdownModalTitle: {
    fontSize: 20,
    fontWeight: "900",
    color: COLORS.textPrimary,
    marginBottom: 20,
    textAlign: "center",
  },
  dropdownModalList: {
    marginBottom: 20,
  },
  dropdownOption: {
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dropdownOptionSelected: {
    backgroundColor: COLORS.successLight,
    borderRadius: 12,
    borderBottomColor: "transparent",
    paddingHorizontal: 12,
  },
  dropdownOptionText: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textAlign: "center",
  },
  dropdownOptionTextSelected: {
    color: COLORS.success,
    fontWeight: "800",
  },
  dropdownModalCancel: {
    marginTop: 10,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface,
    borderRadius: 16,
  },

  // Subscription Details
  dayMenuSection: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  menuSummaryInline: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 8,
  },
  personDays: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  personDay: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingVertical: 8,
    paddingHorizontal: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 55,
    backgroundColor: COLORS.white,
  },
  personDayText: {
    color: COLORS.textSecondary,
    fontSize: 11,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  qrPassCard: {
    backgroundColor: COLORS.white,
    padding: 24,
    borderRadius: 32,
    alignItems: "center",
    width: 320,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  qrPassHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  qrPassEvent: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 2,
  },
  qrPassTitle: {
    color: COLORS.textPrimary,
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  qrPassDetails: {
    alignItems: "center",
    marginTop: 20,
    gap: 4,
  },
  qrPassFlat: {
    fontSize: 28,
    fontWeight: "900",
    color: COLORS.primary,
  },
  qrPassPeople: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  qrPassSummary: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 8,
  },
  qrPassFooter: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    width: "100%",
    alignItems: "center",
  },
    qrPassInstruction: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textAlign: "center",
    marginBottom: 10,
  },
  qrPassCopyright: {
    fontSize: 14,
    fontWeight: "800",
    color: COLORS.textSecondary,
    textAlign: "center",
    marginTop: 10,
  },
});
