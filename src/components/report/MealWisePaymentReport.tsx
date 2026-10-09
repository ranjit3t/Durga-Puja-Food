import React from "react";
import { View, Text } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, getMealLabel, isMealEnabled } from "../../constants";
import { ConfigDay, MealType } from "../../domain";
import { MealPaymentDetail } from "../../utils/paymentUtils";
import { ReportSummaryCard } from "./ReportSummaryCard";
import { MealReportItemCard } from "./MealReportItemCard";

export function MealWisePaymentReport({
  mealWisePayments = [],
  seasonTotalPayment = { menuPrice: 0, parcelPrice: 0, packageDiscount: 0, excessDeficient: 0, netPayment: 0, totalPortions: 0, dineInCount: 0, parcelCount: 0 },
  dayConfig = [],
}: {
  mealWisePayments?: MealPaymentDetail[];
  seasonTotalPayment?: {
    menuPrice: number;
    parcelPrice?: number;
    packageDiscount: number;
    excessDeficient: number;
    netPayment: number;
    totalPortions?: number;
    dineInCount?: number;
    parcelCount?: number;
  };
  dayConfig?: ConfigDay[];
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  // Group meal-wise payment items by dayId
  const activeDays = dayConfig.filter((d) => d.enabled);

  return (
    <View style={{ gap: 20 }}>
      {/* 1. Global Season Financial Summary Card for Meal Payment */}
      <ReportSummaryCard
        title={UI_TEXT.mealWisePayment}
        iconName="restaurant-outline"
        summary={seasonTotalPayment}
      />

      {/* 2. Day-by-Day Meal Payment Cards */}
      {activeDays.map((dayObj, dayIdx) => {
        const colorScheme = theme.cardColors[dayIdx % theme.cardColors.length];
        const dayMeals = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].filter((mKey) =>
          isMealEnabled(dayObj.id, mKey, dayConfig)
        );

        if (dayMeals.length === 0) return null;

        return (
          <View
            key={dayObj.id}
            style={[
              styles.dashboardCard,
              { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5, gap: 12 },
            ]}
          >
            <View style={{ borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 10 }}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent, fontSize: 18 }]}>
                {getDayLabel(dayObj.id, dayConfig)}
              </Text>
            </View>

            {dayMeals.map((mType) => {
              const detail: MealPaymentDetail = mealWisePayments.find(
                (m) => m.dayId === dayObj.id && m.mealType === mType
              ) || {
                dayId: dayObj.id,
                mealType: mType,
                menuPrice: 0,
                parcelPrice: 0,
                packageDiscount: 0,
                excessDeficient: 0,
                netPayment: 0,
                passCount: 0,
                portionCount: 0,
                dineInCount: 0,
                parcelCount: 0,
                adultPortionCount: 0,
                kidsPortionCount: 0,
                guestsPortionCount: 0,
              };

              return (
                <MealReportItemCard
                  key={mType}
                  mealType={mType}
                  mealLabel={getMealLabel(mType)}
                  detail={detail}
                  colorScheme={colorScheme}
                />
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
