# Eternia Food Desk — System Architecture & Technical Documentation

A high-performance Expo React Native & Web application designed for event administrators and volunteers to manage feast subscriptions, daily menus, meal distribution, and real-time kitchen analytics during large scale community festivals like **Durga Puja**.

---

## 📐 System Architecture & Overview

The application follows a decoupled, context-driven component architecture with a centralized **Firebase Repository Layer**. It supports multi-platform execution across **Mobile (Android/iOS)** and **Desktop/Web Browsers**.

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

## 🛠️ Tech Stack & Key Libraries

| Technology / Library | Purpose & Usage |
| :--- | :--- |
| **React Native / Expo (v51+)** | Core cross-platform app framework targeting Android, iOS, and Web. |
| **TypeScript (v5.3+)** | Strict type safety for domain models, context providers, and props. |
| **Firebase Realtime Database** | Real-time data sync, subscription persistence, menu management, version checks, and activity logs. |
| **`expo-camera`** | High-performance camera integration for QR Code pass scanning at food stalls. |
| **`react-native-qrcode-svg`** | SVG-based QR code pass matrix generation. |
| **`react-native-view-shot` (`captureRef`)** | Snapshot engine for capturing report cards and digital passes as PNG images for sharing. |
| **`expo-sharing` & `expo-print`** | Platform-native sharing dialogs (WhatsApp / System) and HTML document printing. |
| **`@react-native-async-storage/async-storage`** | Local device persistence for theme preferences (`AppThemeMode`). |
| **`@expo/vector-icons` (Ionicons)** | Vector icons tuned for high-contrast theme states across screens. |

---

## 📁 Directory Structure

```
src/
├── components/          # Modular UI Components
│   ├── common/          # Action Label, Back Button, Home Button, Counter, Alert Modal, Dropdowns
│   ├── dashboard/       # Meal Bar Chart, Meal Metric Grid
│   ├── menu/            # Meal Display, Meal Menu Editor, Summary Bar
│   └── report/          # DayWise, MealWise, SingleMeal, Guest, Parcel, Pending, FlatWise, Payment, Kids
├── context/             # Global React Context State
│   ├── AuthContext.tsx       # Session, Login/Logout, Role Governance (Admin/Vendor)
│   ├── DatabaseContext.tsx   # Realtime DB listeners, Subscriptions, Menus, App Version, Config, Activity Logs
│   ├── NavigationContext.tsx # History-stack-enabled screen navigation
│   └── UIContext.tsx         # Global Alert dialogs, Error modals, Share & Print handlers
├── hooks/               # Custom Utility Hooks
│   └── useReportData.ts # Data aggregation pipeline for analytics and reports
├── navigation/          # App Navigator Router & Screen Switcher
├── theme/               # Modern Glassmorphic Design Token Engine
│   ├── primary.ts       # Light Mode Color Tokens & Palette
│   ├── dark.ts          # Dark Mode Color Tokens & Palette
│   ├── types.ts         # Theme Property Contracts
│   └── index.tsx        # Dynamic Theme Context Provider
├── domain.ts            # Domain Data Models & Type Contracts
├── repository.ts        # Firebase RTDB API Operations & Cleaning Pipelines
├── config.ts            # Default App Configuration & Festival Defaults
├── firebase.ts          # Firebase SDK Initialization
├── strings.ts           # Centralized Dictionary for Localized UI Text & `appVersion`
├── styles.ts            # Global Responsive Scaling Engine (`s()` / `v()`) & Glassmorphism Styles
└── screens/             # Top-Level Screen Views
    ├── ActivityLogScreen.tsx     # Real-time System Audit Trail Log
    ├── ContactsScreen.tsx        # Resident Directory with Direct WhatsApp/Call/SMS Actions
    ├── DashboardScreen.tsx       # Live Kitchen Counter Dashboard (Plates, Parcels, Guests)
    ├── GuestManagementScreen.tsx # Counter Guest Demand Manager
    ├── HomeScreen.tsx            # Main Operational Summary, Version Check Alert & Quick Action Grid
    ├── LoginScreen.tsx           # Two-Phase Secured Database Login
    ├── MenuEditorScreen.tsx      # Daily Meal Menu & Pricing Editor
    ├── NotesScreen.tsx           # Collaborative Team Notes with Role Permissions
    ├── QrScreen.tsx              # Digital Pass Generator with 4-Digit Passcode & WhatsApp Share
    ├── ReportScreen.tsx          # Analytics Suite with Theme-Aware PNG Image Export
    ├── ScannerScreen.tsx         # QR Camera Scanner & 4-Digit Keypad Scanner
    ├── SettingsScreen.tsx        # Festival Configuration, Meal Lifecycle & Safety Governance
    ├── SubscriptionForm.tsx      # Pass Registration & Editing with Headcount Protection
    ├── SubscriptionListScreen.tsx# Pass Directory with Alphanumeric Sorting & Multi-Tag Filters
    └── ViewMenuScreen.tsx        # Daily Food Menu Viewer
```

---

## 🔐 Security, Roles & Version Synchronization

1. **Database-Driven Authentication (`auth_config`)**:
   User credentials and role definitions (`Admin` vs `Vendor`) are fetched directly from Firebase RTDB. This allows instant credential or access adjustments without app redeployments.
2. **Top-Level `appVersion` Auto-Check & Alert**:
   - The app maintains a top-level `"appVersion"` node in Firebase RTDB (`database.rules.json` configured for public read).
   - Local build version is specified in `UI_TEXT.appVersion` (`src/strings.ts`).
   - Upon landing on `HomeScreen` after login, the app verifies `remoteAppVersion` against `UI_TEXT.appVersion`.
   - If `remoteAppVersion !== UI_TEXT.appVersion`, an instant modal alert is surfaced: *"App has been updated, please download and install the latest app"*.
3. **Session Security & Auto-Expiration**:
   - Persistent login state across app re-launches is disabled for security.
   - Active sessions auto-expire if left idle or backgrounded for more than 24 hours.
4. **Role-Based Permissions**:
   - **Admin**: Full authority to create/edit subscriptions, update festival settings, modify menus, delete records, manage notes, access contacts, and export passes via WhatsApp.
   - **Vendor**: Operational access to scan passes and mark meals/parcels as taken. Blocked from modifying registrations, financial records, or system settings.

---

## 🎟️ Pass Management & Verification Architecture

To accommodate all residents and guests—especially non-technical users, elderly members, or those without smartphones—the system offers **3 flexible, redundant meal collection options** at the food stall:

```
                          ┌──────────────────────────┐
                          │  Resident at Food Stall  │
                          └────────────┬─────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
┌───────▼──────────────┐   ┌───────────▼──────────────┐   ┌───────────▼──────────────┐
│  Option 1: QR Scan   │   │  Option 2: 4-Digit Code  │   │ Option 3: Flat Lookup    │
│  Camera scan on pass │   │ Keypad entry of 4-digit  │   │ Direct Block & Flat search│
│    image in 1 sec.   │   │  code printed on pass.   │   │ when phone is forgotten. │
└──────────────────────┘   └──────────────────────────┘   └──────────────────────────┘
```

1. **Unique 4-Digit Passcode Engine**:
   Every registered pass automatically generates a guaranteed unique **4-digit numeric Passcode** (`0000–9999`) with collision-detection logic against active subscriptions.
2. **Bi-Directional Pass Safety Rules**:
   - **Headcount Protection**: Prevents decreasing registered headcount below initial values if any member has already taken a meal.
   - **Add Pass Guardrail**: Blocks selecting meal plans or parcels for past/completed service windows during new registration.
   - **Inconsistency Alerts**: Audits and warns volunteers if a parcel was selected but only the primary dine-in meal was marked as taken.
3. **Dedicated Guest Management**:
   Flat passes cover resident families. Guest meals are handled independently via a dedicated **Guest Management** module managed directly at the counter by volunteers (guests do not require passes).

---

## 🍳 Kitchen Dashboard & Meal Metric Grid Hierarchy

The `DashboardScreen` and `MealMetricGrid` components present kitchen demand metrics using a strict, structured section hierarchy designed for rapid volunteer scanning:

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

- **Top Summary**: Displays total planned demand alongside total meals served so far (`totalMealTaken`).
- **Adults / Members Section**: Dedicated Veg/Non-Veg planned and served counters for primary flat residents (Titled **ADULTS** when `kidsEnabled === true`, **MEMBERS** when `kidsEnabled === false`).
- **Kids Section**: Rendered conditionally ONLY when `kidsEnabled === true` and children exist (`kidsTotal > 0`).
- **Guests Section**: Rendered conditionally ONLY when `guestEnabled === true` and guest demand exists (`guestTotal > 0`). Placed directly before Takeaway Parcels for operational flow.
- **Parcels Section**: Rendered conditionally ONLY when takeaway parcels are enabled (`isParcelEnabled === true`) and parcel demand exists (`parcel > 0`).

---

## 🎨 UI Architecture, Glassmorphic Styling & Export Engine

### 1. Dual-Axis Responsive Viewport Engine (`styles.ts`)
- **`s(size)`**: Scales horizontal spacing, padding, and typography based on device width or desktop breakpoint factor.
- **`v(size)`**: Vertically compacts dense operational data to fit kitchen dashboards within browser viewports without scrolling.
- **Adaptive Column**: Web viewports expand to full browser width with centered 600px max-width content bounds for native-like readability.

### 2. Glassmorphic Mesh Background System
- Renders **9 floating background mesh blobs** using theme-aware translucent colors (`cardColors`) that surround screen edges.
- Cards, headers, and report containers use frosted glass opacity to allow glowing mesh colors to bleed through elegantly in both Light and Dark themes.

### 3. Theme-Aware Report & Image Export Architecture (`captureRef`)
When generating PNG image exports of report views in `ReportScreen.tsx` using `react-native-view-shot`:
- **Problem**: Capturing views with `backgroundColor: "transparent"` renders a transparent canvas. When converted to PNG and opened in WhatsApp or gallery apps, transparent regions render as **black/dark mode**, corrupting Light mode exports.
- **Solution**: The report container (`reportRef`) dynamically applies `backgroundColor: theme.colors.background` along with rounded padding (`s(12)`, `s(16)`).
  - In **Light Mode** (`AppThemeMode.LIGHT`), `theme.colors.background` evaluates to solid `#FFFFFF` (white).
  - In **Dark Mode** (`AppThemeMode.DARK`), `theme.colors.background` evaluates to solid `#121212` (dark).
  - Result: Shared images perfectly match the active app theme with zero background corruption.

---

## 📊 Analytics & Reporting Suite

The `ReportScreen` and `useReportData` pipeline provide 10 specialized operational reports:

1. **Day-Wise Report**: Aggregate plate demand, taken count, and dietary split per day.
2. **Meal-Wise Report**: Meal-by-meal breakdown (Breakfast, Lunch, Dinner) across all active days.
3. **Single Meal Split**: High-density view of a specific selected day and meal.
4. **Guest Report**: Separate breakdown of guest demands and served meals.
5. **Parcel Report**: Detailed parcel collection tracking vs dine-in.
6. **Missed Parcel Report**: Highlights flats that claimed dine-in meals but missed collecting their registered takeaway parcels.
7. **Kids Meal Report**: Dedicated report tracking kids' meal demands and consumption.
8. **Pending (Not Taken) Report**: Identifies flats that have not yet collected their current meal.
9. **Flat-Wise Report**: Comprehensive matrix of flat-by-flat attendance and preferences across all days.
10. **Payment Summary Report**: Financial audit report categorizing collections by UPI, Cash, and Bank Transfer.

---

## 🚀 Build, Setup & Local Execution

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **Expo CLI**: `npx expo`
- **Firebase Project**: Realtime Database initialized with `.env` credentials.

### Installation & Execution

```bash
# 1. Clone repository & install dependencies
npm install

# 2. Configure Environment Variables (.env)
EXPO_PUBLIC_FIREBASE_API_KEY="your-api-key"
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project.firebaseapp.com"
EXPO_PUBLIC_FIREBASE_DATABASE_URL="https://your-project.firebaseio.com"
EXPO_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"

# 3. Start Expo Development Server
npx expo start

# 4. Run on specific platform targets
npx expo start --web       # Web browser
npx expo run:android       # Native Android build
npx expo run:ios           # Native iOS build
```

---

© 2026 Eternia Festival Committee — Food Desk Architecture Document
