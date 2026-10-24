import React from "react";
import { View, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { getPaymentModeLabel } from "../../constants";
import { formatCurrencyAmount } from "../../utils/paymentUtils";
import { PaymentMode } from "../../domain";

export interface ReportSummaryCardProps {
  title: string;
  iconName: keyof typeof Ionicons.glyphMap;
  activeFilterChips?: { label: string; value: string }[];
  summary: {
    menuPrice: number;
    parcelPrice?: number;
    packageDiscount: number;
    excessDeficient: number;
    netPayment: number;
    totalDeficiency?: number;
    totalExcess?: number;
    totalPortions?: number;
    servedPortions?: number;
    dineInCount?: number;
    dineInCountTaken?: number;
    parcelCount?: number;
    parcelCountTaken?: number;
    vegPortions?: number;
    vegPortionsTaken?: number;
    nonVegPortions?: number;
    nonVegPortionsTaken?: number;
    totalMembersCount?: number;
    totalAdultsCount?: number;
    totalKidsCount?: number;
    totalGuestsCount?: number;
    seasonTotalPasses?: number;
    paidPassesCount?: number;
    unpaidPassesCount?: number;
    packagedMembersCount?: number;
    packageCounts?: Record<string, { packageName: string; count: number }>;
    paymentModeTotals?: Record<string, number>;
  };
}

export function ReportSummaryCard({ title, iconName, activeFilterChips, summary }: ReportSummaryCardProps) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const summaryA11yLabel = `${title}: ${
    summary.servedPortions !== undefined
      ? `${summary.servedPortions} of ${summary.totalPortions ?? 0} plates served`
      : `${summary.totalPortions ?? 0} plates`
  }, Menu Price ${summary.menuPrice} rupees, Net Payment ${summary.netPayment} rupees`;

  return (
    <View
      style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}
      accessible={true}
      accessibilityRole="summary"
      accessibilityLabel={summaryA11yLabel}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Ionicons name={iconName} size={20} color={theme.colors.white} />
        <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1 }}>
          {title}
        </Text>
      </View>

      <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
        {/* Applied Filter Criteria Subsection */}
        {activeFilterChips !== undefined && (
          <View style={{ gap: 4, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
              {UI_TEXT.activeFilterSummary}
            </Text>
            {activeFilterChips.length > 0 ? (
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 2 }}>
                {activeFilterChips.map((chip) => (
                  <View
                    key={chip.label}
                    style={{
                      backgroundColor: theme.colors.white + "25",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ color: theme.colors.white, fontSize: 12, fontWeight: "800" }}>
                      {chip.label}: {chip.value}
                    </Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={{ color: theme.colors.white, fontSize: 12, fontWeight: "700", marginTop: 2 }}>
                {UI_TEXT.allFilters}
              </Text>
            )}
          </View>
        )}

        {/* Total Passes Block */}
        {(summary.seasonTotalPasses ?? 0) > 0 && (
          <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
              {UI_TEXT.totalPassesLabel}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "900" }}>
                {summary.seasonTotalPasses} {summary.seasonTotalPasses === 1 ? UI_TEXT.passSingular : UI_TEXT.passPlural}
              </Text>
              {((summary.paidPassesCount ?? 0) > 0 || (summary.unpaidPassesCount ?? 0) > 0) && (
                <Text style={{ color: theme.colors.white + "DD", fontSize: 13, fontWeight: "700" }}>
                  {UI_TEXT.openParen}
                  {(summary.paidPassesCount ?? 0) > 0 && `${summary.paidPassesCount}${UI_TEXT.space}${UI_TEXT.overpaidLabel}`}
                  {(summary.paidPassesCount ?? 0) > 0 && (summary.unpaidPassesCount ?? 0) > 0 && UI_TEXT.pipe}
                  {(summary.unpaidPassesCount ?? 0) > 0 && `${summary.unpaidPassesCount}${UI_TEXT.space}${UI_TEXT.underpaidLabel}`}
                  {UI_TEXT.closeParen}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Headcount Subsection Block */}
        {(summary.totalMembersCount ?? 0) > 0 && (
          <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
              {UI_TEXT.membersReport} ({summary.totalMembersCount} {summary.totalMembersCount === 1 ? UI_TEXT.member : UI_TEXT.members})
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {summary.totalAdultsCount !== undefined && summary.totalAdultsCount > 0 && (
                <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                  • {UI_TEXT.adults}: {summary.totalAdultsCount}
                </Text>
              )}
              {summary.totalKidsCount !== undefined && summary.totalKidsCount > 0 && (
                <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                  • {UI_TEXT.kids}: {summary.totalKidsCount}
                </Text>
              )}
              {summary.totalGuestsCount !== undefined && summary.totalGuestsCount > 0 && (
                <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800" }}>
                  • {UI_TEXT.guests}: {summary.totalGuestsCount}
                </Text>
              )}
            </View>
          </View>
        )}

        {/* Subscribed & Served Plates Block */}
        {(summary.totalPortions ?? 0) > 0 && (
          <View style={{ gap: 4, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.totalSubscribed}
              </Text>
              {summary.servedPortions !== undefined && (
                <Text style={{ color: theme.colors.white + "EE", fontSize: 12, fontWeight: "800" }}>
                  {UI_TEXT.totalServed}: {summary.servedPortions} / {summary.totalPortions} {UI_TEXT.plates}
                </Text>
              )}
            </View>

            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "900" }}>
              {summary.servedPortions !== undefined ? `${summary.servedPortions} / ${summary.totalPortions}` : summary.totalPortions} {UI_TEXT.plates}
              {(summary.parcelCount ?? 0) > 0
                ? ` (${summary.dineInCountTaken !== undefined ? `${summary.dineInCountTaken}/${summary.dineInCount}` : summary.dineInCount} ${UI_TEXT.dineIn}, ${summary.parcelCountTaken !== undefined ? `${summary.parcelCountTaken}/${summary.parcelCount}` : summary.parcelCount} ${UI_TEXT.parcel})`
                : ` (${summary.dineInCountTaken !== undefined ? `${summary.dineInCountTaken}/${summary.dineInCount}` : (summary.dineInCount ?? summary.totalPortions)} ${UI_TEXT.dineIn})`}
            </Text>

            {/* Veg / Non-Veg Breakdown */}
            {(summary.vegPortions !== undefined || summary.nonVegPortions !== undefined) && (
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4, flexWrap: "wrap" }}>
                {summary.vegPortions !== undefined && summary.vegPortions > 0 && (
                  <Text style={{ color: theme.colors.white + "EE", fontSize: 12, fontWeight: "800" }}>
                    • {UI_TEXT.veg}: {summary.vegPortionsTaken !== undefined ? `${summary.vegPortionsTaken}/${summary.vegPortions}` : summary.vegPortions}
                  </Text>
                )}
                {summary.nonVegPortions !== undefined && summary.nonVegPortions > 0 && (
                  <Text style={{ color: theme.colors.white + "EE", fontSize: 12, fontWeight: "800" }}>
                    • {UI_TEXT.nonVeg}: {summary.nonVegPortionsTaken !== undefined ? `${summary.nonVegPortionsTaken}/${summary.nonVegPortions}` : summary.nonVegPortions}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Applied Packages Block */}
        {(summary.packagedMembersCount ?? 0) > 0 && (
          <View style={{ gap: 4, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
              {UI_TEXT.packagesAppliedTitle} ({summary.packagedMembersCount} {summary.packagedMembersCount === 1 ? UI_TEXT.member : UI_TEXT.members})
            </Text>
            {summary.packageCounts && Object.keys(summary.packageCounts).length > 0 && (
              <View style={{ gap: 4, marginTop: 2 }}>
                {Object.values(summary.packageCounts).map((pkg) => (
                  <View key={pkg.packageName} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
                    <Text style={{ color: theme.colors.white + "EE", fontSize: 12, fontWeight: "600", flex: 1, minWidth: 120 }}>
                      • {pkg.packageName}
                    </Text>
                    <Text style={{ color: theme.colors.white, fontSize: 12, fontWeight: "800", flexShrink: 0 }}>
                      {pkg.count} {pkg.count === 1 ? UI_TEXT.member : UI_TEXT.members}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Financial Collections Breakdown */}
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 }} numberOfLines={1}>
            {UI_TEXT.expectedAmount}
          </Text>
          <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }} numberOfLines={1}>
            {UI_TEXT.rs} {formatCurrencyAmount(summary.menuPrice)}
          </Text>
        </View>

        {(summary.parcelPrice ?? 0) > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 }} numberOfLines={1}>
              {UI_TEXT.parcelCharges}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }} numberOfLines={1}>
              + {UI_TEXT.rs} {formatCurrencyAmount(summary.parcelPrice ?? 0)}
            </Text>
          </View>
        )}

        {summary.packageDiscount > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 }} numberOfLines={1}>
              {UI_TEXT.packageDiscountLabel}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }} numberOfLines={1}>
              - {UI_TEXT.rs} {formatCurrencyAmount(summary.packageDiscount)}
            </Text>
          </View>
        )}

        {(summary.totalDeficiency ?? 0) > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 }} numberOfLines={1}>
              {UI_TEXT.totalDeficiency}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }} numberOfLines={1}>
              - {UI_TEXT.rs} {formatCurrencyAmount(summary.totalDeficiency ?? 0)}
            </Text>
          </View>
        )}

        {(summary.totalExcess ?? 0) > 0 && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 }} numberOfLines={1}>
              {UI_TEXT.totalExcess}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }} numberOfLines={1}>
              + {UI_TEXT.rs} {formatCurrencyAmount(summary.totalExcess ?? 0)}
            </Text>
          </View>
        )}

        {summary.excessDeficient !== 0 && summary.totalDeficiency === undefined && summary.totalExcess === undefined && (
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 }} numberOfLines={1}>
              {UI_TEXT.excessDeficientLabel}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }} numberOfLines={1}>
              {summary.excessDeficient > 0 ? "+" : "-"} {UI_TEXT.rs}{" "}
              {formatCurrencyAmount(Math.abs(summary.excessDeficient))}
            </Text>
          </View>
        )}

        <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 8, marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4 }}>
          <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 16 }}>
            {UI_TEXT.paidAmount}
          </Text>
          <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 20 }}>
            {UI_TEXT.rs} {formatCurrencyAmount(summary.netPayment)}
          </Text>
        </View>

        {/* Payment Channels Breakdown Subsection */}
        {summary.paymentModeTotals && Object.keys(summary.paymentModeTotals).length > 0 && (
          <View style={{ gap: 4, marginTop: 4, borderTopWidth: 1, borderTopColor: theme.colors.white + "30", paddingTop: 8 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
              {UI_TEXT.paymentChannelsLabel}
            </Text>
            <View style={{ gap: 3, marginTop: 2 }}>
              {Object.entries(summary.paymentModeTotals)
                .filter(([_, amt]) => amt > 0)
                .map(([mode, amt]) => (
                  <View key={mode} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 4, paddingLeft: 10 }}>
                    <Text style={{ color: theme.colors.white + "DD", fontSize: 12, fontWeight: "700", flex: 1, minWidth: 120 }}>
                      • {getPaymentModeLabel(mode as PaymentMode)}
                    </Text>
                    <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800", flexShrink: 0 }}>
                      {UI_TEXT.rs} {formatCurrencyAmount(amt)}
                    </Text>
                  </View>
                ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
}
