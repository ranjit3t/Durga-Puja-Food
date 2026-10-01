/**
 * Centralized Type Definitions
 * Re-exports domain types and defines application-specific types.
 */
import {
  SubscriptionRecord,
  FoodMenu,
  DayMenu,
  MealMenu,
  MealChoice,
  MealSlot,
  TakenState,
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
  PaymentEntry,
  ActivityLog,
  ActivityAction,
  ActivityModule,
  AppThemeMode,
  ConfigDay,
  AppConfig,
  PaymentConfig,
  Note,
  MealMetrics,
  KitchenMetrics,
  CheckoutSource,
  GuestCheckoutSource,
  getPassDisplayLabel,
  AppVersionInfo,
} from "./domain";

export enum FilterMode {
  ALL = "all",
  SUBSCRIBED = "subscribed",
  KIDS = "kids",
  PARCEL = "parcel",
  VEG_ONLY = "vegOnly",
  MISSED = "missed",
}

export type Day = string;
export type Screen = AppScreen;

export type Subscription = SubscriptionRecord;

export {
  SubscriptionRecord,
  FoodMenu,
  DayMenu,
  MealMenu,
  MealChoice,
  MealSlot,
  TakenState,
  MealType,
  DietaryOption,
  normalizeChoice,
  normalizeSlot,
  toBool,
  DietType,
  AppScreen,
  ReportType,
  UserRole,
  PaymentMode,
  PaymentEntry,
  ActivityLog,
  ActivityAction,
  ActivityModule,
  AppThemeMode,
  ConfigDay,
  getPassDisplayLabel,
  AppVersionInfo,
  AppConfig,
  PaymentConfig,
  Note,
  CheckoutSource,
  GuestCheckoutSource,
  MealMetrics,
  KitchenMetrics,
};
