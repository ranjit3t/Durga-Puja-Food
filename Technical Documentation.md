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
- **Functional Rules**: `days[]` controls enabled meals, dietary options, and parcel support per slot.

### B. Centralized UI String Management
The application employs a **Zero-Hardcoding Policy** for UI text. All strings are defined in `src/strings.ts`. 
- **Consistency**: Prevents terminology drift (e.g., mixing "Veg" and "Vegetarian").
- **Scalability**: Allows for instant global updates to labels or placeholders.
- **Localization Ready**: The infrastructure is in place to support multiple languages by swapping the `UI_TEXT` object.

### C. Real-Time Synchronization Strategy
- **Transition-Based Sync**: Triggers a silent fetch whenever the `screen` state changes.
- **Periodic Background Refresh**: Runs every 10 seconds. This is critical for synchronizing "Food Taken" counts and "Guest Demand" in a multi-user environment.

### D. Navigation & View State Management
- **History Stack**: A React-state-based array in `App.tsx` tracks navigation depth. `goBack()` pops the stack, while navigating to "home" clears it entirely.
- **State Hoisting**: Crucial UI states like the `ReportScreen` active tab/filters and the `SubscriptionListScreen` search text are hoisted to the root `App` component. This ensures UI continuity during sub-navigation.

### E. Dynamic Theme & Responsive Engine
- **Context System**: Built on React Context API (`ThemeProvider`), facilitating instant styling updates without re-mounting the component tree.
- **Hook Architecture**: `useAppTheme()` provides raw theme tokens, while `useStyles()` provides memoized, theme-specific and **dimension-aware** styles generated via `createStyles`.
- **Responsive Logic**: Integrates `useWindowDimensions` to automatically apply a centered, 600px max-width layout on large displays (>768px), ensuring consistent UI density across mobile, web, and tablet.
- **Local Persistence**: User-specific preferences (like theme) are decoupled from the Firebase global state and stored using `AsyncStorage`.

### F. Layout & Scrollability Optimization
- **Full-Width ScrollViews**: Every primary container uses `style={{ flex: 1, width: '100%' }}` and `contentContainerStyle={{ flexGrow: 1 }}` to ensure touch events are captured across the entire viewport and content remains scrollable even when vertically centered.
- **Modern Safe Areas**: Implements generous bottom paddings (up to 150px) to prevent interactive components (Login buttons, FABs, footers) from being obscured by modern OS home indicators.

### G. Guest Management & Counter Logic
- **Module Interface**: The `GuestManagementScreen` provides a high-density matrix for updating guest demand and collections in real-time.
- **Permission Mapping**:
    - `guestVeg`, `guestNonVeg`, `guestTotal`: Editable by **Admin** only.
    - `guestVegTaken`, `guestNonVegTaken`, `guestTaken`: Editable by **Admin** and **Vendor**.
- **Auto-Calculation**: In dual-diet mode (Veg + Non-Veg), the "Total" and "Taken" metrics are derived values, ensuring the summary always matches the specific counts.
- **Reverse Validation**: The `CounterInput` enforces strict data integrity using `min` and `max` props:
    - **Min Demand**: Demand (Veg/Non-Veg) cannot be lowered below the current "Taken" count.
    - **Max Collection**: "Taken" count cannot exceed the current planned Demand.
- **Global Sync**: Guest data is stored within the `FoodMenu` object in Firebase, ensuring that Dashboard metrics remain read-only and consistent across all user sessions.

### H. Data Normalization Layer
Implemented in `src/repository.ts`, `normalizeRecord` ensures that the local matrices (Person x Day x Meal) are always correctly sized and shaped. Renamed `PujaDay` to `EventDay` to support generic event scheduling.

### I. Digital Pass & Reporting
- **Image Generation**: Uses `captureRef` from `react-native-view-shot` to convert themed views into PNGs.
- **Analytics Engine**: Uses `useMemo` hooks to calculate demand splits between Residents vs. Guests for multiple payment modes and dietary choices.
- **Guest & Parcel Report Tabs**: Features specialized summaries for extra guest plates and meal-wise parcel requirements. These tabs are conditionally rendered based on the global `guestEnabled` flag and the `isParcelEnabled` setting within the festival configuration.

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
