import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { PaymentMode, AppThemeMode, ConfigDay } from "../../domain";
import { getPaymentModeLabel } from "../../constants";
import { AmountDiscrepancyReport } from "./AmountDiscrepancyReport";
import { DayWisePaymentReport } from "./DayWisePaymentReport";
import { MealWisePaymentReport } from "./MealWisePaymentReport";
import { DiscrepancyItem, DayPaymentDetail, MealPaymentDetail } from "../../utils/paymentUtils";

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
  totalAdultFood?: number;
  totalKidsFood?: number;
  totalGuestsFood?: number;
  totalParcel: number;
  totalAdultParcel?: number;
  totalKidsParcel?: number;
  totalGuestsParcel?: number;
  discrepancies?: DiscrepancyItem[];
  mealWisePayments?: MealPaymentDetail[];
  dayWisePayments?: DayPaymentDetail[];
  seasonTotalPayment?: {
    menuPrice: number;
    packageDiscount: number;
    excessDeficient: number;
    netPayment: number;
    seasonTotalPasses?: number;
    paidPassesCount?: number;
    unpaidPassesCount?: number;
  };
  seasonTotalPasses?: number;
}

enum PaymentTab {
  SUMMARY = "summary",
  DAY_WISE = "day_wise",
  MEAL_WISE = "meal_wise",
  DISCREPANCY = "discrepancy",
}

export function PaymentSummaryReport({
  data,
  dayConfig = [],
  onSelectFlat,
  kidsEnabled = false,
  guestsEnabled = false,
}: {
  data: PaymentData;
  dayConfig?: ConfigDay[];
  onSelectFlat?: (id: string) => void;
  kidsEnabled?: boolean;
  guestsEnabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<PaymentTab>(PaymentTab.SUMMARY);

  // Group individual payment entries by mode from ALL subscriptions
  const transactionsByMode = (data.summary || []).map((s) => {
    const entries: any[] = [];
    (data.details || []).forEach((flat) => {
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

  const discrepancyCount = data.discrepancies ? data.discrepancies.length : 0;

  const foodBreakdown = [
    { label: UI_TEXT.adults, amount: data.totalAdultFood ?? 0 },
    ...(kidsEnabled ? [{ label: UI_TEXT.kids, amount: data.totalKidsFood ?? 0 }] : []),
    ...(guestsEnabled ? [{ label: UI_TEXT.guests, amount: data.totalGuestsFood ?? 0 }] : []),
  ].filter((item) => item.amount > 0);

  const parcelBreakdown = [
    { label: UI_TEXT.adults, amount: data.totalAdultParcel ?? 0 },
    ...(kidsEnabled ? [{ label: UI_TEXT.kids, amount: data.totalKidsParcel ?? 0 }] : []),
    ...(guestsEnabled ? [{ label: UI_TEXT.guests, amount: data.totalGuestsParcel ?? 0 }] : []),
  ].filter((item) => item.amount > 0);

  return (
    <View style={{ gap: 16 }}>
      {/* Sub-Tabs Navigation */}
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8, paddingHorizontal: 2 }}>
        {[
          { id: PaymentTab.SUMMARY, label: UI_TEXT.paymentSummary, icon: "card-outline" },
          { id: PaymentTab.DAY_WISE, label: UI_TEXT.dayWisePayment, icon: "calendar-outline" },
          { id: PaymentTab.MEAL_WISE, label: UI_TEXT.mealWisePayment, icon: "restaurant-outline" },
          {
            id: PaymentTab.DISCREPANCY,
            label: `${UI_TEXT.amountDiscrepancyReport}${discrepancyCount > 0 ? ` (${discrepancyCount})` : ""}`,
            icon: "alert-circle-outline",
          },
        ].map((tab) => (
          <Pressable
            key={tab.id}
            onPress={() => setActiveTab(tab.id as PaymentTab)}
            accessible={true}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected: activeTab === tab.id }}
            style={({ pressed }) => [
              {
                flex: 1,
                minWidth: 110,
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                gap: 5,
                paddingVertical: 8,
                paddingHorizontal: 8,
                borderRadius: 12,
                backgroundColor: activeTab === tab.id ? theme.colors.primary : theme.colors.surfaceDark,
                borderWidth: 1,
                borderColor: theme.colors.border,
              },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Ionicons
              name={tab.icon as any}
              size={15}
              color={activeTab === tab.id ? theme.colors.white : theme.colors.textSecondary}
            />
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit={true}
              style={{
                fontSize: 11,
                fontWeight: "800",
                color: activeTab === tab.id ? theme.colors.white : theme.colors.textSecondary,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {activeTab === PaymentTab.SUMMARY ? (
        <View style={{ gap: 24 }}>
          {/* 1. Global Financial Summary Card */}
          <View style={[styles.card, { padding: 0, overflow: "hidden" }]}>
            {(data.summary || []).map((item) => (
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
            <View
              style={{ backgroundColor: theme.colors.primary, padding: 16 }}
              accessible={true}
              accessibilityRole="summary"
              accessibilityLabel={`${UI_TEXT.totalCollection}: ${(data.summary || []).reduce((acc, curr) => acc + curr.total, 0).toFixed(0)} rupees, Total Passes: ${(data.seasonTotalPayment?.seasonTotalPasses ?? data.seasonTotalPasses ?? data.details?.length ?? 0)}`}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1, minWidth: 140 }}>
                  {UI_TEXT.totalCollection}
                </Text>
                <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 24, flexShrink: 0 }}>
                  {UI_TEXT.rs}
                  {UI_TEXT.space}
                  {(data.summary || []).reduce((acc, curr) => acc + curr.total, 0).toFixed(0)}
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
                {((data.seasonTotalPayment?.seasonTotalPasses ?? data.seasonTotalPasses ?? data.details?.length) || 0) > 0 && (
                  <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
                    <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                      {UI_TEXT.totalPassesLabel}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "900" }}>
                        {(() => {
                          const pCount = data.seasonTotalPayment?.seasonTotalPasses ?? data.seasonTotalPasses ?? data.details?.length ?? 0;
                          return `${pCount} ${pCount === 1 ? UI_TEXT.passSingular : UI_TEXT.passPlural}`;
                        })()}
                      </Text>
                      {(() => {
                        const totalCount = data.seasonTotalPayment?.seasonTotalPasses ?? data.seasonTotalPasses ?? data.details?.length ?? 0;
                        const paidCount = data.seasonTotalPayment?.paidPassesCount ?? (data.details || []).filter((flat) => flat.total > 0).length;
                        const unpaidCount = totalCount - paidCount;
                        return (
                          <Text style={{ color: theme.colors.white + "DD", fontSize: 13, fontWeight: "700" }}>
                            {UI_TEXT.openParen}
                            {paidCount}{UI_TEXT.space}{UI_TEXT.paidPasses}
                            {UI_TEXT.pipe}
                            {unpaidCount}{UI_TEXT.space}{UI_TEXT.unpaidPasses}
                            {UI_TEXT.closeParen}
                          </Text>
                        );
                      })()}
                    </View>
                  </View>
                )}

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                  <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, minWidth: 120 }}>
                    {UI_TEXT.foodCollection}
                  </Text>
                  <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }}>
                    {UI_TEXT.rs}
                    {UI_TEXT.space}
                    {(data.totalFood || 0).toFixed(0)}
                  </Text>
                </View>
                {foodBreakdown.length > 1 ? (
                  foodBreakdown.map((item) => (
                    <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4, paddingLeft: 12 }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 12, fontWeight: "600", flex: 1, minWidth: 120 }}>
                        • {item.label}
                      </Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flexShrink: 0 }}>
                        {UI_TEXT.rs}
                        {UI_TEXT.space}
                        {item.amount.toFixed(0)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4, paddingLeft: 12 }}>
                    <Text style={{ color: theme.colors.white + "99", fontSize: 12, fontWeight: "600", flex: 1, minWidth: 120 }}>
                      • {kidsEnabled ? UI_TEXT.adults : UI_TEXT.members}
                    </Text>
                    <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flexShrink: 0 }}>
                      {UI_TEXT.rs}
                      {UI_TEXT.space}
                      {(data.totalFood || 0).toFixed(0)}
                    </Text>
                  </View>
                )}

                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                  <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, minWidth: 120 }}>
                    {UI_TEXT.parcelCollection}
                  </Text>
                  <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }}>
                    {UI_TEXT.rs}
                    {UI_TEXT.space}
                    {(data.totalParcel || 0).toFixed(0)}
                  </Text>
                </View>
                {parcelBreakdown.length > 1 ? (
                  parcelBreakdown.map((item) => (
                    <View key={item.label} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4, paddingLeft: 12 }}>
                      <Text style={{ color: theme.colors.white + "99", fontSize: 12, fontWeight: "600", flex: 1, minWidth: 120 }}>
                        • {item.label}
                      </Text>
                      <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flexShrink: 0 }}>
                        {UI_TEXT.rs}
                        {UI_TEXT.space}
                        {item.amount.toFixed(0)}
                      </Text>
                    </View>
                  ))
                ) : (
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4, paddingLeft: 12 }}>
                    <Text style={{ color: theme.colors.white + "99", fontSize: 12, fontWeight: "600", flex: 1, minWidth: 120 }}>
                      • {kidsEnabled ? UI_TEXT.adults : UI_TEXT.members}
                    </Text>
                    <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flexShrink: 0 }}>
                      {UI_TEXT.rs}
                      {UI_TEXT.space}
                      {(data.totalParcel || 0).toFixed(0)}
                    </Text>
                  </View>
                )}
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
                      <Text style={[styles.sectionTitle, { fontSize: 16, color: theme.colors.textPrimary, textTransform: "uppercase" }]}>
                        {getPaymentModeLabel(group.mode)}
                      </Text>
                      <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary }}>
                        {group.entries.length} {UI_TEXT.transactionsLabel}
                      </Text>
                    </View>
                    <View
                      style={[styles.pill, { backgroundColor: groupColor.accentLight, height: 26, paddingHorizontal: 12, borderRadius: 13 }]}
                    >
                      <Text style={[styles.pillText, { color: groupColor.accent, fontSize: 12, fontWeight: "900" }]}>
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
                        accessible={true}
                        accessibilityRole="button"
                        accessibilityLabel={`${entry.block}${UI_TEXT.hyphen}${entry.flat}${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.rs}${parseFloat(entry.amount).toFixed(0)}`}
                        accessibilityHint={UI_TEXT.viewPassHint}
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
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                              <View style={{ width: 4, height: 16, borderRadius: 2, backgroundColor: groupColor.accent }} />
                              <Text style={{ fontSize: 18, fontWeight: "900", color: theme.colors.textPrimary }}>
                                {entry.block}
                                {UI_TEXT.hyphen}
                                {entry.flat}
                              </Text>
                            </View>

                            {group.mode === PaymentMode.CASH && entry.receivedBy ? (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, marginLeft: 12 }}>
                                <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: "700", textTransform: "uppercase" }}>
                                  {UI_TEXT.receivedByLabel}{UI_TEXT.colon}
                                </Text>
                                <Text style={{ fontSize: 12, color: groupColor.accent, fontWeight: "800" }}>{entry.receivedBy}</Text>
                              </View>
                            ) : group.mode !== PaymentMode.CASH && entry.transactionId ? (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 6, marginLeft: 12 }}>
                                <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: "700", textTransform: "uppercase" }}>
                                  {UI_TEXT.transactionIdLabel}{UI_TEXT.colon}
                                </Text>
                                <Text style={{ fontSize: 12, color: groupColor.accent, fontWeight: "800" }}>{entry.transactionId}</Text>
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
      ) : activeTab === PaymentTab.DAY_WISE ? (
        <DayWisePaymentReport
          dayWisePayments={data.dayWisePayments || []}
          seasonTotalPayment={data.seasonTotalPayment}
          dayConfig={dayConfig}
        />
      ) : activeTab === PaymentTab.MEAL_WISE ? (
        <MealWisePaymentReport
          mealWisePayments={data.mealWisePayments || []}
          seasonTotalPayment={data.seasonTotalPayment}
          dayConfig={dayConfig}
        />
      ) : (
        <AmountDiscrepancyReport
          data={data.discrepancies || []}
          onSelectFlat={onSelectFlat || (() => {})}
          kidsEnabled={kidsEnabled}
        />
      )}
    </View>
  );
}
