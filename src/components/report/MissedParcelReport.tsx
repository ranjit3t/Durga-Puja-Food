import React from "react";
import { View, Text, Pressable, Linking } from "react-native";
import { useStyles } from "../../styles";
import { useAppTheme } from "../../theme";
import { UI_TEXT } from "../../strings";
import { ConfigDay, MealType, AppThemeMode, ActivityModule, ActivityAction } from "../../domain";
import { Ionicons } from "@expo/vector-icons";

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
  selectedDayId,
  selectedMealType,
  dayConfig,
  onSelectFlat,
  kidsEnabled,
  whatsappCountryCode,
  mobileEnabled,
  addActivityLog,
}: {
  data: MissedParcelItem[];
  selectedDayId: string;
  selectedMealType: MealType;
  dayConfig: ConfigDay[];
  onSelectFlat: (id: string) => void;
  kidsEnabled: boolean;
  whatsappCountryCode: string;
  mobileEnabled: boolean;
  addActivityLog: any;
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

              {mobileEnabled && item.mobile && (
                <>
                  <View style={{ height: 1, backgroundColor: colorScheme.border, marginVertical: 12, opacity: 0.5 }} />
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Pressable
                      onPress={() => {
                        addActivityLog({
                          module: ActivityModule.REPORT,
                          action: ActivityAction.CHAT,
                          targetId: item.id,
                          description: UI_TEXT.logChatReport.replace("{id}", item.id)
                        });
                        Linking.openURL(`https://wa.me/${whatsappCountryCode || UI_TEXT.defaultCountryCode}${item.mobile}`);
                      }}
                      style={({ pressed }) => [
                        { padding: 6, borderRadius: 20, backgroundColor: theme.colors.successLight },
                        pressed && { opacity: 0.7 }
                      ]}
                    >
                      <Ionicons name="logo-whatsapp" size={20} color={theme.colors.success} />
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        addActivityLog({
                          module: ActivityModule.REPORT,
                          action: ActivityAction.CALL,
                          targetId: item.id,
                          description: UI_TEXT.logCallReport.replace("{id}", item.id)
                        });
                        Linking.openURL(`tel:${item.mobile}`);
                      }}
                      style={({ pressed }) => [
                        { padding: 6, borderRadius: 20, backgroundColor: theme.colors.surfaceDark },
                        pressed && { opacity: 0.7 }
                      ]}
                    >
                      <Ionicons name="call" size={20} color={theme.colors.primary} />
                    </Pressable>
                  </View>
                </>
              )}
            </Pressable>
          );
        })
      )}
    </View>
  );
}
