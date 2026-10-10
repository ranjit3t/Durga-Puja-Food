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
} from "./domain";

export enum FilterMode {
  ALL = "all",
  SUBSCRIBED = "subscribed",
  KIDS = "kids",
  GUESTS = "guests",
  PARCEL = "parcel",
  VEG_ONLY = "vegOnly",
  MISSED = "missed",
  SPECIAL_ONLY = "specialOnly",
  PACKAGE = "package",
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

export type CategoryInputs = Record<string, { parcel: number; dineIn: number }>;

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
