# Eternia Food Desk — System Architecture & Technical Documentation

A high-performance Expo React Native & Web application designed for event administrators and volunteers to manage feast subscriptions, daily menus, meal distribution, quick meal checkouts, guest plate management, and real-time kitchen analytics during large scale community festivals like **Durga Puja**.

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
| **React Native / Expo (v57+)** | Core cross-platform app framework targeting Android, iOS, and Web. |
| **TypeScript (v5.3+)** | Strict type safety for domain models, context providers, and props. |
| **Firebase Realtime Database** | Real-time data sync, subscription persistence, menu management, version checks, and activity logs. |
| **`expo-camera`** | High-performance camera integration for QR Code pass scanning at food stalls. |
| **`expo-image-picker`** | Camera capture and gallery screenshot selection for payment receipt scanning. |
| **`tesseract.js`** | Open-source client-side OCR engine for extracting 12-digit UPI UTR / Bank transaction IDs from payment screenshots. |
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
│   ├── common/          # Action Label, Back Button, Home Button, CounterInput, Dropdowns, QuickCheckoutModal, QuickGuestModal
│   ├── dashboard/       # Meal Bar Chart, Meal Metric Grid
│   ├── menu/            # Meal Display, Meal Menu Editor, Summary Bar
│   └── report/          # DayWise, MealWise, SingleMeal, Guest, Parcel, Pending, FlatWise, Payment, Kids
├── context/             # Global React Context State
│   ├── AuthContext.tsx       # Session, Login/Logout, Role Governance (Admin/Vendor)
│   ├── DatabaseContext.tsx   # Realtime DB listeners, Subscriptions, Menus, App Version, Config, Activity Logs
│   ├── NavigationContext.tsx # History-stack-enabled screen navigation (isQuickCheckout, isQuickGuestMode)
│   └── UIContext.tsx         # Global Alert dialogs, Error modals, Share & Print handlers
├── hooks/               # Custom Utility Hooks
│   └── useReportData.ts # Data aggregation pipeline for analytics and reports
├── navigation/          # App Navigator Router & Screen Switcher
├── theme/               # Modern Glassmorphic Design Token Engine
│   ├── primary.ts       # Light Mode Color Tokens & Palette
│   ├── dark.ts          # Dark Mode Color Tokens & Palette
│   ├── types.ts         # Theme Property Contracts
│   └── index.tsx        # Dynamic Theme Context Provider
├── utils/               # Helper Utility Modules
│   └── ocrScanner.ts    # Open-Source Tesseract OCR & UPI / Bank Transaction ID Extractor
├── domain.ts            # Domain Data Models & Type Contracts
├── repository.ts        # Firebase RTDB API Operations & Cleaning Pipelines
├── config.ts            # Default App Configuration & Festival Defaults
├── firebase.ts          # Firebase SDK Initialization
├── strings.ts           # Centralized Dictionary for Localized UI Text & `appVersion`
├── styles.ts            # Global Responsive Scaling Engine (`s()` / `v()`) & Glassmorphism Styles
└── screens/             # Top-Level Screen Views
    ├── ActivityLogScreen.tsx     # Real-time System Audit Trail Log (Username + Role tracking/filtering)
    ├── ContactsScreen.tsx        # Resident Directory with Direct WhatsApp/Call/SMS Actions
    ├── DashboardScreen.tsx       # Live Kitchen Counter Dashboard (Plates, Parcels, Guests)
    ├── GuestManagementScreen.tsx # Counter Guest Demand Manager with Quick Guest Modal & Excel Export
    ├── HomeScreen.tsx            # Main Operational Summary, Quick Checkout & Quick Guest Launchers
    ├── LoginScreen.tsx           # Two-Phase Secured Database Login
    ├── MenuEditorScreen.tsx      # Daily Meal Menu & Pricing Editor
    ├── NotesScreen.tsx           # Collaborative Team Notes with Role Permissions
    ├── QrScreen.tsx              # Digital Pass Generator with 4-Digit Passcode & WhatsApp Share
    ├── ReportScreen.tsx          # Analytics Suite with Theme-Aware PNG Image Export
    ├── ScannerScreen.tsx         # QR Camera Scanner & 4-Digit Keypad Scanner (Same-page persistence)
    ├── SettingsScreen.tsx        # Festival Configuration, Meal Lifecycle & Safety Governance
    ├── SubscriptionForm.tsx      # Pass Registration & Editing with Open-Source OCR Payment Scanner
    ├── SubscriptionListScreen.tsx# Pass Directory with Alphanumeric Sorting, Multi-Tag Filters & Excel Export
    └── ViewMenuScreen.tsx        # Daily Food Menu Viewer
```

---

## ⚡ Key Features & Operational Modules

### 1. Quick Checkout Engine (`QuickCheckoutModal.tsx`)
- **1-Tap Launch**: Launches directly from `HomeScreen` (adjacent to "Scan/Pass Code") or View Pass screen (`DetailsScreen`) whenever a meal is live/current (`isMealCurrent`).
- **Solid Primary Red Header Card**: Styled in solid primary red theme (`backgroundColor: theme.colors.primary`) matching the Dashboard summary card.
- **Pluralization Grammar**: Handles singular/plural terms (`1 Adult` vs `2 Adults`, `1 Kid` vs `2 Kids`, `1 General Member` vs `3 General Members`).
- **Dynamic Max Badges & Zero-Max Hiding**: Displays right-aligned `Max: X` indicators. Input fields with zero eligible max limit (`Max === 0`) are conditionally hidden.
- **Food-Bounded Parcel Limit**: Bounded by $\text{ParcelMax} = \min(\text{UnservedParcels}, \text{AdultInput} + \text{KidInput})$. Parcel counter enables only when food is selected.
- **Sequential Allocation & Missed Parcel Auditing**: Sequentially marks unserved members as taken in `takenByPerson[dayId]` and asynchronously logs `ActivityAction.MISSED_PARCEL` if member meals are served but parcels remain uncollected.
- **Same-Page Persistence**: On checkout success, displays alert `"Checkout Successful"` and remains on the current screen (`ScannerScreen` or `DetailsScreen`).

### 2. Quick Guest Checkout Engine (`QuickGuestModal.tsx`)
- **Live Meal Overlay Launch**: Tapping **Guest** on `HomeScreen` during a live meal (`currentMealInfo !== null`) sets `isQuickGuestMode = true` and launches `QuickGuestModal` over `GuestManagementScreen`.
- **Ultra-Compact 2-Column Layout**: Combines title & summary into a 1-tile red card and arranges Planned & Served counter inputs into a 2-column side-by-side grid (`flexDirection: "row"`), reducing modal height by ~200px (~40% shorter).
- **RBAC Rules**: Non-admin users cannot edit planned inputs; admin users can edit both planned and served inputs. Served inputs are bounded by `min = 0` and `max = planned`.
- **Shared Debounced Pipeline**: Uses `updateGuestCountDebounced` in `DatabaseContext` (1000ms debounce timer) for 0ms optimistic UI updates, batched database writes, and single `ActivityModule.GUEST` log entries.
- **Same-Page Persistence on Close**: Closing the modal (`✕`) reveals the background `GuestManagementScreen` with all updated guest counts rendered in real-time.

### 3. Open-Source Live Camera & Gallery OCR Payment Scanner (`SubscriptionForm.tsx`, `PaymentScannerModal.tsx`, `ocrScanner.ts`)
- **Live Camera Scanner Modal (`PaymentScannerModal.tsx`)**: Tapping the camera icon inside `Transaction ID` launches a live camera viewfinder (`CameraView`) with an enlarged reticle (`350px x 320px`), torch toggle, shutter button, and gallery picker.
- **Single-Pass Txn ID & Amount Joint Extraction**: Simultaneously extracts BOTH the UPI Transaction ID (including 22+ char PhonePe IDs `T260...` & Super.Money `UPI reference ID: ...`) and Payment Amount ($\text{₹}$) in a single OCR pass.
- **User Confirmation Dialog (`UI_TEXT.confirmExtractedDetails`)**: Prompts the user to review extracted Txn ID & Amount before populating form fields.
- **Universal Recognition & Rupee Disambiguation**: Uses Google ML Kit On-Device Vision (`@react-native-ml-kit/text-recognition`) on mobile and Tesseract.js on Web. Features `parseAmountFromWords` (e.g., `Two Thousand Eight Hundred Rupees` $\rightarrow$ `2800`) and Rupee glyph disambiguation (`32800` $\rightarrow$ `2800`) across Paytm, PayZapp, PhonePe, Google Pay, Super.Money, and Bank Apps.

### 4. Forensic Activity Logging & Role Audit (`ActivityLogScreen.tsx`)
- **Username & Role Tracking**: Posts both `userName` and `userRole` to Firebase RTDB for every activity log event. Unauthenticated pre-login errors record `userName` while omitting `userRole` cleanly.
- **Preserved Casing & Badges**: Displays user badges in exact original letter casing: `userName (ROLE)` (e.g., `admin (ADMIN)`, `JohnDoe (VENDOR)`).
- **Multi-Field Filtering & Search**: "Filter by User" dropdown and text search filter and search by username, user role, and combined labels (`john (vendor)`).

---

## 🔐 Security, Roles & Version Synchronization

1. **Database-Driven Authentication (`auth_config`)**:
   User credentials and role definitions (`Admin` vs `Vendor`) are fetched directly from Firebase RTDB.
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

To accommodate all residents and guests, the system offers **3 flexible, redundant meal collection options** at the food stall:

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
   Flat passes cover resident families. Guest meals are handled independently via the **Guest Management** module and **Quick Guest Modal**.

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
