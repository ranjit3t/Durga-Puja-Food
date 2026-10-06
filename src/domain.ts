/**
 * Core Domain Models and Type Definitions
 * Shared across the repository and UI layers.
 */

export type EventDay = string;

export enum PaymentMode {
  UPI = "UPI",
  CASH = "Cash",
  BANK_TRANSFER = "Bank Transfer",
}

export enum MealType {
  BREAKFAST = "breakfast",
  LUNCH = "lunch",
  DINNER = "dinner",
}

export enum DietType {
  VEG = "veg",
  NON_VEG = "nonVeg",
}

export enum DietaryOption {
  VEG = "Veg",
  NON_VEG = "Non-Veg",
  NONE = "None",
}

export function normalizeChoice(choice: any): DietaryOption | string {
  if (!choice || choice === DietaryOption.NONE || choice === "None" || choice === "none") return DietaryOption.NONE;
  if (choice === DietaryOption.VEG || choice === DietaryOption.NON_VEG) {
    return choice;
  }
  const str = String(choice).trim();
  const lower = str.toLowerCase();
  if (lower === "veg" || lower === "v") return DietaryOption.VEG;
  if (lower === "non-veg" || lower === "nonveg" || lower === "non_veg" || lower === "nv" || lower === "n") return DietaryOption.NON_VEG;
  return str;
}

export function toBool(val: any): boolean {
  if (val === true || val === "true" || val === 1 || val === "1") return true;
  return false;
}

/**
 * Normalizes a meal slot object:
 * - Maps dietary choices via normalizeChoice
 * - Enforces domain invariant: Parcel option CAN ONLY be true if the corresponding meal choice is NOT DietaryOption.NONE.
 */
export function normalizeSlot(slot: any): MealSlot {
  const bChoice = normalizeChoice(slot?.[MealType.BREAKFAST] ?? slot?.breakfast);
  const lChoice = normalizeChoice(slot?.[MealType.LUNCH] ?? slot?.lunch);
  const dChoice = normalizeChoice(slot?.[MealType.DINNER] ?? slot?.dinner);

  const bParcel = bChoice !== DietaryOption.NONE && toBool(slot?.breakfastParcel);
  const lParcel = lChoice !== DietaryOption.NONE && toBool(slot?.lunchParcel);
  const dParcel = dChoice !== DietaryOption.NONE && toBool(slot?.dinnerParcel);

  return {
    [MealType.BREAKFAST]: bChoice,
    [MealType.LUNCH]: lChoice,
    [MealType.DINNER]: dChoice,
    breakfastParcel: bParcel,
    lunchParcel: lParcel,
    dinnerParcel: dParcel,
  };
}

export enum CheckoutSource {
  SCANNER = "QR Code Scan",
  PASSCODE = "Numeric Passcode",
  DETAILS = "Pass Details",
  SUBSCRIPTION_LIST = "Pass Directory",
}

export enum FreeMealCheckoutSource {
  FREE_MEAL_MODAL = "Quick Free Meal Modal",
  FREE_MEAL_SCREEN = "Free Meal Desk Screen",
}

export enum AppScreen {
  HOME = "home",
  FORM = "form",
  DETAILS = "details",
  QR = "qr",
  SCANNER = "scanner",
  DASHBOARD = "dashboard",
  MENU = "menu",
  VIEW_MENU = "viewMenu",
  REPORT = "report",
  SETTINGS = "settings",
  SUBSCRIPTION_LIST = "subscriptionList",
  FREE_MEAL_MANAGEMENT = "freeMealManagement",
  LOGIN = "login",
  ACTIVITY_LOG = "activityLog",
  NOTES = "notes",
  CONTACTS = "contacts",
  FOOD_PACKAGE = "foodPackage",
}

export enum AppThemeMode {
  LIGHT = "primary",
  DARK = "dark",
}

export type DietaryVariety = {
  id: string;
  name: string;
  type: DietType;
  color: string;
  isDefault?: boolean;
};

export type VarietyMenu = {
  items: string[];
  adultPrice?: string;
  kidsPrice?: string;
  memberPrice?: string;
  parcelPrice?: string;
  kidsParcelPrice?: string;
};

export type MealConfig = {
  enabled: boolean;
  veg: boolean;
  nonVeg: boolean;
  parcel: boolean;
  special?: boolean;
  parcelAlert?: boolean;
  kidsParcel?: boolean;
  kidsParcelAlert?: boolean;
  dineInFallbackParcel?: boolean;
  done?: boolean;
  current?: boolean;
  vegPrice?: string;
  nonVegPrice?: string;
  vegParcelPrice?: string;
  nonVegParcelPrice?: string;
  varieties?: DietaryVariety[];
};

export type ConfigDay = {
  id: string;
  label: string;
  abbr: string;
  enabled: boolean;
  vegOnly?: boolean;
} & Record<MealType, MealConfig>;

export type PaymentConfig = {
  enabled: boolean;
  options: {
    upi: boolean;
    cash: boolean;
    bankTransfer: boolean;
  };
};

export type AppConfig = {
  seasonName: string;
  days: ConfigDay[];
  payment?: PaymentConfig;
  freeMealEnabled?: boolean;
  mobileEnabled?: boolean;
  foodPriceEnabled?: boolean;
  seasonEnabled?: boolean;
  kidsEnabled?: boolean;
  whatsappCountryCode?: string;
  quickCheckoutAutoCloseMs?: number;
  soundEnabled?: boolean;
};

export enum ActivityModule {
  SUBSCRIPTION = "Pass",
  MENU = "Menu",
  CONFIG = "Settings",
  FREE_MEAL = "Free Meal",
  QR = "QR Pass",
  REPORT = "Report",
  SCANNER = "Scanner",
  AUTH = "Login",
  NOTE = "Note",
  CONTACT = "Contact",
  PACKAGE = "Food Package",
}

export enum ActivityAction {
  CREATE = "Created",
  UPDATE = "Updated",
  DELETE = "Deleted",
  VIEW = "Viewed",
  CHAT = "Started Chat",
  CALL = "Started Call",
  SHARE = "Shared",
  DOWNLOAD = "Downloaded",
  PRINT = "Printed",
  SCAN = "Scanned",
  PASS = "Pass Code",
  LOGIN = "Logged In",
  LOGOUT = "Logged Out",
  ERROR = "Error",
  MISSED_PARCEL = "Missed Parcel",
  SMS = "Sent SMS",
}

export type ActivityLog = {
  id: string;
  timestamp: number;
  userName: string;
  userRole?: UserRole | string;
  module: ActivityModule;
  action: ActivityAction;
  targetId?: string;
  description?: string;
  oldData?: any;
  newData?: any;
  device?: string;
  os?: string;
  stack?: string;
  appVersion?: string;
};

export enum ReportType {
  DAY = "day",
  MEAL = "meal",
  FREE_MEAL = "freeMeal",
  PARCEL = "parcel",
  FLAT = "flat",
  PAYMENT = "payment",
  SINGLE = "single",
  NOT_TAKEN = "notTaken",
  MEMBERS_MEAL = "membersMeal",
  MISSED_PARCEL = "missedParcel",
  PACKAGE = "package",
}

export enum UserRole {
  ADMIN = "admin",
  VENDOR = "vendor",
}

export type MealAllocation = Record<DietType, number> & {
  kidsVeg?: number;
  kidsNonVeg?: number;
};

export type MealChoice = DietaryOption | string;

export type MealSlot = Record<MealType, MealChoice> & {
  breakfastParcel: boolean;
  lunchParcel: boolean;
  dinnerParcel: boolean;
};

export type TakenState = Record<MealType, boolean> & {
  breakfastParcel?: boolean;
  lunchParcel?: boolean;
  dinnerParcel?: boolean;
  breakfastTime?: string;
  lunchTime?: string;
  dinnerTime?: string;
  breakfastParcelTime?: string;
  lunchParcelTime?: string;
  dinnerParcelTime?: string;
};

export type MealMenu = {
  veg: string[];
  nonVeg: string[];
  vegPrice?: string;
  nonVegPrice?: string;
  kidsVegPrice?: string;
  kidsNonVegPrice?: string;
  vegParcelPrice?: string;
  nonVegParcelPrice?: string;
  kidsVegParcelPrice?: string;
  kidsNonVegParcelPrice?: string;
  varieties?: Record<string, VarietyMenu>;
  freeMealCounts?: Record<string, number>;
  freeMealTakenCounts?: Record<string, number>;
  freeMealVeg?: number;
  freeMealNonVeg?: number;
  freeMealTotal?: number;
  freeMealTaken?: number;
  freeMealVegTaken?: number;
  freeMealNonVegTaken?: number;
  kidsVeg?: number;
  kidsNonVeg?: number;
  kidsVegTaken?: number;
  kidsNonVegTaken?: number;
};

export type DayMenu = Record<MealType, MealMenu>;

export type FoodMenu = Record<EventDay, DayMenu>;

export type MealMetrics = {
  vegServed?: number;
  nonVegServed?: number;
  kidsVegServed?: number;
  kidsNonVegServed?: number;
  parcelServed?: number;
};

export type KitchenMetrics = Record<EventDay, Record<MealType, MealMetrics>>;

export type PaymentEntry = {
  amount: string;
  mode: PaymentMode;
  transactionId?: string;
  receivedBy?: string;
};

export type PackageApplicability = "adult" | "kids" | "member";

export type PackageMealItem = {
  mealType: MealType;
  varietyId: string;
};

export type PackageDiscountType = "meal_package" | "flat_discount";

export type FoodPackage = {
  id: string;
  name: string;
  description: string;
  applicability: PackageApplicability;
  enabled: boolean;
  discountType?: PackageDiscountType;
  selectedMealItems?: Record<string, PackageMealItem[]>;
  selectedMeals?: Record<string, MealType[]>;
  packagePrice?: number;
  currentPrice?: number;
  discountRate?: number;
  minCartValue?: number;
  timestamp: number;
};

export type AppliedPackageInfo = {
  packageId: string;
  packageName: string;
  packagePrice: number;
};

export type SubscriptionRecord = {
  id: string;
  block: string;
  flat: string;
  mobile?: number;
  peopleCount: number;
  kidsCount?: number;
  meals: Record<EventDay, MealAllocation>;
  mealByPerson: Record<EventDay, MealChoice[]>;
  mealSlots: Record<EventDay, MealSlot[]>;
  payments: PaymentEntry[];
  // Legacy fields for backward compatibility
  amount: string;
  paymentMode: PaymentMode;
  transactionId?: string;
  passcode?: string;
  takenByPerson: Record<EventDay, TakenState[]>;
  isPackageApplied?: boolean;
  appliedPackages?: Record<number, AppliedPackageInfo>;
  timestamp?: number;
  createdAt?: number;
  updatedAt?: number;
};

export type Note = {
  id: string;
  timestamp: number;
  userName: string;
  subject: string;
  content: string;
};

export type AppVersionInfo = {
  version: string;
  androidAppLocation?: string;
  iosAppLocation?: string;
};

export type MessageStatus = "sent" | "delivered" | "read";

export type ChatMessage = {
  id: string;
  chatId: string;
  sender: string;
  senderName: string;
  recipient: string;
  text: string;
  timestamp: number | any;
  localTimestamp?: number;
  status: MessageStatus;
  readAt?: number;
};

export type UserPresence = {
  username: string;
  displayName: string;
  role: string;
  online: boolean;
  lastSeen: number;
};

export type ChatUser = {
  username: string;
  displayName: string;
  role: string;
  online: boolean;
  lastSeen: number;
  unreadCount: number;
  lastMessage?: ChatMessage;
};

export const getPassDisplayLabel = (sub?: { block?: string; flat?: string; id?: string } | null): string => {
  if (!sub) return "";
  const block = sub.block?.trim();
  const flat = sub.flat?.trim();
  if (block && flat) return `${block}-${flat}`;
  if (flat) return flat;
  if (block) return `Block ${block}`;
  return sub.id || "";
};
