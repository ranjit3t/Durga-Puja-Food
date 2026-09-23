# Eternia Food Desk — Architecture Documentation

This document describes the high-level system architecture, data models, design patterns, and security workflows used in the **Eternia Food Desk** application.

---

## 1. System Overview
Eternia Food Desk is a cross-platform mobile and web application built with **React Native (Expo)** designed to manage high-volume food distribution during community festivals. It uses a **Serverless Layered Architecture** with **Firebase Realtime Database** for real-time synchronization, state persistence, and dynamic configuration.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          React Native / Expo UI                        │
│  (Screens, Components, Theme Engine, Dual-Axis Viewport Scaling)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        Context Provider Layer                          │
│   AuthContext ┆ DatabaseContext ┆ NavigationContext ┆ UIContext ┆ Theme│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        Firebase Repository Layer                       │
│      (Data normalization, optimistic updates, offline fallbacks)       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Firebase Realtime Database                       │
│ subscriptions ┆ menu ┆ config ┆ auth_config ┆ logs ┆ notes ┆ appVersion│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technical Stack
- **Framework**: React Native with Expo (v51+)
- **Language**: TypeScript (v5.3+, strict mode) with Domain Enums (`MealType`, `DietType`, `DietaryOption`, `AppScreen`, `ReportType`, `PaymentMode`, `AppThemeMode`).
- **Backend & Database**: Firebase Realtime Database
- **Authentication**: Hybrid model using Database-driven Role Authentication (`auth_config` node) with ephemeral 24-hour sessions.
- **Version Control & Auto-Alert**: Top-level `"appVersion"` node in RTDB vs local `UI_TEXT.appVersion` (`src/strings.ts`).
- **Local Persistence**: `AsyncStorage` for local device preferences (Theme mode).
- **Scanning & Pass Generation**: `expo-camera` for QR code scanning and `react-native-qrcode-svg` for matrix generation.
- **Snapshot & Sharing**: `react-native-view-shot` (`captureRef`) for image exports and `expo-sharing` / `expo-print` for WhatsApp and native dialogs.

---

## 3. Core Architecture & Layers

The project follows a **Modular Layered Architecture**:

```
src/
├── components/          # Modular UI Components
├── context/             # React Context Providers (Auth, Database, Navigation, UI)
├── hooks/               # Custom Hooks (useReportData)
├── navigation/          # Navigation Router & Screen Switcher
├── theme/               # Light/Dark Design Tokens & Provider
├── domain.ts            # Domain Data Contracts
├── repository.ts        # Firebase Repository Operations
├── config.ts            # Global App Defaults & Constants
├── firebase.ts          # Firebase Initialization
├── strings.ts           # Centralized Dictionary for Localized UI Text & `appVersion`
├── styles.ts            # Global Scaling Engine (`s()` / `v()`) & Glassmorphic Styles
└── screens/             # Top-Level Screen Views
```

### A. Presentation Layer (`src/screens`, `src/components`)
- **`HomeScreen`**: Dashboard summary, real-time operational badges, service shortcuts, auto version-check alert, and high-density action grid.
- **`SubscriptionListScreen`**: Pass directory with natural alphanumeric sorting, search, multi-select filter bar (`All`, `Current Meal`, `Current Meal Missed`, `Kids`, `Parcels`, `Veg Only`), and filtered detailed Excel CSV export sorted by Block and Flat.
- **`SubscriptionForm`**: Registration & edit view with headcount baseline protection, automated pricing, and identity locking (Block/Flat locked in edit mode).
- **`ScannerScreen`**: Dual-mode verification interface featuring live QR camera scanning and a 4-digit numeric passcode keypad overlay.
- **`QrScreen`**: Digital pass renderer displaying seasonal branding, QR matrix, and bold 4-digit passcode identity fallback.
- **`DetailsScreen`**: Detailed flat pass summary with food collection matrix, quick contact actions (WhatsApp/Call/SMS), and deletion safeguards.
- **`DashboardScreen`**: Kitchen counter dashboard with live meal metrics, meal bar charts, and organized metric grid views.
- **`ReportScreen`**: Analytics suite providing 10 specialized reports (`DayWise`, `MealWise`, `SingleMeal`, `Guest`, `Parcel`, `MissedParcel`, `Kids`, `Pending`, `FlatWise`, `PaymentSummary`) with theme-aware PNG image export.
- **`GuestManagementScreen`**: Dedicated counter interface for managing guest meal demands with detailed guest Excel CSV export.
- **`ContactsScreen`**: Admin-exclusive resident directory with direct WhatsApp/Call/SMS shortcuts.
- **`NotesScreen`**: Collaborative team notes module with role permissions.
- **`ActivityLogScreen`**: Forensic system audit log viewer.
- **`SettingsScreen`**: Administrative control center for festival rules, meal lifecycles, and configuration safety guards.

### B. State & Context Layer (`src/context/`)
- **`AuthContext`**: Manages login state, roles (`Admin` / `Vendor`), and session expiration (24-hour auto-logout).
- **`DatabaseContext`**: Realtime RTDB listeners, data hydration, `remoteAppVersion` sync, activity logging, and subscription state updates.
- **`NavigationContext`**: Custom history-stack navigation using `AppScreen` enums, preventing circular loops and handling back button behavior.
- **`UIContext`**: Global alert modals, error overlays, share handlers (`shareQr`), and printing logic (`printPass`).
- **`ThemeContext`**: Dynamic Light/Dark mode switcher with `AsyncStorage` persistence.

### C. Repository Layer (`src/repository.ts`)
- **Granular Path Operations**: Executes targeted leaf node updates (e.g., `subscriptions/id/mealSlots/dayId/index/slot`) to reduce bandwidth and eliminate write collisions.
- **Data Normalization**: Cleans undefined fields and guarantees array matrix integrity (`Person x Day x Meal`).
- **Unique Passcode Generator**: Executes collision checks (`0000–9999`) across active subscriptions during pass creation and updates.
- **App Version Operations**: `getAppVersion()`, `updateAppVersion()`, and real-time subscriber `onAppVersionChange()` for RTDB top-level `"appVersion"` path.

---

## 4. Kitchen Dashboard & Metric Grid Hierarchy

To optimize kitchen planning and volunteer workflows, the `MealMetricGrid` on `DashboardScreen` follows a strict, organized section hierarchy:

```
┌────────────────────────────────────────────────────────┐
│ 1. TOP SUMMARY:    [ Total Planned ] [ Total Served ]  │
├────────────────────────────────────────────────────────┤
│ 2. ADULTS/MEMBERS: [ Veg Planned / Served ]            │
│                    [ Non-Veg Planned / Served ]        │
├────────────────────────────────────────────────────────┤
│ 3. KIDS:           [ Kids Veg Planned / Served ]       │
│                    [ Kids Non-Veg Planned / Served ]   │
├────────────────────────────────────────────────────────┤
│ 4. GUESTS:         [ Guests Veg Planned / Served ]     │
│                    [ Guests Non-Veg Planned / Served ] │
├────────────────────────────────────────────────────────┤
│ 5. PARCELS:        [ Parcels Planned / Served ]        │
└────────────────────────────────────────────────────────┘
```

- **Top Summary**: Immediate top-level overview of overall planned plates vs total meals served (`totalMealTaken`).
- **Adults / Members Section**: Dedicated Veg/Non-Veg planned and served counters for primary flat residents (Titled **ADULTS** when `kidsEnabled === true`, **MEMBERS** when `kidsEnabled === false`).
- **Kids Section**: Rendered conditionally ONLY when `kidsEnabled === true` and children exist (`kidsTotal > 0`).
- **Guests Section**: Rendered conditionally ONLY when `guestEnabled === true` and guest demand exists (`guestTotal > 0`). Placed directly before Takeaway Parcels for operational flow.
- **Takeaway Parcels Section**: Rendered conditionally ONLY when takeaway parcels are enabled (`isParcelEnabled === true`) and parcel demand exists (`parcel > 0`).

---

## 5. Pass Verification Architecture for Non-Technical Users

The system supports **3 flexible, redundant verification channels** at the food counter to ensure seamless service for all residents and guests:

1. **Option 1: QR Code Scan**: Camera scan of the digital pass image sent via WhatsApp.
2. **Option 2: 4-Digit Passcode**: Keypad entry of the unique 4-digit code printed on the pass.
3. **Option 3: Block & Flat Lookup**: Direct manual search by Block & Flat number when residents forget their phone.
4. **Quick Checkout Mode**: Instant meal collection processing via camera QR scan or keypad entry directly on `HomeScreen` or View Pass screen (`DetailsScreen`). Opens `QuickCheckoutModal` for dynamic headcount and parcel allocation.
5. **Guest Management**: Dedicated counter feature where guest meals are managed directly by volunteers without requiring passes.

---

## 6. App Version Check & Auto-Alert System

1. **Firebase Top-Level Node**: `"appVersion"` node stored at the root of Firebase Realtime Database with public read rules (`database.rules.json`).
2. **Local Version Single Source of Truth**: `UI_TEXT.appVersion` (`src/strings.ts`).
3. **Real-time Synchronization**: `DatabaseContext` subscribes to `"appVersion"` updates using `onAppVersionChange()`.
4. **Session-Bound Single Alert**: Upon landing on `HomeScreen` after login:
   - If `remoteAppVersion && remoteAppVersion !== UI_TEXT.appVersion` and `versionAlertShown` is `false` in `AuthContext`:
   - System displays modal alert: *"App has been updated, please download and install the latest app"* and marks `versionAlertShown = true`.
   - The alert displays **only once per login session** and will not repeat when navigating back and forth from other screens.


---

## 7. Theme Engine & Image Export Architecture

### A. Dual-Axis Responsive Engine (`styles.ts`)
- **`s(size)`**: Scales horizontal spacing, typography, and iconography based on viewport width.
- **`v(size)`**: Vertically compacts dense dashboard layouts on web browsers to fit within screen height.

### B. Theme-Aware Snapshot Engine (`captureRef`)
When generating PNG image exports of reports in `ReportScreen.tsx` using `react-native-view-shot`:
- **Transparent Canvas Fix**: Previous transparent container backgrounds caused image viewers (like WhatsApp) to render dark/black backgrounds.
- **Solid Theme Background**: `reportRef` applies `backgroundColor: theme.colors.background` along with rounded padding (`s(12)`, `s(16)`).
  - In **Light Mode** (`AppThemeMode.LIGHT`), the canvas background evaluates to solid white (`#FFFFFF`).
  - In **Dark Mode** (`AppThemeMode.DARK`), the canvas background evaluates to solid dark (`#121212`).
  - Result: Shared report images accurately match the active app theme with zero image corruption.

### C. Excel / CSV Data Export Pipeline
1. **Subscription Export (`SubscriptionListScreen.tsx`)**:
   - Condition: Renders Export button when `visibleSubscriptions.length >= 1`.
   - Filter & Sorting: Filters output by active search text & filter pills, then sorts by `block` and `flat` in natural alphanumeric order.
   - Comprehensive Columns: Outputs un-abbreviated headers for Block No., Flat No., Pass Code, Mobile Number, Adults Count, Kids Count, Total Members, Total Amount (Rs.), Payment Mode, Transaction ID (comma-separated with payment channel details for multiple payments, e.g. `UPI: 12345, Bank Transfer: 67890`), Payment Details, per-member day/meal choices, per-member food taken status, and daily dietary totals.
   - Grand Total Row: Appends a `GRAND TOTAL` row at the end summing Adults Count, Kids Count, Total Members, Total Amount (Rs.), and daily Veg, Non-Veg, and Parcel totals across all exported passes.
2. **Guest Management Export (`GuestManagementScreen.tsx`)**:
   - Condition: Renders Export button when active days exist (`activeDays.length >= 1`).
   - Granular Breakdown: Outputs Day Name, Meal Type, Veg Planned, Veg Served, Veg Pending, Non-Veg Planned, Non-Veg Served, Non-Veg Pending, Total Guest Planned, Total Guest Served, Total Guest Pending.
   - Grand Total: Appends a season-wide `GRAND TOTAL` calculation row at the end of the dataset.
3. **Encoding & Transport**:
   - Prepends UTF-8 Byte Order Mark (`\uFEFF`) to prevent character encoding issues in spreadsheet software (Microsoft Excel, Google Sheets).
   - Uses Blob & URL link downloads on Web, and native `Share.share` dialogs on mobile targets.
   - Audits all export operations into Firebase RTDB activity logs.

---

## 8. Safety Rails & Data Integrity

1. **Headcount Baseline Protection**: Prevents reducing registered Adults/Kids headcount below initial registration values if any member has taken a meal.
2. **Add Pass Restriction**: Prevents selecting meal plans or parcels for past/completed service windows during new registration.
3. **Inconsistency Alerts**: Detects and logs instances where a parcel was opted for but only the primary dine-in meal was collected.
4. **Chronological Meal Lock**: Enforces strict meal lifecycle rules (a meal slot can only be marked "Done" if all preceding meals are completed).

---

© 2026 Eternia Festival Committee — Architecture Documentation
