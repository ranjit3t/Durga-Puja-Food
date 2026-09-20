# Technical Documentation - Eternia Food Desk

A comprehensive technical breakdown of the implementation, data flow, and architectural patterns within the Eternia Food Desk application.

## 1. Core Architecture
The application follows a **Serverless Modular Architecture** built on the **Expo React Native** framework, utilizing **Firebase Realtime Database** for synchronized persistence.

### High-Level Flow
1.  **Bootstrapping**: `App.tsx` initializes the `ThemeProvider` (loading local preferences), global state, navigation history stack, and checks for session validity.
2.  **Authentication**: `LoginScreen` (with theme toggle) verifies credentials against the `auth_config` DB node. It uses a **Two-Phase Transition Logic**: `verifying` (during credential fetch) and `loading` (after match, during data hydration).
3.  **Hydration**: Upon login or screen transition, the app performs a full fetch of subscriptions, menu, and configuration.
4.  **Backdrop Layering**: The `AppNavigator` serves as a master layout shell, injecting **9 dynamic mesh gradient blobs** behind the `screenComponent`. These circles utilize high-contrast festive tones (Crimson, Marigold, Royal Blue, Violet) that adapt to theme modes.
5.  **Navigation**: Custom history stack management allows predictable back navigation, including Android hardware button support. History is automatically purged upon returning to the root Home screen.
6.  **Presentation**: UI elements are rendered dynamically using the `useStyles` hook, which reacts to theme changes and global `AppConfig`. All primary panels use **Shadow-Free Glassmorphism** to allow background mesh glows to bleed through seamlessly.

---

## 2. Key Technical Implementations

### A. Dynamic Configuration Engine
The entire application is strictly **Config-Driven**. The `AppConfig` object controls:
- **Branding**: `seasonName` updates all shared Digital Pass headers and Report captions.
- **Financial Visibility**: The `payment` node toggles the display of all "Amount" and "Payment Mode" fields across the app.
- **Automated Food Pricing**: When `foodPriceEnabled` is active, the app looks up configured `vegPrice`, `nonVegPrice`, and optional **Parcel Prices** for each selected meal. If **Kids Support** is enabled, it also applies separate `kidsVegPrice`, `kidsNonVegPrice`, and kids-specific parcel surcharges. It then aggregates these for all members (A/K) to pre-populate the registration amount, minimizing manual entry errors.
- **Kids Support**: `kidsEnabled` toggles separate tracking for children. When active:
  - Registration UI splits headcount into **Adults** and **Kids**.
  - Member legends change to **A1, A2...** and **K1, K2...**.
  - Dashboard and Reports show segregated metrics (Adult vs Kids).
  - Terminology across the app switches from generic "Person/Persons" to specific "Adults" and "Kids", respecting singular/plural grammar rules based on current counts.
  - The Subscription List includes a specialized **Kids filter** with real-time pass counts.
- **Multi-Payment Support**: Subscriptions now support up to 3 separate payment entries per flat. Each entry tracks amount, mode (UPI, Cash, Bank Transfer), and metadata:
  - **UPI/Bank Transfer**: Includes an optional **Transaction ID** field.
  - **Cash**: Includes an optional **Received By** text field to document which volunteer or committee member collected the physical currency.
  - In reporting, metadata is hidden if empty to maintain a clean audit trail.
- **Functional Rules**: `days[]` controls enabled meals, dietary options, parcel support per slot, the **Done** lifecycle status, individual meal prices, and the **Current** active meal prioritization. **Only 1 Current Meal is allowed per season**, and toggling it ON in settings automatically deactivates others across all days. The system automatically enforces that a meal can only be "Current" if it is both enabled and not marked as "Done".
- **Settings State Isolation & Configuration Safety Guard**: To ensure a smooth administrative experience, the `SettingsScreen` isolates its local form state from the application's 10-second periodic background synchronization. Every configuration block (e.g., Global Rules, Individual Festival Days) features its own **Save** button, allowing admins to persist changes immediately without full-page scrolling. Additionally, a **Safety Guard** is implemented: if at least one pass exists in the system, manually toggling **OFF** any enabled feature (Global switches, Day status, or Meal options) triggers a mandatory confirmation dialog ("Disabling the toggle may require some manual adjustments in the application. Are you sure to proceed?"). This ensures that critical operational rules are not accidentally changed mid-event.
- **Smart Change Detection & Validation**: Employs a `pristine` state snapshot to detect modifications. Buttons are only enabled if the live form differs from the initial load (accounting for data normalization) and strict data integrity rules are met.
- **Pass Deletion Safeguards**: Implements a "Trust-Initial-Load" strategy for deletions. The delete button is functionally locked (disabled with 40% opacity) if the record was loaded with either:
  1.  **Financial Value**: A non-zero `amount` (when payment tracking is active).
  2.  **Operational History**: At least one `taken` entry in the food or parcel matrix.
  This logic ignores local unsaved form edits, ensuring users cannot bypass distribution history rules to force a deletion.
- **Global Feature Toggles**: Controlled by `guestEnabled` and `mobileEnabled` flags to streamline the UI based on event needs.
- **WhatsApp Country Code**: `whatsappCountryCode` defines the default country code prefix appended to registered mobile numbers during direct pass distribution via WhatsApp, ensuring seamless messaging across global regions without manual formatting.

### B. Centralized UI String & Type Management
The application employs a **Zero-Hardcoding Policy** for UI text and Domain entities.
- **Zero-Hardcoding Policy**: Every single string displayed in the UI is retrieved from `src/strings.ts`. This includes labels, button text, error messages, and even micro-delimiters like `pipe (" | ")`, `plus (" + ")`, and `space (" ")`. This architecture ensures that changing a term (like "Adult" to "Person") or translating the app requires editing only one file.
- **Status Bar Centralization**: Status bar styles are controlled via the `StatusBarStyleMode` enum, ensuring consistent dark/light mode integration without manual string checks.
- **Enums**: Utilizes TypeScript `enum` for `MealType`, `DietType`, `DietaryOption`, `AppScreen`, `ReportType`, `PaymentMode`, `FilterMode`, and `AppThemeMode` to ensure type safety and eliminate string-based errors during navigation and logic evaluation.
- **Localization Ready**: The infrastructure is in place to support multiple languages by swapping the `UI_TEXT` object.

### C. Real-Time Synchronization Strategy
- **Granular Deep-Path Updates**: To optimize performance, the system avoids sending large JSON objects to Firebase. Instead, it utilizes deep-path references (e.g., `menu/dayId/mealKey/field`) for operational updates like guest count increments or marking food as taken.
- **Transition-Based Sync**: Triggers a silent fetch whenever the `screen` state changes.
- **Periodic Background Refresh**: Runs every 10 seconds. This is critical for synchronizing "Food Taken" counts and "Guest Demand" in a multi-user environment.

### D. Navigation & View State Management
- **History Stack**: A React-state-based array in `NavigationContext.tsx` tracks navigation depth using the `AppScreen` enum. `goBack()` pops the stack, while navigating to "home" clears it entirely. To ensure a professional user experience, the system implements a **Unified Pass Lifecycle**—navigating between **View Pass**, **Edit Pass**, and **Digital Pass** replaces the current screen in history to prevent circular "back button" loops.
- **Identity Locking**: To maintain the permanent QR identity of each pass, the system automatically locks the **Block No.** and **Flat No.** fields in the `SubscriptionForm` when in Edit mode. This ensures that the primary key of the record (which is used to generate the QR code) remains immutable after creation.
- **State Hoisting**: Crucial UI states like the `ReportScreen` active tab/filters and the `SubscriptionListScreen` search text are hoisted to the `NavigationContext`. This ensures UI continuity during sub-navigation.
- **Interactive Details & Menu Navigation**: The `DetailsScreen` and `ViewMenuScreen` feature multiple deep-linking entry points:
  - **Quick Edit (Pass)**: A pencil icon in the identity card routes to the `SubscriptionForm`.
  - **Quick Edit (Menu)**: A circular pencil icon in each day card of the `ViewMenuScreen` routes to the `MenuEditorScreen`.
  - **Targeted Auto-Scrolling**: Implemented a `targetDay` logic in the `NavigationContext`. When navigating between View Menu and Update Menu, the system automatically scrolls the targeted day into focus and highlights it with a primary-colored border.
  - **Audit Shortcut**: Tapping the payment summary card navigates to the `PaymentSummaryReport`.
  - **Menu verification**: Tapping the food plan card routes to the `ViewMenuScreen`.
- **Contextual Pass Highlighting & Filtering**: The `SubscriptionListScreen` implements real-time subscription detection and filtering. It cross-references each pass's `mealSlots` with the globally active "Current Meal".
  - **Markers**: Cards are decorated with specialized icons: **"restaurant"** (active service window), **"happy face"** (kids included), **"briefcase"** (parcels registered), and **"leaf"** (strictly vegetarian plan).
  - **Missed Meal Badge**: When the "Current Meal Missed" filter is active, cards display a **Red Circular Badge** in the top-right corner indicating the total number of members who have not yet collected their food (dine-in or parcel).
  - **Intelligent Filter bar**: The themed "Filter Chips" (`All`, `Current Meal`, `Current Meal Missed`, `Kids`, `Parcels`, and `Veg Only`) intelligently collapse if no qualified passes exist, ensuring a clean interface during off-peak hours.
  - **Visibility Rules**: The "Current Meal" and "Missed" chips only appear during an active service window and if relevant pending collections exist.

- **Integrated Resident Communication**: Both the `SubscriptionListScreen` and `DetailsScreen` leverage the `Linking` API to provide direct communication paths.
  - **Auto-Injection**: If a pass contains a valid mobile number, the system automatically injects WhatsApp and Phone icons into the UI.
  - **Placement**: Icons are positioned at the bottom of pass cards in the subscription list, and within the themed **Pass Identity card** (bottom section) in the details view. This provides high-density access while maintaining brand aesthetics.
  - **Contextual Formatting**: WhatsApp links utilize the globally configured `whatsappCountryCode` for seamless message initialization.

### E. Global Error Handling Infrastructure
- **UI Error Interceptor**: Integrates `showGlobalError()` within `UIContext.tsx`. This headless layer translates runtime database synchronization warnings (`firebaseError`) into interactive modal cards that inherit high-contrast text and layout padding variants depending on active theme states.
- **Interactive Banners**: Provides pressable error summary strips on primary dashboards that toggle detail windows upon tap discoverability events.

### F. Dynamic Theme & Responsive Engine
- **Context System**: Built on React Context API (`ThemeProvider`), facilitating instant styling updates without re-mounting the component tree.
- **Hook Architecture**: `useAppTheme()` provides raw theme tokens, while `useStyles()` provides memoized, theme-specific and **dimension-aware** styles generated via `createStyles`.
- **Scaling Utilities (`useScaling`)**: A core utility hook that provides two transformation functions used across all screens:
    - **`s(size)`**: Scales a numeric value based on a `scalingFactor`. On Web, this increases by **15-30%** to ensure legibility on desktop monitors.
    - **`v(size)`**: Applies a vertical compaction multiplier (**0.85x - 0.9x**) on Web. This allows dense screens like the Dashboard and Home grid to fit within a single viewport height.
- **Responsive Logic**: Integrates `useWindowDimensions` to automatically apply a centered, 600px max-width layout on large native displays (iOS/Android Tablets). On **Web browsers**, it implements a flexible "Centered Column" pattern that expands to fill the monitor while maintaining a readable maximum width for core content.
- **Web Polish**: Injects platform-specific CSS-like properties for web:
    - **`cursor: 'pointer'`**: Applied to all interactive `Pressable` components.
    - **`boxShadow`**: Higher fidelity shadows for cards and modals on desktop.
    - **Centered Modals**: Dropdown selectors and alerts appear centered in the browser window rather than sliding from the bottom.
- **Local Persistence**: User-specific preferences (like theme) are decoupled from the Firebase global state and stored using `AsyncStorage`.

### F. Layout & Scrollability Optimization
- **Full-Width ScrollViews**: Every primary container uses `style={{ flex: 1, width: '100%' }}` and `contentContainerStyle={{ flexGrow: 1 }}` to ensure touch events are captured across the entire viewport and content remains scrollable even when vertically centered.
- **Safe Area Insets**: Implements generous bottom paddings (up to 150px) to prevent interactive components (Login buttons, FABs, footers) from being obscured by modern OS home indicators.

### G. Immersive Mesh Background Implementation
The premium "Festive Mesh" backdrop is achieved via absolute absolute-positioned circles with large radial coverage:
- **Geometry**: Utilizes up to **9 dynamic circles** (`s(400)` to `s(700)` in diameter).
- **Positioning**: Pushed outside the viewport edges (`top: -240`, `left: -160`) to create soft corner blurs that eliminate sharp geometric outlines inside headers.
- **Adaptive Contrast**: Uses higher alpha weights (`0.24`–`0.26`) in **Light Mode** to ensure visibility against white backgrounds and tuned glowing values in **Dark Mode** for neon immersion.
- **Festive Palette**: Features a **Premium Warm & Festive** color combination: Crimson Red, Marigold Gold, Soft Royal Blue, and Deep Violet.
- **Web-Aware Expansion**: Automatically mounts 3 additional large `<View style={styles.bgBlobWeb...} />` elements when `Platform.OS === 'web'`, ensuring the entire horizontal canvas of a 4K monitor remains visually immersive.
- **Shadow-Free UI**: Global style tokens for `card` and `dashboardCard` were transitioned to a shadow-free design. By removing all `elevation` and `shadowColor` properties, the app eliminates the "white glow" around content columns, allowing the background blurs to be the sole source of visual depth.

### H. High-Vibrancy Status Badges
To maintain maximum visibility against the dynamic mesh background:
- **LIVE Indicator**: The activity log and service windows now utilize a solid, high-contrast **Success Green** background with white text and 8px circular "heartbeat" icons for instant recognition.
- **Dietary Markers**: Subscriptions and dashboard titles feature vibrant, color-coded badges (Leaf Green for Veg, Error Red for Non-Veg) with increased saturation.

### I. Guest Management & Counter Logic
- **Module Interface**: The `GuestManagementScreen` provides a high-density matrix for updating guest demand and collections in real-time. The interface utilizes a vertically-stacked input layout to maximize touch accuracy on mobile devices.
- **Current Meal Flow**: Prioritizes the active "Current Meal" at the top of the list for rapid entry during peak hours. It adopts the same "LIVE" badge and focused styling used on the main kitchen dashboard to maintain a unified operational experience. For meals supporting dual diets (Veg + Non-Veg), the module provides aggregated Guest Total and Guest Taken summaries to help administrators visualize the total workload.
- **Interactive People Counter**: The registration form utilizes the `CounterInput` for headcount management, enforcing a minimum of 1 member and automatically synchronizing with the person-wise dietary choice matrix.
- **Permission Mapping**:
    - `guestVeg`, `guestNonVeg`, `guestTotal`: Editable by **Admin** only.
    - `guestVegTaken`, `guestNonVegTaken`, `guestTaken`: Editable by **Admin** and **Vendor**.
- **Auto-Calculation**: In dual-diet mode (Veg + Non-Veg), the "Total" and "Taken" metrics are derived values, ensuring the summary always matches the specific counts.
- **Reverse Validation**: The `CounterInput` enforces strict data integrity using `min` and `max` props:
    - **Min Demand**: Demand (Veg/Non-Veg) cannot be lowered below the current "Taken" count.
    - **Max Collection**: "Taken" count cannot exceed the current planned Demand.
- **Global Sync**: Guest data is stored within the `FoodMenu` object in Firebase, ensuring that Dashboard metrics remain read-only and consistent across all user sessions.

### H. Data Normalization & Natural Sorting
Implemented in `src/repository.ts`, `normalizeRecord` ensures that the local matrices (Person x Day x Meal) are always correctly sized and shaped. It also manages the **Legacy Payment Migration**, automatically converting single-field amount/mode data into the new multi-payment `payments[]` array.

- **Dine-in vs Parcel Tracking**: Independent collection flags for `taken` and `takenParcel` ensure accurate reconciliation. In the distribution workflow, the "Parcel Taken" toggle only appears after the primary meal is marked as "Taken", preventing erroneous parcel-only collections. High-visibility **"P" badges** (12px, elevated) on collection matrices in the Details view provide instant verification.

The application also enforces a **Natural Alphanumeric Sorting** policy globally:
- **Implementation**: Uses `localeCompare(undefined, { numeric: true, sensitivity: 'base' })` in the `DatabaseContext` (for master list fetch) and `useReportData` (for all modular reports).
- **Logical Ordering**: This ensures that Block "2" correctly precedes Block "10", and alphanumeric flats (e.g., "3S", "30N") are sorted intuitively, matching the physical layout of the community.

### I. Digital Pass, Analytics & Home Layout
- **Intelligent Sorting & Navigation**:
    - **Current-Day-First Sort**: On the **Dashboard** and **Guest Management** screens, the day containing the active "Current Meal" is automatically hoisted to the top of the list for zero-scroll accessibility.
    - **Chronological Form Order**: On the **Subscription Form**, **Menu Viewer**, and **Reports**, days and meals (Breakfast $\rightarrow$ Lunch $\rightarrow$ Dinner) are displayed in their fixed chronological sequence to maintain data entry and viewing stability.
    - **Auto-Scroll Focus**: The form includes a `dayScrollRef` logic that automatically calculates the horizontal offset of the current day and performs an animated scroll to center it upon opening.
- **High-Density Responsive Home Card**: The primary home page action summary tile leverages a high-density horizontal layout scheme. It dynamically adjusts font sizes, padding, and layout orientation based on device width to prevent breaking on smaller screens. It shifts pass and member counts (including grammar-aware adults/kids breakdown), total plates (with synchronized dietary split), and guest totals into parallel matrices and introduces a micro-partition divider for payment aggregation data, compressing card dimensions and increasing vertical space for action grids. Features a centered background watermark icon for enhanced branding.
- **Responsive Dashboard & Menu Headers**: Individual meal sections, the primary event summary card, and menu display/editor screens utilize flexible wrapping headers (`flexWrap: 'wrap'`). This ensures that meal titles, active status badges (LIVE), dietary markers (Veg Only), and aggregated demand metrics adjust their layout gracefully on narrow screens without overflowing their container boundaries.
- **Live Service Deep-Linking**: Integrates a `Pressable` shortcut layout within the card structure positioned at the top-right. If a specific event meal is globally marked as active, volunteers can tap the live status indicator badge (which explicitly displays the active day and meal) to route straight to the kitchen metrics layout.
- **Visual Completion Indicators**: The operational dashboard visually dims (reduces opacity to 0.5) meal sections that are marked as "Done". Individual sections are outlined with thin borders to better segregate high-density kitchen metrics.
- **Operational Summary snapshot**: The dashboard's main event card includes a real-time snapshot of the "Current Meal" demand and actual collection status. It segregates requirements into three primary categories: **Adults**, **Kids**, and **Guests**. If Kids Support is disabled, member categories are unified under a single **Members** label. All categories utilize a shorthand dietary split and collection status (e.g., "**Adults: 45 (20V | 25N) (Taken: 10)**"). For single-diet service windows (Veg Only), shorthand splits are automatically hidden to maintain focus on the collection count. This snapshot allows kitchen managers to focus on the immediate workload without scrolling through day-wise matrices. 
- **Sectional Saving (Menu Editor)**: To minimize data transfer and provide immediate feedback, the `MenuEditorScreen` supports individual **Save** buttons for each meal section (Breakfast, Lunch, Dinner). These buttons are enabled only when the specific section has unsaved changes.
- **Dual Visualization (Grid/Chart)**: Within each meal section, the **Total Taken** metric is strategically placed at the end of the grid to serve as the final reconciliation anchor. Volunteers can toggle between a numeric `MealMetricGrid` and a visual `MealBarChart` using the bottom-left action bar. The bar chart provides a comparative view of "Planned" (faded) vs "Taken" (solid) plates for each dietary type (Veg, Non-Veg, Guest, Parcel).
- **High-Density Grouped Metrics**: Individual meal sections within the dashboard utilize a logical row-based grouping. Related fields like **Veg Demand** and **Veg Taken** are positioned adjacently. The system employs **Adaptive Labeling**: on single-diet days, it automatically removes redundant "Veg/Non-Veg" qualifiers from member and collection counts, simplifying the interface to focus on core counts (e.g., "Adults Taken" instead of "Adult Veg Taken").
- **Direct PNG Share (WhatsApp)**: Each meal section is equipped with a theme-aware WhatsApp export handler located at the bottom-right action bar. It captures the current state (Grid or Chart) exactly as seen by the user and generates a professional PNG image with localized operational captions.
- **Modular Component Architecture**: The reporting system is broken down into specialized components (e.g., `DayWiseReport`, `KidsReport`, `PaymentSummaryReport`) located in `src/components/report/`. This modularity allows for clean, focused rendering of complex data sets.
- **Headless Analytics (`useReportData`)**: All data aggregation logic is encapsulated in the `useReportData` custom hook. It calculates dietary splits, taken counts, and financial summaries synchronously from the global subscription state.
- **Image Generation**: Uses `captureRef` from `react-native-view-shot` to convert themed views into PNGs.
- **Detailed Transaction Audit**: The Payment Report provides a detailed audit trail grouped by **Payment Mode**. Each subsection features a vertical accent bar, subtotal, and transaction count. It lists individual line items with associated metadata where provided, facilitating easier reconciliation and direct navigation to detailed pass information. All entries within groups follow the **Natural Alphanumeric Sorting** policy.
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
- **Admin**: Full write/delete access. Exclusive permission to edit registration data, financials, and primary dietary plans.
- **Vendor**: Operational access. Limited to marking food/parcels as "Taken" and viewing reports. Restricted from modifying core registration or financial records.

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
- **Compact Home Grid**: The action grid on the home page features space-saving **64px high tiles** with **18px icons**, optimized for high-density information display using a flexible 4-column layout strategy.
- **Dynamic Summary Card**: The dashboard header card automatically uses the global `seasonName` and dynamically hides 0-counts for dietary types that are disabled in the festival configuration.
- **Colorful Premium Palette**: Primary info boxes use a high-contrast palette of pastel colors (`CARD_COLORS`) defined in `src/theme/` for instant visual segmentation.
- **Quick-Action Tiles**: Home page grid replaces basic list views for a "sleek" entry experience.
- **Home Summary Analytics**: Centralized card displaying both **Active Pass Count** and **Total Registered Members** for high-level event monitoring.
- **Dedicated Subscription Screen**: Offloads pass management to a standalone screen with high-performance search.
- **Compact Selectors**: Uses "P1", "P2" for members and 4-char abbreviations for days.
- **Password Toggle**: Integrated visibility switch in the Login screen.
- **Dashed Interactive Cues**: Editable metrics (Guest counts) are highlighted with bold dashed borders and 15% opacity themed background tints for discovery.
- **Adaptive Buttons**: "Add Item" button changes color based on the selected dietary type (Green/Red).
- **Bug Reporting Engine**: Administrators have access to a "Report Bug" shortcut on the Home screen. This utility leverages the `Linking` API to open the native mail app with the support email and subject line retrieved from `src/strings.ts`.

### K. Activity Log & Audit System
The application maintains a permanent, asynchronous audit trail of all significant operations.
- **Log Structure**: Each log entry (`ActivityLog`) includes a unique ID, high-resolution timestamp, the performing username, hardware metadata (OS and Version), **Application Version**, the target module, the action type, and a user-friendly description. For failure events, the system also captures the full **JavaScript Stack Trace**.
- **Unified Visual Language**: To ensure seamless architectural consistency, the Activity Log utilizes the same **Festive Mesh Backdrop** and **Shadow-Free Glassmorphic Cards** as the rest of the application. Individual log items dynamically cycle through the `cardColors` registry (Crimson, Marigold, Royal Blue, Violet) and feature high-contrast `1.5px` borders.
- **Interactive Deep-Linking**: Logs for Pass creation and updates are now clickable, allowing administrators to instantly navigate to the `DetailsScreen` for the associated `targetId`.
- **Rich Transaction Metadata**:
  - **Subscriptions**: Logs include detailed demand breakdowns per day (Veg/Non-Veg/Parcel) and collection history (Total Taken vs. Previous state).
  - **Menu Management**: Captures exactly which dishes were added or removed (e.g., `+V:[Kheer] | -N:[Egg Curry]`) and specific price adjustments for Adults and Kids.
  - **Configuration**: Tracks state transitions for global flags (Season status, Guest/Kids support), accepted payment method modifications, and internal rule changes for festival days (e.g., `LUNCH(Enabled:OFF,Parcel:ON)`).
- **Asynchronous Capture**: To ensure zero impact on user experience, logs are dispatched to the repository in an asynchronous fire-and-forget manner (`void repository.addActivityLog(...)`).
- **Live Monitoring Dashboard**: The `ActivityLogScreen` functions as a live status feed, auto-refreshing every 10 seconds with a visual "LIVE" indicator and heartbeat sync heartbeat.
- **Advanced Forensics**: Administrators can perform keyword searches over descriptions and apply granular filters by **User**, **Event Module**, **Target Object**, **Date**, or **Errors Only**.
- **Sorting**: Features toggleable **Chronological Sorting** (ASC/DESC) to view audit trails in either direction.
- **Diagnostics**: Error logs are visually emphasized with red accents and feature an interactive toggle to expand technical stack traces directly within the UI.
- **Forensic Export**: One-tap export of the active filtered view to a `.txt` file for external auditing. Supports native file saving on Web and Share API on Mobile.
- **Event Coverage**:
  - **Subscriptions**: Creation, updates (including headcounts/amounts), deletions, and direct communications (Chat/Call).
  - **System Errors**: Automated reporting of database failures, validation errors, and runtime exceptions with technical context.
  - **Menu Distribution**: Menu item updates, price changes, and operational status toggles.
  - **Guest Management**: All manual adjustments to guest demand and collection counts.
  - **Configuration**: All changes to global festival rules and day-specific settings.
  - **Operations**: QR code scans (success/fail), pass image sharing, and downloads.
  - **Collaborative Notes**: Creation, updates, and deletion of operational notes by users, with full historical logging of these actions.
  - **Security**: Successful logins, failed login attempts (tracking username), and Logouts.

### L. Operational Sequencing & Write Protection
The application implements strict **Bi-Directional Temporal Data Governance** to ensure operational accuracy:
- **Meal Ordering**: Established a strict chronological sort order: `DayIndex` $\rightarrow$ `MealIndex (B=0, L=1, D=2)`.
- **Logic Helpers**: Centralized utilities in `constants.ts` determine if a specific slot is `current`, `in future`, or `done`.
- **Dynamic Lock Propagation**:
  - **Future Meal Protection**: The `SubscriptionForm` and `GuestManagementScreen` lock all "Taken" collection counters for future slots relative to the "Current Meal", preventing forward-dated entries.
  - **Add Pass Historical Lock**: The `SubscriptionForm` blocks **Meal Plan (Choice)** and **Parcel Registration** for past meals specifically when creating *new* records.
  - **Edit Pass Granularity**: For *existing* records, historical meal plans remain editable until the slot is marked as **Done** in global settings, allowing for post-service corrections without compromising current kitchen counts.
  - **Analytical Reports**: The `ReportScreen` dynamically filters the Day and Meal selectors for the **"Food Not Taken"** report, ensuring that future service windows are hidden from the pending list for operational clarity.
  - **Operational & Financial Safety Rails**: The `SettingsScreen` prevents deactivation of features if active data exists.
      - **Global Payment Lock**: Switching off "Payment Integration" is blocked if any pass has non-zero amount. Alert: *"Payment integration cannot be switched..."*.
      - **Channel Lock**: Switching off UPI/Cash/Bank is blocked if any existing entry uses that mode. Alert: *"Payment channel cannot be switched off..."*.
      - **Kids Support Lock**: Disabling is blocked if any pass has registered children. Alert: *"Kids support cannot be switched off..."*.
      - **Guest Mode Lock**: Disabling is blocked if any guest plates are planned for any meal. Alert: *"Guest mode cannot be switched off as guest already subscribed"*.
      - **Subscription-Aware Status Lock**: Disabling a **Festival Day** or **Meal Slot** is blocked if active subscriptions depend on them. Alert: *"Day/Meal cannot be switched off..."*. The **Delete Day** button is Red and strictly disabled for such active days.
  - **Season Lifecycle Safety**: The "Season Status" toggle can only be switched off if all enabled meals across the festival are marked as **Done**. Alert: *"Season cannot be switched off unless all meals... are marked done or disabled"*.
  - **Veg-Only & Parcel Support Safety**: The `SettingsScreen` automatically disables the **Veg-Only** toggle for a day if any of its meals are marked as **Done**. Similarly, the **Parcel Support** toggle is disabled for individual meals once they are completed.
  - **Headcount Reduction Guard**: The `SubscriptionForm` locks the Adult and Kid counters (using the `min` prop) to their **initial load values** if the pass is active.
  - **Optimized Administrative Workflow**: Generic confirmation boxes have been removed for all logic-guarded toggles, including Season, Kids, Guest, Payment, and Meal availability, providing a faster and more professional administrative experience.
  - **State Stability**: If no meal is currently active in settings, all slots remain writable for historical correction or pre-event planning.
- **Dependency Guard**: The `takenParcel` toggle visibility is strictly dependent on the primary `taken` status being `true`. The application logic ensures that if a primary meal is unmarked as taken, its associated parcel collection flag is also automatically reset to `false`.
- **Missed Collection Logic**: The "Current Meal Missed" filter identifies flats where at least one member has an active dietary choice for the current window but has collected neither the dine-in plate nor the takeaway parcel.
- **Intelligent Report Focus**: Upon selecting the **"Meal Not Taken"** (Pending) or **"Kids Meal"** report tabs, the system automatically detects, selects, and scrolls to the globally active **Current Meal**, providing administrators with immediate access to relevant service data.
- **Parcel Inconsistency Alert**: During pass editing, if a globally active **Current Meal** is enabled, the system checks for inconsistencies. If a member has opted for a parcel but only the primary meal (dine-in) was marked as taken, a mandatory confirmation alert triggers before saving, ensuring comprehensive data capture for the active service window.

### M. Configuration Lifecycle Constraints
To prevent operational data corruption, the `SettingsScreen` enforces strict chronological rules for meal lifecycle states:
- **Marking as Done**: A meal can only be marked as `Done` if all preceding meals are already `Done` AND it is not a future meal (relative to the `Current` marker).
- **Unmarking as Done**: A meal can only be unmarked as `Done` if all subsequent meals are already unmarked.
- **Activating Current Meal**: A meal can only be set as `Current` if no future meal has already been marked as `Done`.
- **Deactivating Current Meal**: A `Current` marker cannot be removed unless all subsequent meals are unmarked (not `Done`).
- **Validation Alerts**: Violating these rules triggers specific operational alerts informing the administrator of the required sequence (Day 1 $\rightarrow$ Day N).

### N. Collaborative Notes Infrastructure
The application includes a decentralized note-taking system for operational coordination:
- **CRUD Operations**: Users can add, edit, and delete notes. A modal-based entry form captures a **Subject** and **Content**.
- **Role-Based Permissions**:
    - **Admins**: Can edit or delete any note in the system.
    - **Users**: Can only edit or delete notes that they personally created (tracked via `userName`).
- **Audit Integration**: Every note action (ADD, EDIT, DELETE, VIEW) automatically generates a corresponding entry in the global **Activity Log** for forensic tracking.
- **UI Architecture**: Modeled after the `ActivityLogScreen`, the notes list features pagination (20 items per page), keyword search, and toggleable chronological sorting. The system utilizes a **Modal Window** within the Notes page to facilitate **Add**, **Edit**, and **Read-Only View** modes based on context. Note cards utilize the cyclical themed palette for visual consistency.

### O. Admin Contacts Directory
- **Data Filtering**: The `ContactsScreen` automatically scans the subscription database and displays only those flats that have a non-empty `mobile` field.
- **Natural Sorting**: Implements the standard community-wide natural alphanumeric sorting (Block $\rightarrow$ Flat) to match the physical site layout.
- **Communication Integration**: Leverages the `Linking` API for one-tap actions:
    - **WhatsApp Chat**: Initializes a direct chat using the globally configured `whatsappCountryCode`.
    - **Cellular Call**: Triggers the device's native dialer.
- **Deep-Linking**: Clicking a contact card instantly navigates the administrator to the resident's full **Details Screen** for quick verification of their meal plan or payment status.
- **Audit Integration**: All communication attempts from this screen are captured in the **Activity Log** for transparency.

### P. High-Fidelity Theming System
The application features a robust, reactive theme architecture:
- **Zero Hard-Coded Colors**: A strict policy where UI components never use literal hex or RGB values. All colors are sourced from the `theme.colors` or `theme.cardColors` registries.
- **Dynamic Backdrop**: Mesh gradient blobs automatically adjust their intensity and hue-shift based on the active theme, maintaining a festive atmosphere while ensuring absolute readability.
- **Web Scaling**: The theme engine dynamically calculates scaling factors for desktop monitors, ensuring a "first-class" browser experience without the "tiny UI" common in mobile-to-web ports.

---
© 2026 Eternia Food Desk Technical Team
