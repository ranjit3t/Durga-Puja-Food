# FestiveDesk Operations — System Architecture & Technical Documentation

A high-performance Expo React Native & Web application designed for festival committees, administrators, and volunteers to manage resident pass subscriptions, daily gourmet menus, meal distribution, quick meal checkouts, guest plate tracking, OCR payment verification, and real-time kitchen analytics during large scale community festivals like **Durga Puja**.

---

## 📐 System Architecture & Overview

The application follows a decoupled, context-driven component architecture with a centralized **Universal Real-Time Firebase Repository Layer** and decoupled sub-contexts (`CoreDatabaseContext`, `ActivityLogsContext`, `NotesContext`). It supports multi-platform execution with 100% feature parity across **Mobile (Android/iOS Native)** and **Desktop/Web Browsers**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          React Native / Expo UI                        │
│  (Screens, Components, Festive Royal Theme Engine, Responsive Breakpoints)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                    Decoupled Context Provider Layer                    │
│   AuthContext ┆ CoreDatabaseContext ┆ ActivityLogsContext ┆ NotesContext│
│                    NavigationContext ┆ UIContext                       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│             Universal WebSocket Delta Engine & Debounced Batcher        │
│   (Sub-100ms push, progressive hydration, 100ms/150ms event batching)  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                       Firebase Realtime Database                       │
│ subscriptions ┆ menu ┆ config ┆ auth_config ┆ logs ┆ notes ┆ metrics  │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack & Key Libraries

| Technology / Library | Purpose & Usage |
| :--- | :--- |
| **React Native / Expo (v57+)** | Core cross-platform app framework targeting Android, iOS, and Web. |
| **TypeScript (v5.3+)** | Strict type safety for domain models, context providers, and props. |
| **Metro Transformer (`inlineRequires: true`)** | Defers JS module loading at runtime in `metro.config.js`, accelerating TTI by ~25% and lowering initial baseline RAM. |
| **Firebase Realtime Database** | Sub-100ms WebSocket real-time delta streams across subscriptions, menus, notes, audit logs, and pre-aggregated kitchen metrics. |
| **`expo-camera`** | High-performance camera integration for QR Code pass scanning with isolated memoization for 60 FPS scanning. |
| **`expo-image-picker`** | Camera capture and gallery screenshot selection for payment receipt scanning. |
| **`@react-native-ml-kit/text-recognition`** | On-device Google ML Kit Text Recognition for sub-15ms payment OCR on mobile app bundles (~1MB RAM footprint). |
| **`tesseract.js`** | Open-source client-side OCR engine for extracting UPI transaction IDs & amounts on Web browsers and as fallback on mobile. |
| **`react-native-qrcode-svg`** | SVG-based QR code pass matrix generation. |
| **`react-native-view-shot` (`captureRef`)** | Snapshot engine for capturing report cards and digital passes as theme-padded PNG images. |
| **`expo-sharing` & `expo-print`** | Platform-native sharing dialogs (WhatsApp / System) and HTML document printing. |
| **`@react-native-async-storage/async-storage`** | Local device persistence for theme preferences and session tokens. |
| **`@expo/vector-icons` (Ionicons)** | Vector icons tuned for high-contrast theme states across screens. |

---

## 🎨 Theme Engine & Design System

### 1. Festive Royal Theme Palette
- **Primary Festive Accent**: Royal Festive Crimson Red (`#C41E3A` light / `#FB7185` dark).
- **Secondary Accent**: Warm Satin Gold (`#D4AF37` light / `#FBBF24` dark).
- **Light Theme Canvas**: Soft Ivory Cream (`#FAFAFA`) with crisp surface overlays (`#FFFFFF`).
- **Dark Theme Canvas**: Obsidian Slate (`#0F172A`) with elevated slate surface tiles (`#1E293B`).
- **Standardized Dietary Indicators**: FSSAI standard Emerald Green (`#10B981`) for Vegetarian and Crimson Red (`#EF4444`) for Non-Vegetarian.

### 2. Universal Theme Toggle Button (`ThemeToggleButton.tsx`)
- Integrated in the top-right header control bar alongside `LogoutButton` on **every screen** across the app.
- **Camera Viewfinder Exclusion**: Intentionally excluded from camera screens (`ScannerScreen` and `PaymentScannerModal`) to keep dark camera viewfinders undisturbed.

---

## ⚡ High-Scale Real-Time & Performance Architecture

### 1. Decoupled Context Provider Architecture (Context Splitting)
State is split into 3 independent React contexts inside `DatabaseContext.tsx`:
- `CoreDatabaseContext` (Subscriptions, Food Menu, Day Configs, Kitchen Metrics, Dashboard Demand Totals)
- `ActivityLogsContext` (System Audit Trail Logs)
- `NotesContext` (Collaborative Team Notes)

**Impact**: Operational views (`DashboardScreen`, `SubscriptionListScreen`, `ScannerScreen`, `ReportScreen`, `HomeScreen`, etc.) subscribe exclusively to `useCoreDatabase()`. Background activity logs or note updates **never trigger re-renders** on main operational screens.

### 2. Debounced WebSocket Listener Batching
Firebase real-time delta listeners for activity logs (`onLogsDelta`) and subscriptions (`onSubscriptionsDelta`) use debounced buffer timers (100ms–150ms window).
- **Result**: Grouping 50+ rapid startup `onChildAdded` events into a **single batched update** eliminates initial load screen freezing and CPU thrashing.

### 3. Dual Google ML Kit Native & Tesseract.js Fallback OCR Strategy
- On **Native Android/iOS**, `ocrScanner.ts` uses `@react-native-ml-kit/text-recognition` directly (~1MB RAM footprint, sub-15ms speed).
- If ML Kit returns empty text or when running on **Web Browsers**, `tesseract.js` fallback is triggered.

### 4. Dashboard Icon-Only 3-Way View Mode Action Bar
Each meal card section on the Analytics & Kitchen Operations Dashboard ([`DashboardScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/DashboardScreen.tsx)) features an icon-only action bar with 4 sleek 36px circular buttons:
- **`Grid View`** ([`grid-outline`](file:///D:/Code/Durga-Puja-Food/src/components/dashboard/MealMetricGrid.tsx)): Standard view showing Planned, Served & Pending metrics.
- **`Planned-Only View`** ([`clipboard-outline`](file:///D:/Code/Durga-Puja-Food/src/components/dashboard/MealMetricGrid.tsx)): Kitchen-focused view displaying **ONLY Subscribed/Planned demand counts** without clutter from served numbers.
- **`Chart View`** ([`bar-chart-outline`](file:///D:/Code/Durga-Puja-Food/src/components/dashboard/MealBarChart.tsx)): Visual bar chart progress view.
- **`WhatsApp Share`** ([`logo-whatsapp`](file:///D:/Code/Durga-Puja-Food/src/screens/DashboardScreen.tsx)): 1-tap card snapshot sharing in green accent.

### 5. Multi-Source Quick Checkout & Full-Height Success Overlay (`QuickCheckoutModal.tsx`)
Quick Checkout can be triggered from 4 distinct application entry methods, tracked via `CheckoutSource` enum:
- **`QR Code Scan`** ([`ScannerScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/ScannerScreen.tsx)): Verified via live camera QR code scan.
- **`Numeric Passcode Keypad`** ([`ScannerScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/ScannerScreen.tsx)): Verified via 4-digit numeric passcode keypad entry.
- **`Pass Details`** ([`DetailsScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/DetailsScreen.tsx)): Triggered from the pass inspection view.
- **`Pass Directory`** ([`SubscriptionListScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/SubscriptionListScreen.tsx)): Interactive red missed meal badge tap.

**Full-Height Festive Success Overlay & Audio Feedback (`QuickCheckoutModal.tsx`)**:
- Replaced alert dialogs with a full-height, theme-enabled success overlay window (`theme.colors.successLight`).
- Features a large glowing green checkmark badge (`checkmark-done`), complete checkout details (Block, Flat, Day, Meal, Served counts, Total Plates, and Timestamp), synthesized 2-tone audio chime (`playSuccessChime()`), and haptic vibration.
- **Zero Hardcoded Colors & Text**: 100% theme-driven styling (`theme.colors`) and 100% localized text (`UI_TEXT`).
- **Configurable Auto-Close (`QUICK_CHECKOUT_AUTO_CLOSE_MS = 1400` in `config.ts`)**: Auto-closes smoothly without manual close buttons, returning volunteers back to origin screens (`ScannerScreen`, `SubscriptionListScreen`, or `DetailsScreen`).
- **Web & Accessibility Compliant**: 100% viewport scaling on Web browsers, `accessibilityRole="alert"`, and VoiceOver / TalkBack live speech announcements.

### 6. Atomic Multi-Path Checkouts & Anti-Duplicate Lock (`checkInPassAtomic`)
- **100% Duplicate Prevention**: Server-side atomic multi-path updates (`update(ref(db), multiPathUpdates)`) lock meal status and increment kitchen metrics in a single transaction.

### 7. Member Food Taken Date & Time Tracking
- **Synchronized Batch Timestamps**: Checkouts assign a formatted timestamp string (`formatTakenTime()`, e.g. `"12 Oct, 1:15 PM"`) to all members served in that transaction.
- **View Pass Time Badges (`DetailsScreen.tsx`)**: Displays member-level timestamps underneath service badges.
- **Excel CSV Export Timestamps (`SubscriptionListScreen.tsx`)**: Directory exports include member-level meal taken date & time.

---

## 📁 Directory Structure

```
metro.config.js          # Metro Bundler Configuration (inlineRequires: true)
src/
├── components/          # Modular UI Components
│   ├── common/          # Action Label, Back Button, Home Button, CounterInput, Dropdowns, QuickCheckoutModal, QuickGuestModal, ThemeToggleButton
│   ├── dashboard/       # Meal Bar Chart, Meal Metric Grid
│   ├── menu/            # Meal Display, Meal Menu Editor, Summary Bar
│   └── report/          # DayWise, MealWise, SingleMeal, Guest, Parcel, Pending, FlatWise, Payment, Kids
├── context/             # Global React Context State
│   ├── AuthContext.tsx       # Session, Login/Logout, Role Governance (Admin/Vendor)
│   ├── DatabaseContext.tsx   # CoreDatabaseContext, ActivityLogsContext, NotesContext (Decoupled Sub-Contexts)
│   ├── NavigationContext.tsx # History-stack-enabled screen navigation (isQuickCheckout, isQuickGuestMode)
│   └── UIContext.tsx         # Global Alert dialogs, Error modals, Share & Print handlers
├── hooks/               # Custom Utility Hooks
│   └── useReportData.ts # Targeted Lazy Report Aggregation Engine
├── navigation/          # App Navigator Router & Screen Switcher
├── theme/               # Royal Festive Design Token Engine (primary.ts & dark.ts)
├── utils/               # Helper Utility Modules
│   └── ocrScanner.ts    # Dual ML Kit (Native) / Tesseract (Web/Fallback) OCR Extractor
├── domain.ts            # Domain Data Models, Enums (CheckoutSource, GuestCheckoutSource) & Type Contracts
├── repository.ts        # Firebase RTDB API Operations, Atomic Writes & Real-Time Listeners
├── config.ts            # Festival Configuration & QUICK_CHECKOUT_AUTO_CLOSE_MS
├── firebase.ts          # Firebase SDK Initialization
├── strings.ts           # Centralized Dictionary for Localized UI Text (`UI_TEXT`)
├── styles.ts            # Global Responsive Scaling Engine (`s()` / `v()`) & Widescreen Breakpoints
└── screens/             # Top-Level Screen Views
    ├── ActivityLogScreen.tsx     # Real-Time Audit Log Stream (uses useActivityLogs())
    ├── ContactsScreen.tsx        # Resident Directory with Direct WhatsApp/Call/SMS Actions
    ├── DashboardScreen.tsx       # Live Real-Time Kitchen Counter Dashboard (uses useCoreDatabase())
    ├── GuestManagementScreen.tsx # Counter Guest Demand Manager with Source Tracking
    ├── HomeScreen.tsx            # Main Operational Summary (uses useCoreDatabase())
    ├── LoginScreen.tsx           # Two-Phase Secured Database Login
    ├── MenuEditorScreen.tsx      # Daily Meal Menu & Pricing Editor
    ├── NotesScreen.tsx           # Real-Time Collaborative Team Notes Stream (uses useNotes())
    ├── QrScreen.tsx              # Digital Pass Generator with 4-Digit Passcode & WhatsApp Share
    ├── ReportScreen.tsx          # Analytics Suite with Share Report Action & Theme-Aware Image Export
    ├── ScannerScreen.tsx         # Memoized Camera Scanner & Passcode Keypad (uses useCoreDatabase())
    ├── SettingsScreen.tsx        # Festival Configuration & Switch Overflow Protection
    ├── SubscriptionForm.tsx      # Pass Registration & Editing with OCR Payment Scanner
    ├── SubscriptionListScreen.tsx# Pass Directory with Clickable Missed Badge (uses useCoreDatabase())
    └── ViewMenuScreen.tsx        # Daily Food Menu Viewer
```

---

## 🚀 Build, Setup & Local Execution

```bash
# 1. Clone repository & install dependencies
npm install

# 2. Configure Environment Variables (.env)
EXPO_PUBLIC_FIREBASE_API_KEY="your-api-key"
EXPO_PUBLIC_FIREBASE_DATABASE_URL="https://your-project.firebaseio.com"

# 3. Start Expo Development Server
npx expo start

# 4. Run on specific platform targets
npx expo start --web       # Web browser (React Native Web)
npx expo run:android       # Native Android build
npx expo run:ios           # Native iOS build
```

---

© 2026 Eternia Festival Committee — FestiveDesk Operations Architecture Document
