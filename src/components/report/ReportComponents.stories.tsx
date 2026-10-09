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
import { MealWisePaymentReport } from "./MealWisePaymentReport";
import { DayWisePaymentReport } from "./DayWisePaymentReport";
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

const sampleMealWisePayments = [
  { dayId: "Shashthi", mealType: MealType.BREAKFAST, menuPrice: 3400, parcelPrice: 100, packageDiscount: 0, excessDeficient: 0, netPayment: 3500, passCount: 34, portionCount: 35, dineInCount: 34, parcelCount: 1 },
  { dayId: "Shashthi", mealType: MealType.LUNCH, menuPrice: 4200, parcelPrice: 620, packageDiscount: 200, excessDeficient: 30, netPayment: 4650, passCount: 31, portionCount: 31, dineInCount: 0, parcelCount: 31 },
  { dayId: "Shashthi", mealType: MealType.DINNER, menuPrice: 5100, parcelPrice: 0, packageDiscount: 0, excessDeficient: 0, netPayment: 5100, passCount: 34, portionCount: 34, dineInCount: 34, parcelCount: 0 },
];

const sampleDayWisePayments = [
  {
    dayId: "Shashthi",
    menuPrice: 12700,
    parcelPrice: 720,
    packageDiscount: 200,
    excessDeficient: 30,
    netPayment: 13250,
    passCount: 35,
    meals: {
      [MealType.BREAKFAST]: sampleMealWisePayments[0],
      [MealType.LUNCH]: sampleMealWisePayments[1],
      [MealType.DINNER]: sampleMealWisePayments[2],
    }
  }
];

const sampleSeasonTotalPayment = {
  menuPrice: 49905,
  parcelPrice: 860,
  packageDiscount: 1235,
  excessDeficient: 90,
  netPayment: 50400,
  totalPortions: 641,
  dineInCount: 514,
  parcelCount: 127,
  seasonTotalPasses: 46,
};

export default { title: "UI/Reports", parameters: { controls: { disable: true } } };

export const AmountDiscrepancyReportStory = {
  name: "AmountDiscrepancyReport",
  render: () => <AmountDiscrepancyReport data={[
    {
      id: "pass-1",
      block: "A",
      flat: "101",
      peopleCount: 2,
      kidsCount: 1,
      paidAmount: 2760,
      calculatedAmount: 2730,
      difference: 30,
      payments: [{ amount: "2760", mode: PaymentMode.UPI }],
    },
    {
      id: "pass-2",
      block: "B",
      flat: "202",
      peopleCount: 4,
      kidsCount: 0,
      paidAmount: 5100,
      calculatedAmount: 5300,
      difference: -200,
      payments: [{ amount: "5100", mode: PaymentMode.CASH }],
    }
  ]} onSelectFlat={noop} />,
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
  render: () => {
    const storyDays = ["Shashthi", "Saptami", "Ashtami", "Navami", "Dashami"];
    const storyConfig = storyDays.map((dayId) => ({
      id: dayId,
      label: dayId,
      abbr: dayId.slice(0, 3),
      enabled: true,
      breakfast: { enabled: false, veg: true, nonVeg: true, parcel: false },
      lunch: { enabled: true, veg: true, nonVeg: true, parcel: true },
      dinner: { enabled: true, veg: true, nonVeg: true, parcel: true },
    }));
    const storyMenu = Object.fromEntries(storyDays.map(dayId => [
      dayId,
      {
        breakfast: { veg: [], nonVeg: [] },
        lunch: {
          veg: ["Khichdi", "Labra", "Beguni", "Payesh"],
          nonVeg: ["Fish Fry", "Mutton Curry"],
          vegPrice: "100",
          nonVegPrice: "150",
          freeMealVeg: 20,
          freeMealNonVeg: 15,
          freeMealVegTaken: 18,
          freeMealNonVegTaken: 12,
          freeMealVegPrice: "100",
          freeMealNonVegPrice: "150",
        },
        dinner: {
          veg: ["Puri", "Alur Dom"],
          nonVeg: ["Chicken Curry"],
          vegPrice: "80",
          nonVegPrice: "120",
          freeMealVeg: 15,
          freeMealNonVeg: 10,
          freeMealVegTaken: 15,
          freeMealNonVegTaken: 10,
          freeMealVegPrice: "80",
          freeMealNonVegPrice: "120",
        }
      }
    ]));
    return <FreeMealWiseReport activeDays={storyDays} foodMenu={storyMenu} dayConfig={storyConfig as any} />;
  },
};

export const MealWiseReportStory = {
  name: "MealWiseReport",
  render: () => <MealWiseReport data={mealWiseData as any} dayConfig={dayConfig} kidsEnabled={false} />,
};

export const MealWisePaymentReportStory = {
  name: "MealWisePaymentReport",
  render: () => <MealWisePaymentReport mealWisePayments={sampleMealWisePayments as any} seasonTotalPayment={sampleSeasonTotalPayment} dayConfig={dayConfig} />,
};

export const DayWisePaymentReportStory = {
  name: "DayWisePaymentReport",
  render: () => <DayWisePaymentReport dayWisePayments={sampleDayWisePayments as any} seasonTotalPayment={sampleSeasonTotalPayment} dayConfig={dayConfig} />,
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
  render: () => <PackagePassesReport
    data={[
      {
        id: "pass-pkg-1",
        block: "A",
        flat: "101",
        peopleCount: 2,
        kidsCount: 1,
        amount: "3000",
        paymentMode: PaymentMode.UPI,
        payments: [{ amount: "3000", mode: PaymentMode.UPI }],
        meals: {},
        mealByPerson: {},
        takenByPerson: {},
        isPackageApplied: true,
        appliedPackages: {
          "0": { packageId: "gold-pkg", packageName: "Gold Festival Pack", packagePrice: 1500 },
          "1": { packageId: "gold-pkg", packageName: "Gold Festival Pack", packagePrice: 1500 },
        },
        mealSlots: {
          "Shashthi": [
            { breakfast: "veg_default", lunch: "veg_default", dinner: "none", breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
            { breakfast: "veg_default", lunch: "veg_default", dinner: "none", breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
            { breakfast: "veg_default", lunch: "veg_default", dinner: "none", breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
          ]
        }
      },
      {
        id: "pass-pkg-2",
        block: "B",
        flat: "202",
        peopleCount: 4,
        kidsCount: 0,
        amount: "4800",
        paymentMode: PaymentMode.UPI,
        payments: [{ amount: "4800", mode: PaymentMode.UPI }],
        meals: {},
        mealByPerson: {},
        takenByPerson: {},
        isPackageApplied: true,
        appliedPackages: {
          "0": { packageId: "family-pack", packageName: "Family Festival Pack", packagePrice: 4800 },
        },
        mealSlots: {
          "Shashthi": [
            { breakfast: "nonVeg_default", lunch: "nonVeg_default", dinner: "nonVeg_default", breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
            { breakfast: "nonVeg_default", lunch: "nonVeg_default", dinner: "nonVeg_default", breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
            { breakfast: "nonVeg_default", lunch: "nonVeg_default", dinner: "nonVeg_default", breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
            { breakfast: "nonVeg_default", lunch: "nonVeg_default", dinner: "nonVeg_default", breakfastParcel: false, lunchParcel: false, dinnerParcel: false },
          ]
        }
      }
    ]}
    onSelectFlat={noop}
    kidsEnabled={true}
    guestsEnabled={false}
    dayConfig={dayConfig}
    foodMenu={foodMenu}
    foodPackages={[
      { id: "gold-pkg", name: "Gold Festival Pack", description: "Gold Festival Pack", applicability: "adult", enabled: true, timestamp: Date.now(), packagePrice: 1500, discountType: "meal_package" },
      { id: "family-pack", name: "Family Festival Pack", description: "Family Festival Pack", applicability: "adult", enabled: true, timestamp: Date.now(), packagePrice: 4800, discountType: "meal_package" }
    ]}
  />,
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
    discrepancies: [
      { id: "pass-1", block: "A", flat: "101", peopleCount: 2, kidsCount: 1, paidAmount: 2760, calculatedAmount: 2730, difference: 30, payments: [{ amount: "2760", mode: PaymentMode.UPI }] },
      { id: "pass-2", block: "B", flat: "202", peopleCount: 4, kidsCount: 0, paidAmount: 5100, calculatedAmount: 5300, difference: -200, payments: [{ amount: "5100", mode: PaymentMode.CASH }] }
    ],
    mealWisePayments: sampleMealWisePayments as any,
    dayWisePayments: sampleDayWisePayments as any,
    seasonTotalPayment: sampleSeasonTotalPayment as any,
  }} dayConfig={dayConfig} onSelectFlat={noop} kidsEnabled={false} guestsEnabled={false} />,
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
