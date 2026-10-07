import React from "react";
import { AmountDiscrepancyReport } from "./AmountDiscrepancyReport";
import { DayWiseReport } from "./DayWiseReport";
import { FlatWiseReport } from "./FlatWiseReport";
import { FreeMealWiseReport } from "./FreeMealWiseReport";
import { MealWiseReport } from "./MealWiseReport";
import { MembersReport } from "./MembersReport";
import { MissedParcelReport } from "./MissedParcelReport";
import { PackagePassesReport } from "./PackagePassesReport";
import { ParcelWiseReport } from "./ParcelWiseReport";
import { PaymentSummaryReport } from "./PaymentSummaryReport";
import { PendingReport } from "./PendingReport";
import { MealType, PaymentMode } from "../../domain";
import { STORY_FIXTURES } from "../../../.storybook/storyMocks";

const noop = () => undefined;
const dayConfig = STORY_FIXTURES.dayConfig as any;
const foodMenu = STORY_FIXTURES.foodMenu as any;
const emptyStats = {
  veg: 12,
  nonVeg: 6,
  kidsVeg: 0,
  kidsNonVeg: 0,
  guestsVeg: 0,
  guestsNonVeg: 0,
  vegTaken: 8,
  nonVegTaken: 3,
  kidsVegTaken: 0,
  kidsNonVegTaken: 0,
  guestsVegTaken: 0,
  guestsNonVegTaken: 0,
  vegParcel: 3,
  nonVegParcel: 1,
  kidsVegParcel: 0,
  kidsNonVegParcel: 0,
  guestsVegParcel: 0,
  guestsNonVegParcel: 0,
  vegParcelTaken: 2,
  nonVegParcelTaken: 0,
  kidsVegParcelTaken: 0,
  kidsNonVegParcelTaken: 0,
  guestsVegParcelTaken: 0,
  guestsNonVegParcelTaken: 0,
  freeMealVeg: 2,
  freeMealNonVeg: 1,
  freeMealVegTaken: 1,
  freeMealNonVegTaken: 1,
};
const mealWiseData = [{ day: "Shashthi", meals: {
  [MealType.BREAKFAST]: emptyStats,
  [MealType.LUNCH]: emptyStats,
  [MealType.DINNER]: emptyStats,
} }];
const dayWiseData = [{ day: "Shashthi", ...emptyStats }];

export default { title: "UI/Reports", parameters: { controls: { disable: true } } };

export const AmountDiscrepancyReportStory = {
  name: "AmountDiscrepancyReport",
  render: () => <AmountDiscrepancyReport data={[{
    id: "sample-pass",
    block: "A",
    flat: "101",
    peopleCount: 1,
    kidsCount: 0,
    paidAmount: 60,
    calculatedAmount: 80,
    difference: -20,
    payments: [{ amount: "60", mode: PaymentMode.CASH }],
  }]} onSelectFlat={noop} />,
};

export const DayWiseReportStory = {
  name: "DayWiseReport",
  render: () => (
    <DayWiseReport
      data={dayWiseData}
      selectedDayId="Shashthi"
      selectedMealType={MealType.LUNCH}
      mealWiseData={mealWiseData as any}
      dayConfig={dayConfig}
      kidsEnabled={false}
      guestsEnabled={false}
      freeMealEnabled
    />
  ),
};

export const FlatWiseReportStory = {
  name: "FlatWiseReport",
  render: () => <FlatWiseReport data={[{
    id: "sample-pass",
    flat: "101",
    block: "A",
    people: 1,
    kids: 0,
    amount: "80",
    dayStats: [],
  }]} dayConfig={dayConfig} onSelectFlat={noop} kidsEnabled={false} />,
};

export const FreeMealWiseReportStory = {
  name: "FreeMealWiseReport",
  render: () => <FreeMealWiseReport activeDays={["Shashthi"]} foodMenu={foodMenu} dayConfig={dayConfig} />,
};

export const MealWiseReportStory = {
  name: "MealWiseReport",
  render: () => <MealWiseReport data={mealWiseData as any} dayConfig={dayConfig} kidsEnabled={false} />,
};

export const MembersReportStory = {
  name: "MembersReport",
  render: () => <MembersReport data={[{
    id: "sample-pass",
    block: "A",
    flat: "101",
    categoryLabel: "Adult Veg",
    veg: 1,
    nonVeg: 0,
    vegTaken: 0,
    nonVegTaken: 0,
    vegParcel: 0,
    nonVegParcel: 0,
    vegParcelTaken: 0,
    nonVegParcelTaken: 0,
    total: 1,
  }]} selectedDayId="Shashthi" selectedMealType={MealType.LUNCH} dayConfig={dayConfig} onSelectFlat={noop} />,
};

export const MissedParcelReportStory = {
  name: "MissedParcelReport",
  render: () => <MissedParcelReport
    data={[{ id: "sample-pass", block: "A", flat: "101", count: 1, kids: 0 }]}
    selectedDayId="Shashthi"
    selectedMealType={MealType.LUNCH}
    dayConfig={dayConfig}
    onSelectFlat={noop}
    kidsEnabled={false}
  />,
};

export const PackagePassesReportStory = {
  name: "PackagePassesReport",
  render: () => <PackagePassesReport data={[]} onSelectFlat={noop} />,
};

export const ParcelWiseReportStory = {
  name: "ParcelWiseReport",
  render: () => <ParcelWiseReport
    data={mealWiseData as any}
    dayConfig={dayConfig}
    getMissedParcelData={() => []}
    selectedDayId="Shashthi"
    selectedMealType={MealType.LUNCH}
    onSelectFlat={noop}
    kidsEnabled={false}
  />,
};

export const PaymentSummaryReportStory = {
  name: "PaymentSummaryReport",
  render: () => <PaymentSummaryReport data={{
    summary: [{ mode: PaymentMode.CASH, count: 1, total: 80 }],
    details: [{ id: "sample-pass", block: "A", flat: "101", peopleCount: 1, total: 80, payments: [{ amount: "80", mode: PaymentMode.CASH }] }],
    totalFood: 80,
    totalParcel: 0,
  }} onSelectFlat={noop} />,
};

export const PendingReportStory = {
  name: "PendingReport",
  render: () => <PendingReport
    data={[{ id: "sample-pass", block: "A", flat: "101", veg: 1, nonVeg: 0, count: 1, kids: 0 }]}
    selectedDayId="Shashthi"
    selectedMealType={MealType.LUNCH}
    dayConfig={dayConfig}
    onSelectFlat={noop}
    kidsEnabled={false}
  />,
};