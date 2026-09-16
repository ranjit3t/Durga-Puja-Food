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
    - `LoginScreen`: Gateway for role-based session initialization. Dynamically fetches credentials from `auth_config`.
    - `HomeScreen`: Quick-action dashboard utilizing a grid of sleek interaction tiles and a space-saving, high-density dashboard header card with a centered watermark icon and deep-linked live service shortcut attributes. The "LIVE" badge only appears if the current meal is active and enabled.
    - `SubscriptionListScreen`: Dedicated interface for pass management with high-performance search.
    - `DashboardScreen`: Aggregated analytics with a sleek, earthy-toned financial summary (conditional) and real-time operational metrics. Features a high-visibility summary card with seasonal totals and a dynamic "Current Meal" demand snapshot for the active service slot. Guest plate counts are read-only and derived from the `GuestManagementScreen`. Individual meal sections are clearly demarcated with borders, and completed service slots are visually dimmed to signify inactivation. Each meal section uses a standardized metric grid where the "Total Taken" field is prioritized as the final summary item.
    - `SubscriptionForm`: CRUD interface with role-based field locking and touch-optimized block dropdowns. Features **Automated Food Pricing** that calculates costs in real-time as meal choices are modified.
    - `SettingsScreen`: Administrative interface for managing festival config, payment rules, and Season Branding. It employs a **State Isolation Pattern** to prevent background database refreshes from overwriting local unsaved edits during the configuration process. It also enforces operational integrity by ensuring that only enabled and incomplete meals can be designated as the "Current Meal".
    - `GuestManagementScreen`: Operational module for tracking extra guest plates with automated total/taken calculations. Shares the same "LIVE" prioritization and highlighting logic as the kitchen dashboard for operational consistency.
    - `ReportScreen`: A modularized analytics engine. Instead of a monolithic file, it utilizes specialized sub-components (`DayWiseReport`, `MealWiseReport`, `GuestWiseReport`, `ParcelWiseReport`, `SingleMealReport`, `PendingReport`, `FlatWiseReport`, `PaymentSummaryReport`) for distinct data visualizations. The payment audit tab includes a granular flat-wise transaction list with headcount parameters and deep-linking into specific passes. Supports PNG export for all views.
- **Components**: Atomic and reusable UI units.
    - `ActionLabel`: Standardized Icon+Text component supporting both horizontal and vertical layouts.
    - `CounterInput`: Specialized numeric input with `+/-` controls and automated min/max clamping.
    - `CustomAlert`: A centralized, themed replacement for system dialogs.
    - `Global Error View`: A component wrapper layer that safely intercepts database connection and runtime exceptions, formatting them contextually within high-visibility premium alert overlays.
    - `Header Controls`: Unified set of components (`BackButton`, `HomeButton`, `LogoutButton`) designed with a consistent **36px circular aesthetic**.
    - `Metric Tiles`: Read-only and interactive tiles for rapid data consumption.

### 📂 Logic & Theme Layer (`src/theme/`, `src/constants.ts`, `src/strings.ts`)
- **Dynamic Theme & Responsive Provider (`src/theme/`)**: Implements a React Context-based theme and responsiveness system.
    - `ThemeProvider`: Wraps the app and manages `themeType` (Primary/Dark).
    - `useAppTheme` & `useStyles`: Custom hooks used by all components for dynamic, theme-aware and size-aware styling.
    - **Responsive Engine**: The `useStyles` hook integrates `useWindowDimensions` to provide real-time screen metrics, enabling centered 600px layouts on large screens (Tablets/Browser).
    - Persistence: Uses `AsyncStorage` to remember user's theme choice locally.
- **Centralized String Resource System (`strings.ts`)**: Every single UI string, label, placeholder, and message is centralized in a constant object. This ensures architectural purity, prevents hardcoded "magic strings," and makes the entire app localization-ready.
- **Report Data Hook (`useReportData.ts`)**: A centralized headless hook that performs all complex data aggregations and dietary splits, decoupling business logic from the reporting UI components.
- **AppConfig Schema**: The application consumes a central configuration object:
    - `seasonName`: Global branding string.
    - `seasonEnabled`: Global master switch for Read-Only mode.
    - `mobileEnabled`: Global toggle for mobile number collection.
    - `foodPriceEnabled`: Global toggle for price-based auto-calculations.
    - `payment`: Global switch and method whitelist (UPI, Cash, Bank Transfer).
    - `days`: Array of event day rules (meals, dietary, parcels, current status, prices, and done status).
    - `whatsappCountryCode`: Global default country calling code prefix for WhatsApp sharing (e.g., "91" for India).
- **Navigation & History Stack**: Uses a custom-built history array in `NavigationContext.tsx`. The `navigate()` and `goBack()` helpers manage the transition state using the `AppScreen` enum, ensuring that the Android hardware back button behaves predictably. History is automatically purged upon returning to the **Home** screen to prevent stack bloat.
- **Persistent View State Hoisting**: Selected tabs and filter states for the `ReportScreen` and search queries for the `SubscriptionListScreen` are hoisted to the root level. This ensures UI continuity during sub-navigation (e.g., returning from a pass detail to the exact same report tab).
- **Visibility Logic**: Helpers in `constants.ts` strictly enforce the active configuration, hiding disabled features (like payments or specific meals) globally across all screens.

### 📂 Data Layer (`src/repository.ts`, `src/firebase.ts`)
- **Real-time Persistence**: Uses Firebase Realtime Database for all subscriptions, menus, and configurations.
- **Query Optimization**: Implements a granular path strategy. Rather than replacing entire parent objects, the repository provides methods to target specific leaf nodes (e.g., a single guest count or one member's food collection status). This minimizes bandwidth usage and improves concurrency.
- **Data Normalization**: Handles schema variations and ensures data matrix integrity (Person x Day x Meal). 

## 4. Security & Permissions Model
The application implements **Role-Based Access Control (RBAC)**:
- **Admin**: Full read/write/delete privileges on all modules, including global configuration and **Guest demand planning**.
- **Vendor**: Operational access. Can mark food as taken, update **Guest collection counts** (Taken), and view Reports. Destructive actions, festival rule changes, and pass registration are restricted.
- **Global Read-Only Enforcement**: When the `seasonEnabled` config flag is false, the application automatically locks all data-modifying components (text inputs, checkboxes, save buttons) across all roles, effectively archiving the season's data.

## 5. Performance & Synchronization Patterns
- **Transition-Based Data Sync**: Performs a comprehensive backend fetch on every screen transition to eliminate reliance on stale data.
- **Periodic Background Refresh**: Triggers a silent sync every 10 seconds to maintain live metrics during long sessions.
- **Windowed Rendering**: `FlatList` optimization for high-volume pass records.
- **CaptureRef**: Asynchronous PNG generation for the "Digital Pass" and analytical reports.
