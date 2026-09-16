# Technical Documentation - Eternia Food Desk

A comprehensive technical breakdown of the implementation, data flow, and architectural patterns within the Eternia Food Desk application.

## 1. Core Architecture
The application follows a **Serverless Modular Architecture** built on the **Expo React Native** framework, utilizing **Firebase Realtime Database** for synchronized persistence.

### High-Level Flow
1.  **Bootstrapping**: `App.tsx` initializes the `ThemeProvider` (loading local preferences), global state, navigation history stack, and checks for session validity.
2.  **Authentication**: `LoginScreen` (with theme toggle) verifies credentials against the `auth_config` DB node in real-time.
3.  **Hydration**: Upon login or screen transition, the app performs a full fetch of subscriptions, menu, and configuration.
4.  **Navigation**: Custom history stack management allows predictable back navigation, including Android hardware button support. History is automatically purged upon returning to the root Home screen.
5.  **Presentation**: UI elements are rendered dynamically using the `useStyles` hook, which reacts to theme changes and global `AppConfig` (Branding, Payment, Day Rules, and Season Status).

---

## 2. Key Technical Implementations

### A. Dynamic Configuration Engine
The entire application is strictly **Config-Driven**. The `AppConfig` object controls:
- **Branding**: `seasonName` updates all shared Digital Pass headers and Report captions.
- **Financial Visibility**: The `payment` node toggles the display of all "Amount" and "Payment Mode" fields across the app.
- **Automated Food Pricing**: When `foodPriceEnabled` is active, the app looks up configured `vegPrice`, `nonVegPrice`, and optional **Parcel Prices** for each selected meal. It then aggregates these for all members to pre-populate the registration amount, minimizing manual entry errors.
- **Multi-Payment Support**: Subscriptions now support up to 3 separate payment entries per flat. Each entry tracks amount, mode (UPI, Cash, Bank Transfer), and optional Transaction ID. The system automatically migrates legacy single-payment records into the new array-based structure.
- **Functional Rules**: `days[]` controls enabled meals, dietary options, parcel support per slot, the **Done** lifecycle status, individual meal prices, and the **Current** active meal prioritization. **Only 1 Current Meal is allowed per season**, and toggling it ON in settings automatically deactivates others across all days. The system automatically enforces that a meal can only be "Current" if it is both enabled and not marked as "Done".
- **Settings State Isolation**: To ensure a smooth administrative experience, the `SettingsScreen` isolates its local form state from the application's 10-second periodic background synchronization. The form re-initializes from the database only on mount or after a successful save operation, preventing data loss during active typing or day management.
- **Smart Change Detection**: Employs a `pristine` state snapshot to detect modifications. Buttons are only enabled if the live form differs from the initial load, accounting for data normalization.
- **Global Feature Toggles**: Controlled by `guestEnabled` and `mobileEnabled` flags to streamline the UI based on event needs.
- **WhatsApp Country Code**: `whatsappCountryCode` defines the default country code prefix appended to registered mobile numbers during direct pass distribution via WhatsApp, ensuring seamless messaging across global regions without manual formatting.

### B. Centralized UI String & Type Management
The application employs a **Zero-Hardcoding Policy** for UI text and Domain entities.
- **Strings**: All text is defined in `src/strings.ts`. 
- **Enums**: Utilizes TypeScript `enum` for `MealType`, `DietType`, `DietaryOption`, `AppScreen`, `ReportType`, and `PaymentMode` to ensure type safety and eliminate string-based errors during navigation and logic evaluation.
- **Localization Ready**: The infrastructure is in place to support multiple languages by swapping the `UI_TEXT` object.

### C. Real-Time Synchronization Strategy
- **Granular Deep-Path Updates**: To optimize performance, the system avoids sending large JSON objects to Firebase. Instead, it utilizes deep-path references (e.g., `menu/dayId/mealKey/field`) for operational updates like guest count increments or marking food as taken.
- **Transition-Based Sync**: Triggers a silent fetch whenever the `screen` state changes.
- **Periodic Background Refresh**: Runs every 10 seconds. This is critical for synchronizing "Food Taken" counts and "Guest Demand" in a multi-user environment.

### D. Navigation & View State Management
- **History Stack**: A React-state-based array in `NavigationContext.tsx` tracks navigation depth using the `AppScreen` enum. `goBack()` pops the stack, while navigating to "home" clears it entirely.
- **State Hoisting**: Crucial UI states like the `ReportScreen` active tab/filters and the `SubscriptionListScreen` search text are hoisted to the `NavigationContext`. This ensures UI continuity during sub-navigation.

### E. Global Error Handling Infrastructure
- **UI Error Interceptor**: Integrates `showGlobalError()` within `UIContext.tsx`. This headless layer translates runtime database synchronization warnings (`firebaseError`) into interactive modal cards that inherit high-contrast text and layout padding variants depending on active theme states.
- **Interactive Banners**: Provides pressable error summary strips on primary dashboards that toggle detail windows upon tap discoverability events.

### F. Dynamic Theme & Responsive Engine
- **Context System**: Built on React Context API (`ThemeProvider`), facilitating instant styling updates without re-mounting the component tree.
- **Hook Architecture**: `useAppTheme()` provides raw theme tokens, while `useStyles()` provides memoized, theme-specific and **dimension-aware** styles generated via `createStyles`.
- **Responsive Logic**: Integrates `useWindowDimensions` to automatically apply a centered, 600px max-width layout on large displays (>768px), ensuring consistent UI density across mobile, web, and tablet.
- **Local Persistence**: User-specific preferences (like theme) are decoupled from the Firebase global state and stored using `AsyncStorage`.

### F. Layout & Scrollability Optimization
- **Full-Width ScrollViews**: Every primary container uses `style={{ flex: 1, width: '100%' }}` and `contentContainerStyle={{ flexGrow: 1 }}` to ensure touch events are captured across the entire viewport and content remains scrollable even when vertically centered.
- **Modern Safe Areas**: Implements generous bottom paddings (up to 150px) to prevent interactive components (Login buttons, FABs, footers) from being obscured by modern OS home indicators.

### G. Guest Management & Counter Logic
- **Module Interface**: The `GuestManagementScreen` provides a high-density matrix for updating guest demand and collections in real-time.
- **Current Meal Flow**: Prioritizes the active "Current Meal" at the top of the list for rapid entry during peak hours. It adopts the same "LIVE" badge and focused styling used on the main kitchen dashboard to maintain a unified operational experience.
- **Interactive People Counter**: The registration form utilizes the `CounterInput` for headcount management, enforcing a minimum of 1 member and automatically synchronizing with the person-wise dietary choice matrix.
- **Permission Mapping**:
    - `guestVeg`, `guestNonVeg`, `guestTotal`: Editable by **Admin** only.
    - `guestVegTaken`, `guestNonVegTaken`, `guestTaken`: Editable by **Admin** and **Vendor**.
- **Auto-Calculation**: In dual-diet mode (Veg + Non-Veg), the "Total" and "Taken" metrics are derived values, ensuring the summary always matches the specific counts.
- **Reverse Validation**: The `CounterInput` enforces strict data integrity using `min` and `max` props:
    - **Min Demand**: Demand (Veg/Non-Veg) cannot be lowered below the current "Taken" count.
    - **Max Collection**: "Taken" count cannot exceed the current planned Demand.
- **Global Sync**: Guest data is stored within the `FoodMenu` object in Firebase, ensuring that Dashboard metrics remain read-only and consistent across all user sessions.

### H. Data Normalization Layer
Implemented in `src/repository.ts`, `normalizeRecord` ensures that the local matrices (Person x Day x Meal) are always correctly sized and shaped. It also manages the **Legacy Payment Migration**, automatically converting single-field amount/mode data into the new multi-payment `payments[]` array. Renamed `PujaDay` to `EventDay` to support generic event scheduling.

### I. Digital Pass, Analytics & Home Layout
- **High-Density Responsive Home Card**: The primary home page action summary tile leverages a high-density horizontal layout scheme. It dynamically adjusts font sizes, padding, and layout orientation based on device width to prevent breaking on smaller screens. It shifts pass and member counts into parallel side-by-side matrices and introduces a micro-partition divider for payment aggregation data, compressing card dimensions and increasing vertical space for action grids. Features a centered background watermark icon for enhanced branding.
- **Live Service Deep-Linking**: Integrates a `Pressable` shortcut layout within the card structure positioned at the top-right. If a specific event meal is globally marked as active, volunteers can tap the live status indicator badge to route straight to the kitchen metrics layout.
- **Visual Completion Indicators**: The operational dashboard visually dims (reduces opacity to 0.5) meal sections that are marked as "Done". Individual sections are outlined with thin borders to better segregate high-density kitchen metrics.
- **Operational Summary snapshot**: The dashboard's main event card includes a real-time snapshot of the "Current Meal" demand (Total, Veg, Non-Veg) and actual collection status, allowing kitchen managers to focus on the immediate workload without scrolling through day-wise matrices. Within each meal section, the **Total Taken** metric is strategically placed at the end of the grid to serve as the final reconciliation anchor.
- **Modular Component Architecture**: The reporting system is broken down into specialized components (e.g., `DayWiseReport`, `PaymentSummaryReport`) located in `src/components/report/`. This modularity allows for clean, focused rendering of complex data sets.
- **Headless Analytics (`useReportData`)**: All data aggregation logic is encapsulated in the `useReportData` custom hook. It calculates dietary splits, taken counts, and financial summaries synchronously from the global subscription state.
- **Image Generation**: Uses `captureRef` from `react-native-view-shot` to convert themed views into PNGs.
- **Detailed Transaction Audit**: The Payment Report features a dedicated section listing every flat with a breakdown of their individual part-payments, modes, member headcounts, and Transaction IDs, facilitating easier reconciliation and direct navigation to detailed pass information.
- **Enhanced Sharing**: On mobile, the app uses the `Share` API to attach generated PNGs. **Admin-only** access is enforced for pass sharing to maintain operational security.
- **WhatsApp API Integration**: Utilizes the `Linking` API with `wa.me` for direct, targeted chat initialization. Supports pre-populated formatted messages for Digital Pass distribution.
- **Contact Selection**: Integrates `expo-contacts` to allow admins to pick registration numbers directly from the device's address book, with automatic normalization of country codes (+91) and special characters.
- **Guest & Parcel Report Tabs**: Features specialized summaries for extra guest plates and meal-wise parcel requirements. These tabs are conditionally rendered based on the global `guestEnabled` flag and the `isParcelEnabled` setting within the festival configuration.
- **Financial Breakdown Logic**: The collection report implements a **"Parcel-First"** attribution logic: `Food Collection = Actual Total Paid - Calculated Parcel Price` (clamped at zero). This treats parcel surcharges as fixed hard costs, providing a conservative audit of food revenue.
- **Strongly Typed Payments**: Uses the `PaymentMode` enum for all financial logic. UI display mapping is handled by the `getPaymentModeLabel` helper to maintain localization consistency.
- **Scanner Workflow**: Employs a `ref`-based synchronous lock to prevent duplicate scans. Invalid QR codes trigger a blocking alert that redirects to the Subscriptions list for manual intervention.

---

## 3. Security & Session Management

### Role-Based Access Control (RBAC)
- **Database Node**: `auth_config` stores staff credentials and roles.
- **Admin**: Full write/delete access. Exclusive permission to edit **Guest Total** plates on the kitchen dashboard.
- **Vendor**: Read-only access to subscriptions and restricted "Taken" status updates.

### Global Read-Only Mode
Controlled via the `seasonEnabled` config flag. When disabled, the application enforces strict Read-Only mode globally:
- Hides all "Save", "Add", and "Delete" actions.
- Disables all text inputs and toggles.
- Hides QR sharing functionality.
- Fades out disabled configuration blocks in Settings for visual feedback.

### Session Lifecycle
- **Ephemeral Persistence**: Login state is stored in React state only. Users are prompted for credentials every time the app is launched.
- **Auto-Logout**: A `sessionStartTime` state is tracked. If the app remains open for more than 24 hours, the background refresh cycle triggers an automatic `handleLogout`.

---

## 4. Component-Based Model

### A. Common & Layout Components
| Component | Responsibility |
| :--- | :--- |
| `ActionLabel` | Combines Ionicons and labels. Supports horizontal rows and vertical tiles. |
| `Dropdown` | Modal-based selector optimized with 18px padding for touch accuracy. |
| `CustomAlert` | Themed, high-contrast replacement for system dialogs. |
| `HomeButton` | Fast-access dashboard navigation positioned in the primary header group. |
| `LogoutButton` | Circular icon-only session terminator with high visual consistency. |

### B. Specialized Metric Tiles
- **Dashboard Metrics**: Sleek, earthy-toned cards with high-precision typography.
- **Collection Metric**: Formats currency (Rs) and breakdown for enabled payment modes.

---

## 5. UI/UX Architecture

### Layout Optimization
- **Sleek Navigation Bar**: Top-level headers utilize a standardized height and icon-only interaction model. Back and Home actions are anchored to the left, while session management (Logout) is anchored to the far right.
- **Compact Home Grid**: The action grid on the home page features space-saving **72px high tiles** with **20px icons**, optimized for high-density information display.
- **Dynamic Summary Card**: The dashboard header card automatically uses the global `seasonName` and dynamically hides 0-counts for dietary types that are disabled in the festival configuration.
- **Colorful Premium Palette**: Primary info boxes use a high-contrast palette of pastel colors (`CARD_COLORS`) defined in `src/theme/` for instant visual segmentation.
- **Quick-Action Tiles**: Home page grid replaces basic list views for a "sleek" entry experience.
- **Home Summary Analytics**: Centralized card displaying both **Active Pass Count** and **Total Registered Members** for high-level event monitoring.
- **Dedicated Subscription Screen**: Offloads pass management to a standalone screen with high-performance search.
- **Compact Selectors**: Uses "P1", "P2" for members and 4-char abbreviations for days.
- **Password Toggle**: Integrated visibility switch in the Login screen.
- **Dashed Interactive Cues**: Editable metrics (Guest counts) are highlighted with bold dashed borders and 15% opacity themed background tints for discovery.
- **Adaptive Buttons**: "Add Item" button changes color based on the selected dietary type (Green/Red).

---
© 2026 Eternia Food Desk Technical Team
