import React from "react";
import { View, Text, Pressable } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { ConfigDay, MealType } from "../../domain";

interface MissedParcelItem {
  id: string;
  block: string;
  flat: string;
  mobile?: number;
  count: number;
  kids: number;
}

export function MissedParcelReport({
  data,
  onSelectFlat,
  kidsEnabled,
}: {
  data: MissedParcelItem[];
  selectedDayId: string;
  selectedMealType: MealType;
  dayConfig: ConfigDay[];
  onSelectFlat: (id: string) => void;
  kidsEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 12 }}>
      {data.length === 0 ? (
        <Text style={styles.emptyState}>{UI_TEXT.noRecords}</Text>
      ) : (
        data.map((item, index) => {
          const colorScheme = theme.cardColors[index % theme.cardColors.length];

          return (
            <Pressable
              key={item.id}
              onPress={() => onSelectFlat(item.id)}
              style={({ pressed }) => [
                styles.dashboardCard,
                { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 },
                pressed && { opacity: 0.7 }
              ]}
            >
              <View style={styles.dashboardCardTop}>
                <View>
                   <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{item.block}{UI_TEXT.hyphen}{item.flat}</Text>
                   {kidsEnabled && item.kids > 0 && <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.textMuted, marginTop: 2 }}>{(item.kids === 1 ? UI_TEXT.kidIncluded : UI_TEXT.kidsIncluded).replace("{count}", String(item.kids))}</Text>}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.amount, { color: theme.colors.primary, fontWeight: '900' }]}>
                    {item.count}{UI_TEXT.space}{UI_TEXT.parcelAbbr}{UI_TEXT.space}{UI_TEXT.pending}
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
