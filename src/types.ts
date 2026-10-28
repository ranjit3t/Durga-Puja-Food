/**
 * Centralized Type Definitions
 * Re-exports domain types and defines application-specific types.
 */
import {
  normalizeChoice,
  normalizeSlot,
  toBool,
  MealType,
  DietaryOption,
  DietType,
  AppScreen,
  ReportType,
  PaymentMode,
  UserRole,
  ActivityAction,
  ActivityModule,
  AppThemeMode,
  CheckoutSource,
  FreeMealCheckoutSource,
  getPassDisplayLabel,
} from "./domain";
import type {
  SubscriptionRecord,
  FoodMenu,
  DayMenu,
  MealMenu,
  MealChoice,
  MealSlot,
  TakenState,
  PaymentEntry,
  ActivityLog,
  ConfigDay,
  AppConfig,
  PaymentConfig,
  Note,
  MealMetrics,
  KitchenMetrics,
  AppVersionInfo,
  DietaryVariety,
  VarietyMenu,
  ChatMessage,
  UserPresence,
  ChatUser,
  MessageStatus,
  PackageApplicability,
  FoodPackage,
  AppliedPackageInfo,
  CatererTransaction,
} from "./domain";

export enum FilterMode {
  ALL = "all",
  SUBSCRIBED = "subscribed",
  KIDS = "kids",
  CURRENT_MEAL_KIDS = "currentMealKids",
  CURRENT_MEAL_GUESTS = "currentMealGuests",
  GUESTS = "guests",
  PARCEL = "parcel",
  CURRENT_MEAL_PARCEL = "currentMealParcel",
  CURRENT_MEAL_PARCEL_PENDING = "currentMealParcelPending",
  VEG_ONLY = "vegOnly",
  MISSED = "missed",
  PARTIAL_CHECKOUT = "partialCheckout",
  COMPLETED_CHECKOUT = "completedCheckout",
  SPECIAL_ONLY = "specialOnly",
  PACKAGE = "package",
  AMOUNT_DISCREPANCY = "amountDiscrepancy",
  ABSENT = "absent",
  CURRENT_MEAL_ABSENT = "currentMealAbsent",
}

export enum SectionType {
  ADULTS = "adults",
  KIDS = "kids",
  GUESTS = "guests",
}

export interface CategoryInfo {
  key: string;
  varietyId?: string;
  varietyName?: string;
  varietyColor?: string;
  section: SectionType;
  subSection: DietType;
  label: string;
  plannedCount: number;
  servedCount: number;
  remMealCount: number;
  parcelPlannedCount: number;
  parcelServedCount: number;
  remParcelCount: number;
  dineInPlannedCount: number;
  dineInServedCount: number;
  remDineInCount: number;
}

export type CategoryInputs = Record<string, { parcel: number; dineIn: number, optDineIn: number }>;

export type Day = string;
export type Screen = AppScreen;

export type Subscription = SubscriptionRecord;

export type {
  SubscriptionRecord,
  FoodMenu,
  DayMenu,
  MealMenu,
  MealChoice,
  MealSlot,
  TakenState,
  PaymentEntry,
  ActivityLog,
  ConfigDay,
  DietaryVariety,
  VarietyMenu,
  AppVersionInfo,
  AppConfig,
  PaymentConfig,
  Note,
  MealMetrics,
  KitchenMetrics,
  ChatMessage,
  UserPresence,
  ChatUser,
  MessageStatus,
  PackageApplicability,
  FoodPackage,
  AppliedPackageInfo,
  CatererTransaction,
};

export {
  MealType,
  DietaryOption,
  normalizeChoice,
  normalizeSlot,
  toBool,
  DietType,
  AppScreen,
  ReportType,
  PaymentMode,
  UserRole,
  ActivityAction,
  ActivityModule,
  AppThemeMode,
  CheckoutSource,
  FreeMealCheckoutSource,
  getPassDisplayLabel,
};
