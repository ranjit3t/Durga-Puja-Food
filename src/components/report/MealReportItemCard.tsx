import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { MealType } from "../../domain";
import { MealPaymentDetail, formatCurrencyAmount } from "../../utils/paymentUtils";

export interface MealReportItemCardProps {
  mealType: MealType;
  mealLabel: string;
  detail: MealPaymentDetail;
  colorScheme: { bg: string; border: string; accent: string; accentLight: string };
}

export function MealReportItemCard({ mealType, mealLabel, detail, colorScheme }: MealReportItemCardProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const mealA11yLabel = `${mealLabel}: ${(detail.portionCount ?? detail.passCount)} plates, Net Payment ${detail.netPayment} rupees`;

  return (
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
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={mealA11yLabel}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons
              name={
                mealType === MealType.BREAKFAST
                  ? "sunny-outline"
                  : mealType === MealType.LUNCH
                  ? "restaurant-outline"
                  : "moon-outline"
              }
              size={16}
              color={theme.colors.primary}
            />
            <Text style={{ color: theme.colors.textPrimary, fontWeight: "800", fontSize: 15 }} numberOfLines={1}>
              {mealLabel}
            </Text>
          </View>
          <Text style={{ fontSize: 13, fontWeight: "900", color: colorScheme.accent, paddingLeft: 22 }} numberOfLines={2}>
            {(detail.portionCount ?? detail.passCount)} {UI_TEXT.plates}
            {detail.parcelCount > 0
              ? ` (${detail.dineInCount} ${UI_TEXT.dineIn}, ${detail.parcelCount} ${UI_TEXT.parcel})`
              : ` (${detail.portionCount ?? detail.passCount} ${UI_TEXT.dineIn})`}
          </Text>
        </View>

        <View
          style={[
            styles.pill,
            { backgroundColor: colorScheme.accentLight, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12, flexShrink: 0 },
          ]}
        >
          <Text style={[styles.pillText, { color: colorScheme.accent, fontSize: 13, fontWeight: "900" }]}>
            {UI_TEXT.rs} {formatCurrencyAmount(detail.netPayment)}
          </Text>
        </View>
      </View>

      <View style={{ gap: 4, marginTop: 4 }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600", flex: 1, marginRight: 8 }} numberOfLines={1}>
            • {UI_TEXT.menuPriceLabel}
          </Text>
          <Text style={{ fontSize: 12, color: theme.colors.textPrimary, fontWeight: "700", flexShrink: 0 }} numberOfLines={1}>
            {UI_TEXT.rs} {formatCurrencyAmount(detail.menuPrice)}
          </Text>
        </View>

        {detail.parcelPrice > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600", flex: 1, marginRight: 8 }} numberOfLines={1}>
              • {UI_TEXT.parcelCharges}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.textPrimary, fontWeight: "700", flexShrink: 0 }} numberOfLines={1}>
              + {UI_TEXT.rs} {formatCurrencyAmount(detail.parcelPrice)}
            </Text>
          </View>
        )}

        {detail.packageDiscount > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600", flex: 1, marginRight: 8 }} numberOfLines={1}>
              • {UI_TEXT.packageDiscountLabel}
            </Text>
            <Text style={{ fontSize: 12, color: theme.colors.error, fontWeight: "700", flexShrink: 0 }} numberOfLines={1}>
              - {UI_TEXT.rs} {formatCurrencyAmount(detail.packageDiscount)}
            </Text>
          </View>
        )}

        {detail.excessDeficient !== 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ fontSize: 12, color: theme.colors.textSecondary, fontWeight: "600", flex: 1, marginRight: 8 }} numberOfLines={1}>
              • {UI_TEXT.excessDeficientLabel}
            </Text>
            <Text
              style={{
                fontSize: 12,
                color: detail.excessDeficient > 0 ? theme.colors.success : theme.colors.error,
                fontWeight: "700",
                flexShrink: 0,
              }}
              numberOfLines={1}
            >
              {detail.excessDeficient > 0 ? "+" : "-"} {UI_TEXT.rs}{" "}
              {formatCurrencyAmount(Math.abs(detail.excessDeficient))}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}
