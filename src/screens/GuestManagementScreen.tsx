import React, { memo } from "react";
import { View, Text, ScrollView, StatusBar, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useStyles } from "../styles";
import { StatusBarStyleMode, useAppTheme } from "../theme";
import { UI_TEXT } from "../strings";
import { getDayLabel, isMealEnabled, isMealDone, getSortedMealKeys, isDietaryEnabled, isMealCurrent, getMealLabel } from "../constants";
import { MealMenu, ConfigDay, UserRole, MealType, DietType, AppScreen, AppThemeMode, ActivityModule, ActivityAction } from "../types";
import { BackButton } from "../components/common/BackButton";
import { HomeButton } from "../components/common/HomeButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { CounterInput } from "../components/common/CounterInput";
import { useAuth } from "../context/AuthContext";
import { useDatabase } from "../context/DatabaseContext";
import { useAppNavigation } from "../context/NavigationContext";

interface GuestMealCardProps {
  dayId: string;
  type: MealType;
  menu: MealMenu;
  config: ConfigDay[];
  disabled: boolean;
  isAdmin: boolean;
  onUpdate: (
    day: string,
    type: MealType,
    field: string,
    value: number
  ) => void;
}

const GuestMealCard = memo(({ dayId, type, menu, config, disabled, isAdmin, onUpdate }: GuestMealCardProps) => {
  const styles = useStyles();
  const { theme } = useAppTheme();

  const isVegEnabled = isDietaryEnabled(dayId, type, DietType.VEG, config);
  const isNonVegEnabled = isDietaryEnabled(dayId, type, DietType.NON_VEG, config);
  const isDone = isMealDone(dayId, type, config);
  const isCurrent = isMealCurrent(dayId, type, config);
  const showDetailed = isVegEnabled && isNonVegEnabled;

  const mealLabel = getMealLabel(type);
  const icon = type === MealType.BREAKFAST ? "sunny-outline" : type === MealType.LUNCH ? "restaurant-outline" : "moon-outline";

  const guestVeg = menu.guestVeg || 0;
  const guestNonVeg = menu.guestNonVeg || 0;
  const guestVegTaken = menu.guestVegTaken || 0;
  const guestNonVegTaken = menu.guestNonVegTaken || 0;

  // For non-detailed (e.g. Veg only), we use guestVeg and guestVegTaken as the primary storage
  const guestTotal = showDetailed ? (guestVeg + guestNonVeg) : (menu.guestVeg || 0);
  const guestTaken = showDetailed ? (guestVegTaken + guestNonVegTaken) : (menu.guestVegTaken || 0);

  return (
    <View style={[
      styles.dashboardMealSection,
      { marginBottom: 20, borderWidth: 1, borderColor: theme.colors.border },
      isCurrent && { borderColor: theme.colors.primary, borderWidth: 1.5, backgroundColor: theme.colors.primary + "08" },
      isDone && { opacity: 0.6 }
    ]}>
      <View style={[styles.mealDisplayHeader, { marginBottom: 16, justifyContent: "space-between" }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Ionicons name={icon} size={22} color={isCurrent ? theme.colors.primary : theme.colors.textSecondary} />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 18, color: isCurrent ? theme.colors.primary : theme.colors.textPrimary }]}>{mealLabel}</Text>
            {isCurrent && (
               <View style={{ backgroundColor: theme.colors.primary, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ color: theme.colors.white, fontSize: 10, fontWeight: "900" }}>{UI_TEXT.live.toUpperCase()}</Text>
               </View>
            )}
            {!showDetailed && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: isVegEnabled ? theme.colors.successLight : theme.colors.errorLight, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, borderWidth: 0.5, borderColor: isVegEnabled ? theme.colors.veg : theme.colors.nonVeg }}>
                <Ionicons name={isVegEnabled ? "leaf" : "flame"} size={10} color={isVegEnabled ? theme.colors.veg : theme.colors.nonVeg} />
                <Text style={{ color: isVegEnabled ? theme.colors.veg : theme.colors.nonVeg, fontSize: 10, fontWeight: "800" }}>
                  {(isVegEnabled ? UI_TEXT.vegOnly : UI_TEXT.nonVegOnly).toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        </View>
        {isDone && (
          <View style={[styles.pill, { backgroundColor: theme.colors.successLight }]}>
             <Text style={[styles.pillText, { color: theme.colors.success, fontSize: 10 }]}>{UI_TEXT.mealDoneLabel.toUpperCase()}</Text>
          </View>
        )}
      </View>

      <View style={{ gap: 16 }}>
        {showDetailed ? (
          <>
            <View style={{ width: '100%' }}>
              <CounterInput
                label={UI_TEXT.guestVeg}
                value={guestVeg}
                min={guestVegTaken}
                onChange={(val) => onUpdate(dayId, type, "guestVeg", val)}
                disabled={disabled || !isAdmin || isDone}
              />
            </View>
            <View style={{ width: '100%' }}>
              <CounterInput
                label={UI_TEXT.guestNonVeg}
                value={guestNonVeg}
                min={guestNonVegTaken}
                onChange={(val) => onUpdate(dayId, type, "guestNonVeg", val)}
                disabled={disabled || !isAdmin || isDone}
              />
            </View>
            <View style={{ width: '100%' }}>
              <CounterInput
                label={UI_TEXT.guestVegTaken}
                value={guestVegTaken}
                max={guestVeg}
                onChange={(val) => onUpdate(dayId, type, "guestVegTaken", val)}
                disabled={disabled || isDone}
              />
            </View>
            <View style={{ width: '100%' }}>
              <CounterInput
                label={UI_TEXT.guestNonVegTaken}
                value={guestNonVegTaken}
                max={guestNonVeg}
                onChange={(val) => onUpdate(dayId, type, "guestNonVegTaken", val)}
                disabled={disabled || isDone}
              />
            </View>

            <View style={{ width: '100%', flexDirection: 'row', gap: 16, marginTop: 4 }}>
               <View style={{ flex: 1, backgroundColor: theme.colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.guestTotal.toUpperCase()}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.textPrimary, marginTop: 4 }}>{guestTotal}</Text>
               </View>
               <View style={{ flex: 1, backgroundColor: theme.colors.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.border }}>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: theme.colors.textSecondary }}>{UI_TEXT.guestTaken.toUpperCase()}</Text>
                  <Text style={{ fontSize: 20, fontWeight: '900', color: theme.colors.success, marginTop: 4 }}>{guestTaken}</Text>
               </View>
            </View>
          </>
        ) : (
          <>
            <View style={{ width: '100%' }}>
              <CounterInput
                label={UI_TEXT.guestTotal}
                value={guestTotal}
                min={guestTaken}
                onChange={(val) => onUpdate(dayId, type, isVegEnabled ? "guestVeg" : "guestNonVeg", val)}
                disabled={disabled || !isAdmin || isDone}
              />
            </View>
            <View style={{ width: '100%' }}>
              <CounterInput
                label={UI_TEXT.guestTaken}
                value={guestTaken}
                min={0}
                max={guestTotal}
                onChange={(val) => onUpdate(dayId, type, isVegEnabled ? "guestVegTaken" : "guestNonVegTaken", val)}
                disabled={disabled || isDone}
              />
            </View>
          </>
        )}
      </View>
    </View>
  );
});

export function GuestManagementScreen() {
  const { userRole, handleLogout } = useAuth();
  const {
    foodMenu, dayConfig, seasonEnabled, updateGuestCount, addActivityLog
  } = useDatabase();
  const { goBack, navigate } = useAppNavigation();

  const styles = useStyles();
  const { theme, themeType } = useAppTheme();

  const activeDays = React.useMemo(() => {
    const active = dayConfig.filter((d) => d.enabled).map((d) => d.id);
    return [...active].sort((a, b) => {
      const aHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(a, m, dayConfig));
      const bHasCurrent = [MealType.BREAKFAST, MealType.LUNCH, MealType.DINNER].some(m => isMealCurrent(b, m, dayConfig));
      if (aHasCurrent && !bHasCurrent) return -1;
      if (!aHasCurrent && bHasCurrent) return 1;
      return 0;
    });
  }, [dayConfig]);

  const isAdmin = userRole === UserRole.ADMIN;

  const handleUpdate = (
    day: string,
    type: MealType,
    field: string,
    value: number
  ) => {
    updateGuestCount(day, type, field, value);
    addActivityLog({
      module: ActivityModule.GUEST,
      action: ActivityAction.UPDATE,
      targetId: `${day}-${type}`,
      description: UI_TEXT.logUpdateGuest
        .replace("{field}", field)
        .replace("{value}", String(value))
        .replace("{day}", getDayLabel(day, dayConfig))
        .replace("{meal}", getMealLabel(type))
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar style={themeType === AppThemeMode.DARK ? StatusBarStyleMode.LIGHT : StatusBarStyleMode.DARK} />
      <View style={styles.header}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <BackButton onPress={goBack} />
            <HomeButton onPress={() => navigate(AppScreen.HOME)} />
          </View>
          <LogoutButton onLogout={handleLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.guestManagement}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.dashboardSubtitle}</Text>
      </View>

      <ScrollView
        style={{ flex: 1, width: "100%" }}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {activeDays.map((day, index) => {
          const dayMenu = foodMenu[day] || {};
          const colorScheme = theme.cardColors[index % theme.cardColors.length];

          return (
            <View key={day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
              <Text style={[styles.dashboardDay, { color: colorScheme.accent, marginBottom: 16 }]}>{getDayLabel(day, dayConfig)}</Text>

              {getSortedMealKeys(day, dayConfig)
                .filter((mKey) => isMealEnabled(day, mKey, dayConfig))
                .map((mKey) => (
                  <GuestMealCard
                    key={mKey}
                    dayId={day}
                    type={mKey}
                    menu={dayMenu[mKey] || { veg: [], nonVeg: [] }}
                    config={dayConfig}
                    onUpdate={handleUpdate}
                    disabled={!seasonEnabled}
                    isAdmin={isAdmin}
                  />
                ))}
            </View>
          );
        })}

        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </View>
  );
}
