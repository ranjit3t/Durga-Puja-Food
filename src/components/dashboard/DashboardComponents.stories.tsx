import React from "react";
import { MealBarChart } from "./MealBarChart";
import { MealMetricGrid } from "./MealMetricGrid";
import { MealType } from "../../domain";

const labels = {
  veg: "Veg",
  nonVeg: "Non-Veg",
  kidsTotal: "Kids",
  kidsTaken: "Kids served",
  kidsVeg: "Kids veg",
  kidsNonVeg: "Kids non-veg",
  kidsVegTaken: "Kids veg served",
  kidsNonVegTaken: "Kids non-veg served",
  vegTaken: "Veg served",
  nonVegTaken: "Non-veg served",
  freeMealVeg: "Free veg",
  freeMealNonVeg: "Free non-veg",
  freeMealVegTaken: "Free veg served",
  freeMealNonVegTaken: "Free non-veg served",
};

const mealProps = {
  day: "Shashthi",
  type: MealType.LUNCH,
  total: 18,
  veg: 12,
  nonVeg: 6,
  parcel: 4,
  parcelTaken: 2,
  totalVegTaken: 8,
  totalNonVegTaken: 3,
  freeMealVeg: 2,
  freeMealNonVeg: 1,
  freeMealVegTaken: 1,
  freeMealNonVegTaken: 1,
  totalMealTaken: 12,
  kidsTotal: 0,
  kidsTaken: 0,
  kidsVeg: 0,
  kidsNonVeg: 0,
  kidsVegTaken: 0,
  kidsNonVegTaken: 0,
  guestsTotal: 0,
  guestsTaken: 0,
  guestsVeg: 0,
  guestsNonVeg: 0,
  guestsVegTaken: 0,
  guestsNonVegTaken: 0,
  kidsEnabled: false,
  guestsEnabled: false,
  freeMealEnabled: true,
  isParcelEnabled: true,
  isBothEnabled: true,
  labels,
};

export default { title: "UI/Dashboard", parameters: { controls: { disable: true } } };

export const MealMetricGridStory = { name: "MealMetricGrid", render: () => <MealMetricGrid {...mealProps} /> };
export const MealBarChartStory = { name: "MealBarChart", render: () => <MealBarChart {...mealProps} /> };