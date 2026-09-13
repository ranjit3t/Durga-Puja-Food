/**
 * Operational Dashboard for tracking meal demands and collections.
 * Provides aggregated counts for kitchen planning and guest entry management.
 */
import React, { memo } from "react";
import {
  View,
  Text,
  ScrollView,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { styles, CARD_COLORS } from "../styles";
import { UI_TEXT } from "../strings";
import {
  getDayLabel,
  isMealEnabled,
  isDietaryEnabled,
  isParcelEnabled,
} from "../constants";
import { FoodMenu, MealMenu, UserRole, ConfigDay } from "../types";
import { BackButton } from "../components/common/BackButton";
import { LogoutButton } from "../components/common/LogoutButton";
import { MealSummaryInline } from "../components/menu/MealSummaryInline";
import { Metric } from "../components/common/Metric";
import { EditableMetric } from "../components/common/EditableMetric";
import { AlertButton } from "../components/common/CustomAlert";

interface MealSectionProps {
  day: string;
  type: "breakfast" | "lunch" | "dinner";
  icon: keyof typeof Ionicons.glyphMap;
  total: number;
  veg: number;
  nonVeg: number;
  parcel: number;
  parcelTaken: number;
  taken: number;
  flatVegTaken: number;
  flatNonVegTaken: number;
  guestVeg: number;
  guestNonVeg: number;
  guestVegTaken: number;
  guestNonVegTaken: number;
  menu: MealMenu;
  userRole: UserRole;
  config: ConfigDay[];
  onUpdateGuest: (
    day: string,
    type: "breakfast" | "lunch" | "dinner",
    field:
      | "guestVeg"
      | "guestNonVeg"
      | "guestTaken"
      | "guestVegTaken"
      | "guestNonVegTaken",
    value: number
  ) => void;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  guestEnabled: boolean;
  seasonEnabled: boolean;
  labels: {
    veg: string;
    nonVeg: string;
    parcel: string;
    parcelTaken: string;
    taken: string;
    guestVeg: string;
    guestNonVeg: string;
    guestVegTaken: string;
    guestNonVegTaken: string;
    vegTaken: string;
    nonVegTaken: string;
  };
}

/**
 * Renders a specific meal category (e.g. Lunch) with its demand metrics.
 */
const DashboardMealSection = memo(
  ({
    day,
    type,
    icon,
    total,
    veg,
    nonVeg,
    parcel,
    parcelTaken,
    taken,
    flatVegTaken,
    flatNonVegTaken,
    guestVeg,
    guestNonVeg,
    guestVegTaken,
    guestNonVegTaken,
    menu,
    userRole,
    config,
    onUpdateGuest,
    showAlert,
    guestEnabled,
    seasonEnabled,
    labels,
  }: MealSectionProps) => {
    const vegItems = menu?.veg || [];
    const nonVegItems = menu?.nonVeg || [];
    const isAdmin = userRole === "admin";
    const canEdit = seasonEnabled;

    const isVegEnabled = isDietaryEnabled(day, type, "veg", config);
    const isNonVegEnabled = isDietaryEnabled(day, type, "nonVeg", config);
    const isBothEnabled = isVegEnabled && isNonVegEnabled;

    const totalVegTaken = flatVegTaken + guestVegTaken;
    const totalNonVegTaken = flatNonVegTaken + guestNonVegTaken;
    const totalMealTaken = totalVegTaken + totalNonVegTaken;

    const mealLabel = type === "breakfast" ? UI_TEXT.breakfast : type === "lunch" ? UI_TEXT.lunch : UI_TEXT.dinner;

    return (
      <View style={styles.dashboardMealSection}>
        <View style={[styles.mealDisplayHeader, { marginBottom: 12, justifyContent: "space-between" }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Ionicons name={icon} size={22} color="#E31837" />
            <Text style={[styles.sectionTitle, { marginBottom: 0, fontSize: 18 }]}>
              {mealLabel}
            </Text>
          </View>
          <View style={[styles.pill, { backgroundColor: "#F1F3F5" }]}>
             <Text style={[styles.pillText, { color: "#6A6E73" }]}>{total} {UI_TEXT.plates}</Text>
          </View>
        </View>

        {/* Menu Quick-View */}
        {(vegItems.length > 0 || nonVegItems.length > 0) ? (
          <View style={{ gap: 8, marginBottom: 16 }}>
            {isVegEnabled && vegItems.length > 0 && (
              <View style={[styles.menuBox, { borderLeftWidth: 4, borderLeftColor: "#28A745", paddingVertical: 8 }]}>
                <MealSummaryInline
                  label={UI_TEXT.veg}
                  dayId={day}
                  mealKey={type}
                  config={config}
                  menu={{ veg: vegItems, nonVeg: [] }}
                />
              </View>
            )}
            {isNonVegEnabled && nonVegItems.length > 0 && (
                <View
                  style={[styles.menuBox, { borderLeftWidth: 4, borderLeftColor: "#DC3545", paddingVertical: 8 }]}
                >
                  <MealSummaryInline
                    label={UI_TEXT.nonVeg}
                    dayId={day}
                    mealKey={type}
                    config={config}
                    menu={{ veg: [], nonVeg: nonVegItems }}
                  />
                </View>
              )}
          </View>
        ) : null}

        {/* Aggregated Demand Metrics */}
        <View style={styles.metricGrid}>
          <Metric icon="people-outline" label={UI_TEXT.total} value={total} />

          {/* Guest Total */}
          {guestEnabled && (
            isBothEnabled ? (
              <Metric
                icon="people-circle-outline"
                label={UI_TEXT.guestTotal}
                value={guestVeg + guestNonVeg}
              />
            ) : (
              <EditableMetric
                icon="people-circle-outline"
                label={UI_TEXT.guestTotal}
                value={guestVeg + guestNonVeg}
                onSave={(val) =>
                  canEdit && isAdmin && onUpdateGuest(day, type, isVegEnabled ? "guestVeg" : "guestNonVeg", val)
                }
                validate={(val) =>
                  val >= (guestVegTaken + guestNonVegTaken) || UI_TEXT.guestTotalError
                }
                showAlert={showAlert}
                disabled={!canEdit || !isAdmin}
              />
            )
          )}

          {/* Detailed Demand */}
          {isBothEnabled && (
            <>
              <Metric icon="leaf-outline" label={labels.veg} value={veg} color="#28A745" />
              <Metric icon="flame-outline" label={labels.nonVeg} value={nonVeg} color="#DC3545" />
            </>
          )}

          {isParcelEnabled(day, type, config) && (
            <>
              <Metric icon="cube-outline" label={labels.parcel} value={parcel} />
              <Metric
                icon="checkmark-circle-outline"
                label={labels.parcelTaken}
                value={parcelTaken}
                color="#E31837"
              />
            </>
          )}

          <Metric
            icon="checkmark-done-outline"
            label={UI_TEXT.total + " " + UI_TEXT.taken}
            value={totalMealTaken}
            color="#28A745"
          />

          {/* Detailed View */}
          {isBothEnabled && (
            <>
              <View style={{ width: "100%", height: 1, backgroundColor: "#E9ECEF", marginVertical: 8 }} />

              <Metric
                icon="checkmark-done-outline"
                label={labels.vegTaken}
                value={totalVegTaken}
                color="#28A745"
              />
              <Metric
                icon="checkmark-done-outline"
                label={labels.nonVegTaken}
                value={totalNonVegTaken}
                color="#DC3545"
              />

              {guestEnabled && (
                <>
                  <EditableMetric
                    icon="leaf-outline"
                    label={labels.guestVeg}
                    value={guestVeg}
                    onSave={(val) => canEdit && onUpdateGuest(day, type, "guestVeg", val)}
                    validate={(val) =>
                      val >= guestVegTaken || UI_TEXT.guestVegTotalError
                    }
                    showAlert={showAlert}
                    color="#28A745"
                    disabled={!canEdit}
                  />
                  <EditableMetric
                    icon="flame-outline"
                    label={labels.guestNonVeg}
                    value={guestNonVeg}
                    onSave={(val) => canEdit && onUpdateGuest(day, type, "guestNonVeg", val)}
                    validate={(val) =>
                      val >= guestNonVegTaken || UI_TEXT.guestNonVegTotalError
                    }
                    showAlert={showAlert}
                    color="#DC3545"
                    disabled={!canEdit}
                  />

                  <EditableMetric
                    icon="checkbox-outline"
                    label={labels.guestVegTaken}
                    value={guestVegTaken}
                    onSave={(val) => canEdit && onUpdateGuest(day, type, "guestVegTaken", val)}
                    validate={(val) => val <= guestVeg || UI_TEXT.guestTakenError}
                    showAlert={showAlert}
                    disabled={!canEdit}
                  />
                  <EditableMetric
                    icon="checkbox-outline"
                    label={labels.guestNonVegTaken}
                    value={guestNonVegTaken}
                    onSave={(val) => canEdit && onUpdateGuest(day, type, "guestNonVegTaken", val)}
                    validate={(val) => val <= guestNonVeg || UI_TEXT.guestTakenError}
                    showAlert={showAlert}
                    disabled={!canEdit}
                  />
                </>
              )}
            </>
          )}

          {!isBothEnabled && guestEnabled && (
            <EditableMetric
              icon="checkbox-outline"
              label={UI_TEXT.guestTaken}
              value={guestVegTaken + guestNonVegTaken}
              onSave={(val) =>
                canEdit && onUpdateGuest(
                  day,
                  type,
                  isVegEnabled ? "guestVegTaken" : "guestNonVegTaken",
                  val
                )
              }
              validate={(val) =>
                val <= (guestVeg + guestNonVeg) || UI_TEXT.guestTakenError
              }
              showAlert={showAlert}
              color="#28A745"
              disabled={!canEdit}
            />
          )}
        </View>
      </View>
    );
  }
);

export function DashboardScreen({
  data,
  userRole,
  menu,
  config,
  paymentConfig,
  totalCollection,
  upiCollection,
  cashCollection,
  bankTransferCollection,
  onUpdateMenu,
  onBack,
  onLogout,
  showAlert,
  guestEnabled,
  seasonEnabled,
}: {
  data: Array<any>;
  userRole: UserRole;
  totalCollection: number;
  upiCollection: number;
  cashCollection: number;
  bankTransferCollection: number;
  menu: FoodMenu;
  config: ConfigDay[];
  paymentConfig: PaymentConfig;
  onUpdateMenu: (menu: FoodMenu) => Promise<void>;
  onBack: () => void;
  onLogout: () => void;
  showAlert: (title: string, message: string, buttons?: AlertButton[]) => void;
  guestEnabled: boolean;
  seasonEnabled: boolean;
}) {
  const emptyMeal = {
    veg: [],
    nonVeg: [],
    guestVeg: 0,
    guestNonVeg: 0,
    guestTaken: 0,
    guestVegTaken: 0,
    guestNonVegTaken: 0,
  };

  const activeDays = config.filter((d) => d.enabled).map((d) => d.id);

  /**
   * Updates guest count or status in the global Food Menu.
   */
  const onUpdateGuest = (
    day: string,
    type: "breakfast" | "lunch" | "dinner",
    field:
      | "guestVeg"
      | "guestNonVeg"
      | "guestTaken"
      | "guestVegTaken"
      | "guestNonVegTaken",
    value: number
  ) => {
    const updatedMenu = { ...menu };
    const updatedDay = { ...updatedMenu[day as any] };
    const updatedMeal = { ...updatedDay[type] };

    // Update the specific field
    updatedMeal[field] = value;

    // Maintain guestTaken as summation of Veg and Non-veg taken
    if (field === "guestVegTaken" || field === "guestNonVegTaken") {
      updatedMeal.guestTaken =
        (updatedMeal.guestVegTaken || 0) + (updatedMeal.guestNonVegTaken || 0);
    }

    updatedDay[type] = updatedMeal;
    updatedMenu[day as any] = updatedDay;
    onUpdateMenu(updatedMenu);
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
    >
      <StatusBar style="light" />
      <View style={styles.header}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <BackButton onPress={onBack} />
          <LogoutButton onLogout={onLogout} />
        </View>
        <Text style={styles.title}>{UI_TEXT.dashboardTitle}</Text>
        <Text style={styles.subtitle}>{UI_TEXT.dashboardSubtitle}</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Financial Overview */}
        {paymentConfig.enabled && (
          <>
            <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>{UI_TEXT.payment}</Text>
            <View style={styles.collectionCard}>
              <View style={{ backgroundColor: "#F7F3F0", width: 56, height: 56, borderRadius: 20, alignItems: "center", justifyContent: "center" }}>
                 <Ionicons name="wallet-outline" size={28} color="#7B5A2D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.collectionLabel}>{UI_TEXT.totalCollection}</Text>
                <Text style={styles.collectionAmount}>
                  {UI_TEXT.rs} {totalCollection.toFixed(0)}
                </Text>
                <Text style={styles.collectionBreakdown}>
                  {(() => {
                     const parts = [];
                     if (paymentConfig.options.upi) parts.push(`${UI_TEXT.upi} ${upiCollection.toFixed(0)}`);
                     if (paymentConfig.options.cash) parts.push(`${UI_TEXT.cash} ${cashCollection.toFixed(0)}`);
                     if (paymentConfig.options.bankTransfer) parts.push(`${UI_TEXT.bankTransfer} ${bankTransferCollection.toFixed(0)}`);
                     return parts.join(" • ");
                  })()}
                </Text>
              </View>
            </View>
          </>
        )}

        <Text style={[styles.sectionTitle, { marginBottom: 16 }]}>{UI_TEXT.dailyMealDemand}</Text>

        {/* Daily Demand Matrices */}
        {activeDays.map((day, index) => {
          const item = data[index] || {};
          const dayMenu = menu[day] || {
            breakfast: emptyMeal,
            lunch: emptyMeal,
            dinner: emptyMeal,
          };
          const colorScheme = CARD_COLORS[index % CARD_COLORS.length];

          return (
            <View key={day} style={[styles.dashboardCard, { backgroundColor: colorScheme.bg, borderColor: colorScheme.border, borderWidth: 1.5 }]}>
              <View style={[styles.dashboardCardTop, { marginBottom: 16 }]}>
                <Text style={[styles.dashboardDay, { color: colorScheme.accent }]}>{getDayLabel(day, config)}</Text>
              </View>

              {isMealEnabled(day, "breakfast", config) && (
                <DashboardMealSection
                  day={day}
                  type="breakfast"
                  icon="sunny-outline"
                  total={item.breakfast || 0}
                  veg={item.breakfastVeg || 0}
                  nonVeg={item.breakfastNonVeg || 0}
                  parcel={item.breakfastParcel || 0}
                  parcelTaken={item.breakfastParcelTaken || 0}
                  taken={item.breakfastTaken || 0}
                  flatVegTaken={item.breakfastFlatVegTaken || 0}
                  flatNonVegTaken={item.breakfastFlatNonVegTaken || 0}
                  guestVeg={item.breakfastGuestVeg || 0}
                  guestNonVeg={item.breakfastGuestNonVeg || 0}
                  guestVegTaken={item.breakfastGuestVegTaken || 0}
                  guestNonVegTaken={item.breakfastGuestNonVegTaken || 0}
                  menu={dayMenu.breakfast}
                  userRole={userRole}
                  config={config}
                  onUpdateGuest={onUpdateGuest}
                  showAlert={showAlert}
                  guestEnabled={guestEnabled} seasonEnabled={seasonEnabled}
                  labels={{
                    veg: UI_TEXT.bVeg,
                    nonVeg: UI_TEXT.bNonVeg,
                    parcel: UI_TEXT.bParcel,
                    parcelTaken: UI_TEXT.bP_Taken,
                    taken: UI_TEXT.bTaken,
                    guestVeg: UI_TEXT.guestVeg,
                    guestNonVeg: UI_TEXT.guestNonVeg,
                    guestVegTaken: UI_TEXT.guestVegTaken,
                    guestNonVegTaken: UI_TEXT.guestNonVegTaken,
                    vegTaken: UI_TEXT.vegTaken,
                    nonVegTaken: UI_TEXT.nonVegTaken,
                  }}
                />
              )}

              {isMealEnabled(day, "lunch", config) && (
                <DashboardMealSection
                  day={day}
                  type="lunch"
                  icon="restaurant-outline"
                  total={item.lunch || 0}
                  veg={item.lunchVeg || 0}
                  nonVeg={item.lunchNonVeg || 0}
                  parcel={item.lunchParcel || 0}
                  parcelTaken={item.lunchParcelTaken || 0}
                  taken={item.lunchTaken || 0}
                  flatVegTaken={item.lunchFlatVegTaken || 0}
                  flatNonVegTaken={item.lunchFlatNonVegTaken || 0}
                  guestVeg={item.lunchGuestVeg || 0}
                  guestNonVeg={item.lunchGuestNonVeg || 0}
                  guestVegTaken={item.lunchGuestVegTaken || 0}
                  guestNonVegTaken={item.lunchGuestNonVegTaken || 0}
                  menu={dayMenu.lunch}
                  userRole={userRole}
                  config={config}
                  onUpdateGuest={onUpdateGuest}
                  showAlert={showAlert}
                  guestEnabled={guestEnabled} seasonEnabled={seasonEnabled}
                  labels={{
                    veg: UI_TEXT.lVeg,
                    nonVeg: UI_TEXT.lNonVeg,
                    parcel: UI_TEXT.lParcel,
                    parcelTaken: UI_TEXT.lP_Taken,
                    taken: UI_TEXT.lTaken,
                    guestVeg: UI_TEXT.guestVeg,
                    guestNonVeg: UI_TEXT.guestNonVeg,
                    guestVegTaken: UI_TEXT.guestVegTaken,
                    guestNonVegTaken: UI_TEXT.guestNonVegTaken,
                    vegTaken: UI_TEXT.vegTaken,
                    nonVegTaken: UI_TEXT.nonVegTaken,
                  }}
                />
              )}

              {isMealEnabled(day, "dinner", config) && (
                <DashboardMealSection
                  day={day}
                  type="dinner"
                  icon="moon-outline"
                  total={item.dinner || 0}
                  veg={item.dinnerVeg || 0}
                  nonVeg={item.dinnerNonVeg || 0}
                  parcel={item.dinnerParcel || 0}
                  parcelTaken={item.dinnerParcelTaken || 0}
                  taken={item.dinnerTaken || 0}
                  flatVegTaken={item.dinnerFlatVegTaken || 0}
                  flatNonVegTaken={item.dinnerFlatNonVegTaken || 0}
                  guestVeg={item.dinnerGuestVeg || 0}
                  guestNonVeg={item.dinnerGuestNonVeg || 0}
                  guestVegTaken={item.dinnerGuestVegTaken || 0}
                  guestNonVegTaken={item.dinnerGuestNonVegTaken || 0}
                  menu={dayMenu.dinner}
                  userRole={userRole}
                  config={config}
                  onUpdateGuest={onUpdateGuest}
                  showAlert={showAlert}
                  guestEnabled={guestEnabled} seasonEnabled={seasonEnabled}
                  labels={{
                    veg: UI_TEXT.dVeg,
                    nonVeg: UI_TEXT.dNonVeg,
                    parcel: UI_TEXT.dParcel,
                    parcelTaken: UI_TEXT.dP_Taken,
                    taken: UI_TEXT.dTaken,
                    guestVeg: UI_TEXT.guestVeg,
                    guestNonVeg: UI_TEXT.guestNonVeg,
                    guestVegTaken: UI_TEXT.guestVegTaken,
                    guestNonVegTaken: UI_TEXT.guestNonVegTaken,
                    vegTaken: UI_TEXT.vegTaken,
                    nonVegTaken: UI_TEXT.nonVegTaken,
                  }}
                />
              )}
            </View>
          );
        })}
        <View style={styles.footer}>
           <Text style={styles.footerText}>{UI_TEXT.footerCopyright}</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
