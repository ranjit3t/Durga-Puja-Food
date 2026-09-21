import React from "react";
import { View, Text, Pressable } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { isDietaryEnabled } from "../../constants";
import { ConfigDay, DietType } from "../../domain";

interface PendingItem {
  id: string;
  block: string;
  flat: string;
  mobile?: number;
  veg: number;
  nonVeg: number;
  count: number;
  kids: number;
}

export function PendingReport({
  data,
  selectedDayId,
  selectedMealType,
  dayConfig,
  onSelectFlat,
  kidsEnabled,
}: {
  data: PendingItem[];
  selectedDayId: string;
  selectedMealType: any; // MealType
  dayConfig: ConfigDay[];
  onSelectFlat: (id: string) => void;
  kidsEnabled: boolean;
}) {
  const styles = useStyles();
  const { theme } = useAppTheme();

  return (
    <View style={{ gap: 12 }}>
      {data.length === 0 ? (
        <Text style={styles.emptyState}>{UI_TEXT.noMealsSelected}</Text>
      ) : (
        data.map((item, index) => {
          const colorScheme = theme.cardColors[index % theme.cardColors.length];
          const vegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, DietType.VEG, dayConfig);
          const nonVegEnabled = isDietaryEnabled(selectedDayId, selectedMealType, DietType.NON_VEG, dayConfig);

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
                <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{item.block}{UI_TEXT.hyphen}{item.flat}</Text>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={[styles.amount, { color: colorScheme.accent, fontWeight: '900' }]}>
                    {item.count}{UI_TEXT.space}{item.count === 1 ? UI_TEXT.personNotTaken : UI_TEXT.personsNotTaken}
                  </Text>
                  {kidsEnabled && item.kids > 0 && <Text style={{ fontSize: 10, fontWeight: '800', color: theme.colors.textMuted, marginBottom: 2 }}>{(item.kids === 1 ? UI_TEXT.kidIncluded : UI_TEXT.kidsIncluded).replace("{count}", String(item.kids))}</Text>}
                  <Text style={[styles.helper, { fontSize: 11, fontWeight: "700", color: theme.colors.textSecondary }]}>
                    {UI_TEXT.openParen}
                    {vegEnabled && item.veg > 0 && <Text style={{ color: theme.colors.veg }}>{item.veg}{UI_TEXT.space}{UI_TEXT.veg}</Text>}
                    {vegEnabled && item.veg > 0 && nonVegEnabled && item.nonVeg > 0 && <Text>{UI_TEXT.comma}{UI_TEXT.space}</Text>}
                    {nonVegEnabled && item.nonVeg > 0 && <Text style={{ color: theme.colors.nonVeg }}>{item.nonVeg}{UI_TEXT.space}{UI_TEXT.nonVeg}</Text>}
                    {UI_TEXT.closeParen}
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
