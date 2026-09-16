import React from "react";
import { View, Text, Pressable } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { PaymentMode } from "../../types";
import { getPaymentModeLabel } from "../../constants";

interface PaymentSummaryItem {
  mode: PaymentMode;
  count: number;
  total: number;
}

interface FlatPaymentDetail {
  id: string;
  block: string;
  flat: string;
  peopleCount: number;
  total: number;
  payments: { amount: string; mode: PaymentMode; transactionId?: string }[];
}

interface PaymentData {
  summary: PaymentSummaryItem[];
  details: FlatPaymentDetail[];
  totalFood: number;
  totalParcel: number;
}

export function PaymentSummaryReport({
  data,
  onSelectFlat,
}: {
  data: PaymentData;
  onSelectFlat?: (id: string) => void;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 24 }}>
      <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
        {data.summary.map((item) => (
          <View key={item.mode} style={{ flexDirection: "row", justifyContent: "space-between", padding: 16, borderBottomWidth: 1, borderBottomColor: theme.colors.border }}>
            <Text style={{ fontWeight: "800" }}>{getPaymentModeLabel(item.mode)}</Text>
            <Text style={{ fontWeight: "900" }}>{UI_TEXT.rs} {item.total.toFixed(0)}</Text>
          </View>
        ))}
        <View style={{ backgroundColor: theme.colors.primary, padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18 }}>{UI_TEXT.totalCollection}</Text>
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 24 }}>
              {UI_TEXT.rs} {data.summary.reduce((acc, curr) => acc + curr.total, 0).toFixed(0)}
            </Text>
          </View>

          {/* Breakdown Subsection */}
          <View style={{ marginTop: 12, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12, gap: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>{UI_TEXT.foodCollection}</Text>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800" }}>{UI_TEXT.rs} {data.totalFood.toFixed(0)}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>{UI_TEXT.parcelCollection}</Text>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800" }}>{UI_TEXT.rs} {data.totalParcel.toFixed(0)}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Flat Wise Payment Audit Details with Member Counts */}
      <View style={{ gap: 12 }}>
        <Text style={[styles.sectionTitle, { fontSize: 16, color: theme.colors.textPrimary }]}>
          {UI_TEXT.flatWiseReport || "Flat Wise Audit Details"}
        </Text>
        {data.details && data.details.map((flatItem, index) => {
          const cardColor = theme.cardColors[index % theme.cardColors.length];
          return (
            <Pressable
              key={flatItem.id}
              onPress={() => onSelectFlat && onSelectFlat(flatItem.id)}
              style={({ pressed }) => [
                styles.dashboardCard,
                { backgroundColor: cardColor.bg, borderColor: cardColor.border, borderWidth: 1.5 },
                pressed && { opacity: 0.7 }
              ]}
            >
              <View style={styles.dashboardCardTop}>
                <View>
                  <Text style={[styles.dashboardDay, { color: cardColor.accent }]}>
                    {flatItem.block}-{flatItem.flat}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.textSecondary, marginTop: 2 }}>
                    {flatItem.peopleCount} {flatItem.peopleCount === 1 ? UI_TEXT.person : UI_TEXT.people}
                  </Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.amount, { color: cardColor.accent, fontWeight: "900" }]}>
                    {UI_TEXT.rs} {flatItem.total.toFixed(0)}
                  </Text>
                  <Text style={[styles.helper, { fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary, marginBottom: 0 }]}>
                    ({flatItem.payments.map(p => getPaymentModeLabel(p.mode)).join(", ")})
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
