import React from "react";
import { View, Text, Pressable } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { SubscriptionRecord, AppliedPackageInfo } from "../../domain";
import { getPassDisplayLabel } from "../../domain";
import { getMemberLegend } from "../../constants";
import { calculatePaidAmount, formatCurrencyAmount } from "../../utils/paymentUtils";

export function PackagePassesReport({
  data,
  onSelectFlat,
  kidsEnabled = false,
}: {
  data: SubscriptionRecord[];
  onSelectFlat: (id: string) => void;
  kidsEnabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
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
                <View>
                  <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>
                    {passLabel}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 2 }}>
                    {sub.peopleCount}{UI_TEXT.space}{sub.peopleCount === 1 ? UI_TEXT.adult : UI_TEXT.adults}
                    {kidsEnabled && (sub.kidsCount || 0) > 0
                      ? `${UI_TEXT.comma}${UI_TEXT.space}${(sub.kidsCount === 1 ? UI_TEXT.kidIncluded : UI_TEXT.kidsIncluded).replace("{count}", String(sub.kidsCount))}`
                      : ""}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colorScheme.accent }}>
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
                    const personLabel = getMemberLegend(pIdx, sub.peopleCount, kidsEnabled);

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
                        }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.textPrimary }}>
                          {personLabel}:
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <Text style={{ fontSize: 12, fontWeight: '900', color: theme.colors.primary }}>
                            {pkgInfo.packageName}
                          </Text>
                          <Text style={{ fontSize: 12, fontWeight: '800', color: theme.colors.success }}>
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
  );
}
