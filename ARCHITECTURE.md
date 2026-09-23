# Eternia Food Desk — Architecture Documentation

This document describes the high-level system architecture, data models, design patterns, and security workflows used in the **Eternia Food Desk** application.

---

## 1. System Overview
Eternia Food Desk is a cross-platform mobile and web application built with **React Native (Expo v57+)** designed to manage high-volume food distribution during community festivals. It uses a **Serverless Layered Architecture** with **Firebase Realtime Database** for real-time synchronization, state persistence, and dynamic configuration.

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
- **Framework**: React Native with Expo (v57+)
- **Language**: TypeScript (v5.3+, strict mode) with Domain Enums (`MealType`, `DietType`, `DietaryOption`, `AppScreen`, `ReportType`, `PaymentMode`, `AppThemeMode`).
- **Backend & Database**: Firebase Realtime Database
- **Authentication**: Hybrid model using Database-driven Role Authentication (`auth_config` node) with ephemeral 24-hour sessions.
- **Version Control & Auto-Alert**: Top-level `"appVersion"` node in RTDB vs local `UI_TEXT.appVersion` (`src/strings.ts`).
- **Local Persistence**: `AsyncStorage` for local device preferences (Theme mode).
- **Scanning & Pass Generation**: `expo-camera` for QR code scanning and `react-native-qrcode-svg` for matrix generation.
- **OCR Payment Processing**: Open-source client-side `tesseract.js` and `expo-image-picker` for extracting 12-digit UPI UTR / Bank transaction IDs from payment screenshots and camera receipts.
- **Snapshot & Sharing**: `react-native-view-shot` (`captureRef`) for image exports and `expo-sharing` / `expo-print` for WhatsApp and native dialogs.

---

## 3. Core Architecture & Layers

The project follows a **Modular Layered Architecture**:

```
src/
├── components/          # Modular UI Components (QuickCheckoutModal, QuickGuestModal)
├── context/             # React Context Providers (Auth, Database, Navigation, UI)
├── hooks/               # Custom Hooks (useReportData)
├── navigation/          # Navigation Router & Screen Switcher
├── theme/               # Light/Dark Design Tokens & Provider
├── utils/               # Utility Helpers (ocrScanner.ts)
├── domain.ts            # Domain Data Contracts
├── repository.ts        # Firebase Repository Operations
├── config.ts            # Global App Defaults & Constants
├── firebase.ts          # Firebase Initialization
├── strings.ts           # Centralized Dictionary for Localized UI Text & `appVersion`
├── styles.ts            # Global Scaling Engine (`s()` / `v()`) & Glassmorphic Styles
└── screens/             # Top-Level Screen Views
```

### A. Presentation Layer (`src/screens`, `src/components`)
- **`HomeScreen`**: Dashboard summary, real-time operational badges, service shortcuts, auto version-check alert, and Quick Checkout & Quick Guest modal launchers.
- **`SubscriptionListScreen`**: Pass directory with natural alphanumeric sorting, search, multi-select filter bar (`All`, `Current Meal`, `Current Meal Missed`, `Kids`, `Parcels`, `Veg Only`), and filtered detailed Excel CSV export sorted by Block and Flat.
- **`SubscriptionForm`**: Registration & edit view with headcount baseline protection, automated pricing, identity locking, and Open-Source OCR Payment Transaction Scanner.
- **`ScannerScreen`**: Dual-mode verification interface featuring live QR camera scanning, 4-digit numeric passcode keypad, and Quick Checkout mode with same-page persistence.
- **`QrScreen`**: Digital pass renderer displaying seasonal branding, QR matrix, and bold 4-digit passcode identity fallback.
- **`DetailsScreen`**: Detailed flat pass summary with food collection matrix, quick contact actions (WhatsApp/Call/SMS), deletion safeguards, and Quick Checkout shortcut.
- **`DashboardScreen`**: Kitchen counter dashboard with live meal metrics, meal bar charts, and organized metric grid views.
- **`ReportScreen`**: Analytics suite providing 10 specialized reports (`DayWise`, `MealWise`, `SingleMeal`, `Guest`, `Parcel`, `MissedParcel`, `Kids`, `Pending`, `FlatWise`, `PaymentSummary`) with theme-aware PNG image export.
- **`GuestManagementScreen`**: Dedicated counter interface for managing guest meal demands with Quick Guest Modal overlay and detailed guest Excel CSV export.
- **`ContactsScreen`**: Admin-exclusive resident directory with direct WhatsApp/Call/SMS shortcuts.
- **`NotesScreen`**: Collaborative team notes module with role permissions.
- **`ActivityLogScreen`**: Forensic system audit log viewer tracking both `userName` (preserved casing) and `userRole`.
- **`SettingsScreen`**: Administrative control center for festival rules, meal lifecycles, and configuration safety guards.

### B. State & Context Layer (`src/context/`)
- **`AuthContext`**: Manages login state, roles (`Admin` / `Vendor`), and session expiration (24-hour auto-logout).
- **`DatabaseContext`**: Realtime RTDB listeners, data hydration, `remoteAppVersion` sync, activity logging, `updateGuestCountDebounced` pipeline, and subscription state updates.
- **`NavigationContext`**: Custom history-stack navigation using `AppScreen` enums, managing `isQuickCheckout` and `isQuickGuestMode` states while preventing circular loops and handling back button behavior.
- **`UIContext`**: Global alert modals, error overlays, share handlers (`shareQr`), and printing logic (`printPass`).
- **`ThemeContext`**: Dynamic Light/Dark mode switcher with `AsyncStorage` persistence.

### C. Repository Layer (`src/repository.ts`)
- **Granular Path Operations**: Executes targeted leaf node updates (e.g., `subscriptions/id/mealSlots/dayId/index/slot`) to reduce bandwidth and eliminate write collisions.
- **Data Normalization**: Cleans undefined fields and guarantees array matrix integrity (`Person x Day x Meal`).
- **Unique Passcode Generator**: Executes collision checks (`0000–9999`) across active subscriptions during pass creation and updates.
- **App Version Operations**: `getAppVersion()`, `updateAppVersion()`, and real-time subscriber `onAppVersionChange()` for RTDB top-level `"appVersion"` path.

---

## 4. Quick Checkout & Quick Guest Engines

### A. Quick Checkout Modal (`QuickCheckoutModal.tsx`)
- **Solid Primary Red Summary Header Card**: Styled in solid primary red theme (`backgroundColor: theme.colors.primary`) matching the Dashboard summary card.
- **Grammar & Dynamic Max Badges**: Proper singular/plural grammar formatting (`1 Adult` vs `X Adults`) and right-aligned `Max: X` indicators. Input fields with zero max count (`Max === 0`) are conditionally hidden.
- **Food-Bounded Parcel Limit**: Bounded by $\text{ParcelMax} = \min(\text{UnservedParcels}, \text{AdultInput} + \text{KidInput})$. Parcel input enables only when food meals are selected.
- **Sequential Member Allocation & Missed Parcel Audit**: Sequentially marks unserved members as taken in `takenByPerson[dayId]` and asynchronously logs `ActivityAction.MISSED_PARCEL` if member meals are served but parcels remain uncollected.
- **Same-Page Persistence**: On checkout submit success, displays alert `"Checkout Successful"` and remains on the active screen (`ScannerScreen` or `DetailsScreen`).

### B. Quick Guest Modal (`QuickGuestModal.tsx`)
- **Trigger & Navigation State (`isQuickGuestMode`)**: Tapping **Guest** on `HomeScreen` during a live meal (`currentMealInfo !== null`) sets `isQuickGuestMode = true` and launches `QuickGuestModal` over `GuestManagementScreen`.
- **Ultra-Compact 2-Column Grid Layout**: Combines title & summary into a 1-tile red header card and arranges Planned & Served counter inputs into a 2-column side-by-side grid (`flexDirection: "row"`), reducing modal height by ~200px (~40% shorter).
- **RBAC & Role Restrictions**: Non-admin users cannot edit planned inputs; admin users can edit both planned and served inputs.
- **Shared Debounced Pipeline**: Uses `updateGuestCountDebounced` in `DatabaseContext` (1000ms debounce timer) for 0ms optimistic UI updates, batched database writes, and single `ActivityModule.GUEST` log entries.
- **Same-Page Persistence on Close**: Closing the modal (`✕`) reveals the background `GuestManagementScreen` displaying updated counts in real-time.

---

## 5. Live Camera & Gallery OCR Payment Scanner Architecture (`PaymentScannerModal.tsx`, `ocrScanner.ts`)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. User taps Camera Icon in Transaction ID Field             │
├──────────────────────────────────────────────────────────────┤
│ 2. PaymentScannerModal opens Live Camera or Gallery Picker   │
├──────────────────────────────────────────────────────────────┤
│ 3. On-Device Vision Engine (ML Kit on Mobile / Tesseract Web)│
├──────────────────────────────────────────────────────────────┤
│ 4. Single-Pass joint extraction of Txn ID and Payment Amount  │
├──────────────────────────────────────────────────────────────┤
│ 5. Confirmation Dialog prompts user to Apply or Cancel       │
└──────────────────────────────────────────────────────────────┘
```

1. **Google ML Kit On-Device Vision**: On Android and iOS native mobile app bundles, uses Google's official on-device ML Kit Text Recognition (`@react-native-ml-kit/text-recognition`) for sub-100ms pixel-level OCR. Uses Tesseract.js Web Workers on Web browsers.
2. **Single-Pass Joint Recognition & Word Parsing**: Simultaneously extracts BOTH the UPI Transaction ID and Payment Amount ($\text{₹}$). Includes English word amount parsing (`Two Thousand Eight Hundred` $\rightarrow$ `2800`) and Rupee glyph disambiguation (`32800` $\rightarrow$ `2800`).
3. **User Confirmation Dialog (`UI_TEXT.confirmExtractedDetails`)**: Displays an interactive review dialog summarizing extracted details before populating form fields upon user acceptance.
4. **Universal App Recognition**: Engineered to process receipts across Google Pay, PhonePe, Paytm, Amazon Pay, Super.Money (`UPI reference ID`), BHIM UPI, PayZapp, CRED, Navi, and major Bank Apps.

---

## 6. Pass Verification & Security Architecture

1. **3 Verification Channels**: QR Code scan, 4-digit numeric passcode entry, or Block & Flat manual lookup.
2. **Database-Driven Roles & ephemerality**: Credentials and roles (`Admin` vs `Vendor`) are read from `auth_config`. Sessions expire after 24 hours.
3. **Bi-Directional Safety Guardrails**:
   - Headcount Protection: Prevents decreasing registered Adults/Kids count below initial values if any member has taken a meal.
   - Add Pass Restriction: Blocks selecting meal plans or parcels for past/completed service windows during new registration.

---

## 7. Theme Engine & Data Export Architecture

### A. Dual-Axis Responsive Engine (`styles.ts`)
- **`s(size)`**: Scales horizontal spacing, typography, and iconography based on viewport width.
- **`v(size)`**: Vertically compacts dense dashboard layouts on web browsers to fit within screen height.

### B. Theme-Aware Snapshot Engine (`captureRef`)
Report views apply `backgroundColor: theme.colors.background` along with rounded padding (`s(12)`, `s(16)`), ensuring that captured PNG images render with solid theme backgrounds in both Light Mode (`#FFFFFF`) and Dark Mode (`#121212`) without transparent canvas corruption.

### C. Excel / CSV Data Export Pipeline
- **Subscription List Export**: Filters output by active search text & filter pills, sorts by Block and Flat in natural alphanumeric order, includes comma-separated transaction details with payment modes, and appends a `GRAND TOTAL` row.
- **Guest Management Export**: Exports Day Name, Meal Type, Veg Planned, Veg Served, Veg Pending, Non-Veg Planned, Non-Veg Served, Non-Veg Pending, Total Guest Planned, Total Guest Served, Total Guest Pending, and appends a season-wide `GRAND TOTAL` summary row.
- **UTF-8 BOM Encoding**: Prepends `\uFEFF` to prevent character encoding issues in Microsoft Excel and Google Sheets.

---

© 2026 Eternia Festival Committee — Architecture Documentation
