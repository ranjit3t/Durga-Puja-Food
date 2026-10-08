import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getDayLabel, getMealLabel, isMealEnabled } from "../../constants";
import { AppThemeMode, ConfigDay, MealType } from "../../domain";
import { MealPaymentDetail, formatCurrencyAmount } from "../../utils/paymentUtils";

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
      <View style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Ionicons name="restaurant-outline" size={20} color={theme.colors.white} />
          <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1 }}>
            {UI_TEXT.mealWisePayment}
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

          {(seasonTotalPayment.parcelPrice ?? 0) > 0 && (
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.parcelCharges}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800" }}>
                + {UI_TEXT.rs} {formatCurrencyAmount(seasonTotalPayment.parcelPrice ?? 0)}
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
              const detail = mealWisePayments.find(
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
              };

              return (
                <View
                  key={mType}
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
                        size={16}
                        color={theme.colors.primary}
                      />
                      <Text style={{ color: theme.colors.textPrimary, fontWeight: "800", fontSize: 15 }}>
                        {getMealLabel(mType)}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.pill,
                        { backgroundColor: colorScheme.accentLight, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
                      ]}
                    >
                      <Text style={[styles.pillText, { color: colorScheme.accent, fontSize: 11, fontWeight: "800" }]}>
                        {(detail.portionCount ?? detail.passCount)} {UI_TEXT.planned}
                        {detail.parcelCount > 0
                          ? ` (${detail.dineInCount} ${UI_TEXT.dineIn}, ${detail.parcelCount} ${UI_TEXT.parcel})`
                          : ` (${detail.portionCount ?? detail.passCount} ${UI_TEXT.dineIn})`}
                      </Text>
                    </View>
                  </View>

                  <View style={{ gap: 4, marginTop: 4 }}>
                    <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" }}>
                        • {UI_TEXT.menuPriceLabel}
                      </Text>
                      <Text style={{ fontSize: 12, color: theme.colors.textPrimary, fontWeight: "700" }}>
                        {UI_TEXT.rs} {formatCurrencyAmount(detail.menuPrice)}
                      </Text>
                    </View>

                    {detail.parcelPrice > 0 && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" }}>
                          • {UI_TEXT.parcelCharges}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.colors.textPrimary, fontWeight: "700" }}>
                          + {UI_TEXT.rs} {formatCurrencyAmount(detail.parcelPrice)}
                        </Text>
                      </View>
                    )}

                    {detail.packageDiscount > 0 && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" }}>
                          • {UI_TEXT.packageDiscountLabel}
                        </Text>
                        <Text style={{ fontSize: 12, color: theme.colors.error, fontWeight: "700" }}>
                          - {UI_TEXT.rs} {formatCurrencyAmount(detail.packageDiscount)}
                        </Text>
                      </View>
                    )}

                    {detail.excessDeficient !== 0 && (
                      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                        <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600" }}>
                          • {UI_TEXT.excessDeficientLabel}
                        </Text>
                        <Text
                          style={{
                            fontSize: 12,
                            color: detail.excessDeficient > 0 ? theme.colors.success : theme.colors.error,
                            fontWeight: "700",
                          }}
                        >
                          {detail.excessDeficient > 0 ? "+" : "-"} {UI_TEXT.rs}{" "}
                          {formatCurrencyAmount(Math.abs(detail.excessDeficient))}
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
                        {UI_TEXT.netMealPayment}
                      </Text>
                      <Text style={{ fontSize: 15, color: colorScheme.accent, fontWeight: "900" }}>
                        {UI_TEXT.rs} {formatCurrencyAmount(detail.netPayment)}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}
