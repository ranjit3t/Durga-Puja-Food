import React from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { SubscriptionRecord, ConfigDay } from "../../domain";
import { getPassDisplayLabel } from "../../domain";
import { getMemberLegend } from "../../constants";
import { calculatePaidAmount, calculatePackageReportSummary, formatCurrencyAmount } from "../../utils/paymentUtils";

export function PackagePassesReport({
  data,
  onSelectFlat,
  kidsEnabled = false,
  guestsEnabled = false,
  dayConfig = [],
  foodMenu = {},
  foodPackages = [],
}: {
  data: SubscriptionRecord[];
  onSelectFlat: (id: string) => void;
  kidsEnabled?: boolean;
  guestsEnabled?: boolean;
  dayConfig?: ConfigDay[];
  foodMenu?: Record<string, any>;
  foodPackages?: any[];
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const summary = calculatePackageReportSummary(
    data,
    foodMenu,
    dayConfig,
    kidsEnabled,
    guestsEnabled,
    foodPackages
  );

  const summaryA11yLabel = `${UI_TEXT.packagesAppliedTitle}: ${summary.totalPasses} passes, ${summary.totalPeopleCovered} members covered, Total Savings ${summary.totalSavings} rupees`;

  return (
    <View style={{ gap: 16 }}>
      {/* 1. Global Package Summary Card */}
      <View
        style={[styles.card, { padding: 18, backgroundColor: theme.colors.primary, borderRadius: 16 }]}
        accessible={true}
        accessibilityRole="summary"
        accessibilityLabel={summaryA11yLabel}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
          <Ionicons name="cube-outline" size={20} color={theme.colors.white} />
          <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 18, flex: 1 }}>
            {UI_TEXT.packagesAppliedTitle}
          </Text>
        </View>

        <View style={{ gap: 8, borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 12 }}>
          {/* Total Passes Opted Packages */}
          <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
              {UI_TEXT.totalPassesOptedPackages}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "900" }}>
              {summary.totalPasses} {summary.totalPasses === 1 ? UI_TEXT.passSingular : UI_TEXT.passPlural}
            </Text>
          </View>

          {/* Members Covered */}
          <View style={{ gap: 3, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
            <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
              {UI_TEXT.totalPeopleCovered}
            </Text>
            <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "900" }}>
              {summary.totalPeopleCovered} {summary.totalPeopleCovered === 1 ? UI_TEXT.member : UI_TEXT.members}
            </Text>
          </View>

          {/* Package Breakdown */}
          {Object.keys(summary.packageCounts).length > 0 && (
            <View style={{ gap: 4, marginBottom: 4, borderBottomWidth: 1, borderBottomColor: theme.colors.white + "20", paddingBottom: 8 }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700" }}>
                {UI_TEXT.packageBreakdownTitle}
              </Text>
              {Object.values(summary.packageCounts).map((pkg) => (
                <View key={pkg.packageName} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingLeft: 8, flexWrap: "wrap", gap: 4 }}>
                  <Text style={{ color: theme.colors.white + "99", fontSize: 12, fontWeight: "600", flex: 1, minWidth: 100 }} numberOfLines={1}>
                    • {pkg.packageName}
                  </Text>
                  <Text style={{ color: theme.colors.white, fontSize: 12, fontWeight: "800", flexShrink: 0 }}>
                    {pkg.count} {pkg.count === 1 ? UI_TEXT.member : UI_TEXT.members}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Financial Comparison */}
          <View style={{ gap: 6, marginTop: 4 }}>
            <Text style={{ color: theme.colors.white, fontSize: 13, fontWeight: "800", textTransform: "uppercase" }}>
              {UI_TEXT.financialComparisonTitle}
            </Text>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 }} numberOfLines={1}>
                {UI_TEXT.expectedCostWithoutPackage}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }} numberOfLines={1}>
                {UI_TEXT.rs} {formatCurrencyAmount(summary.expectedCostWithoutPackage)}
              </Text>
            </View>

            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.colors.white + "CC", fontSize: 13, fontWeight: "700", flex: 1, marginRight: 8 }} numberOfLines={1}>
                {UI_TEXT.costAfterPackage}
              </Text>
              <Text style={{ color: theme.colors.white, fontSize: 14, fontWeight: "800", flexShrink: 0 }} numberOfLines={1}>
                {UI_TEXT.rs} {formatCurrencyAmount(summary.costAfterPackage)}
              </Text>
            </View>

            <View style={{ borderTopWidth: 1, borderTopColor: theme.colors.white + "40", paddingTop: 8, marginTop: 4, flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 16 }}>
                {UI_TEXT.totalSavings}
              </Text>
              <Text style={{ color: theme.colors.white, fontWeight: "900", fontSize: 20 }}>
                {UI_TEXT.rs} {formatCurrencyAmount(summary.totalSavings)}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* 2. Package Passes Card List */}
      <View style={{ gap: 12 }}>
        {data.length === 0 ? (
          <Text style={styles.emptyState}>{UI_TEXT.noPackagePasses}</Text>
        ) : (
          data.map((sub, index) => {
            const colorScheme = theme.cardColors[index % theme.cardColors.length];
            const passLabel = getPassDisplayLabel(sub);
            const paidAmount = calculatePaidAmount(sub);
            const appliedPackages = sub.appliedPackages || {};

            return (
              <Pressable
                key={sub.id}
                onPress={() => onSelectFlat(sub.id)}
                accessible={true}
                accessibilityRole="button"
                accessibilityLabel={`${UI_TEXT.pass} ${passLabel}, ${UI_TEXT.paidAmount}: ${formatCurrencyAmount(paidAmount)}`}
                accessibilityHint={UI_TEXT.viewPassHint}
                style={({ pressed }) => [
                  styles.dashboardCard,
                  { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 },
                  pressed && { opacity: 0.7 },
                ]}
              >
                <View style={styles.dashboardCardTop}>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[styles.dashboardDay, { color: colorScheme.accent }]} numberOfLines={1}>
                      {passLabel}
                    </Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 2 }} numberOfLines={1}>
                      {sub.peopleCount}{UI_TEXT.space}{sub.peopleCount === 1 ? UI_TEXT.adult : UI_TEXT.adults}
                      {kidsEnabled && (sub.kidsCount || 0) > 0
                        ? `${UI_TEXT.comma}${UI_TEXT.space}${(sub.kidsCount === 1 ? UI_TEXT.kidIncluded : UI_TEXT.kidsIncluded).replace("{count}", String(sub.kidsCount))}`
                        : ""}
                    </Text>
                  </View>

                  <View style={{ alignItems: 'flex-end', flexShrink: 0 }}>
                    <Text style={{ fontSize: 16, fontWeight: '900', color: colorScheme.accent }} numberOfLines={1}>
                      {formatCurrencyAmount(paidAmount)}
                    </Text>
                  </View>
                </View>

                {/* Applied Packages Details */}
                {Object.keys(appliedPackages).length > 0 && (
                  <View
                    style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTopWidth: 1,
                      borderTopColor: colorScheme.border,
                      gap: 6,
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.textMuted, textTransform: 'uppercase' }}>
                      {UI_TEXT.packagesAppliedTitle}
                    </Text>

                    {Object.entries(appliedPackages).map(([pIdxStr, pkgInfo]) => {
                      const pIdx = Number(pIdxStr);
                      const personLabel = getMemberLegend(pIdx, sub.peopleCount, kidsEnabled, sub.kidsCount || 0, guestsEnabled);

                      return (
                        <View
                          key={pIdxStr}
                          style={{
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            backgroundColor: theme.colors.surface,
                            paddingHorizontal: 8,
                            paddingVertical: 6,
                            borderRadius: 6,
                            borderWidth: 1,
                            borderColor: theme.colors.border,
                            flexWrap: "wrap",
                            gap: 4,
                          }}
                        >
                          <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textPrimary, flex: 1, minWidth: 80 }} numberOfLines={1}>
                            {personLabel}:
                          </Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <Text style={{ fontSize: 12, fontWeight: '900', color: theme.colors.primary }} numberOfLines={1}>
                              {pkgInfo.packageName}
                            </Text>
                            <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.success }} numberOfLines={1}>
                              ({formatCurrencyAmount(pkgInfo.packagePrice)})
                            </Text>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </Pressable>
            );
          })
        )}
      </View>
    </View>
  );
}
