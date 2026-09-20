# Eternia Food Desk (Event Management)

A robust Expo React Native application designed for food admins and volunteers to manage feast subscriptions, daily menus, and meal distribution during large scale community events.

## ✨ Key Features

### 🌐 Cross-Platform Web Support
- **First-Class Browser Experience**: Fully optimized for web browsers with a professional, desktop-class interface.
- **Adaptive Screen Scaling**: The system detects high-resolution monitors and automatically scales typography and interactive elements for maximum legibility.
- **High-Density Web Layout**: On wide screens, the UI intelligently uses the available space, expanding grids and centering content in a readable column.
- **Vertical Optimization**: Specifically optimized to fit dense operational data (like the Kitchen Dashboard) within the browser viewport to minimize scrolling.
- **Web Polish**: Includes desktop-specific enhancements like hover cursors for buttons, centered modal dialogs, and high-fidelity box shadows.

### 🔐 Security & Access Control
- **Database-Driven Authentication**: All user credentials, passwords, and roles are managed centrally in the Firebase Realtime Database (`auth_config` node). This allows for instant staff updates without code changes.
- **Session Security**: For maximum security, the app does not store persistent login state across app restarts. Users are prompted for a fresh login every time the app is launched.
- **Auto-Logout**: If the app stays open (foreground or background) for more than 24 hours, the session automatically expires, and the user is logged out.
- **Role-Based Permissions**:
    - **Admin**: Full access to register flats, update festival settings, edit menu items, report bugs via email, and delete records.
    - **Vendor**: Operational access to mark food and parcels as taken. Restricted from modifying registration data, financial records, or primary dietary choices.
- **Two-Phase Verified Login**: The login button intelligently guides the user through two distinct phases: **"Verifying..."** (credential check against the database) followed by **"Loading data..."** (pre-fetching configuration and subscriptions) for a more transparent and precise authentication experience.
- **Enhanced LIVE Awareness**: Critical system statuses and service windows are highlighted with **High-Vibrancy Glowing Badges** (Success Green with white accents) for maximum prominence across all background types.
- **Global Logout**: Quick-access logout button available in the header of every screen for secure session management.

### 📋 Subscription & Pass Management
- **Dedicated Pass List**: A standalone **Subscriptions** screen centralizes pass discovery with high-performance search and **Natural Alphanumeric Sorting**. The interface features a **Dynamic Filter Bar** that intelligently appears only when relevant operational filters (Current Meal, Kids, Parcels, or Veg Only) are available. Pass cards display visual markers—restaurant icon for active subs, happy icon for kids, briefcase icon for parcels, and a **leaf icon** for strictly vegetarian passes—for rapid scanning. Includes **Direct Contact Icons** (WhatsApp and Phone) for instant communication.
- **Digital Registration**: Register flats with block number, flat number, and headcount. **Flat Number is a mandatory field**. Supports optional **Mobile Number** registration with a native **Contact Picker** for fast entry. Features **Automated Food Pricing** that pre-calculates the subscription amount based on member choices and **Additional Parcel Surcharges**. Includes an **Interactive Member Counter** for quick headcount adjustments. Supports separate **Adult and Kids** counts (when enabled).
- **Headcount Protection**: In the Edit Pass form, the system automatically prevents decreasing the headcount (Adults/Kids) below their **initial registration values** if any member of the pass has already "taken" a meal. A meal is considered "taken" if it is explicitly marked so, or if the person was subscribed and the meal slot is already marked as "Done" in global settings. This ensures historical consistency while still allowing for headcount increases.
- **Bi-Directional Pass Safety**:
    - **Add Pass Restriction**: During new registration, the system strictly blocks selecting meal plans or parcels for **past** or completed service windows to ensure new entries only apply to upcoming meals.
    - **Edit Pass Flexibility**: For existing records, administrators can still refine the meal plans of past days (provided they aren't marked as "Done"), allowing for historical accuracy while maintaining operational guardrails.
- **Smart Navigation Strategy**: The system uses a dual-sorting strategy: **Operational screens** (Dashboard/Guest Management) always prioritize the "Current Meal" by moving it to the top. **Data Entry and Viewing screens** maintain a fixed chronological order (Days 1 $\rightarrow$ N, Meals B $\rightarrow$ L $\rightarrow$ D) while using **Intelligent Auto-Focus** to automatically select and scroll the active day into view.
- **Minimum Meal Validation**: Implements strict data rules—the system prevents saving or generating QR codes if no dietary meals (Veg/Non-Veg) are selected for any person across the event duration.
- **Grammar-Aware UI**: The system intelligently handles **Singular and Plural forms** across all labels (e.g., "1 Adult" vs "2 Adults", "1 Kid" vs "2 Kids"). It also adaptively switches terminology—when Kids support is disabled, it reverts from "Adults/Kids" to generic "Person/Persons" to maintain a clean, relevant interface.
- **Smart Change Detection**: The Save buttons remain disabled until a meaningful change is detected in the form, preventing redundant updates.
- **Pass Protection Rules**: To maintain operational integrity, the system automatically disables the **Delete** button for any pass that has recorded a non-zero payment or has marked at least one meal as "Taken". This ensures that active transaction or distribution data is never accidentally purged.
- **Direct WhatsApp Integration**: Send professional "Digital Pass" images directly to a person's WhatsApp with a single tap. The system automatically opens a chat with the registered number and attaches the pass details as a formatted caption. **Restricted to Admin only**.
- **Interactive Reports**: Seamlessly jump from any flat record in the "Flat Wise" or "Pending" reports directly to its detailed pass information for instant verification.
- **Compact Member Selection**: Uses space-saving "P1", "P2", "P3" labels for selecting individual members, ensuring the interface remains usable for large groups.
- **Sequential Collection Tracking**: staff first mark a meal as "Taken" (dine-in), which then unlocks a secondary toggle to record "Parcel Collection" if takeaway was registered.
- **Current Meal Lock**: Implements strict **Bi-Directional Write Protection**. When a "Current Meal" is globally active, the system automatically disables the "Taken" and "Parcel" toggles across all modes for all **Future Meals** to prevent erroneous forward-dated entries.
- **Subscription-Aware Configuration Safety**: Critical settings are protected by real-time data validation. The system blocks switching off global **"Kids Support"**, **"Guest Management"**, **"Payment Integration"**, or individual **"Festival Days"** and **"Meal Slots"** if any existing subscription or kitchen data depends on them. This ensures data integrity and prevents orphaning active registrations.
- **Redesigned Day Deletion**: The "Delete Day" button is now high-visibility Red and strictly **disabled** if subscriptions exist for that day, providing a clear visual safeguard against accidental data loss.
- **Meal Lifecycle Management**: Admins can "Mark as Done" individual meal slots. Once marked as done, the system locks all associated data. **Chronological Enforcement** ensures a meal can only be marked "Done" if all preceding enabled meals are completed and it is not a future meal.
- **Current Meal Selection Rules**: A meal can only be designated as "Current" if all past enabled meals are marked as "Done" and no future meal is yet completed.
- **Season Lifecycle Safety**: The "Season Status" toggle can only be switched off if all enabled meals across the entire festival are already marked as **Done**, ensuring operational archiving only occurs after full service completion.
- **Optimized Administrative Workflow**: Generic confirmation boxes have been removed for logic-guarded toggles, resulting in a faster, more responsive settings interface that only intervenes when an operation would truly compromise data integrity.
- **Automatic Menu Cleanup**: Deleting an event day from settings automatically scrubs all associated menu data from the database.
- **Veg Only Toggle**: Easily convert a day to "Veg only" mode, which simplifies the entire app UI for that day.
- **Labels & Abbreviations**: Custom display names and legends are centrally managed.

### 🎨 Polished & Responsive UI/UX
- **Immersive Festive Backdrop**: A premium, dynamic background system featuring **9 floating Mesh Gradient Blobs**. These colorful glowing spots surround the screen from all 4 corners and sides, creating a majestic celebratory atmosphere.
- **Dynamic Glassmorphism**: Every card, report panel, and dashboard section uses a semi-translucent **"Frosted Glass" design language**, allowing the underlying festive background glows to bleed through beautifully while maintaining absolute text legibility and a clean, shadow-free aesthetic.
- **Adaptive High-Contrast Tones**: Backdrop colors automatically adjust their intensity for Light and Dark themes, utilizing high-contrast alpha weights (up to 26% in Light mode) to ensure the marvelous glowing effect pops vividly on any screen.
- **Web-Specific Background Optimization**: Specifically tuned for wide horizontal viewports, the system dynamically injects 3 extra large **Central and Top Mesh Circles** on web desktop monitors to ensure the entire wide-screen canvas is covered with immersive color gradients.
- **Fully Responsive Design**: The UI intelligently adapts to all screen sizes, from small mobile phones to large tablets and desktop browsers.
- **Adaptive Column Layout**: On wide native screens (Tablets), content is centered in a professional 600px column. On **Web**, the layout expands to the full browser width while keeping the internal content perfectly centered and readable.
- **Intelligent Viewport Scaling**: Introduced a dual-axis scaling engine (`s` for horizontal/size and `v` for vertical) that ensures text isn't "tiny" on large monitors while compacting vertical space to help screens fit within the browser's viewable area.
- **Global Error Notification Modal**: High-visibility error handling wrapper attached to the home action strip. Tapping database network exceptions surfaces details in a premium modal dialog box fully adhering to active light/dark design tokens.
- **Optimized for Modern Devices**: Specifically tuned for modern aspect ratios (like iPhone 16). All screens use a `flexGrow` scroll strategy with generous bottom paddings to ensure that interactive elements like the Login button and footer are never clipped by home indicators.
- **Dynamic Theming (Dark & Light Mode)**: Fully integrated theme system that supports high-contrast Dark Mode and a vibrant Light Mode. Users can toggle themes from both the Login and Home screens.
- **Persistent User Preference**: Theme selections are saved locally on the device using `AsyncStorage`, ensuring the app launches with the user's preferred aesthetic.
- **Sleek Navigation Bar**: Unified header design across all screens featuring compact **36px circular icon buttons**.
- **Contextual Navigation**: A dedicated **Home** button is positioned next to the Back button on all sub-pages for rapid dashboard access.
- **Icon-Only Header Actions**: Clean, professional interface achieved by removing text labels from header actions (Back, Home, Logout), using high-contrast themed colors for visibility.
- **Colorful Premium Palette**: Primary information boxes and daily menu cards use a vibrant, high-contrast palette of pastel colors (Red, Blue, Green, Orange, Purple, Cyan) for a modern and energetic aesthetic.
- **Real-Time Summary Card**: The Home screen summary card features a high-density, space-saving horizontal layout that neatly groups active passes, total members (including grammar-aware adults/kids breakdown), total plate demand (with synchronized dietary split), and guest counts. It dynamically displays cumulative collection data when enabled, alongside an interactive deep-linking **LIVE** service shortcut badge identifying the active day and meal (e.g., "SAPTAMI LUNCH"). The card also features a large, centered background watermark icon for a premium look.
- **Contact-Aware Details View**: The **View Pass** (Details) screen intelligently integrates **Quick Contact Actions** (WhatsApp and Call) into the primary Pass Identity card if a mobile number is associated with the pass, enabling volunteers to reach residents instantly while reviewing their plan.
- **Navigation History Stack**: Implemented a robust history stack that ensures the "Back" button typically takes you to the previous screen (including from the View Pass screen). To streamline high-volume operations, a dedicated **Home** button is available in the header for a direct return to the dashboard.
- **Visual Feedback**: Disabling a configuration section (Season or Day) in settings triggers a smooth **opacity-based fade-out**, providing clear visual confirmation of the inactive state.
- **Quick-Action Dashboard**: The Home page features a sleek, tile-based grid for fast access to core modules. Optimized with **64px high tiles** and **18px icons** for a compact, distortion-free experience. On wide screens, the grid automatically adapts to a **4-column layout**.
- **Admin Contacts Directory**: A dedicated, searchable directory for administrators containing all flats with registered contact numbers. Features natural alphanumeric sorting and member details. Individual cards provide one-tap shortcuts for **WhatsApp Chat** and **Cellular Calls**, while clicking the card body deep-links directly to the resident's full **Pass Details** for instant lookup.
- **Collaborative Notes**: A dedicated **Notes** module accessible to all users. Supports full CRUD operations (Create, Read, Update, Delete) via a high-speed modal interface. Includes role-based permissions where users can manage their own notes and Admins have full oversight. Features forensic search, chronological sorting, and automated activity logging for every view and modification.
- **Password Visibility**: Added a "Show/Hide" toggle in the login field for user convenience.
- **Full Meal Names**: Replaced confusing abbreviations with full names ("Breakfast", "Lunch", "Dinner") in all primary selection buttons.
- **Optimized Layouts**: Touch-friendly dropdowns (18px spacing), elevated FAB positioning, and vertically stacked legends to prevent overflow.

---
© 2026 Eternia Festival Committee
