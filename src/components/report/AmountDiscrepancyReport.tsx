import React from "react";
import { View, Text, Pressable } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { DiscrepancyItem } from "../../utils/paymentUtils";

export function AmountDiscrepancyReport({
  data,
  onSelectFlat,
  kidsEnabled = false,
}: {
  data: DiscrepancyItem[];
  onSelectFlat: (id: string) => void;
  kidsEnabled?: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 12 }}>
      {data.length === 0 ? (
        <Text style={styles.emptyState}>{UI_TEXT.noDiscrepancies}</Text>
      ) : (
        data.map((item, index) => {
          const colorScheme = theme.cardColors[index % theme.cardColors.length];
          const passLabel = `${item.block}${UI_TEXT.hyphen}${item.flat}`;
          const isUnderpaid = item.difference < 0;
          const statusText = isUnderpaid ? UI_TEXT.underpaidLabel : UI_TEXT.overpaidLabel;
          const diffAmountText = `${UI_TEXT.rs}${UI_TEXT.space}${Math.abs(item.difference).toFixed(0)}`;
          const badgeColor = isUnderpaid ? theme.colors.error : theme.colors.success;

          return (
            <Pressable
              key={item.id}
              onPress={() => onSelectFlat(item.id)}
              accessible={true}
              accessibilityRole="button"
              accessibilityLabel={`${UI_TEXT.pass}${UI_TEXT.space}${passLabel}${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.expectedAmount}${UI_TEXT.colon}${UI_TEXT.space}${UI_TEXT.rs}${item.calculatedAmount.toFixed(0)}${UI_TEXT.comma}${UI_TEXT.space}${UI_TEXT.paidAmount}${UI_TEXT.colon}${UI_TEXT.space}${UI_TEXT.rs}${item.paidAmount.toFixed(0)}${UI_TEXT.comma}${UI_TEXT.space}${statusText}${UI_TEXT.colon}${UI_TEXT.space}${diffAmountText}`}
              accessibilityHint={UI_TEXT.viewPassHint}
              style={({ pressed }) => [
                styles.dashboardCard,
                { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 },
                pressed && { opacity: 0.7 }
              ]}
            >
              <View style={styles.dashboardCardTop}>
                <View>
                  <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>
                    {passLabel}
                  </Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary, marginTop: 2 }}>
                    {item.peopleCount}{UI_TEXT.space}{item.peopleCount === 1 ? UI_TEXT.adult : UI_TEXT.adults}
                    {kidsEnabled && item.kidsCount > 0
                      ? `${UI_TEXT.comma}${UI_TEXT.space}${(item.kidsCount === 1 ? UI_TEXT.kidIncluded : UI_TEXT.kidsIncluded).replace("{count}", String(item.kidsCount))}`
                      : ""}
                  </Text>
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  <View style={{
                    backgroundColor: isUnderpaid ? theme.colors.errorLight : theme.colors.successLight,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 8,
                    borderWidth: 1,
                    borderColor: badgeColor,
                  }}>
                    <Text style={{
                      fontSize: 12,
                      fontWeight: '900',
                      color: badgeColor
                    }}>
                      {statusText}{UI_TEXT.colon}{UI_TEXT.space}{diffAmountText}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginTop: 12,
                paddingTop: 10,
                borderTopWidth: 1,
                borderTopColor: colorScheme.border,
                gap: 8,
              }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase' }}>
                    {UI_TEXT.expectedAmount}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: theme.colors.textPrimary, marginTop: 2 }}>
                    {UI_TEXT.rs}{UI_TEXT.space}{item.calculatedAmount.toFixed(0)}
                  </Text>
                </View>

                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 10, fontWeight: '700', color: theme.colors.textSecondary, textTransform: 'uppercase' }}>
                    {UI_TEXT.paidAmount}
                  </Text>
                  <Text style={{ fontSize: 16, fontWeight: '900', color: colorScheme.accent, marginTop: 2 }}>
                    {UI_TEXT.rs}{UI_TEXT.space}{item.paidAmount.toFixed(0)}
                  </Text>
                </View>
              </View>
            </Pressable>
          );
        })
      )}
    </View>
  );
}
