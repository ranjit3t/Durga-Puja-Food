# Eternia Food Desk (Event Management)

A robust Expo React Native application designed for food admins and volunteers to manage feast subscriptions, daily menus, and meal distribution during large scale community events.

## ✨ Key Features

### 🔐 Security & Access Control
- **Database-Driven Authentication**: All user credentials, passwords, and roles are managed centrally in the Firebase Realtime Database (`auth_config` node). This allows for instant staff updates without code changes.
- **Session Security**: For maximum security, the app does not store persistent login state across app restarts. Users are prompted for a fresh login every time the app is launched.
- **Auto-Logout**: If the app stays open (foreground or background) for more than 24 hours, the session automatically expires, and the user is logged out.
- **Role-Based Permissions**:
    - **Admin**: Full access to register flats, update festival settings, edit menu items, report bugs via email, and delete records.
    - **Vendor**: Operational access to mark food and parcels as taken. Restricted from modifying registration data, financial records, or primary dietary choices.
- **Global Logout**: Quick-access logout button available in the header of every screen for secure session management.

### 📋 Subscription & Pass Management
- **Dedicated Pass List**: A standalone **Subscriptions** screen centralizes pass discovery with high-performance search and **Natural Alphanumeric Sorting**. The interface features a **Dynamic Filter Bar** that intelligently appears only when relevant operational filters (Current Meal, Kids, Parcels, or Veg Only) are available. Pass cards display visual markers—restaurant icon for active subs, happy icon for kids, briefcase icon for parcels, and a **leaf icon** for strictly vegetarian passes—for rapid scanning. Includes **Direct Contact Icons** (WhatsApp and Phone) for instant communication.
- **Digital Registration**: Register flats with block number, flat number, and headcount. **Flat Number is a mandatory field**. Supports optional **Mobile Number** registration with a native **Contact Picker** for fast entry. Features **Automated Food Pricing** that pre-calculates the subscription amount based on member choices and **Additional Parcel Surcharges**. Includes an **Interactive Member Counter** for quick headcount adjustments. Supports separate **Adult and Kids** counts (when enabled). Implements **Minimum Meal Validation**—the system prevents saving or generating QR codes if no dietary meals (Veg/Non-Veg) are selected for any person across the event duration.
- **Grammar-Aware UI**: The system intelligently handles **Singular and Plural forms** across all labels (e.g., "1 Adult" vs "2 Adults", "1 Kid" vs "2 Kids"). It also adaptively switches terminology—when Kids support is disabled, it reverts from "Adults/Kids" to generic "Person/Persons" to maintain a clean, relevant interface.
- **Smart Change Detection**: The Save buttons remain disabled until a meaningful change is detected in the form, preventing redundant updates.
- **Direct WhatsApp Integration**: Send professional "Digital Pass" images directly to a person's WhatsApp with a single tap. The system automatically opens a chat with the registered number and attaches the pass details as a formatted caption. **Restricted to Admin only**.
- **Interactive Reports**: Seamlessly jump from any flat record in the "Flat Wise" or "Pending" reports directly to its detailed pass information for instant verification.
- **Compact Member Selection**: Uses space-saving "P1", "P2", "P3" labels for selecting individual members, ensuring the interface remains usable for large groups.
- **Granular Meal Planning**: Configure food choices (Veg/Non-Veg/None) individually for each meal slot (Breakfast, Lunch, Dinner) for each person. Features **Sequential Collection Tracking**—staff first mark a meal as "Taken" (dine-in), which then unlocks a secondary toggle to record "Parcel Collection" if takeaway was registered.
- **Payment tracking (Optional)**: Dynamic configuration allows enabling/disabling payment tracking globally. Supports **Multi-Payment** entries (up to 3 per flat) with standardized modes (UPI, Cash, Bank Transfer) powered by a robust **PaymentMode Enum**.
- **Detailed Financial Audit**: The Payment Summary report provides a comprehensive audit trail grouped into **Mode-Specific Subsections** (UPI, Cash, Bank Transfer). Each section displays subtotals and transaction counts. It features individual entry tracking—if a flat makes multiple payments, each appears as a separate line item. Metadata like **Transaction ID** or **Received By** name is displayed where available (omitted if empty for a cleaner look). All organized via **Natural Alphanumeric Sorting**.
- **Smart Payment Validation**: The system automatically validates and falls back to an enabled payment method during edits if the previously selected mode has been disabled in settings.
- **Stable QR Identity**: Each flat gets a unique, permanent QR code based on its `block-flat` ID.
- **Professional Digital Pass**: Generates a branded "Digital Pass" image containing the Season Name, Flat ID, Headcount, and Instructions. Specifically excludes volatile meal details to ensure pass longevity.

### 🍛 Daily Menu & Operations
- **Live Menu Management**: Admins can update the daily menu for each meal. Items are added one-by-one with specific Veg/Non-Veg indicators. The editor features **Sectional Saving**—each meal slot (Breakfast, Lunch, Dinner) has its own dedicated Save button for immediate updates. The editor automatically prioritizes the **Current Meal** and displays a "LIVE" badge along with dietary tags (Veg/Non-Veg Only) for instant context. Upon successful saving of a section, the app **automatically redirects** the admin back to the "View Menu" screen and **auto-scrolls** to that specific day for immediate verification.
- **Enhanced Navigation**: The "View Menu" screen features a **circular pencil icon** on each day card for Admins. Clicking it deep-links directly to that day in the editor and automatically scrolls the view into focus.
- **Adaptive Add Button**: The "Add Item" (+) button in the menu editor dynamically changes color to Green (Veg) or Red (Non-Veg) based on the selected dietary type for instant feedback.
- **Admin Bug Reporting**: A dedicated "Report Bug" button on the home screen allows administrators to instantly initialize a pre-formatted email to the support team. Both the destination email and subject line are centrally managed in the string dictionary.
- **Dedicated Menu View**: A clean, non-editable view for volunteers to see the feast plan. It intelligently filters out empty slots, showing only days and meals with defined items. Features the same "LIVE" badge and dietary tags (Veg/Non-Veg Only) for operational consistency.
- **Guest Management Module**: A dedicated interface for managing extra guest plates. Accessible to both **Admins** and **Vendors** via a sleek "Guest" tile on the home screen. Features a vertically-stacked, touch-optimized input layout for maximum entry speed. Automatically prioritizes the **Current Meal** and **Current Day** at the top with a high-visibility **"LIVE" badge** and themed highlighting for active service. Dual-diet meals (Veg + Non-Veg) automatically display aggregated **Guest Total** and **Guest Taken** summary fields, while single-diet service windows feature descriptive "Veg Only" or "Non-Veg Only" visual indicators for instant administrative clarity.
- **Role-Based Guest Editing**: Only **Admins** can set the guest demand (Total, Veg, Non-Veg). **Vendors** are restricted to updating the collection counts (Taken) only.
- **Smart Data Integrity**: Implements "Reverse Validation"—you cannot decrease guest demand below what has already been collected, and you cannot mark more food as "Taken" than what is planned.
- **Kitchen Dashboard**: Real-time operational data showing exactly how many plates and parcels are needed. The main summary card dynamically displays the **Season Name** as its title and intelligently filters out disabled dietary types. It also features a dedicated **Current Meal Summary** subsection (if a current meal is active) that provides a horizontally-aligned snapshot of demand vs collections for the immediate service window. Automatically prioritizes the **Current Meal** and **Current Day** at the top with a high-visibility **"LIVE" badge** and themed highlighting for the active service.
- **Dual Visualization**: Each meal section supports two views:
    - **Metric Grid**: Standard numeric layout for detailed reconciliation.
    - **Bar Chart**: Visual comparative layout for rapid workload estimation (Planned vs Taken).
- **Professional Status Sharing**: Each meal section includes a **WhatsApp Share** button at the bottom action bar. It captures the current state (Grid or Chart) as a high-quality, theme-aware PNG image for instant distribution to kitchen groups.
- **Integrated Communication & Management**: Pass cards and the Details view feature **Direct Contact Icons** (WhatsApp and Call) if a mobile number is registered. The **Details View** also includes a high-visibility **Quick Edit Button** in the primary identity card, allowing administrators to instantly jump to the edit form.
- **Kids-Aware Operations**: On single-diet days (Veg Only / Non-Veg Only), the dashboard intelligently provides a breakdown of **Adults** and **Kids** requirements if children are present, ensuring the kitchen team has exact counts for different portion sizes or pricing tiers.
- **Meal Lifecycle Management**: Individual meal metrics are organized for rapid scanning, with the **Total Taken** count always appearing as the final data point. Completed meals are visually dimmed (reduced opacity) to signify they are no longer operational.
- **QR Scanner Fallback**: High-performance QR scanning with synchronous locking. Scanned invalid codes trigger a modal alert that automatically redirects the user to the **Subscriptions** list for quick manual lookup.
- **Dynamic Guest Metrics**: Guest plate totals on the dashboard are now read-only for all users, automatically synchronized from the data entered in the Guest Management module.
- **Sleek Financial Overview**: A professional, earthy-toned summary of total collections, visible only when payment integration is enabled.

### 📊 Advanced Reporting
- **Modular Reporting Engine**: A high-performance, component-based engine that generates specialized reports for Day, Meal, Guest, Kids, Parcel, Flat, and Payments. Powered by a centralized `useReportData` hook for consistent calculations.
- **Kids-Specific Audit**: A detailed report tracking kids' meal choices (Veg/Non-Veg) and their collection status per flat, facilitating accurate portion management and verification.
- **Dedicated Guest Report**: A specialized view for tracking extra guest plate collections (Veg/Non-Veg) across all event days.
- **Parcel-Wise Summary**: A detailed report tracking the total number of parcels needed per meal, categorized by dietary type (Veg/Non-Veg).
- **Conditional Reporting**: The "Guest" and "Parcel" tabs are intelligently hidden if those features are not enabled in the current season's configuration, ensuring a streamlined interface.
- **Payment Summary**: Comprehensive breakdown of UPI, Cash, and Bank Transfer collections. Includes a sub-section for **Food vs Parcel Collection** breakdown.
- **Space-Saving UI**: Features a horizontal scrollable selection bar for report types and compact selectors for Days and Meals.
- **Color-Coded Data**: All dietary text is intuitively color-coded (Green for Veg, Red for Non-Veg) for rapid scanning.
- **PNG Export**: Convert any report into a high-quality image and share it instantly via WhatsApp or Email.

### ⚙️ Dynamic Configuration (Zero-Code Customization)
- **Settings Screen**: Admins can manage the entire event structure directly from the app. Features **Sectional Saving**—each configuration block (Global, Day-specific) has its own dedicated Save button for immediate updates. Implements **Intelligent Post-Save Navigation**—after successfully updating configurations, the user is smoothly transitioned back to the main Home dashboard.
- **Current Meal Prioritization**: Admins can designate a "Current Meal" in settings. This meal automatically moves to the top of all registration forms, guest management inputs, and reports for maximum operational speed. The system automatically prevents disabled or completed meals from remaining as the "Current Meal".
- **Global Read-Only Mode**: A master **Season Status** toggle. When disabled, the entire app enters a read-only archive state—blocking all new registrations, edits, food collections, and QR code sharing.
- **Centralized String Dictionary**: Zero hardcoded strings in the UI components. All text is sourced from a central repository (`strings.ts`), ensuring 100% consistency across all screens and shared pass images.
- **Type-Safe Theming**: The theme system uses centralized enums (`AppThemeMode`, `StatusBarStyleMode`) for all mode switching and status bar styling, eliminating string-based errors.
- **Global Season Name**: A persistent setting in the database that dynamically updates the header of all shared Digital Passes and Reports.
- **WhatsApp Country Code Config**: Allows admins to define a default country code prefix (e.g., 91) globally so that the direct WhatsApp pass sharing API works seamlessly regardless of how individual mobile numbers are saved.
- **Dynamic Payment Rules**: Toggle global payment status and select enabled payment methods (UPI/Cash/Bank Transfer). Hides all financial fields globally if payments are disabled.
- **Automated Food Pricing**: Admins can set individual Veg/Non-Veg prices per meal slot. When enabled, the registration form automatically calculates and pre-populates the total payment amount based on person-wise selections.
- **Smart Save Logic**: The "Update All Settings" button intelligently detects changes and remains disabled until modifications exist.
- **Meal Lifecycle Management**: Admins can "Mark as Done" individual meal slots (e.g. Saturday Lunch). Once marked as done, the system locks all associated data for that meal—preventing any further additions, edits, or collection updates across all screens. Marking a meal as done also automatically removes its "Current Meal" status.
- **Automatic Menu Cleanup**: Deleting an event day from settings automatically scrubs all associated menu data from the database.
- **Veg Only Toggle**: Easily convert a day to "Veg only" mode, which simplifies the entire app UI for that day.
- **Labels & Abbreviations**: Custom display names and legends are centrally managed.

### 🎨 Polished & Responsive UI/UX
- **Fully Responsive Design**: The UI intelligently adapts to all screen sizes, from small mobile phones to large tablets and desktop browsers. On wide screens, content is automatically centered in a professional 600px column to maintain readability.
- **Global Error Notification Modal**: High-visibility error handling wrapper attached to the home action strip. Tapping database network exceptions surfaces details in a premium modal dialog box fully adhering to active light/dark design tokens.
- **Optimized for Modern Devices**: Specifically tuned for modern aspect ratios (like iPhone 16). All screens use a `flexGrow` scroll strategy with generous bottom paddings to ensure that interactive elements like the Login button and footer are never clipped by home indicators.
- **Dynamic Theming (Dark & Light Mode)**: Fully integrated theme system that supports high-contrast Dark Mode and a vibrant Light Mode. Users can toggle themes from both the Login and Home screens.
- **Persistent User Preference**: Theme selections are saved locally on the device using `AsyncStorage`, ensuring the app launches with the user's preferred aesthetic.
- **Sleek Navigation Bar**: Unified header design across all screens featuring compact **36px circular icon buttons**.
- **Contextual Navigation**: A dedicated **Home** button is positioned next to the Back button on all sub-pages for rapid dashboard access.
- **Icon-Only Header Actions**: Clean, professional interface achieved by removing text labels from header actions (Back, Home, Logout), using high-contrast themed colors for visibility.
- **Colorful Premium Palette**: Primary information boxes and daily menu cards use a vibrant, high-contrast palette of pastel colors (Red, Blue, Green, Orange, Purple, Cyan) for a modern and energetic aesthetic.
- **Real-Time Summary Card**: The Home screen summary card features a high-density, space-saving horizontal layout that neatly groups active passes and total members. It dynamically displays cumulative collection data when enabled, alongside an interactive deep-linking **LIVE** service shortcut badge. The card also features a large, centered background watermark icon for a premium look.
- **Contact-Aware Details View**: The **View Pass** (Details) screen intelligently integrates **Quick Contact Actions** (WhatsApp and Call) into the primary Pass Identity card if a mobile number is associated with the pass, enabling volunteers to reach residents instantly while reviewing their plan.
- **Navigation History Stack**: Implemented a robust history stack that ensures the "Back" button typically takes you to the previous screen. To streamline high-volume operations, the **View Pass** (Details) screen's back button is optimized to return directly to the **Home** dashboard, clearing the navigation history for a fresh start.
- **Visual Feedback**: Disabling a configuration section (Season or Day) in settings triggers a smooth **opacity-based fade-out**, providing clear visual confirmation of the inactive state.
- **Quick-Action Dashboard**: The Home page features a sleek, tile-based grid for fast access to core modules like Subscriptions, Scan QR, and Reports.
- **Password Visibility**: Added a "Show/Hide" toggle in the login field for user convenience.
- **Full Meal Names**: Replaced confusing abbreviations with full names ("Breakfast", "Lunch", "Dinner") in all primary selection buttons.
- **Optimized Layouts**: Touch-friendly dropdowns (18px spacing), elevated FAB positioning, and vertically stacked legends to prevent overflow.

---
© 2026 Eternia Festival Committee
