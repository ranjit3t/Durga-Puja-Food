import React, { useState } from "react";
import { View, Text, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { PaymentMode, AppThemeMode, ConfigDay } from "../../domain";
import { getPaymentModeLabel } from "../../constants";
import { AmountDiscrepancyReport } from "./AmountDiscrepancyReport";
import { DayWisePaymentReport } from "./DayWisePaymentReport";
import { MealWisePaymentReport } from "./MealWisePaymentReport";
import { DiscrepancyItem, DayPaymentDetail, MealPaymentDetail, formatPaymentDateTime } from "../../utils/paymentUtils";

interface PaymentSummaryItem {
  mode: PaymentMode;
  count: number;
  total: number;
  passesCount?: number;
}

interface FlatPaymentDetail {
  id: string;
  block: string;
  flat: string;
  peopleCount: number;
  total: number;
  payments: { amount: string; mode: PaymentMode; transactionId?: string; receivedBy?: string; paymentTime?: number }[];
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

  const handleExportCsv = async () => {
    try {
      const rows: string[] = [];
      rows.push("Block,Flat,Total Amount (INR),Payment Mode,Amount (INR),Transaction ID / Received By,Paid On");

      (data.details || []).forEach((flat) => {
        const block = `"${(flat.block || "").replace(/"/g, '""')}"`;
        const flatNo = `"${(flat.flat || "").replace(/"/g, '""')}"`;
        const totalAmt = (flat.total || 0).toFixed(0);

        if (flat.payments && flat.payments.length > 0) {
          flat.payments.forEach((p, pIdx) => {
            const mode = `"${getPaymentModeLabel(p.mode).replace(/"/g, '""')}"`;
            const pAmt = parseFloat(p.amount || "0").toFixed(0);
            const refInfo = `"${(p.mode === PaymentMode.CASH ? (p.receivedBy || "") : (p.transactionId || "")).replace(/"/g, '""')}"`;
            const paidOnStr = `"${p.paymentTime ? formatPaymentDateTime(p.paymentTime).replace(/"/g, '""') : ""}"`;
            const rowTotal = pIdx === 0 ? totalAmt : "";
            rows.push(`${block},${flatNo},${rowTotal},${mode},${pAmt},${refInfo},${paidOnStr}`);
          });
        } else {
          rows.push(`${block},${flatNo},${totalAmt},"None","0","",""`);
        }
      });

      const csvContent = rows.join("\n");
      const fileName = `payment_breakup_${new Date().toISOString().slice(0, 10)}.csv`;

      if (Platform.OS === "web") {
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.setAttribute("download", fileName);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        const { FileSystem, Sharing } = await import("expo-file-system" as any).catch(() => ({}) as any);
        if (FileSystem && FileSystem.documentDirectory) {
          const fileUri = `${FileSystem.documentDirectory}${fileName}`;
          await FileSystem.writeAsStringAsync(fileUri, csvContent, { encoding: FileSystem.EncodingType.UTF8 });
          if (Sharing && (await Sharing.isAvailableAsync())) {
            await Sharing.shareAsync(fileUri, { mimeType: "text/csv", dialogTitle: UI_TEXT.exportCsv });
          }
        } else {
          const { Share } = await import("react-native");
          await Share.share({
            message: csvContent,
            title: fileName,
          });
        }
      }
    } catch (err) {
      console.error("Failed to export payment breakup CSV", err);
    }
  };

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
                gap: 6,
                paddingVertical: 10,
                paddingHorizontal: 12,
                borderRadius: 10,
                backgroundColor: activeTab === tab.id ? theme.colors.primary : theme.colors.surfaceDark,
                borderWidth: 1,
                borderColor: activeTab === tab.id ? theme.colors.primary : theme.colors.border,
              },
              pressed && { opacity: 0.8 },
            ]}
          >
            <Ionicons
              name={tab.icon as any}
              size={16}
              color={activeTab === tab.id ? theme.colors.white : theme.colors.textSecondary}
            />
            <Text
              style={{
                fontSize: 12,
                fontWeight: "800",
                color: activeTab === tab.id ? theme.colors.white : theme.colors.textPrimary,
              }}
            >
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>
      )}

      {/* Tab 1: Summary & Flat Breakup */}
      {activeTab === PaymentTab.SUMMARY && (
        <View style={{ gap: 16 }}>
          {/* Top Collection Summary Cards */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            <View
              style={[
                styles.card,
                {
                  flex: 1,
                  minWidth: 240,
                  backgroundColor: theme.cardColors[0].bg,
                  borderColor: theme.cardColors[0].border,
                },
              ]}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                {UI_TEXT.totalCollection}
              </Text>
              <Text style={{ fontSize: 28, fontWeight: "900", color: theme.cardColors[0].accent, marginTop: 4 }}>
                
                {data.seasonTotalPayment?.netPayment?.toFixed(0) || "0"}
              </Text>
              <View style={{ flexDirection: "row", gap: 12, marginTop: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary }}>
                  {UI_TEXT.paidPasses}: <Text style={{ color: theme.colors.textPrimary, fontWeight: "900" }}>{data.seasonTotalPayment?.paidPassesCount ?? 0}</Text>
                </Text>
                <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary }}>
                  {UI_TEXT.unpaidPasses}: <Text style={{ color: theme.colors.textPrimary, fontWeight: "900" }}>{data.seasonTotalPayment?.unpaidPassesCount ?? 0}</Text>
                </Text>
              </View>
            </View>

            {/* Food vs Parcel Revenue Breakdown */}
            <View
              style={[
                styles.card,
                {
                  flex: 1,
                  minWidth: 240,
                  backgroundColor: theme.cardColors[1].bg,
                  borderColor: theme.cardColors[1].border,
                },
              ]}
            >
              <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase", marginBottom: 8 }}>
                {UI_TEXT.paymentSummary} ({UI_TEXT.food} vs {UI_TEXT.parcel})
              </Text>
              <View style={{ gap: 6 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.textPrimary }}>
                    • {UI_TEXT.food} ({foodBreakdown.map(i => i.label).join(", ")})
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: theme.cardColors[1].accent }}>
                    {(data.totalFood || 0).toFixed(0)}
                  </Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: theme.colors.textPrimary }}>
                    • {UI_TEXT.parcel} ({parcelBreakdown.map(i => i.label).join(", ")})
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "900", color: theme.cardColors[1].accent }}>
                    {(data.totalParcel || 0).toFixed(0)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Payment Mode Summary Cards */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
            {(data.summary || []).map((item, idx) => {
              const cardTheme = theme.cardColors[(idx + 2) % theme.cardColors.length];
              return (
                <View
                  key={item.mode}
                  style={[
                    styles.card,
                    {
                      flex: 1,
                      minWidth: 160,
                      backgroundColor: cardTheme.bg,
                      borderColor: cardTheme.border,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: "800", color: theme.colors.textSecondary, textTransform: "uppercase" }}>
                    {getPaymentModeLabel(item.mode)}
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: "900", color: cardTheme.accent, marginTop: 4 }}>
                    
                    {item.total.toFixed(0)}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary, marginTop: 4 }}>
                    {item.count} {item.count === 1 ? UI_TEXT.paymentTransaction : UI_TEXT.paymentTransactions} ({item.passesCount || 0} passes)
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Detailed / Summarized Flat Breakdown List */}
          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <Text style={[styles.sectionTitle, { fontSize: 16, marginBottom: 0 }]}>
                {UI_TEXT.detailedPayment} ({data.details?.length || 0} passes)
              </Text>

              {/* View Mode Toggle Pill */}
              <View style={{ flexDirection: "row", backgroundColor: theme.colors.surfaceDark, padding: 3, borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border }}>
                <Pressable
                  onPress={() => setSummaryMode("detailed")}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Detailed payment view"
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: summaryMode === "detailed" ? theme.colors.primary : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "800", color: summaryMode === "detailed" ? theme.colors.white : theme.colors.textPrimary }}>
                    {UI_TEXT.detailedPayment}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setSummaryMode("summarized")}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel="Summarized payment view"
                  style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 6,
                    backgroundColor: summaryMode === "summarized" ? theme.colors.primary : "transparent",
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: "800", color: summaryMode === "summarized" ? theme.colors.white : theme.colors.textPrimary }}>
                    {UI_TEXT.summarizedPayment}
                  </Text>
                </Pressable>
              </View>
            </View>

            <View style={{ gap: 12 }}>
              {(data.details || []).map((flat) => {
                const colorScheme = theme.cardColors[0];
                return (
                  <Pressable
                    key={flat.id}
                    onPress={() => onSelectFlat && onSelectFlat(flat.id)}
                    accessible={true}
                    accessibilityRole="button"
                    accessibilityLabel={`Pass ${flat.block}-${flat.flat}, Total ${flat.total.toFixed(0)} rupees`}
                    style={({ pressed }) => [
                      {
                        backgroundColor: theme.colors.surfaceDark,
                        borderRadius: 12,
                        padding: 12,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        gap: 10,
                      },
                      pressed && { opacity: 0.8 },
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
                                {parseFloat(p.amount || "0").toFixed(0)}
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

                            {/* Paid On Timestamp */}
                            {p.paymentTime ? (
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2, paddingLeft: 20 }}>
                                <Ionicons name="time-outline" size={11} color={theme.colors.textMuted} />
                                <Text style={{ fontSize: 10, color: theme.colors.textSecondary, fontWeight: "700" }}>
                                  {UI_TEXT.paymentTimeLabel}: {formatPaymentDateTime(p.paymentTime)}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        ))}
                      </View>
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>

          {/* Export CSV Button */}
          {!isCapturing && (
            <Pressable
              onPress={handleExportCsv}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={UI_TEXT.exportCsv}
              accessibilityHint="Exports payment breakup for each flat in CSV format"
              style={({ pressed }) => [
                {
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                  backgroundColor: theme.colors.primary,
                  paddingVertical: 14,
                  paddingHorizontal: 20,
                  borderRadius: 12,
                },
                pressed && { opacity: 0.8 },
              ]}
            >
              <Ionicons name="download-outline" size={18} color={theme.colors.white} />
              <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 14 }}>
                {UI_TEXT.exportCsv}
              </Text>
            </Pressable>
          )}
        </View>
      )}

      {/* Tab 2: Day-Wise Payment Report */}
      {activeTab === PaymentTab.DAY_WISE && (
        <DayWisePaymentReport
          dayWisePayments={data.dayWisePayments || []}
          seasonTotalPayment={data.seasonTotalPayment}
          dayConfig={dayConfig}
        />
      )}

      {/* Tab 3: Meal-Wise Payment Report */}
      {activeTab === PaymentTab.MEAL_WISE && (
        <MealWisePaymentReport
          mealWisePayments={data.mealWisePayments || []}
          seasonTotalPayment={data.seasonTotalPayment}
        />
      )}

      {/* Tab 4: Amount Discrepancy Report */}
      {activeTab === PaymentTab.DISCREPANCY && (
        <AmountDiscrepancyReport
          discrepancies={data.discrepancies || []}
          onSelectFlat={onSelectFlat}
        />
      )}
    </View>
  );
};
