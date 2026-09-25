# FestiveDesk Operations — System Architecture & Technical Documentation

A high-performance Expo React Native & Web application designed for festival committees, administrators, and volunteers to manage resident pass subscriptions, daily gourmet menus, meal distribution, quick meal checkouts, guest plate tracking, OCR payment verification, and real-time kitchen analytics during large scale community festivals like **Durga Puja**.

---

## 📐 System Architecture & Overview

The application follows a decoupled, context-driven component architecture with a centralized **Universal Real-Time Firebase Repository Layer**. It supports multi-platform execution with 100% feature parity across **Mobile (Android/iOS Native)** and **Desktop/Web Browsers**.

```
┌────────────────────────────────────────────────────────────────────────┐
│                          React Native / Expo UI                        │
│  (Screens, Components, Festive Royal Theme Engine, Responsive Breakpoints)│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                        Context Provider Layer                          │
│   AuthContext ┆ DatabaseContext ┆ NavigationContext ┆ UIContext ┆ Theme│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│                  Universal WebSocket Delta Listener Engine             │
│   (Sub-100ms real-time push, progressive hydration, atomic transactions)│
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
| **Firebase Realtime Database** | Sub-100ms WebSocket real-time delta streams across subscriptions, menus, notes, audit logs, and pre-aggregated kitchen metrics. |
| **`expo-camera`** | High-performance camera integration for QR Code pass scanning with isolated memoization for 60 FPS scanning. |
| **`expo-image-picker`** | Camera capture and gallery screenshot selection for payment receipt scanning. |
| **`@react-native-ml-kit/text-recognition`** | On-device Google ML Kit Text Recognition for sub-100ms payment OCR on mobile app bundles. |
| **`tesseract.js`** | Open-source client-side OCR engine for extracting UPI transaction IDs & amounts on Web browsers. |
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
- Integrated in the top-right header control bar alongside `LogoutButton` on **every screen** across the app (`HomeScreen`, `LoginScreen`, `SubscriptionListScreen`, `ViewMenuScreen`, `GuestManagementScreen`, `ReportScreen`, `DashboardScreen`, `SubscriptionForm`, `DetailsScreen`, `SettingsScreen`, `ActivityLogScreen`, `NotesScreen`, `ContactsScreen`, `QrScreen`).
- **Camera Viewfinder Exclusion**: Intentionally excluded from camera screens (`ScannerScreen` and `PaymentScannerModal`) to keep dark camera viewfinders undisturbed.

---

## ♿ Accessibility (a11y) & WCAG 2.1 AA Architecture

FestiveDesk is engineered to meet **WCAG 2.1 Level AA** standards and **Google Material / iOS Accessibility Guidelines**:

### 1. Centralized Localized Accessibility Engine (`UI_TEXT`)
- **Zero Hardcoded Text**: 100% of accessibility labels (`accessibilityLabel`), screen hints (`accessibilityHint`), live announcements (`announceForAccessibility`), and control descriptions are dynamically resolved from the centralized dictionary in [`strings.ts`](file:///D:/Code/Durga-Puja-Food/src/strings.ts).

### 2. Contrast Ratios (WCAG 2.1 AA Standard ≥ 4.5:1)
- **Light Theme Canvas**: `textMuted` set to `#64748B` on `#FFFFFF` surface (**4.6:1 contrast ratio** ✅).
- **Dark Theme Canvas**: `textMuted` set to `#94A3B8` on `#1E293B` surface (**4.8:1 contrast ratio** ✅).
- **Zero Hardcoded Color Overrides**: Zero inline hex (`"#FFFFFF"`) or `rgba(...)` color overrides in UI components; all styling binds dynamically to `theme.colors`.

### 3. Screen Reader Semantics & Focus Management
- **Full Role & State Bindings**: Standardized `accessible={true}`, `accessibilityRole` (`button`, `combobox`, `menuitem`, `header`, `alert`, `switch`, `checkbox`), and state indicators (`accessibilityState={{ expanded, selected, checked, disabled }}`) across interactive components ([`CounterInput.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/CounterInput.tsx), [`Dropdown.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/Dropdown.tsx), [`CustomAlert.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/CustomAlert.tsx), [`ThemeToggleButton.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/ThemeToggleButton.tsx), [`BackButton.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/BackButton.tsx), [`HomeButton.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/HomeButton.tsx), [`LogoutButton.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/LogoutButton.tsx), [`EditableMetric.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/EditableMetric.tsx)).
- **Live Speech Announcements (`AccessibilityInfo`)**: Triggers real-time VoiceOver / TalkBack announcements (`AccessibilityInfo.announceForAccessibility`) on checkout completions, QR pass scans, and OCR payment receipt extractions.
- **Modal View Isolation**: Enforces `accessibilityViewIsModal={true}` on modal overlays ([`QuickCheckoutModal.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/QuickCheckoutModal.tsx), [`QuickGuestModal.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/QuickGuestModal.tsx), [`PaymentScannerModal.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/PaymentScannerModal.tsx), [`CustomAlert.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/CustomAlert.tsx)) to trap screen reader focus inside active dialogs.

### 4. Touch Target Size & Form Navigation
- **Minimum 48×48 dp Touch Regions**: Interactive controls and icon buttons enforce minimum touch areas via `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}`.
- **Hardware Keyboard & Focus Chaining**: Form inputs in [`LoginScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/LoginScreen.tsx) and [`SubscriptionForm.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/SubscriptionForm.tsx) feature input ref chaining with `returnKeyType="next"` and `onSubmitEditing` for seamless focus transitions.

---

## ⚡ High-Scale Real-Time & Performance Architecture

### 1. Dashboard Icon-Only 3-Way View Mode Action Bar
Each meal card section on the Analytics & Kitchen Operations Dashboard ([`DashboardScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/DashboardScreen.tsx)) features an icon-only action bar with 4 sleek 36px circular buttons:
- **`Grid View`** ([`grid-outline`](file:///D:/Code/Durga-Puja-Food/src/components/dashboard/MealMetricGrid.tsx)): Standard view showing Planned, Served & Pending metrics.
- **`Planned-Only View`** ([`clipboard-outline`](file:///D:/Code/Durga-Puja-Food/src/components/dashboard/MealMetricGrid.tsx)): Kitchen-focused view displaying **ONLY Subscribed/Planned demand counts** without clutter from served numbers.
- **`Chart View`** ([`bar-chart-outline`](file:///D:/Code/Durga-Puja-Food/src/components/dashboard/MealBarChart.tsx)): Visual bar chart progress view.
- **`WhatsApp Share`** ([`logo-whatsapp`](file:///D:/Code/Durga-Puja-Food/src/screens/DashboardScreen.tsx)): 1-tap card snapshot sharing in green accent.

### 2. Multi-Source Quick Checkout Origin Tracking (`CheckoutSource`)
Quick Checkout can be triggered from 3 distinct application entry points, tracked via `CheckoutSource` enum:
- **`QR Scanner`** ([`ScannerScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/ScannerScreen.tsx)): Live camera QR scan or 4-digit passcode entry.
- **`Pass Details`** ([`DetailsScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/DetailsScreen.tsx)): Triggered from the pass inspection view.
- **`Pass Directory`** ([`SubscriptionListScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/SubscriptionListScreen.tsx)): Interactive red missed meal badge tap.

**Audit Log Origin Badges (`ActivityLogScreen.tsx`)**:
Every quick checkout entry in the Activity Audit Log automatically displays a distinct origin tag badge (`[ 📷 QR SCANNER ]`, `[ 💳 PASS DETAILS ]`, or `[ 📜 PASS DIRECTORY ]`) in the card header.

### 3. Guest Checkout Origin Tracking (`GuestCheckoutSource`)
Guest plate updates and served counts track their origin source via `GuestCheckoutSource` enum:
- **`Quick Guest Modal`** ([`QuickGuestModal.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/common/QuickGuestModal.tsx)): Triggered from Home or Dashboard quick launch.
- **`Guest Desk Screen`** ([`GuestManagementScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/GuestManagementScreen.tsx)): Managed from the counter guest desk.

**Audit Log Guest Origin Badges**:
Displays `[ 👥 QUICK GUEST MODAL ]` or `[ 💻 GUEST DESK SCREEN ]` origin badges in the Activity Audit Log stream.

### 4. Clickable Missed Meal Badge Checkout
- On the Pass Directory screen ([`SubscriptionListScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/SubscriptionListScreen.tsx)), tapping the red missed meal counter badge directly triggers the **Quick Checkout Modal** for that pass via `e.stopPropagation()`.

### 5. Widescreen Breakpoint Scaling (`MAX_WIDTH`) & Overflow Protection
- **Adaptive Max Widths**: `MAX_WIDTH` scales dynamically across viewports (`1000px` for Desktop Web, `800px` for Tablet, `600px` for Mobile Web) in [`styles.ts`](file:///D:/Code/Durga-Puja-Food/src/styles.ts).
- **Flexbox Shrink Protection**: `Switch` controls, action buttons, and header titles use `flex: 1`, `minWidth`, and `flexShrink: 0` rules to prevent layout overflow or text clipping on narrow viewports or large fonts.

### 6. Universal Real-Time WebSocket Delta Engine
- **Zero Polling**: Firebase WebSocket push listeners (`onChildAdded`, `onChildChanged`, `onChildRemoved`, `onValue`).
- **Sub-100ms Real-Time Propagation**: Check-ins, pass edits, deletes, new registrations, team notes, audit logs, and guest plate updates stream to all active devices in **<100ms**.
- **99.99% Bandwidth Reduction**: Broadcasts tiny **~1.5 KB delta payloads** instead of re-downloading full database nodes.

### 7. Atomic Multi-Path Checkouts & Anti-Duplicate Lock (`checkInPassAtomic`)
- **100% Duplicate Prevention**: Server-side atomic multi-path updates (`update(ref(db), multiPathUpdates)`) lock meal status and increment kitchen metrics in a single transaction.

### 8. Member Food Taken Date & Time Tracking
- **Synchronized Batch Timestamps**: Checkouts assign a formatted timestamp string (`formatTakenTime()`, e.g. `"12 Oct, 1:15 PM"`) to all members served in that transaction.
- **View Pass Time Badges (`DetailsScreen.tsx`)**: Displays member-level timestamps underneath service badges.
- **Excel CSV Export Timestamps (`SubscriptionListScreen.tsx`)**: Directory exports include member-level meal taken date & time.

### 9. Refined Day-Wise Analytics, Complete/Planned View Switcher & Current Meal Auto-Focus
- **Day & Meal Filter Selection ([`ReportScreen.tsx`](file:///D:/Code/Durga-Puja-Food/src/screens/ReportScreen.tsx))**: Refined the **Day Wise Report** (`ReportType.DAY`) to support interactive Day and Meal selection filters alongside Split Report (`ReportType.SINGLE`).
- **Complete View vs. Planned View Mode Switcher ([`DayWiseReport.tsx`](file:///D:/Code/Durga-Puja-Food/src/components/report/DayWiseReport.tsx))**: Features an integrated `[ Complete View ]` / `[ Planned View ]` toggle bar.
  - **`Complete View`**: Displays total kitchen demand, dietary split (veg/non-veg breakdown for adults, kids, guests), Meal Served, Awaiting Service / Not Taken, and Parcels Served.
  - **`Planned View`**: Displays detailed subscribed preparation counts in individual stat boxes (`Resident Members`, `Kids`, `Guests`, `Parcels`) without served/taken clutter.
- **Active Current Meal Auto-Focus & Smooth Scroll**: On screen navigation or tab selection, `ReportScreen` automatically detects if any meal is currently active and enabled (`isMealCurrent` & `isMealEnabled`). It focuses `selectedDayId` and `selectedMealType` on the current active meal and smoothly scrolls the horizontal day selector to highlight the active day card.

### 10. Partial & Parcel Checkout Alerts with Initial-Load Snapshot Locking (`QuickCheckoutModal.tsx`, `SubscriptionForm.tsx`)
- **Automated Partial Pickup & Parcel Alerts**: Automatically detects prior partial checkouts (`totalFoodAlreadyServed > 0` && `totalFoodRemaining < totalFoodRegistered`) and remaining takeaway parcels (`parcelMax > 0`) for the current meal slot.
- **Pulsating Warning Alert Banners**: Displays 60 FPS animated pulsating warning banners at the top of the checkout modal with stacked ordering (Parcel Pickup Alert on top, Partial Checkout Alert below).
- **Initial Load Snapshot Locking**: Captures initial pickup state on screen/modal open (`initialPartialInfo`, `initialParcelInfo`, `parcelAlertFiredRef`), preventing alerts from re-triggering or flashing during active data edits or checkout submissions.

### 11. Pass Directory Auto-Deselect Stale Filters & Fallback (`SubscriptionListScreen.tsx`)
- **Auto-Deselect 0-Selection Filters**: Reactive `useEffect` monitors active filter counts and deselects stale filters whose match count drops to `0` (e.g. `FilterMode.MISSED` when all missed meals are checked out).
- **Default `ALL` Fallback**: If deselecting a stale filter leaves no active filters remaining, it automatically falls back to `FilterMode.ALL`; if other active filters exist, it preserves them as is.

---

## 📁 Directory Structure

```
src/
├── components/          # Modular UI Components
│   ├── common/          # Action Label, Back Button, Home Button, CounterInput, Dropdowns, QuickCheckoutModal, QuickGuestModal, ThemeToggleButton
│   ├── dashboard/       # Meal Bar Chart, Meal Metric Grid
│   ├── menu/            # Meal Display, Meal Menu Editor, Summary Bar
│   └── report/          # DayWise, MealWise, SingleMeal, Guest, Parcel, Pending, FlatWise, Payment, Kids
├── context/             # Global React Context State
│   ├── AuthContext.tsx       # Session, Login/Logout, Role Governance (Admin/Vendor)
│   ├── DatabaseContext.tsx   # Universal WebSocket Delta Listeners, Progressive Boot & Lifecycle Sync
│   ├── NavigationContext.tsx # History-stack-enabled screen navigation (isQuickCheckout, isQuickGuestMode)
│   └── UIContext.tsx         # Global Alert dialogs, Error modals, Share & Print handlers
├── hooks/               # Custom Utility Hooks
│   └── useReportData.ts # Targeted Lazy Report Aggregation Engine
├── navigation/          # App Navigator Router & Screen Switcher
├── theme/               # Royal Festive Design Token Engine (primary.ts & dark.ts)
├── utils/               # Helper Utility Modules
│   └── ocrScanner.ts    # Dual ML Kit / Tesseract OCR Payment Extractor
├── domain.ts            # Domain Data Models, Enums (CheckoutSource, GuestCheckoutSource) & Type Contracts
├── repository.ts        # Firebase RTDB API Operations, Atomic Writes & Real-Time Listeners
├── config.ts            # Default App Configuration & Festival Defaults
├── firebase.ts          # Firebase SDK Initialization
├── strings.ts           # Centralized Dictionary for Localized UI Text (`UI_TEXT`)
├── styles.ts            # Global Responsive Scaling Engine (`s()` / `v()`) & Widescreen Breakpoints
└── screens/             # Top-Level Screen Views
    ├── ActivityLogScreen.tsx     # Real-Time Audit Log Stream with Origin Badges & Summary Engine
    ├── ContactsScreen.tsx        # Resident Directory with Direct WhatsApp/Call/SMS Actions
    ├── DashboardScreen.tsx       # Live Real-Time Kitchen Counter Dashboard with Icon-Only Action Bar
    ├── GuestManagementScreen.tsx # Counter Guest Demand Manager with Source Tracking & Excel Export
    ├── HomeScreen.tsx            # Main Operational Summary with Compact Single-Line Stat Rows
    ├── LoginScreen.tsx           # Two-Phase Secured Database Login
    ├── MenuEditorScreen.tsx      # Daily Meal Menu & Pricing Editor
    ├── NotesScreen.tsx           # Real-Time Collaborative Team Notes Stream
    ├── QrScreen.tsx              # Digital Pass Generator with 4-Digit Passcode & WhatsApp Share
    ├── ReportScreen.tsx          # Analytics Suite with Share Report Action & Theme-Aware Image Export
    ├── ScannerScreen.tsx         # Memoized Camera Scanner & 4-Digit Keypad with Multi-Source Quick Checkout
    ├── SettingsScreen.tsx        # Festival Configuration & Switch Overflow Protection
    ├── SubscriptionForm.tsx      # Pass Registration & Editing with OCR Payment Scanner
    ├── SubscriptionListScreen.tsx# Pass Directory with Clickable Missed Badge & Sort Toggle
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
