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
} from "./repository";

export type MealConfig = {
  enabled: boolean;
  veg: boolean;
  nonVeg: boolean;
  parcel: boolean;
};

export type ConfigDay = {
  id: string;
  label: string;
  abbr: string;
  enabled: boolean;
  vegOnly?: boolean;
  breakfast: MealConfig;
  lunch: MealConfig;
  dinner: MealConfig;
};

export type Day = string;
export type PaymentMode = "UPI" | "Cash";
export type UserRole = "admin" | "vendor";
export type Screen =
  | "home"
  | "form"
  | "details"
  | "qr"
  | "scanner"
  | "dashboard"
  | "menu"
  | "viewMenu"
  | "report"
  | "settings"
  | "login";

export type Subscription = SubscriptionRecord;

export {
  SubscriptionRecord,
  FoodMenu,
  DayMenu,
  MealMenu,
  MealChoice,
  MealSlot,
  TakenState,
};
