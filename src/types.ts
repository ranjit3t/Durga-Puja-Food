/**
 * Centralized Type Definitions
 * Re-exports repository types and defines application-specific types.
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
} from "./domain";

export enum AppThemeMode {
  LIGHT = "primary",
  DARK = "dark",
}

export enum FilterMode {
  ALL = "all",
  SUBSCRIBED = "subscribed",
  KIDS = "kids",
  PARCEL = "parcel",
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
};
