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

export enum GuestCheckoutSource {
  GUEST_MODAL = "Quick Guest Modal",
  GUEST_SCREEN = "Guest Desk Screen",
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
  GUEST_MANAGEMENT = "guestManagement",
  LOGIN = "login",
  ACTIVITY_LOG = "activityLog",
  NOTES = "notes",
  CONTACTS = "contacts",
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
  parcelAlert?: boolean;
  kidsParcel?: boolean;
  kidsParcelAlert?: boolean;
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
  guestEnabled?: boolean;
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
  GUEST = "Guest",
  QR = "QR Pass",
  REPORT = "Report",
  SCANNER = "Scanner",
  AUTH = "Login",
  NOTE = "Note",
  CONTACT = "Contact",
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
  GUEST = "guest",
  PARCEL = "parcel",
  FLAT = "flat",
  PAYMENT = "payment",
  SINGLE = "single",
  NOT_TAKEN = "notTaken",
  KIDS_MEAL = "kidsMeal",
  MISSED_PARCEL = "missedParcel",
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
  guestCounts?: Record<string, number>;
  guestTakenCounts?: Record<string, number>;
  guestVeg?: number;
  guestNonVeg?: number;
  guestTotal?: number;
  guestTaken?: number;
  guestVegTaken?: number;
  guestNonVegTaken?: number;
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

export const getPassDisplayLabel = (sub?: { block?: string; flat?: string; id?: string } | null): string => {
  if (!sub) return "";
  const block = sub.block?.trim();
  const flat = sub.flat?.trim();
  if (block && flat) return `${block}-${flat}`;
  if (flat) return flat;
  if (block) return `Block ${block}`;
  return sub.id || "";
};
