import React from "react";
import { View, Text, Pressable } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { PaymentMode, AppThemeMode } from "../../domain";
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
  payments: { amount: string; mode: PaymentMode; transactionId?: string; receivedBy?: string }[];
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

  // Group individual payment entries by mode from ALL subscriptions
  const transactionsByMode = data.summary.map((s) => {
    const entries: any[] = [];
    data.details.forEach((flat) => {
      flat.payments.forEach((p) => {
        if (p.mode === s.mode) {
          entries.push({
            ...p,
            block: flat.block,
            flat: flat.flat,
            flatId: flat.id,
          });
        }
      });
    });
    // Sort entries by block/flat naturally
    entries.sort(
      (a, b) =>
        (a.block || "").localeCompare(b.block || "", undefined, { numeric: true, sensitivity: "base" }) ||
        (a.flat || "").localeCompare(b.flat || "", undefined, { numeric: true, sensitivity: "base" })
    );
    return { mode: s.mode, total: s.total, entries };
  });

  return (
    <View style={{ gap: 24 }}>
      {/* 1. Global Financial Summary Card */}
      <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
        {data.summary.map((item) => (
          <View
            key={item.mode}
            style={{
              flexDirection: "row",
              justifyContent: "space-between",
              padding: 16,
              borderBottomWidth: 1,
              borderBottomColor: theme.colors.border,
            }}
          >
            <Text style={{ fontWeight: "800", color: theme.colors.textPrimary }}>
              {getPaymentModeLabel(item.mode)}
            </Text>
            <Text style={{ fontWeight: "900", color: theme.colors.textPrimary }}>
              {UI_TEXT.rs}
              {UI_TEXT.space}
              {item.total.toFixed(0)}
            </Text>
          </View>
        ))}
        <View style={{ backgroundColor: theme.colors.primary, padding: 16 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1, minWidth: 140 }}>
              {UI_TEXT.totalCollection}
            </Text>
            <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 24, flexShrink: 0 }}>
              {UI_TEXT.rs}
              {UI_TEXT.space}
              {data.summary.reduce((acc, curr) => acc + curr.total, 0).toFixed(0)}
            </Text>
          </View>

          {/* Breakdown Subsection */}
          <View
            style={{
              marginTop: 12,
              borderTopWidth: 1,
              borderTopColor: theme.colors.white + "40",
              paddingTop: 12,
              gap: 8,
            }}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, minWidth: 120 }}>
                {UI_TEXT.foodCollection}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }}>
                {UI_TEXT.rs}
                {UI_TEXT.space}
                {data.totalFood.toFixed(0)}
              </Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, minWidth: 120 }}>
                {UI_TEXT.parcelCollection}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }}>
                {UI_TEXT.rs}
                {UI_TEXT.space}
                {data.totalParcel.toFixed(0)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. Mode-Specific Transaction Detailed Subsections */}
      <View style={{ gap: 32 }}>
        {transactionsByMode.map((group, groupIdx) => {
          if (group.entries.length === 0) return null;
          const groupColor = theme.cardColors[groupIdx % theme.cardColors.length];

          return (
            <View key={group.mode} style={{ gap: 12 }}>
              {/* Subsection Header */}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingHorizontal: 4,
                  borderLeftWidth: 4,
                  borderLeftColor: groupColor.accent,
                  paddingLeft: 12,
                }}
              >
                <View>
                  <Text style={[styles.sectionTitle, { fontSize: 16, color: theme.colors.textPrimary, textTransform: 'uppercase' }]}>
                    {getPaymentModeLabel(group.mode)}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>
                    {group.entries.length} {UI_TEXT.transactionsLabel}
                  </Text>
                </View>
                <View
                  style={[styles.pill, { backgroundColor: groupColor.accentLight, height: 26, paddingHorizontal: 12, borderRadius: 13 }]}
                >
                  <Text style={[styles.pillText, { color: groupColor.accent, fontSize: 12, fontWeight: '900' }]}>
                    {UI_TEXT.rs} {group.total.toFixed(0)}
                  </Text>
                </View>
              </View>

              {/* Individual Transaction Entries */}
              <View style={{ gap: 10 }}>
                {group.entries.map((entry, idx) => (
                  <Pressable
                    key={`${entry.flatId}-${idx}`}
                    onPress={() => onSelectFlat && onSelectFlat(entry.flatId)}
                    style={({ pressed }) => [
                      styles.dashboardCard,
                      {
                        backgroundColor: theme.colors.surfaceDark + (theme.themeType === AppThemeMode.DARK ? "66" : "80"),
                        borderColor: theme.colors.border,
                        borderWidth: 1,
                        marginBottom: 0,
                        paddingVertical: 12,
                        paddingHorizontal: 16,
                      },
                      pressed && { opacity: 0.7, backgroundColor: groupColor.bg },
                    ]}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <View style={{ flex: 1 }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                           <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: groupColor.accent }} />
                           <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary }}>
                             {entry.block}
                             {UI_TEXT.hyphen}
                             {entry.flat}
                           </Text>
                        </View>

                        {group.mode === PaymentMode.CASH && entry.receivedBy ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginLeft: 12 }}>
                             <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>{UI_TEXT.receivedByLabel}{UI_TEXT.colon}</Text>
                             <Text style={{ fontSize: 12, color: groupColor.accent, fontWeight: '800' }}>{entry.receivedBy}</Text>
                          </View>
                        ) : (group.mode !== PaymentMode.CASH && entry.transactionId) ? (
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6, marginLeft: 12 }}>
                             <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: '700', textTransform: 'uppercase' }}>{UI_TEXT.transactionIdLabel}{UI_TEXT.colon}</Text>
                             <Text style={{ fontSize: 12, color: groupColor.accent, fontWeight: '800' }}>{entry.transactionId}</Text>
                          </View>
                        ) : null}
                      </View>

                      <View style={{ alignItems: "flex-end" }}>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: groupColor.accent }}>
                          {UI_TEXT.rs}
                          {UI_TEXT.space}
                          {parseFloat(entry.amount).toFixed(0)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                ))}
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
