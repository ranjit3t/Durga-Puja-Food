import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { formatCurrencyAmount } from "../../utils/paymentUtils";

export interface ReportSummaryCardProps {
  title: string;
  iconName: keyof typeof Ionicons.glyphMap;
  summary: {
    menuPrice: number;
    parcelPrice?: number;
    packageDiscount: number;
    excessDeficient: number;
    netPayment: number;
    totalPortions?: number;
    dineInCount?: number;
    parcelCount?: number;
  };
}

export function ReportSummaryCard({ title, iconName, summary }: ReportSummaryCardProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Ionicons name={iconName} size={20} color={theme.colors.white} />
        <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1 }}>
          {title}
        </Text>
      </View>

      <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
        {(summary.totalPortions ?? 0) > 0 && (
          <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
              {UI_TEXT.totalSubscribed}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "900" }}>
              {summary.totalPortions} {UI_TEXT.plates}
              {(summary.parcelCount ?? 0) > 0
                ? ` (${summary.dineInCount ?? 0} ${UI_TEXT.dineIn}, ${summary.parcelCount ?? 0} ${UI_TEXT.parcel})`
                : ` (${summary.dineInCount ?? summary.totalPortions} ${UI_TEXT.dineIn})`}
            </Text>
          </View>
        )}

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
            {UI_TEXT.menuPriceLabel}
          </Text>
          <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800" }}>
            {UI_TEXT.rs} {formatCurrencyAmount(summary.menuPrice)}
          </Text>
        </View>

        {(summary.parcelPrice ?? 0) > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
              {UI_TEXT.parcelCharges}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800" }}>
              + {UI_TEXT.rs} {formatCurrencyAmount(summary.parcelPrice ?? 0)}
            </Text>
          </View>
        )}

        {summary.packageDiscount > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
              {UI_TEXT.packageDiscountLabel}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800" }}>
              - {UI_TEXT.rs} {formatCurrencyAmount(summary.packageDiscount)}
            </Text>
          </View>
        )}

        {summary.excessDeficient !== 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
              {UI_TEXT.excessDeficientLabel}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800" }}>
              {summary.excessDeficient > 0 ? "+" : "-"} {UI_TEXT.rs}{" "}
              {formatCurrencyAmount(Math.abs(summary.excessDeficient))}
            </Text>
          </View>
        )}

        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 8, marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 16 }}>
            {UI_TEXT.netPaymentLabel}
          </Text>
          <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 20 }}>
            {UI_TEXT.rs} {formatCurrencyAmount(summary.netPayment)}
          </Text>
        </View>
      </View>
    </View>
  );
}
