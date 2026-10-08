import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, getMealLabel, isMealEnabled } from "../../constants";
import { AppThemeMode, ConfigDay, MealType } from "../../domain";
import { DayPaymentDetail, formatCurrencyAmount } from "../../utils/paymentUtils";

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
      <View style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Ionicons name="calendar-outline" size={20} color={theme.colors.white} />
          <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1 }}>
            {UI_TEXT.dayWisePayment}
          </Text>
        </View>

        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
          {(seasonTotalPayment.totalPortions ?? 0) > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 2 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.totalSubscribed}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                {seasonTotalPayment.totalPortions} {UI_TEXT.plates}
                {(seasonTotalPayment.parcelCount ?? 0) > 0
                  ? ` (${seasonTotalPayment.dineInCount ?? 0} ${UI_TEXT.dineIn}, ${seasonTotalPayment.parcelCount ?? 0} ${UI_TEXT.parcel})`
                  : ` (${seasonTotalPayment.dineInCount ?? seasonTotalPayment.totalPortions} ${UI_TEXT.dineIn})`}
              </Text>
            </View>
          )}

          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
              {UI_TEXT.menuPriceLabel}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800" }}>
              {UI_TEXT.rs} {formatCurrencyAmount(seasonTotalPayment.menuPrice)}
            </Text>
          </View>

          {seasonTotalPayment.parcelPrice !== undefined && seasonTotalPayment.parcelPrice > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.parcelCharges}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800" }}>
                + {UI_TEXT.rs} {formatCurrencyAmount(seasonTotalPayment.parcelPrice)}
              </Text>
            </View>
          )}

          {seasonTotalPayment.packageDiscount > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.packageDiscountLabel}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800" }}>
                - {UI_TEXT.rs} {formatCurrencyAmount(seasonTotalPayment.packageDiscount)}
              </Text>
            </View>
          )}

          {seasonTotalPayment.excessDeficient !== 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.excessDeficientLabel}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800" }}>
                {seasonTotalPayment.excessDeficient > 0 ? "+" : "-"} {UI_TEXT.rs}{" "}
                {formatCurrencyAmount(Math.abs(seasonTotalPayment.excessDeficient))}
              </Text>
            </View>
          )}

          <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 8, marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 16 }}>
              {UI_TEXT.netPaymentLabel}
            </Text>
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 20 }}>
              {UI_TEXT.rs} {formatCurrencyAmount(seasonTotalPayment.netPayment)}
            </Text>
          </View>
        </View>
      </View>

      {/* 2. Day-Wise Payment Cards */}
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

        const enabledMeals = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].filter((mKey) =>
          isMealEnabled(dayObj.id, mKey, dayConfig)
        );

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
                  (theme.themeType === AppThemeMode.DARK ? "66" : "80"),
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
                      • Parcel Charges
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

            {/* Meal-by-Meal Breakdown for this Day */}
            <View style={{ gap: 8 }}>
              <Text style={{ fontSize: 12, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                {UI_TEXT.mealWiseReport}
              </Text>

              {enabledMeals.map((mType) => {
                const mealInfo = dayDetail.meals?.[mType] || {
                  dayId: dayObj.id,
                  mealType: mType,
                  menuPrice: 0,
                  parcelPrice: 0,
                  packageDiscount: 0,
                  excessDeficient: 0,
                  netPayment: 0,
                  passCount: 0,
                };

                return (
                  <View
                    key={mType}
                    style={{
                      backgroundColor: theme.colors.surfaceDark + "40",
                      borderRadius: 12,
                      padding: 12,
                      borderWidth: 1,
                      borderColor: theme.colors.border,
                      gap: 6,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons
                          name={
                            mType === MealType.BREAKFAST
                              ? "sunny-outline"
                              : mType === MealType.LUNCH
                              ? "restaurant-outline"
                              : "moon-outline"
                          }
                          size={14}
                          color={theme.colors.primary}
                        />
                        <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary }}>
                          {getMealLabel(mType)}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: "600", color: theme.colors.textMuted }}>
                          ({(mealInfo.portionCount ?? mealInfo.passCount)} {UI_TEXT.planned}
                          {mealInfo.parcelCount > 0
                            ? ` • ${mealInfo.dineInCount} ${UI_TEXT.dineIn}, ${mealInfo.parcelCount} ${UI_TEXT.parcel}`
                            : ` • ${(mealInfo.portionCount ?? mealInfo.passCount)} ${UI_TEXT.dineIn}`})
                        </Text>
                      </View>

                      <Text style={{ fontSize: 14, fontWeight: "900", color: colorScheme.accent }}>
                        {UI_TEXT.rs} {formatCurrencyAmount(mealInfo.netPayment)}
                      </Text>
                    </View>

                    <View style={{ gap: 3, marginTop: 2 }}>
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: "600" }}>
                          • {UI_TEXT.menuPriceLabel}
                        </Text>
                        <Text style={{ fontSize: 11, color: theme.colors.textPrimary, fontWeight: "700" }}>
                          {UI_TEXT.rs} {formatCurrencyAmount(mealInfo.menuPrice)}
                        </Text>
                      </View>

                      {mealInfo.parcelPrice > 0 && (
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: "600" }}>
                            • {UI_TEXT.parcelCharges}
                          </Text>
                          <Text style={{ fontSize: 11, color: theme.colors.textPrimary, fontWeight: "700" }}>
                            + {UI_TEXT.rs} {formatCurrencyAmount(mealInfo.parcelPrice)}
                          </Text>
                        </View>
                      )}

                      {mealInfo.packageDiscount > 0 && (
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: "600" }}>
                            • {UI_TEXT.packageDiscountLabel}
                          </Text>
                          <Text style={{ fontSize: 11, color: theme.colors.error, fontWeight: "700" }}>
                            - {UI_TEXT.rs} {formatCurrencyAmount(mealInfo.packageDiscount)}
                          </Text>
                        </View>
                      )}

                      {mealInfo.excessDeficient !== 0 && (
                        <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                          <Text style={{ fontSize: 11, color: theme.colors.textSecondary, fontWeight: "600" }}>
                            • {UI_TEXT.excessDeficientLabel}
                          </Text>
                          <Text style={{ fontSize: 11, color: theme.colors.success, fontWeight: "700" }}>
                            + {UI_TEXT.rs} {formatCurrencyAmount(mealInfo.excessDeficient)}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        );
      })}
    </View>
  );
}
