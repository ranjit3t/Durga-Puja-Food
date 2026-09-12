import { AppConfig } from "./types";

/**
 * Default Festival App Configuration
 * Used when no configuration is found in the database.
 */
const emptyMeal = { enabled: false, veg: true, nonVeg: true, parcel: false };

export const DEFAULT_APP_CONFIG: AppConfig = {
  seasonName: "ETERNIA FESTIVAL 2026",
  days: [
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
  ],
};
