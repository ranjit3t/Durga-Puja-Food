import { ConfigDay } from "./types";

/**
 * Internal Authentication Configuration
 * Defines user roles and their associated credentials.
 */
export const AUTH_CONFIG = {
  users: [
    {
      username: "admin",
      password: "adminEternia@2026",
      role: "admin",
    },
    {
      username: "vendor",
      password: "vendor",
      role: "vendor",
    },
  ] as const,
};

/**
 * Default Festival Day Configuration
 * Used when no configuration is found in the database.
 */
const emptyMeal = { enabled: true, veg: true, nonVeg: true, parcel: true };

export const DEFAULT_DAY_CONFIG: ConfigDay[] = [
  {
    id: "Shashthi",
    label: "Shashthi",
    abbr: "Sha",
    enabled: true,
    breakfast: { ...emptyMeal },
    lunch: { ...emptyMeal },
    dinner: { ...emptyMeal },
  },
  {
    id: "Saptami",
    label: "Saptami",
    abbr: "Sap",
    enabled: true,
    breakfast: { ...emptyMeal },
    lunch: { ...emptyMeal },
    dinner: { ...emptyMeal },
  },
  {
    id: "Ashtami",
    label: "Ashtami",
    abbr: "Ash",
    enabled: true,
    breakfast: { ...emptyMeal },
    lunch: { ...emptyMeal },
    dinner: { ...emptyMeal },
  },
  {
    id: "Nabami",
    label: "Nabami",
    abbr: "Nab",
    enabled: true,
    breakfast: { ...emptyMeal },
    lunch: { ...emptyMeal },
    dinner: { ...emptyMeal },
  },
  {
    id: "Dashami",
    label: "Dashami",
    abbr: "Das",
    enabled: true,
    breakfast: { ...emptyMeal },
    lunch: { ...emptyMeal },
    dinner: { ...emptyMeal },
  },
];
