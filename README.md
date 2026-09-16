# Eternia Food Desk (Event Management)

A robust Expo React Native application designed for food admins and volunteers to manage feast subscriptions, daily menus, and meal distribution during large scale community events.

## ✨ Key Features

### 🔐 Security & Access Control
- **Database-Driven Authentication**: All user credentials, passwords, and roles are managed centrally in the Firebase Realtime Database (`auth_config` node). This allows for instant staff updates without code changes.
- **Session Security**: For maximum security, the app does not store persistent login state across app restarts. Users are prompted for a fresh login every time the app is launched.
- **Auto-Logout**: If the app stays open (foreground or background) for more than 24 hours, the session automatically expires, and the user is logged out.
- **Role-Based Permissions**:
    - **Admin**: Full access to register flats, update festival settings, edit menu items, and delete records.
    - **Vendor**: Operational access to distribute food, manage guest collections, toggle parcels, and view reports.
- **Global Logout**: Quick-access logout button available in the header of every screen for secure session management.

### 📋 Subscription & Pass Management
- **Dedicated Pass List**: A standalone **Subscriptions** screen centralizes pass discovery with high-performance search and filtering.
- **Digital Registration**: Register flats with block number, flat number, and headcount. **Flat Number is a mandatory field**. Supports optional **Mobile Number** registration with a native **Contact Picker** for fast entry. Features **Automated Food Pricing** that pre-calculates the subscription amount based on member choices and **Additional Parcel Surcharges**. Includes an **Interactive People Counter** for quick headcount adjustments with a safe minimum of 1. Supports zero-payment entries.
- **Smart Change Detection**: The Save buttons remain disabled until a meaningful change is detected in the form, preventing redundant updates.
- **Direct WhatsApp Integration**: Send professional "Digital Pass" images directly to a person's WhatsApp with a single tap. The system automatically opens a chat with the registered number and attaches the pass details as a formatted caption. **Restricted to Admin only**.
- **Interactive Reports**: Seamlessly jump from any flat record in the "Flat Wise" or "Pending" reports directly to its detailed pass information for instant verification.
- **Compact Member Selection**: Uses space-saving "P1", "P2", "P3" labels for selecting individual members, ensuring the interface remains usable for large groups.
- **Granular Meal Planning**: Configure food choices (Veg/Non-Veg/None) individually for each meal slot (Breakfast, Lunch, Dinner) for each person.
- **Payment tracking (Optional)**: Dynamic configuration allows enabling/disabling payment tracking globally. Supports **Multi-Payment** entries (up to 3 per flat) with standardized modes (UPI, Cash, Bank Transfer) powered by a robust **PaymentMode Enum**.
- **Detailed Financial Audit**: The Payment Summary report provides a comprehensive flat-wise breakdown of all individual payment parts, ensuring 100% transparency for multi-mode registrations.
- **Smart Payment Validation**: The system automatically validates and falls back to an enabled payment method during edits if the previously selected mode has been disabled in settings.
- **Stable QR Identity**: Each flat gets a unique, permanent QR code based on its `block-flat` ID.
- **Professional Digital Pass**: Generates a branded "Digital Pass" image containing the Season Name, Flat ID, Headcount, and Instructions. Specifically excludes volatile meal details to ensure pass longevity.

### 🍛 Daily Menu & Operations
- **Live Menu Management**: Admins can update the daily menu for each meal. Items are added one-by-one with specific Veg/Non-Veg indicators.
- **Adaptive Add Button**: The "Add Item" (+) button in the menu editor dynamically changes color to Green (Veg) or Red (Non-Veg) based on the selected dietary type for instant feedback.
- **Dedicated Menu View**: A clean, non-editable view for volunteers to see the feast plan.
- **Guest Management Module**: A dedicated interface for managing extra guest plates. Accessible to both **Admins** and **Vendors** via a sleek "Guest" tile on the home screen. Automatically prioritizes the **Current Meal** and **Current Day** at the top with a high-visibility **"LIVE" badge** and themed highlighting for active service, similar to the main dashboard.
- **Role-Based Guest Editing**: Only **Admins** can set the guest demand (Total, Veg, Non-Veg). **Vendors** are restricted to updating the collection counts (Taken) only.
- **Smart Data Integrity**: Implements "Reverse Validation"—you cannot decrease guest demand below what has already been collected, and you cannot mark more food as "Taken" than what is planned.
- **Kitchen Dashboard**: Real-time operational data showing exactly how many plates and parcels are needed. The main summary card dynamically displays the **Season Name** as its title and intelligently filters out disabled dietary types. It also features a dedicated **Current Meal Summary** subsection (if a current meal is active) that provides a snapshot of demand vs collections for the immediate service window. To maintain a clean interface, dietary splits (Veg/Non-Veg) are automatically hidden if the context is restricted to a single food type. The summary card is interactive; tapping it redirects the user to the detailed analytical reports page. Automatically prioritizes the **Current Meal** and **Current Day** at the top with a high-visibility **"LIVE" badge** and themed highlighting for the active service. Individual meal metrics are organized for rapid scanning, with the **Total Taken** count always appearing as the final data point for easy kitchen reconciliation. Completed meals are visually dimmed (reduced opacity) and have their interactive borders removed to signify they are no longer operational.
- **QR Scanner Fallback**: High-performance QR scanning with synchronous locking. Scanned invalid codes trigger a modal alert that automatically redirects the user to the **Subscriptions** list for quick manual lookup.
- **Dynamic Guest Metrics**: Guest plate totals on the dashboard are now read-only for all users, automatically synchronized from the data entered in the Guest Management module.
- **Sleek Financial Overview**: A professional, earthy-toned summary of total collections, visible only when payment integration is enabled.

### 📊 Advanced Reporting
- **Modular Reporting Engine**: A high-performance, component-based engine that generates specialized reports for Day, Meal, Guest, Parcel, Flat, and Payments. Powered by a centralized `useReportData` hook for consistent calculations.
- **Dedicated Guest Report**: A specialized view for tracking extra guest plate collections (Veg/Non-Veg) across all event days.
- **Parcel-Wise Summary**: A detailed report tracking the total number of parcels needed per meal, categorized by dietary type (Veg/Non-Veg).
- **Conditional Reporting**: The "Guest" and "Parcel" tabs are intelligently hidden if those features are not enabled in the current season's configuration, ensuring a streamlined interface.
- **Payment Summary**: Comprehensive breakdown of UPI, Cash, and Bank Transfer collections. Includes a sub-section for **Food vs Parcel Collection** breakdown.
- **Space-Saving UI**: Features a horizontal scrollable selection bar for report types and compact selectors for Days and Meals.
- **Color-Coded Data**: All dietary text is intuitively color-coded (Green for Veg, Red for Non-Veg) for rapid scanning.
- **PNG Export**: Convert any report into a high-quality image and share it instantly via WhatsApp or Email.

### ⚙️ Dynamic Configuration (Zero-Code Customization)
- **Settings Screen**: Admins can manage the entire event structure directly from the app.
- **Current Meal Prioritization**: Admins can designate a "Current Meal" in settings. This meal automatically moves to the top of all registration forms, guest management inputs, and reports for maximum operational speed. The system automatically prevents disabled or completed meals from remaining as the "Current Meal".
- **Global Read-Only Mode**: A master **Season Status** toggle. When disabled, the entire app enters a read-only archive state—blocking all new registrations, edits, food collections, and QR code sharing.
- **Centralized String Dictionary**: Zero hardcoded strings in the UI components. All text is sourced from a central repository, ensuring 100% consistency across all screens and shared pass images.
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
- **Real-Time Summary Card**: The Home screen summary card features a high-density, space-saving horizontal layout that neatly groups active passes and total members. It dynamically displays cumulative collection data when enabled, alongside an interactive deep-linking **LIVE** service shortcut badge (visible only when an enabled meal is marked as current) positioned at the top-right. The card also features a large, centered background watermark icon for a premium look and is fully responsive across all device widths.
- **Navigation History Stack**: Implemented a robust history stack that ensures the "Back" button always takes you to the previous screen (including from the pass detail/view pass screen). Returning to the **Home** screen automatically clears the history for a fresh start.
- **Visual Feedback**: Disabling a configuration section (Season or Day) in settings triggers a smooth **opacity-based fade-out**, providing clear visual confirmation of the inactive state.
- **Quick-Action Dashboard**: The Home page features a sleek, tile-based grid for fast access to core modules like Subscriptions, Scan QR, and Reports.
- **Password Visibility**: Added a "Show/Hide" toggle in the login field for user convenience.
- **Full Meal Names**: Replaced confusing abbreviations with full names ("Breakfast", "Lunch", "Dinner") in all primary selection buttons.
- **Optimized Layouts**: Touch-friendly dropdowns (18px spacing), elevated FAB positioning, and vertically stacked legends to prevent overflow.

---
© 2026 Eternia Festival Committee
