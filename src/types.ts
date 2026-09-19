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
} from "./domain";

export enum FilterMode {
  ALL = "all",
  SUBSCRIBED = "subscribed",
  KIDS = "kids",
  PARCEL = "parcel",
  VEG_ONLY = "vegOnly",
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
  DietType,
  AppScreen,
  ReportType,
  UserRole,
  PaymentMode,
  PaymentEntry,
  ActivityLog,
  ActivityModule,
  ActivityAction,
  AppThemeMode,
  ConfigDay,
  AppConfig,
  PaymentConfig,
};
