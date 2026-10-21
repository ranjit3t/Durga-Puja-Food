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
  isCapturing,
}: {
  data: PaymentData;
  dayConfig?: ConfigDay[];
  onSelectFlat?: (id: string) => void;
  kidsEnabled?: boolean;
  guestsEnabled?: boolean;
  isCapturing?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();
  const [activeTab, setActiveTab] = useState<PaymentTab>(PaymentTab.SUMMARY);
  const [summaryMode, setSummaryMode] = useState<"detailed" | "summarized">("detailed");

  const discrepancyCount = data.discrepancies ? data.discrepancies.length : 0;

  const foodBreakdown = [
    { label: kidsEnabled ? UI_TEXT.adults : UI_TEXT.members, amount: data.totalAdultFood ?? 0 },
    ...(kidsEnabled ? [{ label: UI_TEXT.kids, amount: data.totalKidsFood ?? 0 }] : []),
    ...(guestsEnabled ? [{ label: UI_TEXT.guests, amount: data.totalGuestsFood ?? 0 }] : []),
  ].filter((item) => item.amount > 0);

  const parcelBreakdown = [
    { label: kidsEnabled ? UI_TEXT.adults : UI_TEXT.members, amount: data.totalAdultParcel ?? 0 },
    ...(kidsEnabled ? [{ label: UI_TEXT.kids, amount: data.totalKidsParcel ?? 0 }] : []),
    ...(guestsEnabled ? [{ label: UI_TEXT.guests, amount: data.totalGuestsParcel ?? 0 }] : []),
  ].filter((item) => item.amount > 0);

  return (
    <View style={{ gap: 16 }}>
      {/* Sub-Tabs Navigation */}
      {!isCapturing && (
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
      )}

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

          {/* 2. Pass-Wise Payment Details List */}
          <View style={{ gap: 12 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <Text style={[styles.sectionTitle, { fontSize: 16, color: theme.colors.textPrimary, textTransform: "uppercase", marginBottom: 0 }]}>
                {UI_TEXT.subscriptions} ({data.details.length})
              </Text>

              {!isCapturing && (
                <View style={{ flexDirection: "row", backgroundColor: theme.colors.surfaceDark, borderRadius: 10, padding: 3, borderWidth: 1, borderColor: theme.colors.border }}>
                  <Pressable
                    onPress={() => setSummaryMode("detailed")}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: summaryMode === "detailed" ? theme.colors.primary : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "800", color: summaryMode === "detailed" ? theme.colors.white : theme.colors.textSecondary }}>
                      {UI_TEXT.detailedPayment}
                    </Text>
                  </Pressable>
                  <Pressable
                    onPress={() => setSummaryMode("summarized")}
                    style={{
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 8,
                      backgroundColor: summaryMode === "summarized" ? theme.colors.primary : "transparent",
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "800", color: summaryMode === "summarized" ? theme.colors.white : theme.colors.textSecondary }}>
                      {UI_TEXT.summarizedPayment}
                    </Text>
                  </Pressable>
                </View>
              )}
            </View>

            <View style={{ gap: 10 }}>
              {(data.details || []).map((flat, flatIdx) => {
                const colorScheme = theme.cardColors[flatIdx % theme.cardColors.length];

                return (
                  <Pressable
                    key={flat.id}
                    onPress={() => onSelectFlat && onSelectFlat(flat.id)}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`${flat.block}${UI_TEXT.hyphen}${flat.flat}, ${UI_TEXT.total}: ${UI_TEXT.rs}${flat.total.toFixed(0)}`}
                    accessibilityHint={UI_TEXT.viewPassHint}
                    style={({ pressed }) => [
                      styles.dashboardCard,
                      {
                        backgroundColor: colorScheme.bg,
                        borderColor: colorScheme.border,
                        borderWidth: 1.5,
                        marginBottom: 0,
                        padding: 14,
                        gap: 10,
                      },
                      pressed && { opacity: 0.7 },
                    ]}
                  >
                    {/* Pass Header: Block-Flat & Pass Total Amount */}
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, borderBottomWidth: summaryMode === "detailed" && flat.payments.length > 0 ? 1 : 0, borderBottomColor: colorScheme.border, paddingBottom: summaryMode === "detailed" && flat.payments.length > 0 ? 8 : 0 }}>
                      <View style={{ flex: 1, minWidth: 120 }}>
                        <Text style={[styles.dashboardDay, { color: colorScheme.accent, fontSize: 18 }]}>
                          {flat.block}
                          {UI_TEXT.hyphen}
                          {flat.flat}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary, marginTop: 2 }}>
                          {flat.peopleCount} {flat.peopleCount === 1 ? UI_TEXT.personSuffix : UI_TEXT.personsSuffix}
                        </Text>
                      </View>

                      <View style={{ alignItems: "flex-end", flexShrink: 0 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                          {UI_TEXT.total}
                        </Text>
                        <Text style={{ fontSize: 20, fontWeight: "900", color: colorScheme.accent, marginTop: 2 }}>
                          {UI_TEXT.rs}
                          {UI_TEXT.space}
                          {flat.total.toFixed(0)}
                        </Text>
                      </View>
                    </View>

                    {/* Ordered Payment Breakup Entries */}
                    {summaryMode === "detailed" && flat.payments && flat.payments.length > 0 && (
                      <View style={{ gap: 8, paddingTop: 4 }}>
                        <Text style={{ fontSize: 10, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                          {UI_TEXT.paymentDetails}
                        </Text>
                        {flat.payments.map((p, pIdx) => (
                          <View
                            key={pIdx}
                            style={{
                              backgroundColor: theme.colors.surface + (theme.themeType === AppThemeMode.DARK ? "88" : "CC"),
                              borderRadius: 10,
                              padding: 10,
                              borderWidth: 1,
                              borderColor: theme.colors.border,
                              gap: 6,
                            }}
                          >
                            {/* Payment Method & Entry Amount (Wrapped properly to prevent clashing) */}
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, minWidth: 140 }}>
                                <Ionicons
                                  name={
                                    p.mode === PaymentMode.UPI
                                      ? "phone-portrait-outline"
                                      : p.mode === PaymentMode.CASH
                                      ? "cash-outline"
                                      : "card-outline"
                                  }
                                  size={14}
                                  color={colorScheme.accent}
                                />
                                <Text style={{ fontSize: 13, fontWeight: "800", color: theme.colors.textPrimary, flexShrink: 1 }} numberOfLines={1}>
                                  {getPaymentModeLabel(p.mode)}
                                </Text>
                              </View>

                              <Text style={{ fontSize: 15, fontWeight: "900", color: colorScheme.accent, flexShrink: 0 }}>
                                {UI_TEXT.rs} {parseFloat(p.amount || "0").toFixed(0)}
                              </Text>
                            </View>

                            {/* Transaction ID or Received By (Wrapped on its own line, never clashes with amount) */}
                            {(p.transactionId || p.receivedBy) && (
                              <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 4, marginTop: 2, paddingLeft: 20 }}>
                                <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: "700", textTransform: "uppercase" }}>
                                  {p.mode === PaymentMode.CASH ? UI_TEXT.receivedByLabel : UI_TEXT.transactionIdLabel}:
                                </Text>
                                <Text
                                  style={{ fontSize: 11, color: theme.colors.textPrimary, fontWeight: "800", flex: 1, minWidth: 120 }}
                                  numberOfLines={2}
                                >
                                  {p.mode === PaymentMode.CASH ? p.receivedBy : p.transactionId}
                                </Text>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
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
