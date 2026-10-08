import React from "react";
import { View, Text } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel } from "../../constants";
import { ConfigDay, MealType } from "../../domain";
import { DayPaymentDetail, formatCurrencyAmount } from "../../utils/paymentUtils";
import { ReportSummaryCard } from "./ReportSummaryCard";

export function DayWisePaymentReport({
  dayWisePayments = [],
  seasonTotalPayment = { menuPrice: 0, parcelPrice: 0, packageDiscount: 0, excessDeficient: 0, netPayment: 0, totalPortions: 0, dineInCount: 0, parcelCount: 0 },
  dayConfig = [],
}: {
  dayWisePayments?: DayPaymentDetail[];
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

  const activeDays = dayConfig.filter((d) => d.enabled);

  return (
    <View style={{ gap: 20 }}>
      {/* 1. Global Season Financial Summary Card for Day Payment */}
      <ReportSummaryCard
        title={UI_TEXT.dayWisePayment}
        iconName="calendar-outline"
        summary={seasonTotalPayment}
      />

      {/* 2. Day-Wise Payment Cards (Aggregated per day) */}
      {activeDays.map((dayObj, dayIdx) => {
        const colorScheme = theme.cardColors[dayIdx % theme.cardColors.length];
        const dayDetail = dayWisePayments.find((d) => d.dayId === dayObj.id) || {
          dayId: dayObj.id,
          menuPrice: 0,
          parcelPrice: 0,
          packageDiscount: 0,
          excessDeficient: 0,
          netPayment: 0,
          meals: {} as any,
        };

        const dayPortions = Object.values(dayDetail.meals || {}).reduce((acc: number, m: any) => acc + (m.portionCount ?? m.passCount ?? 0), 0);
        const dayParcelCount = Object.values(dayDetail.meals || {}).reduce((acc: number, m: any) => acc + (m.parcelCount ?? 0), 0);
        const dayDineInCount = Object.values(dayDetail.meals || {}).reduce((acc: number, m: any) => acc + (m.dineInCount ?? 0), 0);

        return (
          <View
            key={dayObj.id}
            style={[
              styles.dashboardCard,
              { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5, gap: 14 },
            ]}
          >
            {/* Header with Day Label and Net Collection Badge */}
            <View style={{ borderBottomWidth: 1, borderBottomColor: colorScheme.border, paddingBottom: 10, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent, fontSize: 18 }]}>
                {getDayLabel(dayObj.id, dayConfig)}
              </Text>
              <View
                style={[
                  styles.pill,
                  { backgroundColor: colorScheme.accentLight, height: 26, paddingHorizontal: 12, borderRadius: 13 },
                ]}
              >
                <Text style={[styles.pillText, { color: colorScheme.accent, fontSize: 13, fontWeight: "900" }]}>
                  {UI_TEXT.rs} {formatCurrencyAmount(dayDetail.netPayment)}
                </Text>
              </View>
            </View>

            {/* Day Financial Breakdown */}
            <View
              style={{
                backgroundColor:
                  theme.colors.surfaceDark +
                  (theme.themeType === "dark" ? "66" : "80"),
                borderRadius: 16,
                padding: 14,
                borderColor: theme.colors.border,
                borderWidth: 1,
                gap: 8,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                {UI_TEXT.dayTotalCollection}
              </Text>

              <View style={{ gap: 4 }}>
                {dayPortions > 0 && (
                  <View style={{ gap: 2, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.border, paddingBottom: 6 }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" }}>
                      • {UI_TEXT.totalSubscribed}
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.colors.textPrimary, fontWeight: "900" }}>
                      {dayPortions} {UI_TEXT.plates}
                      {dayParcelCount > 0
                        ? ` (${dayDineInCount} ${UI_TEXT.dineIn}, ${dayParcelCount} ${UI_TEXT.parcel})`
                        : ` (${dayDineInCount || dayPortions} ${UI_TEXT.dineIn})`}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" }}>
                    • {UI_TEXT.menuPriceLabel}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.colors.textPrimary, fontWeight: "700" }}>
                    {UI_TEXT.rs} {formatCurrencyAmount(dayDetail.menuPrice)}
                  </Text>
                </View>

                {dayDetail.parcelPrice > 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" }}>
                      • {UI_TEXT.parcelCharges}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.textPrimary, fontWeight: "700" }}>
                      + {UI_TEXT.rs} {formatCurrencyAmount(dayDetail.parcelPrice)}
                    </Text>
                  </View>
                )}

                {dayDetail.packageDiscount > 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" }}>
                      • {UI_TEXT.packageDiscountLabel}
                    </Text>
                    <Text style={{ fontSize: 12, color: theme.colors.error, fontWeight: "700" }}>
                      - {UI_TEXT.rs} {formatCurrencyAmount(dayDetail.packageDiscount)}
                    </Text>
                  </View>
                )}

                {dayDetail.excessDeficient !== 0 && (
                  <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" }}>
                      • {UI_TEXT.excessDeficientLabel}
                    </Text>
                    <Text
                      style={{
                        fontSize: 12,
                        color: dayDetail.excessDeficient > 0 ? theme.colors.success : theme.colors.error,
                        fontWeight: "700",
                      }}
                    >
                      {dayDetail.excessDeficient > 0 ? "+" : "-"} {UI_TEXT.rs}{" "}
                      {formatCurrencyAmount(Math.abs(dayDetail.excessDeficient))}
                    </Text>
                  </View>
                )}

                <View
                  style={{
                    borderTopWidth: 1,
                    borderTopColor: theme.colors.border,
                    paddingTop: 6,
                    marginTop: 4,
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text style={{ fontSize: 13, color: theme.colors.textPrimary, fontWeight: "800" }}>
                    {UI_TEXT.netPaymentLabel}
                  </Text>
                  <Text style={{ fontSize: 15, color: colorScheme.accent, fontWeight: "900" }}>
                    {UI_TEXT.rs} {formatCurrencyAmount(dayDetail.netPayment)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}
