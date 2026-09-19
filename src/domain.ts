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
}

export enum AppThemeMode {
  LIGHT = "primary",
  DARK = "dark",
}

export type MealConfig = {
  enabled: boolean;
  veg: boolean;
  nonVeg: boolean;
  parcel: boolean;
  done?: boolean;
  current?: boolean;
  vegPrice?: string;
  nonVegPrice?: string;
  vegParcelPrice?: string;
  nonVegParcelPrice?: string;
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
  LOGIN = "Logged In",
  LOGOUT = "Logged Out",
  ERROR = "Error",
}

export type ActivityLog = {
  id: string;
  timestamp: number;
  userName: string;
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
}

export enum UserRole {
  ADMIN = "admin",
  VENDOR = "vendor",
}

export type MealAllocation = Record<DietType, number> & {
  kidsVeg?: number;
  kidsNonVeg?: number;
};

export type MealChoice = DietaryOption;

export type MealSlot = Record<MealType, MealChoice> & {
  breakfastParcel: boolean;
  lunchParcel: boolean;
  dinnerParcel: boolean;
};

export type TakenState = Record<MealType, boolean> & {
  breakfastParcel?: boolean;
  lunchParcel?: boolean;
  dinnerParcel?: boolean;
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
  guestVeg?: number;
  guestNonVeg?: number;
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
  takenByPerson: Record<EventDay, TakenState[]>;
};
