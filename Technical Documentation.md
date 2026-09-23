# Technical Documentation - Eternia Food Desk

A comprehensive technical breakdown of the implementation, data flow, and architectural patterns within the Eternia Food Desk application.

---

## 1. Core Architecture
The application follows a **Serverless Modular Architecture** built on the **Expo React Native** framework, utilizing **Firebase Realtime Database** for synchronized persistence.

### High-Level Flow
1. **Bootstrapping**: `App.tsx` initializes the `ThemeProvider` (loading local preferences), global state, navigation history stack, and checks for session validity.
2. **Authentication**: `LoginScreen` (with theme toggle) verifies credentials against the `auth_config` DB node. It uses a **Two-Phase Transition Logic**: `verifying` (during credential fetch) and `loading` (after match, during data hydration).
3. **Hydration & Version Sync**: Upon login, `DatabaseContext` hydrates subscriptions, menu, config, and fetches the top-level `"appVersion"` from Firebase RTDB.
4. **Auto-Update Alert**: On `HomeScreen`, if `remoteAppVersion !== UI_TEXT.appVersion`, an instant modal alert is displayed: *"App has been updated, please download and install the latest app"*.
5. **Backdrop Layering**: The `AppNavigator` serves as a master layout shell, injecting **9 dynamic mesh gradient blobs** behind the `screenComponent`. These circles utilize high-contrast festive tones (Crimson, Marigold, Royal Blue, Violet) that adapt to theme modes.
6. **Navigation**: Custom history stack management allows predictable back navigation, including Android hardware button support. History is automatically purged upon returning to the root Home screen.
7. **Presentation**: UI elements are rendered dynamically using the `useStyles` hook, which reacts to theme changes and global `AppConfig`. All primary panels use **Shadow-Free Glassmorphism** to allow background mesh glows to bleed through seamlessly.

---

## 2. Key Technical Implementations

### A. App Version Synchronization & Auto-Alert
- **Top-Level DB Node**: Firebase RTDB maintains a top-level `"appVersion"` string node.
- **Database Rules**: `database.rules.json` configures `".read": true` and `".write": "auth != null"` for `"appVersion"`.
- **Single Source of Truth**: Local version string is stored in `UI_TEXT.appVersion` (`src/strings.ts`).
- **Real-Time Subscription**: `repository.onAppVersionChange()` establishes an `onValue` listener on the `"appVersion"` path.
- **Auto-Initialization**: If `"appVersion"` does not exist in RTDB, `DatabaseContext` auto-initializes it with `UI_TEXT.appVersion`.
- **Instant Alert Execution**: On `HomeScreen.tsx`, a `useEffect` compares `remoteAppVersion` against `UI_TEXT.appVersion`. If they differ, `showAlert()` triggers a modal dialog with `UI_TEXT.appUpdateTitle` ("Update Available") and `UI_TEXT.appUpdatedMessage` ("App has been updated, please download and install the latest app").

### B. Kitchen Dashboard & Meal Metric Grid Hierarchy
The `MealMetricGrid` component on `DashboardScreen` displays meal demand and serving metrics using a strict 5-tier section layout with symmetric `Planned` vs `Taken/Served` labels:
1. **Top Summary**: `Total Planned` vs `Total Served`
2. **Adults / Members**: Titled **ADULTS** (`kidsEnabled === true`) or **MEMBERS** (`kidsEnabled === false`). Displays `Veg Planned` / `Veg Served` and `Non-Veg Planned` / `Non-Veg Served`.
3. **Kids**: Titled **KIDS** (rendered conditionally when `kidsEnabled === true` and `kidsTotal > 0`). Displays `Kids Veg Planned` / `Kids Veg Served` and `Kids Non-Veg Planned` / `Kids Non-Veg Served`.
4. **Guests**: Titled **GUESTS** (rendered conditionally when `guestEnabled === true` and `guestTotal > 0`). Displays `Guests Veg Planned` / `Guests Veg Served` and `Guests Non-Veg Planned` / `Guests Non-Veg Served`. Placed directly before Parcels.
5. **Takeaway Parcels**: Titled **PARCELS** (rendered conditionally when `isParcelEnabled === true` and parcel demand exists). Displays `Parcels Planned` / `Parcels Served`.

### C. Guest Management Layout & Grouping
The `GuestManagementScreen` groups meal counters into distinct dietary cards similar to the Dashboard:
- **Dual-Diet Mode (Veg & Non-Veg)**: Structured into **Veg Group** (`Veg Planned` & `Veg Served` counters) first, followed by **Non-Veg Group** (`Non-Veg Planned` & `Non-Veg Served` counters) and a **Total Planned & Total Served** summary row.
- **Single-Diet Mode (Veg Only / Non-Veg Only)**: Displays **Total Planned** and **Total Served** counters.
- **Symmetric & Implicit Terminology**: Uses symmetric `Planned` and `Served` naming pairs across all blocks. The word "Guest" is omitted from inner counter labels as the guest context is already implied by the module.

### D. Theme-Aware PNG Image Export Architecture
When exporting reports in `ReportScreen.tsx` using `captureRef`:
- Container `reportRef` applies `backgroundColor: theme.colors.background` (`#FFFFFF` in Light Mode, `#121212` in Dark Mode) and padding `s(12)`.
- Eliminates transparent background artifacts in generated PNG files when shared on WhatsApp or viewed in photo galleries.

### E. Excel Export Engine for Subscription Pass Directory (`SubscriptionListScreen.tsx`)
- **Trigger Condition**: Renders the Export button dynamically when `visibleSubscriptions.length >= 1`.
- **Filtering & Natural Alphanumeric Sorting**: Uses current `visibleSubscriptions` (respecting active search query and filter mode pills like `Current Meal`, `Kids`, `Parcels`, `Veg Only`). Automatically sorts records by `block` and `flat` using `localeCompare` with `{ numeric: true, sensitivity: 'base' }`.
- **Detailed Attribute Schema**: Exports un-abbreviated headers: Block No., Flat No., Pass Code, Mobile Number, Adults Count, Kids Count, Total Members, Total Amount (Rs.), Payment Mode, Transaction ID (with channel details & comma separation for multiple transactions, e.g. `UPI: 12345, Bank Transfer: 67890`), Payment Details, Day/Meal Choices per member (`Adult 1: Veg (Parcel)`), Day/Meal Taken Status per member (`Adult 1: Food Taken, Parcel Taken`), and daily Veg/Non-Veg/Parcel totals.
- **Grand Total Row Calculation**: Appends a `GRAND TOTAL` row at the bottom of the table summing up Adults Count, Kids Count, Total Members, Total Amount (Rs.), and day-wise Veg, Non-Veg, and Parcel counts across all exported passes.
- **UTF-8 BOM CSV & Delivery**: Prepends `\uFEFF` to the generated CSV string so Microsoft Excel and Google Sheets render UTF-8 characters cleanly. Triggers Blob web download on browsers or `Share.share` native dialogs on mobile. Logs activity under `SUBSCRIPTION` module.

### F. Excel Export Engine for Guest Management (`GuestManagementScreen.tsx`)
- **Trigger Condition**: Displays an Export button in the header bar when `activeDays.length >= 1`.
- **Granular Metric Hierarchy**: Maps all active festival days and enabled meals into structured rows: Day Name, Meal Type, Veg Planned, Veg Served, Veg Pending, Non-Veg Planned, Non-Veg Served, Non-Veg Pending, Total Guest Planned, Total Guest Served, Total Guest Pending.
- **Grand Total Calculation**: Appends a final `GRAND TOTAL` row aggregating total guest planned plates, served plates, and pending balance across the entire festival season.
- **UTF-8 BOM CSV & Delivery**: Uses `\uFEFF` UTF-8 BOM CSV string formatting. Leverages web Blob download or mobile `Share.share` with activity logging under `GUEST` module.

### G. Dynamic Configuration Engine
The entire application is strictly **Config-Driven**. The `AppConfig` object controls:
- **Branding**: `seasonName` updates all shared Digital Pass headers and Report captions.
- **Financial Visibility**: The `payment` node toggles the display of all "Amount" and "Payment Mode" fields across the app.
- **Automated Food Pricing**: When `foodPriceEnabled` is active, the app looks up configured `vegPrice`, `nonVegPrice`, and optional **Parcel Prices** for each selected meal.
- **Kids Support**: `kidsEnabled` toggles separate tracking for children. When active:
  - Registration UI splits headcount into **Adults** and **Kids**.
  - Dashboard and Reports show segregated metrics (Adult vs Kids).
  - Terminology across the app switches from generic "Person/Persons" to specific "Adults" and "Kids".
- **Multi-Payment Support**: Subscriptions support up to 3 separate payment entries per flat (UPI, Cash, Bank Transfer) with transaction IDs or receiver notes.
- **Functional Rules**: `days[]` controls enabled meals, dietary options, parcel support per slot, the **Done** lifecycle status, individual meal prices, and the **Current** active meal prioritization.

### E. Centralized UI String & Type Management
- **Zero-Hardcoding Policy**: Every single string displayed in the UI is retrieved from `src/strings.ts`. This includes labels, button text, error messages, and `UI_TEXT.appVersion`.
- **Enums**: Utilizes TypeScript `enum` for `MealType`, `DietType`, `DietaryOption`, `AppScreen`, `ReportType`, `PaymentMode`, `FilterMode`, and `AppThemeMode`.

### F. Real-Time Synchronization Strategy
- **Granular Deep-Path Updates**: Uses targeted Firebase path references (e.g., `menu/dayId/mealKey/field`) for operational updates.
- **Periodic Background Refresh**: Runs every 10 seconds to sync food collection counts and guest demand across devices.

---

## 3. Security & Session Management

### Role-Based Access Control (RBAC)
- **Database Node**: `auth_config` stores staff credentials and roles.
- **Admin**: Full write/delete access, config editing, and WhatsApp pass distribution.
- **Vendor**: Operational access. Limited to marking food/parcels as "Taken" and viewing reports.

### Session Lifecycle
- **Ephemeral Persistence**: Login state is stored in React state only. Users are prompted for credentials every time the app is launched.
- **Auto-Logout**: Sessions automatically expire after 24 hours of inactivity.

---

## 4. Build & Environment Setup

```bash
# 1. Install dependencies
npm install

# 2. Configure .env credentials
EXPO_PUBLIC_FIREBASE_API_KEY="your-api-key"
EXPO_PUBLIC_FIREBASE_DATABASE_URL="https://your-project.firebaseio.com"

# 3. Start Expo development server
npx expo start
```

---

© 2026 Eternia Festival Committee — Technical Documentation
