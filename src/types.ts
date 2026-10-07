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
