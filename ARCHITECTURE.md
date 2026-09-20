# Eternia Food Desk - Architecture Documentation

This document describes the high-level architecture, data structures, and design patterns used in the **Eternia Food Desk** application.

## 1. System Overview
Eternia Food Desk is a mobile application built with **React Native (Expo)** designed to manage high-volume food distribution. It uses a **Serverless Architecture** with **Firebase** as the backend for real-time data synchronization and dynamic configuration.

## 2. Technical Stack
- **Framework**: React Native with Expo (Latest SDK)
- **Language**: TypeScript (Strict mode) with **Enums** for Domain integrity (MealType, DietType, DietaryOption, AppScreen, ReportType, PaymentMode).
- **Backend**: Firebase Realtime Database
- **Auth**: Hybrid model using Internal Role-based Login and Firebase Anonymous Authentication. Sessions are ephemeral and do not persist across app restarts.
- **Persistence**: Hybrid model using Firebase for global data and **`AsyncStorage`** for local user preferences (e.g., Theme selection). 
- **Scanning**: `expo-camera` for QR code processing with synchronized navigation logic.
- **Contacts**: `expo-contacts` for native address book integration.

## 3. High-Level Architecture
The project follows a **Modular Layered Architecture**:

### 📂 Presentation Layer (`src/screens`, `src/components`)
- **Screens**: Discrete full-page views.
    - `SubscriptionListScreen`: Dedicated interface for pass management with high-performance search and **Natural Alphanumeric Sorting**. Features a **Context-Aware Filter Bar** (All / Current Meal / Kids / Parcels / Veg Only) with real-time counts. Cards use high-density markers (restaurant, happy face, briefcase, leaf) and provide integrated WhatsApp/Call shortcuts.
    - `DashboardScreen`: Aggregated analytics with a sleek, earthy-toned financial summary. Features a dynamic **Current Meal Priority Sort**, moving the active day to the top. Supports visual comparative bar charts. Each section includes a dedicated **Action Bar** for visualization toggling and PNG sharing. The summary card intelligently adapts terminology ("Adults/Kids" vs "Members") and provides high-fidelity dietary splits and collection status for all recipient categories.
    - `QrScreen`: Renders a permanent digital pass with seasonal branding. Used for verification during meal collection. Uses grammar-aware headcount labels.
    - `DetailsScreen`: Comprehensive view of a single pass including food plan and collection matrix. Integrates **Quick Contact Actions** (WhatsApp/Call) and a **Quick Edit Shortcut** directly into the Pass Identity card. Implements **Deletion Safeguards** based on payment and distribution history. Uses grammar-aware labels. Features interactive informational blocks that deep-link to analytical reports or the global menu.
    - `SubscriptionForm`: CRUD interface with role-based field locking and touch-optimized block dropdowns. Features **Automated Food Pricing** based on Adult/Kids counts. Maintains a **Fixed Chronological Day Order** while utilizing an **Auto-Scroll focus** to ensure the current active day is pre-selected and centered upon opening. Implements strict **Data Integrity Rules** preventing the creation of empty passes with no meal subscriptions. Includes **Headcount Baseline Protection** for active passes, preventing reduction below registration values.
    - `SettingsScreen`: Administrative interface for managing festival config, payment rules, Season Branding, and **Kids Support**. It employs a **State Isolation Pattern** and a **Sophisticated Validation Engine** to enforce chronological lifecycle rules (Marking Done/Current). Features a **Subscription-Aware Lock** on disabling festival days or meals and a Red **Delete Day** button that is strictly disabled for active days. Includes automated state transitions and removed generic confirmations for logic-guarded toggles.
    - **Bug Reporting**: Integrated `Linking` API shortcut for administrators to send pre-populated bug reports via the device's native email client. Destination and subject are configurable via `strings.ts`.
    - `MenuEditorScreen`: Administrative tool for managing the global festival food menu. It allows adding and removing items from Breakfast, Lunch, and Dinner slots. Features **Sectional Saving** and an **alert-driven navigation callback** with auto-scrolling to the targeted day in the View Menu. The interface features "LIVE" service badges and dietary tags for operational clarity.
    - `ViewMenuScreen`: A clean, read-only interface for volunteers to view the current feast plan, featuring "LIVE" badges and dietary tags consistent with the editor and dashboard. Includes Admin-only **Quick Edit (pencil)** buttons with deep-linking and auto-focus logic.
    - `ReportScreen`: A modularized analytics engine. Instead of a monolithic file, it utilizes specialized sub-components (`DayWiseReport`, `MealWiseReport`, `GuestWiseReport`, `KidsReport`, `ParcelWiseReport`, `SingleMealReport`, `PendingReport`, `FlatWiseReport`, `PaymentSummaryReport`) for distinct data visualizations. The payment audit tab includes a granular list grouped by **Payment Mode**, showing individual transactions with metadata (Transaction IDs, Receivers) and deep-linking into specific passes. Supports PNG export for all views. All reports are grammar-aware and respect the global sorting policy.
    - `ActivityLogScreen`: Discrete historical audit view for administrators. Displays system-wide operations including **App Version Tracking**, hardware metadata, and technical stack traces. Log items utilize the same **Themed Card Registry** as subscriptions, featuring shadow-free designs with high-contrast color-coded indicators. Features **Interactive Deep-Linking** to pass details directly from the log dashboard and **Granular Forensic Diffs** for configuration and menu updates.
- **Components**: Atomic and reusable UI units.
    - `ActionLabel`: Standardized Icon+Text component supporting both horizontal and vertical layouts.
    - `CounterInput`: Specialized numeric input with `+/-` controls and automated min/max clamping.
    - `CustomAlert`: A centralized, themed replacement for system dialogs.
    - `Global Error View`: A component wrapper layer that safely intercepts database connection and runtime exceptions, formatting them contextually within high-visibility premium alert overlays.
    - `Header Controls`: Unified set of components (`BackButton`, `HomeButton`, `LogoutButton`) designed with a consistent **36px circular aesthetic**.
    - `Metric Tiles`: Read-only and interactive tiles for rapid data consumption. Dashboard metrics utilize a **High-Density Grouped Pattern**, placing related demand and collection values in adjacent cells. The system intelligently simplifies labels on single-diet days, removing redundant "Veg/Non-Veg" qualifiers from member and collection counts.

### 📂 Logic & Theme Layer (`src/theme/`, `src/constants.ts`, `src/strings.ts`)
- **Dynamic Theme & Responsive Provider (`src/theme/`)**: Implements a React Context-based theme and responsiveness system.
    - `ThemeProvider`: Wraps the app and manages `themeType` (Primary/Dark).
    - `useAppTheme` & `useStyles`: Custom hooks used by all components for dynamic, theme-aware and size-aware styling.
    - **Responsive Scaling Engine**: The `useStyles` hook utilizes a specialized `useScaling` hook to provide real-time dimension-aware scaling.
        - **Size Scaling (`s`)**: Automatically increases typography, icon sizes, and component dimensions on large high-res displays to prevent a "tiny" UI on web.
        - **Vertical Compacting (`v`)**: Specifically on web, vertical paddings and gaps are compacted to ensure high-density dashboards fit comfortably within the browser viewport.
        - **Adaptive Layout**: On native tablets, it applies a centered 600px max-width. On **Web**, it expands to a flexible layout that centers content in an optimized column while allowing full-width decorative elements.
    - Persistence: Uses `AsyncStorage` to remember user's theme choice locally.
- **Centralized String Resource System (`strings.ts`)**: Every single UI string, label, placeholder, and message is centralized in a constant object. This ensures architectural purity, prevents hardcoded "magic strings," and makes the entire app localization-ready.
- **Report Data Hook (`useReportData.ts`)**: A centralized headless hook that performs all complex data aggregations and dietary splits, decoupling business logic from the reporting UI components.
- **AppConfig Schema**: The application consumes a central configuration object:
    - `seasonName`: Global branding string.
    - `seasonEnabled`: Global master switch for Read-Only mode.
    - `mobileEnabled`: Global toggle for mobile number collection.
    - `foodPriceEnabled`: Global toggle for price-based auto-calculations.
    - `kidsEnabled`: Global master switch to enable separate tracking and pricing for children.
    - `payment`: Global switch and method whitelist (UPI, Cash, Bank Transfer).
    - `days`: Array of event day rules (meals, dietary, parcels, current status, prices, and done status).
    - `whatsappCountryCode`: Global default country calling code prefix for WhatsApp sharing (e.g., "91" for India).
- **Navigation & History Stack**: Uses a custom-built history array in `NavigationContext.tsx`. The `navigate()` and `goBack()` helpers manage the transition state using the `AppScreen` enum, ensuring that the Android hardware back button behaves predictably. History is automatically purged upon returning to the **Home** screen to prevent stack bloat. Note that the **Details screen** utilizes a custom back action that routes directly to Home to provide a "fast exit" after pass verification.
- **Persistent View State Hoisting**: Selected tabs and filter states for the `ReportScreen` and search queries for the `SubscriptionListScreen` are hoisted to the root level. This ensures UI continuity during sub-navigation (e.g., returning from a pass detail to the exact same report tab).
- **Visibility Logic**: Helpers in `constants.ts` strictly enforce the active configuration, hiding disabled features (like payments or specific meals) globally across all screens.

### 📂 Data Layer (`src/repository.ts`, `src/firebase.ts`, `src/context/DatabaseContext.tsx`)
- **Real-time Persistence**: Uses Firebase Realtime Database for all subscriptions, menus, and configurations.
- **Query Optimization**: Implements a granular path strategy. Rather than replacing entire parent objects, the repository provides methods to target specific leaf nodes (e.g., a single guest count or one member's food collection status). This minimizes bandwidth usage and improves concurrency.
- **Natural Alphanumeric Sorting**: The `DatabaseContext` and `useReportData` hook implement a centralized sorting policy using `localeCompare` with `numeric: true`. This ensures that blocks and flats are always ordered in an intuitive numeric-aware sequence (1, 2, 10...) rather than strict ASCII (1, 10, 2...).
- **Data Normalization**: Handles schema variations and ensures data matrix integrity (Person x Day x Meal). 

## 4. Security & Permissions Model
The application implements **Role-Based Access Control (RBAC)**:
- **Admin**: Full read/write/delete privileges on all modules, including global configuration and **Guest demand planning**.
- **Vendor**: Operational access. Can mark food as taken, update **Guest collection counts** (Taken), and view Reports. Destructive actions, festival rule changes, and pass registration are restricted.
- **Global Read-Only Enforcement**: When the `seasonEnabled` config flag is false, the application automatically locks all data-modifying components (text inputs, checkboxes, save buttons) across all roles, effectively archiving the season's data.
- **Two-Phase Authentication Flow**: Implements a high-precision login sequence with explicit state transitions: `idle` -> `verifying` (backend credential match) -> `loading` (full data hydration) -> `authorized`. This ensures accurate UI feedback during the security handshake.

## 5. Immersive Background Architecture
The application features a multi-layered **Festive Mesh Backdrop** system managed at the router level:
- **Layer 0 (Base)**: Solid background color (`COLORS.background`) from the active theme.
- **Layer 1 (Mesh spots)**: Up to **9 dynamically positioned ambient blobs** (`bgBlob1` to `bgBlobWebTop`) rendered as absolute absolute-positioned circles with large radial blurs. 
- **Layer 2 (Content Wrapper)**: A transparent screen-container layout that allows the background festive glows to remain visible behind interactive components.
- **Responsive Injection**: The system uses a conditional rendering pattern in `AppNavigator.tsx` to mount additional central and top-aligned blobs specifically for web viewports to maintain horizontal immersion.

## 6. Glassmorphism Design Pattern
To complement the immersive background, the system employs a global **Glassmorphic Language**:
- **Semi-Translucency**: Primary layout cards and report panels utilize `rgba()` background colors with opacities between **50% and 75%** instead of solid colors.
- **Shadow-Free Visual Depth**: All card elevations and solid shadows have been removed in favor of border-based segmentation (`1.5px` borders), allowing the festive background tones (Crimson, Marigold, Royal Blue, Violet) to flow through the UI cleanly. This creating a sophisticated sense of depth and community celebration while retaining high-contrast accessibility.

- **Backward Compatibility & Toggle Stability**: Existing data is automatically normalized. Toggling the feature OFF triggers a silent merge in the registration form to ensure data continuity.

## 8. Operational Flow Controls
To ensure data integrity during live distribution, the system implements **Temporal Locking & Sorting**:
- **Sequence Logic**: Meals are ordered chronologically by Festival Day (Day 1 -> Day N) and then by slot (Breakfast -> Lunch -> Dinner).
- **Smart Sorting**: 
    - **Operational Views**: Prioritize the "Current Meal" by floating the active day and meal to the first position.
    - **Form & Content Views**: Maintain chronological stability (Day 1 $\rightarrow$ Day N; Breakfast $\rightarrow$ Lunch $\rightarrow$ Dinner) for predictable navigation and editing.
- **Bi-Directional Write Protection**:
    - **Future Protection**: When a "Current Meal" is active, the system blocks `taken` and `takenParcel` updates for all future slots to maintain collection accuracy.
    - **Historical Governance**: During new pass registration (**Add Pass**), the system blocks meal plan selections for past days. For existing records (**Edit Pass**), it allows modifications to past meal plans (until marked as "Done") to facilitate corrections while keeping historical data safe.
- **Operational Safety Rails**: 
    - **Data Dependency Guard**: The system prevents disabling global payment integration, individual payment channels (UPI, Cash, Bank Transfer), **Kids Support**, or individual **Festival Days/Meals** if any existing transaction or subscription data depends on those settings.
    - **Headcount Reduction Lock**: The application prevents decreasing the number of Adults or Kids in an existing pass below their **initial load values** once any member has "taken" a meal (including meals that are "Done" while subscribed).
- **Lifecycle Chronology**: Enforces strict rules for state transitions (e.g., cannot mark a meal Done unless all past meals are Done; cannot set Current if future meals are Done).
- **Dine-in vs Parcel Dependency**: The logic enforces a strict collection sequence—a parcel cannot be marked as "Taken" until the primary dine-in meal has been recorded as "Taken". This prevents reconciliation errors in the kitchen.
